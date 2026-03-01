import { useMemo } from 'react';
import { Candle, PivotLevels, CandlePattern, calculateRSI, calculateMACD, calculateEMA } from '@/lib/tradingData';
import { type MultiTFAnalysis } from '@/hooks/useMultiTimeframe';
import { TrendingUp, TrendingDown, Target, BarChart3, Activity, Newspaper, Brain } from 'lucide-react';

interface Props {
  candles: Candle[];
  pivots: PivotLevels;
  patterns: CandlePattern[];
  rsiValue: number;
  macdValue: number;
  sentiment: { bullPct: number; bearPct: number };
  multiTF?: MultiTFAnalysis | null;
  newsScore?: number; // 0-100
}

interface ScoreItem {
  label: string;
  icon: React.ReactNode;
  longScore: number;
  shortScore: number;
  detail: string;
}

export default function ConfluenceScoring({ candles, pivots, patterns, rsiValue, macdValue, sentiment, multiTF, newsScore }: Props) {
  const scores = useMemo(() => {
    const items: ScoreItem[] = [];
    const price = candles[candles.length - 1]?.close || 0;

    // 1. Price Action / Patterns
    const bullPatterns = patterns.filter(p => p.type === 'bullish').length;
    const bearPatterns = patterns.filter(p => p.type === 'bearish').length;
    const paLong = Math.min(30, bullPatterns * 10);
    const paShort = Math.min(30, bearPatterns * 10);
    items.push({
      label: 'Price Action',
      icon: <Activity className="w-3.5 h-3.5" />,
      longScore: paLong,
      shortScore: paShort,
      detail: `${bullPatterns} tăng, ${bearPatterns} giảm (${patterns.map(p => p.nameVi).join(', ') || 'Không có'})`,
    });

    // 2. Pivot / S-R
    const distToS1 = Math.abs(price - pivots.s1);
    const distToR1 = Math.abs(price - pivots.r1);
    const totalDist = distToS1 + distToR1;
    const pivotLong = price < pivots.pp ? Math.min(25, Math.round((1 - distToS1 / totalDist) * 25)) : 5;
    const pivotShort = price > pivots.pp ? Math.min(25, Math.round((1 - distToR1 / totalDist) * 25)) : 5;
    items.push({
      label: 'Pivot / S-R',
      icon: <Target className="w-3.5 h-3.5" />,
      longScore: pivotLong,
      shortScore: pivotShort,
      detail: price > pivots.pp ? `Trên PP (${pivots.pp.toFixed(0)}), gần R1` : `Dưới PP (${pivots.pp.toFixed(0)}), gần S1`,
    });

    // 3. Indicators (RSI + MACD)
    let indLong = 0, indShort = 0;
    if (rsiValue < 30) indLong += 15;
    else if (rsiValue < 40) indLong += 10;
    else if (rsiValue > 70) indShort += 15;
    else if (rsiValue > 60) indShort += 10;
    
    if (macdValue > 0) indLong += 10;
    else indShort += 10;
    
    items.push({
      label: 'Chỉ báo',
      icon: <BarChart3 className="w-3.5 h-3.5" />,
      longScore: indLong,
      shortScore: indShort,
      detail: `RSI: ${rsiValue?.toFixed(1) || 'N/A'} | MACD: ${macdValue?.toFixed(2) || 'N/A'}`,
    });

    // 4. Trend / EMA
    const ema9 = calculateEMA(candles, 9);
    const ema21 = calculateEMA(candles, 21);
    const lastEma9 = ema9[ema9.length - 1];
    const lastEma21 = ema21[ema21.length - 1];
    const trendLong = price > lastEma9 && lastEma9 > lastEma21 ? 20 : price > lastEma21 ? 10 : 0;
    const trendShort = price < lastEma9 && lastEma9 < lastEma21 ? 20 : price < lastEma21 ? 10 : 0;
    items.push({
      label: 'Xu hướng',
      icon: price > lastEma9 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />,
      longScore: trendLong,
      shortScore: trendShort,
      detail: `EMA9: ${lastEma9?.toFixed(0)} | EMA21: ${lastEma21?.toFixed(0)}`,
    });

    // 5. Multi-TF
    if (multiTF) {
      const mtfLong = multiTF.overallBias === 'LONG' ? 20 : multiTF.overallBias === 'NEUTRAL' ? 10 : 0;
      const mtfShort = multiTF.overallBias === 'SHORT' ? 20 : multiTF.overallBias === 'NEUTRAL' ? 10 : 0;
      items.push({
        label: 'Đa khung TG',
        icon: <Brain className="w-3.5 h-3.5" />,
        longScore: mtfLong,
        shortScore: mtfShort,
        detail: multiTF.summary,
      });
    }

    // 6. Sentiment / News
    const sentLong = Math.round(sentiment.bullPct * 0.15);
    const sentShort = Math.round(sentiment.bearPct * 0.15);
    const newsLong = newsScore !== undefined ? (newsScore > 50 ? Math.round((newsScore - 50) * 0.2) : 0) : 0;
    const newsShort = newsScore !== undefined ? (newsScore < 50 ? Math.round((50 - newsScore) * 0.2) : 0) : 0;
    items.push({
      label: 'Sentiment',
      icon: <Newspaper className="w-3.5 h-3.5" />,
      longScore: sentLong + newsLong,
      shortScore: sentShort + newsShort,
      detail: `Bull ${sentiment.bullPct}% / Bear ${sentiment.bearPct}%${newsScore !== undefined ? ` | News: ${newsScore}%` : ''}`,
    });

    return items;
  }, [candles, pivots, patterns, rsiValue, macdValue, sentiment, multiTF, newsScore]);

  const totalLong = scores.reduce((s, i) => s + i.longScore, 0);
  const totalShort = scores.reduce((s, i) => s + i.shortScore, 0);
  const total = totalLong + totalShort || 1;
  const longPct = Math.round((totalLong / total) * 100);
  const shortPct = 100 - longPct;
  const bias: 'LONG' | 'SHORT' | 'NEUTRAL' = longPct > 60 ? 'LONG' : shortPct > 60 ? 'SHORT' : 'NEUTRAL';

  return (
    <div className="bg-card rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-primary flex items-center gap-1.5">
          <Brain className="w-4 h-4" />
          ĐIỂM HỢP LƯU
        </h3>
        <span className={`px-2.5 py-1 rounded text-xs font-bold ${
          bias === 'LONG' ? 'bg-bull/20 text-bull' :
          bias === 'SHORT' ? 'bg-bear/20 text-bear' :
          'bg-pivot/20 text-pivot'
        }`}>
          {bias === 'LONG' ? '🟢 LONG' : bias === 'SHORT' ? '🔴 SHORT' : '⏳ NEUTRAL'}
        </span>
      </div>

      {/* Big bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-bold font-mono">
          <span className="text-bull">Long {longPct}%</span>
          <span className="text-bear">Short {shortPct}%</span>
        </div>
        <div className="flex h-3 rounded-full overflow-hidden bg-secondary/50">
          <div
            className="h-full rounded-l-full transition-all duration-1000 relative overflow-hidden"
            style={{
              width: `${longPct}%`,
              background: 'linear-gradient(90deg, #16a34a, #22c55e)',
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent animate-[tickerScroll_3s_linear_infinite]" />
          </div>
          <div
            className="h-full rounded-r-full transition-all duration-1000"
            style={{
              width: `${shortPct}%`,
              background: 'linear-gradient(90deg, #ef4444, #dc2626)',
            }}
          />
        </div>
      </div>

      {/* Score breakdown */}
      <div className="space-y-1.5">
        {scores.map((item, i) => {
          const itemTotal = item.longScore + item.shortScore || 1;
          const itemLongPct = Math.round((item.longScore / itemTotal) * 100);
          return (
            <div key={i} className="space-y-0.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  {item.icon}
                  <span className="font-medium text-foreground">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-bull font-mono">+{item.longScore}</span>
                  <span className="text-[9px] text-bear font-mono">+{item.shortScore}</span>
                </div>
              </div>
              <div className="flex h-1 rounded-full overflow-hidden bg-secondary/30">
                <div className="h-full bg-bull/60 transition-all duration-700" style={{ width: `${itemLongPct}%` }} />
                <div className="h-full bg-bear/60 transition-all duration-700" style={{ width: `${100 - itemLongPct}%` }} />
              </div>
              <p className="text-[9px] text-muted-foreground pl-5 truncate">{item.detail}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
