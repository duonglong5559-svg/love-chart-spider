import { Signal } from '@/lib/tradingData';
import { ArrowUpCircle, ArrowDownCircle, Zap } from 'lucide-react';

interface Props {
  signals: Signal[];
}

const SignalPanel = ({ signals }: Props) => {
  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
        <Zap className="w-3.5 h-3.5" />
        TÍN HIỆU VÀO/RA
      </h3>
      {signals.length === 0 ? (
        <p className="text-xs text-muted-foreground">Chờ tín hiệu...</p>
      ) : (
        <div className="space-y-2">
          {signals.map((s, i) => (
            <div key={i} className={`flex items-start gap-2 p-2.5 rounded border animate-ticker ${
              s.type === 'BUY' ? 'border-bull/30 bg-bull-muted/30' : 'border-bear/30 bg-bear-muted/30'
            }`}>
              {s.type === 'BUY' ? (
                <ArrowUpCircle className="w-5 h-5 text-bull shrink-0 mt-0.5" />
              ) : (
                <ArrowDownCircle className="w-5 h-5 text-bear shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-xs font-bold ${s.type === 'BUY' ? 'text-bull' : 'text-bear'}`}>
                    {s.type === 'BUY' ? 'MUA' : 'BÁN'}
                  </span>
                  <span className="text-xs font-mono text-foreground">{s.price.toFixed(2)}</span>
                  <span className="text-[10px] text-muted-foreground">{s.time}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">{s.reason}</p>
                <div className="flex gap-0.5 mt-1">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <div key={j} className={`w-3 h-1 rounded-full ${
                      j < s.strength
                        ? s.type === 'BUY' ? 'bg-bull' : 'bg-bear'
                        : 'bg-secondary'
                    }`} />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SignalPanel;
