import { CandlePattern } from '@/lib/tradingData';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Props {
  patterns: CandlePattern[];
}

const PatternPanel = ({ patterns }: Props) => {
  const getIcon = (type: string) => {
    if (type === 'bullish') return <TrendingUp className="w-3.5 h-3.5 text-bull" />;
    if (type === 'bearish') return <TrendingDown className="w-3.5 h-3.5 text-bear" />;
    return <Minus className="w-3.5 h-3.5 text-pivot" />;
  };

  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-primary" />
        MẪU HÌNH NẾN
      </h3>
      {patterns.length === 0 ? (
        <p className="text-xs text-muted-foreground">Đang quét mẫu hình...</p>
      ) : (
        <div className="space-y-2">
          {patterns.map((p, i) => (
            <div key={i} className="flex items-start gap-2 p-2 rounded bg-secondary/50 animate-ticker">
              {getIcon(p.type)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground">{p.nameVi}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">({p.name})</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{p.description}</p>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                p.type === 'bullish' ? 'bg-bull-muted text-bull' :
                p.type === 'bearish' ? 'bg-bear-muted text-bear' :
                'bg-secondary text-pivot'
              }`}>
                {p.type === 'bullish' ? 'TĂNG' : p.type === 'bearish' ? 'GIẢM' : 'TRUNG LẬP'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PatternPanel;
