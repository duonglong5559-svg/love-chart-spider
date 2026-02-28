import { useState, useMemo, useCallback } from 'react';
import { calculatePivots, detectPatterns, generateSignals, generateAlerts, calculateRSI, calculateMACD, generateTrendLines, getSentiment, getPivotAnalysis } from '@/lib/tradingData';
import { type AIAnalysis } from '@/components/trading/AISignalPanel';
import { useBinanceData } from '@/hooks/useBinanceData';
import InteractiveChart from '@/components/trading/InteractiveChart';
import PriceTicker from '@/components/trading/PriceTicker';
import PivotTable from '@/components/trading/PivotTable';
import PatternPanel from '@/components/trading/PatternPanel';
import SignalPanel from '@/components/trading/SignalPanel';
import VolumeChart from '@/components/trading/VolumeChart';
import SentimentBar from '@/components/trading/SentimentBar';
import AlertCards from '@/components/trading/AlertCards';
import RSIChart from '@/components/trading/RSIChart';
import MACDChart from '@/components/trading/MACDChart';
import AIChatPanel from '@/components/trading/AIChatPanel';
import AISignalPanel from '@/components/trading/AISignalPanel';
import NewsPanel from '@/components/trading/NewsPanel';
import { Activity, Wifi, WifiOff, Loader2, TrendingUp, Target, BarChart3, Bot, Brain, Newspaper } from 'lucide-react';

const SYMBOLS = [
  { value: 'BTCUSDT', label: 'BTC' },
  { value: 'ETHUSDT', label: 'ETH' },
  { value: 'PAXGUSDT', label: 'XAU' },
  { value: 'BNBUSDT', label: 'BNB' },
  { value: 'SOLUSDT', label: 'SOL' },
  { value: 'XRPUSDT', label: 'XRP' },
  { value: 'DOGEUSDT', label: 'DOGE' },
];

type TabKey = 'signals' | 'analysis' | 'trends' | 'indicators' | 'news' | 'ai';

const Index = () => {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [timeframe, setTimeframe] = useState('M5');
  const [activeTab, setActiveTab] = useState<TabKey>('signals');
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);

  const { candles, loading, error, connected, candleCloseCount } = useBinanceData(symbol, timeframe);

  const pivots = useMemo(() => candles.length > 0 ? calculatePivots(candles) : null, [candles]);
  const patterns = useMemo(() => detectPatterns(candles), [candles]);
  const signals = useMemo(() => pivots ? generateSignals(candles, pivots) : [], [candles, pivots]);
  const alerts = useMemo(() => pivots ? generateAlerts(candles, pivots, patterns) : [], [candles, pivots, patterns]);
  const rsiData = useMemo(() => calculateRSI(candles), [candles]);
  const macdData = useMemo(() => calculateMACD(candles), [candles]);
  const trendLines = useMemo(() => generateTrendLines(candles), [candles]);
  const sentiment = useMemo(() => getSentiment(candles), [candles]);
  const pivotAnalysis = useMemo(() => pivots && candles.length > 0 ? getPivotAnalysis(candles[candles.length - 1].close, pivots) : '', [candles, pivots]);

  const buyZone = pivots?.s1;
  const sellZone = pivots?.r1;

  const handleAIAnalysisUpdate = useCallback((analysis: AIAnalysis | null) => {
    setAiAnalysis(analysis);
  }, []);

  const timeframes = ['M1', 'M5', 'M15', 'H1', 'H4', 'D1'];

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'signals', label: 'AI Signals', icon: <Brain className="w-3.5 h-3.5" /> },
    { key: 'analysis', label: 'Phân tích', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { key: 'trends', label: `Xu hướng`, icon: <Target className="w-3.5 h-3.5" />, count: aiAnalysis?.aiTrendLines?.length || trendLines.length },
    { key: 'indicators', label: 'Chỉ báo', icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { key: 'news', label: 'Tin tức', icon: <Newspaper className="w-3.5 h-3.5" /> },
    { key: 'ai', label: 'Chat AI', icon: <Bot className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <header className="border-b border-border px-3 py-2">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary/20 flex items-center justify-center">
              <Activity className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-bold text-primary">Spider Analysis</span>
          </div>

          {/* AI Bias indicator */}
          {aiAnalysis?.marketStructure ? (
            <div className={`px-2.5 py-1 rounded text-xs font-semibold ${
              aiAnalysis.marketStructure.bias === 'LONG' ? 'bg-bull-muted text-bull' :
              aiAnalysis.marketStructure.bias === 'SHORT' ? 'bg-bear-muted text-bear' :
              'bg-secondary text-pivot'
            }`}>
              AI: {aiAnalysis.marketStructure.bias === 'LONG' ? 'Lệnh Chờ Long 🟢' :
                aiAnalysis.marketStructure.bias === 'SHORT' ? 'Lệnh Chờ Short 🔴' : 'Chờ Xác Nhận ⏳'}
            </div>
          ) : (
            <div className={`px-2.5 py-1 rounded text-xs font-semibold ${
              candles.length > 1 && candles[candles.length - 1].close >= candles[candles.length - 2].close
                ? 'bg-bull-muted text-bull' : 'bg-bear-muted text-bear'
            }`}>
              {candles.length > 1 && candles[candles.length - 1].close >= candles[candles.length - 2].close
                ? 'Lệnh Chờ Long 🟢' : 'Lệnh Chờ Short 🔴'}
            </div>
          )}

          <div className="px-2.5 py-1 rounded bg-secondary text-xs font-mono text-foreground">
            {SYMBOLS.find(s => s.value === symbol)?.label || symbol.replace('USDT', '')}/USDT
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            {connected ? (
              <>
                <Wifi className="w-3 h-3 text-bull" />
                <span className="w-1.5 h-1.5 rounded-full bg-bull animate-pulse" />
                <span className="text-[10px] text-bull font-mono">LIVE</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-bear" />
                <span className="text-[10px] text-bear font-mono">OFFLINE</span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Sentiment Bar */}
      {candles.length > 0 && (
        <div className="px-3 py-1.5 border-b border-border">
          <SentimentBar bullPct={sentiment.bullPct} bearPct={sentiment.bearPct} />
        </div>
      )}

      {/* Timeframe + Symbol Selector */}
      <div className="px-3 py-2 border-b border-border flex flex-wrap gap-2">
        <div className="flex items-center gap-0.5 bg-card border border-border rounded-md p-0.5 overflow-x-auto">
          {timeframes.map(tf => (
            <button key={tf} onClick={() => setTimeframe(tf)}
              className={`px-3 py-1.5 text-xs font-mono rounded transition-all whitespace-nowrap ${
                tf === timeframe ? 'bg-pivot text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}>{tf}</button>
          ))}
        </div>
        <div className="flex items-center gap-0.5 bg-card border border-border rounded-md p-0.5 overflow-x-auto">
          {SYMBOLS.map(s => (
            <button key={s.value} onClick={() => setSymbol(s.value)}
              className={`px-2 py-1.5 text-[10px] font-mono rounded transition-all whitespace-nowrap ${
                s.value === symbol ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}>{s.label}</button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mx-3 mt-2 bg-bear-muted border border-bear/30 rounded-lg p-3">
          <p className="text-xs text-bear">{error}</p>
        </div>
      )}

      {loading && candles.length === 0 ? (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <span className="ml-3 text-sm text-muted-foreground">Đang tải dữ liệu từ Binance...</span>
        </div>
      ) : candles.length > 0 && pivots ? (
        <>
          {/* Pivot Analysis Banner */}
          <div className="px-3 py-2 border-b border-border overflow-hidden relative">
            <div className="flex items-center gap-2">
              <span className="flex-shrink-0 px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[10px] font-bold animate-pulse">LIVE</span>
              <div className="overflow-hidden flex-1">
                <p className="text-xs text-muted-foreground whitespace-nowrap animate-ticker">
                  <span className="font-mono text-foreground">📊 Giá tại {candles[candles.length - 1].close.toLocaleString()}</span>
                  {'  •  '}
                  <span className="text-pivot">{pivotAnalysis}</span>
                  {'  •  '}
                  <span className="text-bull">RSI: {rsiData[rsiData.length - 1]?.toFixed(1)}</span>
                  {'  •  '}
                  <span className={macdData.histogram[macdData.histogram.length - 1] >= 0 ? 'text-bull' : 'text-bear'}>
                    MACD: {macdData.histogram[macdData.histogram.length - 1]?.toFixed(2)}
                  </span>
                  {'  •  '}
                  {aiAnalysis && (
                    <>
                      <span className="text-primary font-bold">🧠 AI: {aiAnalysis.trend} ({aiAnalysis.trendStrength}/10)</span>
                      {'  •  '}
                      <span className="text-primary">Entries ≥90%: {aiAnalysis.entries.length}</span>
                      {'  •  '}
                    </>
                  )}
                  <span className="text-foreground">Sentiment: {sentiment.bullPct}% Bull / {sentiment.bearPct}% Bear</span>
                </p>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="px-2 pt-2">
            <InteractiveChart
              candles={candles}
              pivots={pivots}
              trendLines={trendLines}
              buyZone={buyZone}
              sellZone={sellZone}
              patterns={patterns}
              aiLevels={aiAnalysis?.validatedLevels}
              aiTrendLines={aiAnalysis?.aiTrendLines}
            />
          </div>

          {/* Bottom Tabs */}
          <div className="border-t border-border">
            <div className="flex overflow-x-auto">
              {tabs.map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-all ${
                    activeTab === tab.key ? 'border-primary text-primary bg-card' : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}>
                  {tab.icon}
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      activeTab === tab.key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                    }`}>{tab.count}</span>
                  )}
                </button>
              ))}
            </div>

            <div className="p-3 max-h-[60vh] overflow-y-auto">
              {activeTab === 'signals' && (
                <AISignalPanel
                  candles={candles}
                  pivots={pivots}
                  patterns={patterns}
                  rsiValue={rsiData[rsiData.length - 1]}
                  macdValue={macdData.histogram[macdData.histogram.length - 1]}
                  symbol={symbol}
                  timeframe={timeframe}
                  sentiment={sentiment}
                  onAnalysisUpdate={handleAIAnalysisUpdate}
                  autoRefresh={true}
                  candleCloseCount={candleCloseCount}
                />
              )}

              {activeTab === 'analysis' && (
                <div className="space-y-3">
                  <PriceTicker candles={candles} symbol={symbol} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <PivotTable pivots={pivots} currentPrice={candles[candles.length - 1]?.close ?? 0} />
                    <PatternPanel patterns={patterns} />
                  </div>
                </div>
              )}

              {activeTab === 'trends' && (
                <div className="space-y-3">
                  <VolumeChart candles={candles} />
                  {aiAnalysis?.aiTrendLines && aiAnalysis.aiTrendLines.length > 0 ? (
                    <div className="bg-card rounded-lg border border-border p-4">
                      <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
                        <Brain className="w-3.5 h-3.5" />
                        ĐƯỜNG XU HƯỚNG AI ({aiAnalysis.aiTrendLines.length})
                      </h3>
                      <div className="space-y-2">
                        {aiAnalysis.aiTrendLines.map((line, i) => (
                          <div key={i} className="flex items-center gap-3 p-2 rounded bg-secondary/50 text-xs">
                            <div className="w-6 h-0.5 rounded" style={{
                              backgroundColor: line.type === 'resistance' ? 'hsl(348, 90%, 60%)' :
                                line.type === 'support' ? 'hsl(145, 90%, 50%)' : 'hsl(45, 100%, 55%)'
                            }} />
                            <span className="text-foreground font-medium capitalize">{line.label || line.type}</span>
                            <span className="text-muted-foreground font-mono">
                              {line.startPrice.toFixed(2)} → {line.endPrice.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-card rounded-lg border border-border p-4">
                      <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
                        <Target className="w-3.5 h-3.5" />
                        ĐƯỜNG XU HƯỚNG ({trendLines.length})
                      </h3>
                      <div className="space-y-2">
                        {trendLines.map((line, i) => (
                          <div key={i} className="flex items-center gap-3 p-2 rounded bg-secondary/50 text-xs">
                            <div className="w-6 h-0.5 rounded" style={{ backgroundColor: line.color }} />
                            <span className="text-foreground font-medium capitalize">{line.type}</span>
                            <span className="text-muted-foreground font-mono">
                              {line.startPrice.toFixed(2)} → {line.endPrice.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'indicators' && (
                <div className="space-y-3">
                  <RSIChart rsiData={rsiData} candles={candles} />
                  <MACDChart macd={macdData.macd} signal={macdData.signal} histogram={macdData.histogram} candles={candles} />
                  <VolumeChart candles={candles} />
                </div>
              )}

              {activeTab === 'news' && (
                <NewsPanel
                  symbol={symbol}
                  currentPrice={candles[candles.length - 1]?.close}
                  trend={aiAnalysis?.trend}
                />
              )}

              {activeTab === 'ai' && (
                <AIChatPanel
                  candles={candles}
                  pivots={pivots}
                  patterns={patterns}
                  rsiValue={rsiData[rsiData.length - 1]}
                  macdValue={macdData.histogram[macdData.histogram.length - 1]}
                  symbol={symbol}
                  timeframe={timeframe}
                />
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default Index;
