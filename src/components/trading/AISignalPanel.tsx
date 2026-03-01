import { useState, useCallback, useRef, useEffect } from 'react';
import { Candle, PivotLevels, CandlePattern } from '@/lib/tradingData';
import { type MultiTFAnalysis } from '@/hooks/useMultiTimeframe';
import { Brain, Loader2, RefreshCw, TrendingUp, TrendingDown, Minus, Target, AlertTriangle, Zap, CheckCircle2, XCircle, Timer } from 'lucide-react';
import { toast } from 'sonner';
import MarketInsightsPanel, { type MarketInsights } from './MarketInsightsPanel';

interface AIEntry {
  type: 'LONG' | 'SHORT';
  entry: number;
  tp1: number;
  tp2: number;
  tp3?: number;
  sl: number;
  rr: string;
  winRate?: number;
  confidence: number;
  reason: string;
  strategy: 'SCALP' | 'SWING';
  confluences?: string[];
}

interface AIValidatedLevel {
  price: number;
  type: 'resistance' | 'support';
  strength: 'Rất mạnh' | 'Mạnh' | 'Trung bình';
  testCount?: number;
  note: string;
  validated?: boolean;
}

interface AITrendLine {
  startPrice: number;
  endPrice: number;
  startIndex: number;
  endIndex: number;
  type: 'support' | 'resistance' | 'channel';
  label?: string;
}

interface MarketStructure {
  phase: string;
  keyZone: string;
  bias: 'LONG' | 'SHORT' | 'NEUTRAL';
}

export interface AIAnalysis {
  trend: 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS';
  trendStrength: number;
  summary: string;
  entries: AIEntry[];
  validatedLevels: AIValidatedLevel[];
  aiTrendLines: AITrendLine[];
  marketStructure?: MarketStructure;
  riskWarning: string;
  marketInsights?: MarketInsights;
}

interface Props {
  candles: Candle[];
  pivots: PivotLevels | null;
  patterns: CandlePattern[];
  rsiValue?: number;
  macdValue?: number;
  symbol: string;
  timeframe: string;
  sentiment: { bullPct: number; bearPct: number };
  onAnalysisUpdate?: (analysis: AIAnalysis | null) => void;
  autoRefresh?: boolean;
  candleCloseCount?: number;
  multiTFData?: MultiTFAnalysis | null;
}

const ANALYZE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-market`;
const AUTO_REFRESH_INTERVAL = 180000; // 3 minutes

export default function AISignalPanel({ candles, pivots, patterns, rsiValue, macdValue, symbol, timeframe, sentiment, onAnalysisUpdate, autoRefresh = true, candleCloseCount = 0, multiTFData }: Props) {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [nextRefresh, setNextRefresh] = useState<number>(0);
  const cooldownRef = useRef(false);
  const hasAutoAnalyzed = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [creditExhausted, setCreditExhausted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const analyze = useCallback(async () => {
    if (!pivots || candles.length < 10 || cooldownRef.current || creditExhausted) return;
    cooldownRef.current = true;
    setTimeout(() => { cooldownRef.current = false; }, 10000);

    setLoading(true);
    setErrorMessage(null);
    try {
      const resp = await fetch(ANALYZE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          candles: candles.slice(-50),
          symbol,
          timeframe,
          pivots,
          rsi: rsiValue?.toFixed(1) ?? 'N/A',
          macd: macdValue?.toFixed(2) ?? 'N/A',
          patterns,
          sentiment,
          previousAnalysis: analysis ? {
            trend: analysis.trend,
            entries: analysis.entries,
            marketStructure: analysis.marketStructure,
          } : null,
          multiTFData: multiTFData ? {
            overallBias: multiTFData.overallBias,
            confluenceScore: multiTFData.confluenceScore,
            htfTrend: multiTFData.htfTrend,
            timeframes: multiTFData.timeframes.map(tf => ({
              timeframe: tf.timeframe,
              trend: tf.trend,
              rsi: tf.rsi,
              macdHistogram: tf.macdHistogram,
              ema9: tf.ema9,
              ema21: tf.ema21,
              bullPct: tf.bullPct,
              patterns: tf.patterns,
            })),
          } : null,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }));
        const msg = err.error || `HTTP ${resp.status}`;
        if (resp.status === 402) {
          setCreditExhausted(true);
          setErrorMessage('Hết credit AI. Vui lòng nạp thêm credit để tiếp tục sử dụng.');
          toast.error('⚠️ Hết credit AI. Auto-refresh đã tắt.', { duration: 8000 });
          return;
        }
        if (resp.status === 429) {
          setErrorMessage('Rate limit - thử lại sau 1 phút.');
          toast.warning('⏳ Rate limit, thử lại sau...', { duration: 5000 });
          return;
        }
        throw new Error(msg);
      }

      const data: AIAnalysis = await resp.json();
      setAnalysis(data);
      onAnalysisUpdate?.(data);
      setLastUpdated(new Date().toLocaleTimeString('vi-VN'));
      
      if (data.entries.length > 0) {
        toast.success(`🧠 AI: ${data.entries.length} tín hiệu ≥90% WR`, { duration: 5000 });
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Lỗi phân tích AI');
      toast.error(e.message || 'Lỗi phân tích AI');
    } finally {
      setLoading(false);
    }
  }, [candles, pivots, patterns, rsiValue, macdValue, symbol, timeframe, sentiment, onAnalysisUpdate, creditExhausted]);

  // Auto-analyze on first load
  useEffect(() => {
    if (pivots && candles.length >= 10 && !hasAutoAnalyzed.current) {
      hasAutoAnalyzed.current = true;
      analyze();
    }
  }, [pivots, candles.length, analyze]);

  // Reset on symbol/timeframe change
  useEffect(() => {
    hasAutoAnalyzed.current = false;
    setAnalysis(null);
    onAnalysisUpdate?.(null);
  }, [symbol, timeframe]);

  // Auto-refresh on interval (stop if credits exhausted)
  useEffect(() => {
    if (!autoRefresh || creditExhausted) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      return;
    }
    
    // Set countdown
    setNextRefresh(AUTO_REFRESH_INTERVAL / 1000);
    countdownRef.current = setInterval(() => {
      setNextRefresh(prev => Math.max(0, prev - 1));
    }, 1000);

    intervalRef.current = setInterval(() => {
      if (pivots && candles.length >= 10) {
        analyze();
        setNextRefresh(AUTO_REFRESH_INTERVAL / 1000);
      }
    }, AUTO_REFRESH_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [autoRefresh, pivots, candles.length, analyze, creditExhausted]);

  // Re-analyze when candle closes
  useEffect(() => {
    if (candleCloseCount > 0 && pivots && candles.length >= 10 && hasAutoAnalyzed.current && !creditExhausted) {
      analyze();
      setNextRefresh(AUTO_REFRESH_INTERVAL / 1000);
    }
  }, [candleCloseCount]);

  const TrendIcon = analysis?.trend === 'UPTREND' ? TrendingUp : analysis?.trend === 'DOWNTREND' ? TrendingDown : Minus;
  const trendColor = analysis?.trend === 'UPTREND' ? 'text-bull' : analysis?.trend === 'DOWNTREND' ? 'text-bear' : 'text-pivot';

  const formatCountdown = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-3">
      {/* Analyze Button + Auto Status */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => { setCreditExhausted(false); setErrorMessage(null); analyze(); }}
          disabled={loading || !pivots}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold disabled:opacity-40 hover:opacity-90 transition-all glow-cyan"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
          {creditExhausted ? 'Thử lại' : loading ? 'AI đang phân tích...' : 'Phân tích AI (≥90% WR)'}
        </button>

        {(creditExhausted || errorMessage) && (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${
            creditExhausted 
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
              : 'bg-bear/10 text-bear border border-bear/20'
          }`}>
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{errorMessage}</span>
          </div>
        )}
        
        {autoRefresh && !creditExhausted && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-secondary text-[10px] text-muted-foreground font-mono">
            <Timer className="w-3 h-3" />
            <span>Auto: {formatCountdown(nextRefresh)}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-bull animate-pulse" />
          </div>
        )}

        {lastUpdated && (
          <span className="text-[10px] text-muted-foreground font-mono">
            Update: {lastUpdated}
          </span>
        )}
        {analysis && (
          <button onClick={analyze} disabled={loading} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      {!analysis && !loading && (
        <div className="text-center py-8 bg-card rounded-lg border border-border">
          <Brain className="w-10 h-10 text-primary/30 mx-auto mb-3" />
          <p className="text-xs text-muted-foreground">Đang chờ phân tích AI...</p>
          <p className="text-[10px] text-muted-foreground mt-1">AI sẽ tự động phân tích khi có đủ dữ liệu</p>
        </div>
      )}

      {loading && !analysis && (
        <div className="text-center py-8 bg-card rounded-lg border border-border">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
          <p className="text-xs text-muted-foreground">Spider AI đang phân tích hợp lưu...</p>
          <p className="text-[10px] text-muted-foreground mt-1">Chỉ đưa tín hiệu khi win rate ≥ 90%</p>
        </div>
      )}

      {analysis && (
        <>
          {/* Market Structure */}
          {analysis.marketStructure && (
            <div className="bg-card rounded-lg border border-border p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold text-primary">MARKET STRUCTURE</span>
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                  analysis.marketStructure.bias === 'LONG' ? 'bg-bull/20 text-bull' :
                  analysis.marketStructure.bias === 'SHORT' ? 'bg-bear/20 text-bear' :
                  'bg-pivot/20 text-pivot'
                }`}>
                  {analysis.marketStructure.phase}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono ${
                  analysis.marketStructure.bias === 'LONG' ? 'text-bull' :
                  analysis.marketStructure.bias === 'SHORT' ? 'text-bear' : 'text-pivot'
                }`}>
                  BIAS: {analysis.marketStructure.bias}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">{analysis.marketStructure.keyZone}</p>
            </div>
          )}

          {/* Trend Summary */}
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TrendIcon className={`w-5 h-5 ${trendColor}`} />
                <span className={`text-sm font-bold ${trendColor}`}>{analysis.trend}</span>
                <div className="flex gap-0.5">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className={`w-2 h-1.5 rounded-sm ${i < analysis.trendStrength ? (analysis.trend === 'UPTREND' ? 'bg-bull' : analysis.trend === 'DOWNTREND' ? 'bg-bear' : 'bg-pivot') : 'bg-secondary'}`} />
                  ))}
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">{symbol} • {timeframe}</span>
            </div>
            <p className="text-xs text-foreground leading-relaxed">{analysis.summary}</p>
          </div>

          {/* Entry Signals - Only 90%+ */}
          {analysis.entries.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-bull flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                TÍN HIỆU HỢP LƯU ≥90% ({analysis.entries.length})
              </h3>
              {analysis.entries.map((entry, i) => {
                const isLong = entry.type === 'LONG';
                return (
                  <div key={i} className={`rounded-lg border-2 p-4 ${isLong ? 'border-bull/50 bg-bull-muted/20' : 'border-bear/50 bg-bear-muted/20'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded text-xs font-bold ${isLong ? 'bg-bull text-primary-foreground' : 'bg-bear text-primary-foreground'}`}>
                          {entry.type}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono ${entry.strategy === 'SCALP' ? 'bg-primary/20 text-primary' : 'bg-pivot/20 text-pivot'}`}>
                          {entry.strategy}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-bull font-bold">WR {entry.winRate || entry.confidence}%</span>
                        <div className="w-20 h-2 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-bull" style={{ width: `${entry.winRate || entry.confidence}%` }} />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-5 gap-1.5 mb-2">
                      <div className="bg-card/50 rounded p-2 text-center">
                        <p className="text-[8px] text-muted-foreground mb-0.5">ENTRY</p>
                        <p className="text-[11px] font-mono font-bold text-foreground">{entry.entry.toLocaleString()}</p>
                      </div>
                      <div className="bg-card/50 rounded p-2 text-center">
                        <p className="text-[8px] text-bull mb-0.5">TP1</p>
                        <p className="text-[11px] font-mono font-bold text-bull">{entry.tp1.toLocaleString()}</p>
                      </div>
                      <div className="bg-card/50 rounded p-2 text-center">
                        <p className="text-[8px] text-bull mb-0.5">TP2</p>
                        <p className="text-[11px] font-mono font-bold text-bull">{entry.tp2.toLocaleString()}</p>
                      </div>
                      {entry.tp3 && (
                        <div className="bg-card/50 rounded p-2 text-center">
                          <p className="text-[8px] text-bull mb-0.5">TP3</p>
                          <p className="text-[11px] font-mono font-bold text-bull">{entry.tp3.toLocaleString()}</p>
                        </div>
                      )}
                      <div className="bg-card/50 rounded p-2 text-center">
                        <p className="text-[8px] text-bear mb-0.5">SL</p>
                        <p className="text-[11px] font-mono font-bold text-bear">{entry.sl.toLocaleString()}</p>
                      </div>
                    </div>

                    {entry.confluences && entry.confluences.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {entry.confluences.map((c, ci) => (
                          <span key={ci} className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[9px] font-medium">
                            ✓ {c}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-muted-foreground flex-1">{entry.reason}</p>
                      <span className="text-[10px] font-mono text-pivot ml-2 font-bold">RR {entry.rr}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-card rounded-lg border border-border p-4 text-center">
              <XCircle className="w-6 h-6 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-xs font-semibold text-muted-foreground">Chưa đủ hợp lưu cho tín hiệu ≥90%</p>
              <p className="text-[10px] text-muted-foreground mt-1">AI đang chờ thêm xác nhận từ các chỉ báo</p>
            </div>
          )}

          {/* AI Validated Levels */}
          {analysis.validatedLevels && analysis.validatedLevels.length > 0 && (
            <div className="bg-card rounded-lg border border-border p-4">
              <h3 className="text-xs font-bold text-primary flex items-center gap-1.5 mb-3">
                <Target className="w-3.5 h-3.5" />
                VÙNG S/R AI XÁC NHẬN ({analysis.validatedLevels.length})
              </h3>
              <div className="space-y-1.5">
                {analysis.validatedLevels.map((level, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded bg-secondary/50 text-xs">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${level.type === 'resistance' ? 'bg-bear' : 'bg-bull'}`} />
                      <span className="font-mono text-foreground font-bold">{level.price.toLocaleString()}</span>
                      <span className="text-[9px] text-muted-foreground uppercase">{level.type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {level.testCount && (
                        <span className="text-[9px] text-pivot font-mono">{level.testCount}x test</span>
                      )}
                      <span className={`text-[10px] font-bold ${level.strength === 'Rất mạnh' ? (level.type === 'resistance' ? 'text-bear' : 'text-bull') : 'text-muted-foreground'}`}>
                        {level.strength}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Market Insights */}
          {analysis.marketInsights && (
            <MarketInsightsPanel insights={analysis.marketInsights} />
          )}

          {/* Risk Warning */}
          {analysis.riskWarning && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-bear-muted/30 border border-bear/20">
              <AlertTriangle className="w-4 h-4 text-bear shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-bold text-bear mb-0.5">CẢNH BÁO RỦI RO</p>
                <p className="text-[10px] text-muted-foreground">{analysis.riskWarning}</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
