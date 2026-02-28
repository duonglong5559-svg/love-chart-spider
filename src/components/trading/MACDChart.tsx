import { Candle } from '@/lib/tradingData';

interface Props {
  macd: number[];
  signal: number[];
  histogram: number[];
  candles: Candle[];
}

const MACDChart = ({ macd, signal, histogram }: Props) => {
  const width = 800;
  const height = 100;
  const padding = { left: 10, right: 80, top: 5, bottom: 5 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const allVals = [...macd, ...signal, ...histogram];
  const maxVal = Math.max(...allVals.map(Math.abs), 0.001);

  const gap = innerW / macd.length;
  const yScale = (val: number) => padding.top + innerH / 2 - (val / maxVal) * (innerH / 2);

  const macdPath = macd.map((v, i) => `${i === 0 ? 'M' : 'L'} ${padding.left + gap * i + gap / 2} ${yScale(v)}`).join(' ');
  const signalPath = signal.map((v, i) => `${i === 0 ? 'M' : 'L'} ${padding.left + gap * i + gap / 2} ${yScale(v)}`).join(' ');

  const lastMACD = macd[macd.length - 1];
  const lastSignal = signal[signal.length - 1];

  return (
    <div className="bg-card rounded-lg border border-border p-3">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-xs font-semibold text-primary">MACD (12, 26, 9)</h3>
        <div className="flex gap-3 text-[10px] font-mono">
          <span className="text-primary">MACD: {lastMACD?.toFixed(2)}</span>
          <span className="text-pivot">Signal: {lastSignal?.toFixed(2)}</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        <rect width={width} height={height} fill="hsl(220, 20%, 8%)" rx="4" />
        
        {/* Zero line */}
        <line x1={padding.left} y1={yScale(0)} x2={width - padding.right} y2={yScale(0)} stroke="hsl(220, 15%, 20%)" strokeWidth="0.5" />

        {/* Histogram */}
        {histogram.map((val, i) => {
          const x = padding.left + gap * i + gap / 2 - gap * 0.3;
          const barH = Math.abs(yScale(val) - yScale(0));
          const y = val >= 0 ? yScale(val) : yScale(0);
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={gap * 0.6}
              height={barH}
              fill={val >= 0 ? 'hsl(145, 100%, 45%)' : 'hsl(348, 100%, 55%)'}
              opacity={0.4}
              rx="1"
            />
          );
        })}

        {/* MACD Line */}
        <path d={macdPath} fill="none" stroke="hsl(187, 100%, 45%)" strokeWidth="1.5" />
        {/* Signal Line */}
        <path d={signalPath} fill="none" stroke="hsl(45, 100%, 55%)" strokeWidth="1" />
      </svg>
    </div>
  );
};

export default MACDChart;
