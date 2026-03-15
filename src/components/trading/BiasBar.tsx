import type { SignalDirection } from '@/engine/types';

interface Props {
  longPct: number;
  shortPct: number;
  direction: SignalDirection;
}

export default function BiasBar({ longPct, shortPct, direction }: Props) {
  return (
    <div className="flex items-center gap-3 text-xs font-mono">
      <div className="flex items-center gap-1.5 min-w-[60px]">
        <span className="text-bull font-bold text-sm">{longPct}%</span>
      </div>
      <div className="flex-1 h-2.5 rounded-full overflow-hidden flex relative bg-black/30">
        <div
          className="h-full transition-all duration-1000 ease-out relative overflow-hidden rounded-l-full"
          style={{
            width: `${longPct}%`,
            background: 'linear-gradient(90deg, #00c853, #00e676)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent animate-[tickerScroll_3s_linear_infinite]" />
        </div>
        <div
          className="h-full transition-all duration-1000 ease-out rounded-r-full"
          style={{
            width: `${shortPct}%`,
            background: 'linear-gradient(90deg, #ff1744, #ff5252)',
          }}
        />
        {direction !== 'neutral' && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-white/60 rounded"
            style={{ left: `${longPct}%` }}
          />
        )}
      </div>
      <div className="flex items-center gap-1.5 min-w-[60px] justify-end">
        <span className="text-bear font-bold text-sm">{shortPct}%</span>
      </div>
    </div>
  );
}
