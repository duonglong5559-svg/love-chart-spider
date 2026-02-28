import { Candle, PivotLevels, TrendLine, CandlePattern, calculateEMA } from '@/lib/tradingData';
import { useMemo } from 'react';

interface AIValidatedLevel {
  price: number;
  type: 'resistance' | 'support';
  strength: 'Rất mạnh' | 'Mạnh' | 'Trung bình';
  testCount?: number;
  note: string;
}

interface AITrendLine {
  startPrice: number;
  endPrice: number;
  startIndex: number;
  endIndex: number;
  type: 'support' | 'resistance' | 'channel';
  label?: string;
}

interface Props {
  candles: Candle[];
  pivots: PivotLevels;
  trendLines: TrendLine[];
  buyZone?: number;
  sellZone?: number;
  patterns?: CandlePattern[];
  aiLevels?: AIValidatedLevel[];
  aiTrendLines?: AITrendLine[];
}

const CandlestickChart = ({ candles, pivots, trendLines, buyZone, sellZone, patterns = [], aiLevels, aiTrendLines }: Props) => {
  const hasAI = aiLevels && aiLevels.length > 0;

  const ema9 = useMemo(() => calculateEMA(candles, 9), [candles]);
  const ema21 = useMemo(() => calculateEMA(candles, 21), [candles]);

  const { minPrice, maxPrice, chartCandles } = useMemo(() => {
    const allPrices = candles.flatMap(c => [c.high, c.low]);
    const pivotValues = [pivots.s3, pivots.s2, pivots.s1, pivots.pp, pivots.r1, pivots.r2, pivots.r3];
    const all = [...allPrices, ...pivotValues];
    if (buyZone) all.push(buyZone);
    if (sellZone) all.push(sellZone);
    if (aiLevels) aiLevels.forEach(l => all.push(l.price));
    const min = Math.min(...all) - 5;
    const max = Math.max(...all) + 5;
    return { minPrice: min, maxPrice: max, chartCandles: candles };
  }, [candles, pivots, buyZone, sellZone, aiLevels]);

  const chartWidth = 800;
  const chartHeight = 450;
  const padding = { top: 30, right: 90, bottom: 30, left: 10 };
  const innerW = chartWidth - padding.left - padding.right;
  const innerH = chartHeight - padding.top - padding.bottom;

  const yScale = (price: number) =>
    padding.top + innerH - ((price - minPrice) / (maxPrice - minPrice)) * innerH;

  const candleW = Math.max(3, (innerW / chartCandles.length) * 0.55);
  const gap = innerW / chartCandles.length;

  const pivotLines = [
    { label: 'R3', value: pivots.r3, color: 'hsl(348, 100%, 55%)' },
    { label: 'R2', value: pivots.r2, color: 'hsl(348, 80%, 50%)' },
    { label: 'R1', value: pivots.r1, color: 'hsl(348, 60%, 45%)' },
    { label: 'PP', value: pivots.pp, color: 'hsl(45, 100%, 55%)' },
    { label: 'S1', value: pivots.s1, color: 'hsl(145, 60%, 45%)' },
    { label: 'S2', value: pivots.s2, color: 'hsl(145, 80%, 50%)' },
    { label: 'S3', value: pivots.s3, color: 'hsl(145, 100%, 55%)' },
  ];

  // EMA path builders
  const ema9Path = ema9.map((v, i) => {
    const x = padding.left + gap * i + gap / 2;
    const y = yScale(v);
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  const ema21Path = ema21.map((v, i) => {
    const x = padding.left + gap * i + gap / 2;
    const y = yScale(v);
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto">
        <defs>
          <linearGradient id="chartBg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(220, 25%, 7%)" />
            <stop offset="100%" stopColor="hsl(220, 20%, 5%)" />
          </linearGradient>
        </defs>
        <rect width={chartWidth} height={chartHeight} fill="url(#chartBg)" rx="6" />

        {/* Grid lines */}
        {Array.from({ length: 8 }).map((_, i) => {
          const y = padding.top + (innerH / 7) * i;
          const price = maxPrice - ((maxPrice - minPrice) / 7) * i;
          return (
            <g key={`grid-${i}`}>
              <line x1={padding.left} y1={y} x2={chartWidth - padding.right} y2={y} stroke="hsl(220, 15%, 12%)" strokeWidth="0.5" />
              <text x={chartWidth - padding.right + 5} y={y + 4} fill="hsl(215, 15%, 35%)" fontSize="8" fontFamily="JetBrains Mono">{price.toFixed(2)}</text>
            </g>
          );
        })}

        {/* AI Validated S/R Zones */}
        {hasAI && aiLevels!.map((level, i) => {
          const y = yScale(level.price);
          if (y < padding.top || y > chartHeight - padding.bottom) return null;
          const isRes = level.type === 'resistance';
          const color = isRes ? 'hsl(348, 100%, 55%)' : 'hsl(145, 100%, 45%)';
          const isStrong = level.strength === 'Rất mạnh';
          const zoneH = isStrong ? 14 : 8;

          return (
            <g key={`ai-level-${i}`}>
              <rect x={padding.left} y={y - zoneH / 2} width={innerW} height={zoneH}
                fill={color} opacity={isStrong ? 0.1 : 0.05} />
              <line x1={padding.left} y1={y} x2={chartWidth - padding.right} y2={y}
                stroke={color} strokeWidth={isStrong ? 1.5 : 1} 
                strokeDasharray={isStrong ? "none" : "6 3"} opacity={isStrong ? 0.9 : 0.6} />
              <rect x={chartWidth - padding.right + 1} y={y - 9} width={84} height={18} rx="3"
                fill={color} opacity={0.2} stroke={color} strokeWidth="0.5" />
              <text x={chartWidth - padding.right + 5} y={y + 3} fill={color} fontSize="8"
                fontFamily="JetBrains Mono" fontWeight="700">
                AI {isRes ? '🔴' : '🟢'} {level.price.toFixed(2)}
              </text>
              {isStrong && (
                <text x={padding.left + 5} y={y - 3} fill={color} fontSize="7" fontFamily="JetBrains Mono" opacity={0.7}>
                  ★ {level.strength} {level.testCount ? `(${level.testCount}x)` : ''}
                </text>
              )}
            </g>
          );
        })}

        {/* Pivot lines */}
        {pivotLines.map(({ label, value, color }) => {
          const y = yScale(value);
          if (y < padding.top || y > chartHeight - padding.bottom) return null;
          const opacity = hasAI ? 0.15 : 0.5;
          const width = hasAI ? 0.5 : 0.8;
          return (
            <g key={label}>
              <line x1={padding.left} y1={y} x2={chartWidth - padding.right} y2={y}
                stroke={color} strokeWidth={width} strokeDasharray="4 4" opacity={opacity} />
              {!hasAI && (
                <g>
                  <rect x={chartWidth - padding.right + 1} y={y - 7} width={84} height={14} rx="2" fill={color} opacity={0.15} />
                  <text x={chartWidth - padding.right + 5} y={y + 3} fill={color} fontSize="8" fontFamily="JetBrains Mono" fontWeight="600">{label} {value.toFixed(2)}</text>
                </g>
              )}
            </g>
          );
        })}

        {/* AI Trend Lines */}
        {aiTrendLines && aiTrendLines.map((line, i) => {
          const startIdx = Math.max(0, Math.min(line.startIndex, chartCandles.length - 1));
          const endIdx = Math.max(0, Math.min(line.endIndex, chartCandles.length - 1));
          const x1 = padding.left + gap * startIdx + gap / 2;
          const x2 = padding.left + gap * endIdx + gap / 2;
          const y1 = yScale(line.startPrice);
          const y2 = yScale(line.endPrice);
          if (x1 < padding.left || x2 > chartWidth - padding.right) return null;
          const color = line.type === 'resistance' ? 'hsl(348, 90%, 60%)'
            : line.type === 'support' ? 'hsl(145, 90%, 50%)'
            : 'hsl(45, 100%, 55%)';
          return (
            <g key={`ai-trend-${i}`}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="4" opacity={0.1} />
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="2" opacity={0.85} />
              <circle cx={x1} cy={y1} r="3.5" fill={color} opacity={0.9} stroke="hsl(220,20%,8%)" strokeWidth="1" />
              <circle cx={x2} cy={y2} r="3.5" fill={color} opacity={0.9} stroke="hsl(220,20%,8%)" strokeWidth="1" />
              {line.label && (
                <text x={(x1 + x2) / 2} y={Math.min(y1, y2) - 6} fill={color} fontSize="7"
                  textAnchor="middle" fontFamily="JetBrains Mono" fontWeight="600" opacity={0.8}>
                  {line.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Static trend lines when no AI */}
        {(!aiTrendLines || aiTrendLines.length === 0) && trendLines.map((line, i) => {
          const x1 = padding.left + gap * line.startIndex + gap / 2;
          const x2 = padding.left + gap * Math.min(line.endIndex, chartCandles.length - 1) + gap / 2;
          const y1 = yScale(line.startPrice);
          const y2 = yScale(line.endPrice);
          if (x1 < padding.left || x2 > chartWidth - padding.right) return null;
          return (
            <g key={`trend-${i}`}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={line.color} strokeWidth="3" opacity={0.12} />
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={line.color} strokeWidth="1.2" opacity={0.6} />
              <circle cx={x1} cy={y1} r="2" fill={line.color} opacity={0.7} />
              <circle cx={x2} cy={y2} r="2" fill={line.color} opacity={0.7} />
            </g>
          );
        })}

        {/* EMA 9 - Cyan */}
        <path d={ema9Path} fill="none" stroke="hsl(187, 100%, 55%)" strokeWidth="1.2" opacity={0.7} />
        {/* EMA 21 - Yellow */}
        <path d={ema21Path} fill="none" stroke="hsl(45, 100%, 55%)" strokeWidth="1.2" opacity={0.7} />

        {/* Candles */}
        {chartCandles.map((c, i) => {
          const x = padding.left + gap * i + gap / 2;
          const isBull = c.close >= c.open;
          const bodyTop = yScale(Math.max(c.open, c.close));
          const bodyBottom = yScale(Math.min(c.open, c.close));
          const bodyH = Math.max(1, bodyBottom - bodyTop);

          return (
            <g key={i}>
              <line x1={x} y1={yScale(c.high)} x2={x} y2={yScale(c.low)}
                stroke={isBull ? 'hsl(145, 80%, 50%)' : 'hsl(348, 80%, 55%)'} strokeWidth="1" />
              <rect x={x - candleW / 2} y={bodyTop} width={candleW} height={bodyH}
                fill={isBull ? 'hsl(145, 80%, 50%)' : 'hsl(348, 80%, 55%)'}
                opacity={0.95} rx="0.5" />
            </g>
          );
        })}

        {/* Pattern Markers */}
        {patterns.map((p, idx) => {
          if (p.index < 0 || p.index >= chartCandles.length) return null;
          const candle = chartCandles[p.index];
          const x = padding.left + gap * p.index + gap / 2;
          const isBullish = p.type === 'bullish';
          const isNeutral = p.type === 'neutral';
          const markerY = isBullish ? yScale(candle.low) + 18 : yScale(candle.high) - 12;
          const labelY = isBullish ? markerY + 11 : markerY - 6;
          const color = isNeutral ? 'hsl(45, 100%, 55%)' : isBullish ? 'hsl(145, 100%, 50%)' : 'hsl(348, 100%, 55%)';

          return (
            <g key={`pattern-${idx}`}>
              <rect x={x - 25} y={labelY - 8} width={50} height={12} rx="3"
                fill={isNeutral ? 'hsl(45, 80%, 25%)' : isBullish ? 'hsl(145, 60%, 20%)' : 'hsl(348, 60%, 20%)'}
                opacity={0.9} stroke={color} strokeWidth="0.5" />
              <text x={x} y={labelY} fill={color} fontSize="6.5" textAnchor="middle"
                fontFamily="JetBrains Mono" fontWeight="600">{p.nameVi}</text>
              {isBullish ? (
                <line x1={x} y1={markerY - 2} x2={x} y2={yScale(candle.low) + 3} stroke={color} strokeWidth="0.8" strokeDasharray="2 1" />
              ) : (
                <line x1={x} y1={markerY + 4} x2={x} y2={yScale(candle.high) - 3} stroke={color} strokeWidth="0.8" strokeDasharray="2 1" />
              )}
              <circle cx={x} cy={isBullish ? yScale(candle.low) + 2 : yScale(candle.high) - 2} r="2.5" fill={color} />
            </g>
          );
        })}

        {/* Time labels */}
        {chartCandles.filter((_, i) => i % Math.ceil(chartCandles.length / 8) === 0).map((c, idx) => {
          const i = chartCandles.indexOf(c);
          const x = padding.left + gap * i + gap / 2;
          return (
            <text key={idx} x={x} y={chartHeight - 8} fill="hsl(215, 15%, 35%)" fontSize="8" textAnchor="middle" fontFamily="JetBrains Mono">{c.time}</text>
          );
        })}

        {/* Current price badge */}
        {chartCandles.length > 0 && (() => {
          const last = chartCandles[chartCandles.length - 1];
          const y = yScale(last.close);
          const isBull = last.close >= last.open;
          const col = isBull ? 'hsl(145, 80%, 50%)' : 'hsl(348, 80%, 55%)';
          return (
            <g>
              <line x1={padding.left} y1={y} x2={chartWidth - padding.right} y2={y} stroke={col} strokeWidth="0.8" opacity={0.4} strokeDasharray="2 2" />
              <rect x={chartWidth - padding.right + 1} y={y - 9} width={84} height={18} rx="3" fill={col} />
              <text x={chartWidth - padding.right + 43} y={y + 4} fill={isBull ? 'hsl(220, 20%, 7%)' : 'white'} fontSize="10" textAnchor="middle" fontFamily="JetBrains Mono" fontWeight="700">{last.close.toFixed(2)}</text>
            </g>
          );
        })()}

        {/* EMA Legend */}
        <g>
          <rect x={padding.left + 4} y={padding.top + 4} width={110} height={28} rx="4" fill="hsl(220,20%,8%)" opacity={0.85} />
          <line x1={padding.left + 10} y1={padding.top + 14} x2={padding.left + 22} y2={padding.top + 14} stroke="hsl(187, 100%, 55%)" strokeWidth="1.5" />
          <text x={padding.left + 25} y={padding.top + 17} fill="hsl(187, 100%, 55%)" fontSize="7" fontFamily="JetBrains Mono">EMA 9</text>
          <line x1={padding.left + 60} y1={padding.top + 14} x2={padding.left + 72} y2={padding.top + 14} stroke="hsl(45, 100%, 55%)" strokeWidth="1.5" />
          <text x={padding.left + 75} y={padding.top + 17} fill="hsl(45, 100%, 55%)" fontSize="7" fontFamily="JetBrains Mono">EMA 21</text>
          {hasAI && (
            <text x={padding.left + 14} y={padding.top + 27} fill="hsl(187, 100%, 55%)" fontSize="7" fontFamily="JetBrains Mono" fontWeight="700">
              🧠 AI Active
            </text>
          )}
        </g>
      </svg>
    </div>
  );
};

export default CandlestickChart;
