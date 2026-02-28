import { Candle } from '@/lib/tradingData';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface Props {
  candles: Candle[];
  symbol: string;
}

const PriceTicker = ({ candles, symbol }: Props) => {
  if (candles.length < 2) return null;
  
  const current = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  const change = current.close - prev.close;
  const changePct = (change / prev.close) * 100;
  const isBull = change >= 0;

  return (
    <div className="flex items-center gap-6 bg-card rounded-lg border border-border p-4">
      <div className="flex items-center gap-3">
        <Activity className="w-5 h-5 text-primary" />
        <div>
          <span className="text-xs text-muted-foreground">Symbol</span>
          <p className="text-lg font-bold font-mono text-primary">{symbol}</p>
        </div>
      </div>
      
      <div className="h-10 w-px bg-border" />
      
      <div>
        <span className="text-xs text-muted-foreground">Giá hiện tại</span>
        <p className={`text-2xl font-bold font-mono animate-ticker ${isBull ? 'text-bull' : 'text-bear'}`}>
          {current.close.toFixed(2)}
        </p>
      </div>
      
      <div className={`flex items-center gap-1 px-3 py-1.5 rounded-md ${
        isBull ? 'bg-bull-muted' : 'bg-bear-muted'
      }`}>
        {isBull ? <TrendingUp className="w-4 h-4 text-bull" /> : <TrendingDown className="w-4 h-4 text-bear" />}
        <span className={`text-sm font-mono font-semibold ${isBull ? 'text-bull' : 'text-bear'}`}>
          {isBull ? '+' : ''}{change.toFixed(2)} ({changePct.toFixed(2)}%)
        </span>
      </div>

      <div className="ml-auto flex gap-6 text-xs">
        <div>
          <span className="text-muted-foreground">Mở</span>
          <p className="font-mono text-foreground">{current.open.toFixed(2)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Cao</span>
          <p className="font-mono text-bull">{current.high.toFixed(2)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Thấp</span>
          <p className="font-mono text-bear">{current.low.toFixed(2)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">KL</span>
          <p className="font-mono text-foreground">{(current.volume / 1000).toFixed(0)}K</p>
        </div>
      </div>
    </div>
  );
};

export default PriceTicker;
