import { PivotLevels } from '@/lib/tradingData';

interface Props {
  pivots: PivotLevels;
  currentPrice: number;
}

const PivotTable = ({ pivots, currentPrice }: Props) => {
  const levels = [
    { label: 'R3', value: pivots.r3, type: 'resistance' as const },
    { label: 'R2', value: pivots.r2, type: 'resistance' as const },
    { label: 'R1', value: pivots.r1, type: 'resistance' as const },
    { label: 'PP', value: pivots.pp, type: 'pivot' as const },
    { label: 'S1', value: pivots.s1, type: 'support' as const },
    { label: 'S2', value: pivots.s2, type: 'support' as const },
    { label: 'S3', value: pivots.s3, type: 'support' as const },
  ];

  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-pivot" />
        PIVOT POINTS
      </h3>
      <div className="space-y-1.5">
        {levels.map(({ label, value, type }) => {
          const distance = ((value - currentPrice) / currentPrice * 100).toFixed(2);
          const isNear = Math.abs(value - currentPrice) < 5;
          
          return (
            <div
              key={label}
              className={`flex items-center justify-between py-1.5 px-2 rounded text-xs font-mono transition-colors ${
                isNear ? 'bg-secondary' : ''
              }`}
            >
              <span className={`font-semibold ${
                type === 'resistance' ? 'text-bear' : type === 'support' ? 'text-bull' : 'text-pivot'
              }`}>
                {label}
              </span>
              <span className="text-foreground">{value.toFixed(2)}</span>
              <span className={`text-[10px] ${
                parseFloat(distance) > 0 ? 'text-bear' : 'text-bull'
              }`}>
                {parseFloat(distance) > 0 ? '+' : ''}{distance}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PivotTable;
