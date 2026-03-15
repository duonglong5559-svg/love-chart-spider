import type { PivotLevels, SignalDirection } from '@/engine/types';

interface Props {
  currentPrice: number;
  pivots: PivotLevels;
  direction: SignalDirection;
  entryLong?: number;
  entryShort?: number;
  target?: number;
  stopLoss?: number;
}

function fmt(v: number): string {
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function MarketOverview({
  currentPrice, pivots, direction, entryLong, entryShort, target, stopLoss,
}: Props) {
  if (currentPrice <= 0) return null;

  const isLong = direction === 'long';
  const isShort = direction === 'short';

  const levels = [
    pivots.r3 > 0 && { label: 'R3', price: pivots.r3, color: 'bg-red-500/80' },
    pivots.r2 > 0 && { label: 'R2', price: pivots.r2, color: 'bg-red-500/60' },
    pivots.r1 > 0 && { label: 'R1', price: pivots.r1, color: 'bg-red-400/70' },
    target && { label: 'Target', price: target, color: 'bg-yellow-400/80' },
    entryShort && { label: 'Sell', price: entryShort, color: 'bg-red-500' },
    pivots.pp > 0 && { label: 'PP', price: pivots.pp, color: 'bg-yellow-500/80' },
    entryLong && { label: 'Buy', price: entryLong, color: 'bg-green-500' },
    pivots.s1 > 0 && { label: 'S1', price: pivots.s1, color: 'bg-green-400/70' },
    stopLoss && { label: 'SL', price: stopLoss, color: 'bg-red-600/80' },
    pivots.s2 > 0 && { label: 'S2', price: pivots.s2, color: 'bg-green-500/60' },
    pivots.s3 > 0 && { label: 'S3', price: pivots.s3, color: 'bg-green-500/80' },
  ].filter(Boolean) as { label: string; price: number; color: string }[];

  levels.sort((a, b) => b.price - a.price);

  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-lg p-3">
      <h3 className="text-[10px] font-bold text-cyan-400/60 mb-2">MỨC GIÁ QUAN TRỌNG</h3>
      <div className="space-y-0.5">
        {levels.map((level, i) => {
          const isCurrentPrice = Math.abs(level.price - currentPrice) / currentPrice < 0.001;
          const isAbovePrice = level.price > currentPrice;

          return (
            <div
              key={`${level.label}-${i}`}
              className={`flex items-center justify-between px-2 py-1 rounded text-[10px] font-mono transition-all ${
                isCurrentPrice ? 'bg-cyan-500/10 border border-cyan-500/20' :
                level.label === 'Buy' ? 'bg-green-500/5' :
                level.label === 'Sell' ? 'bg-red-500/5' :
                'bg-transparent'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-sm ${level.color}`} />
                <span className={`font-bold ${
                  level.label === 'Buy' ? 'text-green-400' :
                  level.label === 'Sell' ? 'text-red-400' :
                  level.label === 'Target' ? 'text-yellow-400' :
                  level.label === 'SL' ? 'text-red-400' :
                  level.label === 'PP' ? 'text-yellow-400' :
                  isAbovePrice ? 'text-red-400/60' : 'text-green-400/60'
                }`}>
                  {level.label}
                </span>
              </div>
              <span className={`font-bold ${
                isCurrentPrice ? 'text-cyan-400 neon-text-cyan' : 'text-white/40'
              }`}>
                {fmt(level.price)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
