import type { TrendBias } from '@/engine/types';

interface TimeframeData {
  long: number;
  short: number;
  state: TrendBias;
  price: number;
}

interface Props {
  timeframes: Record<string, TimeframeData>;
  activeTimeframe: string;
  onTimeframeClick: (tf: string) => void;
}

const TF_DISPLAY: Record<string, string> = {
  '15m': '15M',
  '1h': '1H',
  '2h': '2H',
  '4h': '4H',
  '6h': '6H',
  '8h': '8H',
  '12h': '12H',
  '1d': '1D',
  '1w': '1W',
};

export default function TimeframeCards({ timeframes, activeTimeframe, onTimeframeClick }: Props) {
  const tfKeys = Object.keys(TF_DISPLAY);

  return (
    <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
      {tfKeys.map(tf => {
        const data = timeframes[tf];
        const isActive = tf === activeTimeframe;
        const isBullish = data && data.long > data.short;
        const isBearish = data && data.short > data.long;

        const bgClass = !data
          ? 'bg-card/40 border-border/30'
          : isBullish
            ? 'bg-bull/5 border-bull/20'
            : isBearish
              ? 'bg-bear/5 border-bear/20'
              : 'bg-pivot/5 border-pivot/20';

        const textClass = !data
          ? 'text-muted-foreground'
          : isBullish ? 'text-bull' : isBearish ? 'text-bear' : 'text-pivot';

        return (
          <button
            key={tf}
            onClick={() => onTimeframeClick(tf)}
            className={`flex-shrink-0 flex flex-col items-center px-2.5 py-1.5 rounded-lg border transition-all duration-300 ${bgClass} ${
              isActive ? 'ring-1 ring-primary shadow-[0_0_8px_hsl(187,100%,45%,0.2)]' : ''
            }`}
          >
            <span className={`text-[10px] font-bold font-mono ${isActive ? 'text-primary' : 'text-foreground/70'}`}>
              {TF_DISPLAY[tf]}
            </span>
            {data ? (
              <>
                <span className={`text-[9px] font-mono font-bold ${textClass}`}>
                  {data.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <div className="w-8 h-1 rounded-full overflow-hidden flex mt-0.5 bg-black/20">
                  <div
                    className="h-full rounded-l-full"
                    style={{
                      width: `${data.long}%`,
                      backgroundColor: isBullish ? '#00e676' : '#666',
                    }}
                  />
                  <div
                    className="h-full rounded-r-full"
                    style={{
                      width: `${data.short}%`,
                      backgroundColor: isBearish ? '#ff5252' : '#666',
                    }}
                  />
                </div>
              </>
            ) : (
              <span className="text-[8px] text-muted-foreground mt-0.5">---</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
