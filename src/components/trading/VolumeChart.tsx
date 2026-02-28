import { Candle } from '@/lib/tradingData';

interface Props {
  candles: Candle[];
}

const VolumeChart = ({ candles }: Props) => {
  const maxVol = Math.max(...candles.map(c => c.volume));

  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <h3 className="text-sm font-semibold text-primary mb-3">KHỐI LƯỢNG</h3>
      <div className="flex items-end gap-[2px] h-20">
        {candles.map((c, i) => {
          const h = (c.volume / maxVol) * 100;
          const isBull = c.close >= c.open;
          return (
            <div
              key={i}
              className={`flex-1 rounded-t-sm transition-all ${isBull ? 'bg-bull/40' : 'bg-bear/40'}`}
              style={{ height: `${h}%` }}
            />
          );
        })}
      </div>
    </div>
  );
};

export default VolumeChart;
