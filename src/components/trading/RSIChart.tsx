import { Candle } from '@/lib/tradingData';

interface Props {
  rsiData: number[];
  candles: Candle[];
}

const RSIChart = ({ rsiData, candles }: Props) => {
  const width = 800;
  const height = 100;
  const padding = { left: 10, right: 80, top: 5, bottom: 5 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const gap = innerW / rsiData.length;
  
  const yScale = (val: number) => padding.top + innerH - (val / 100) * innerH;

  const pathD = rsiData
    .map((val, i) => `${i === 0 ? 'M' : 'L'} ${padding.left + gap * i + gap / 2} ${yScale(val)}`)
    .join(' ');

  const lastRSI = rsiData[rsiData.length - 1];
  const rsiColor = lastRSI > 70 ? 'hsl(348, 100%, 55%)' : lastRSI < 30 ? 'hsl(145, 100%, 45%)' : 'hsl(187, 100%, 45%)';

  return (
    <div className="bg-card rounded-lg border border-border p-3">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-xs font-semibold text-primary">RSI (14)</h3>
        <span className="text-xs font-mono" style={{ color: rsiColor }}>{lastRSI}</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        <rect width={width} height={height} fill="hsl(220, 20%, 8%)" rx="4" />
        
        {/* Overbought/Oversold zones */}
        <rect x={padding.left} y={yScale(70)} width={innerW} height={yScale(30) - yScale(70)} fill="hsl(187, 100%, 45%)" opacity="0.05" />
        
        <line x1={padding.left} y1={yScale(70)} x2={width - padding.right} y2={yScale(70)} stroke="hsl(348, 50%, 40%)" strokeWidth="0.5" strokeDasharray="3 3" />
        <line x1={padding.left} y1={yScale(30)} x2={width - padding.right} y2={yScale(30)} stroke="hsl(145, 50%, 40%)" strokeWidth="0.5" strokeDasharray="3 3" />
        <line x1={padding.left} y1={yScale(50)} x2={width - padding.right} y2={yScale(50)} stroke="hsl(220, 15%, 20%)" strokeWidth="0.5" />

        {/* RSI Labels */}
        <text x={width - padding.right + 5} y={yScale(70) + 3} fill="hsl(348, 50%, 50%)" fontSize="8" fontFamily="JetBrains Mono">70</text>
        <text x={width - padding.right + 5} y={yScale(30) + 3} fill="hsl(145, 50%, 50%)" fontSize="8" fontFamily="JetBrains Mono">30</text>

        <path d={pathD} fill="none" stroke={rsiColor} strokeWidth="1.5" />
      </svg>
    </div>
  );
};

export default RSIChart;
