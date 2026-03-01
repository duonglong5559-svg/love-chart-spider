import { type MultiTFAnalysis } from '@/hooks/useMultiTimeframe';
import { TrendingUp, TrendingDown, Minus, Loader2, Layers } from 'lucide-react';

interface Props {
  analysis: MultiTFAnalysis | null;
  loading: boolean;
}

export default function MultiTFPanel({ analysis, loading }: Props) {
  if (loading && !analysis) {
    return (
      <div className="bg-card rounded-lg border border-border p-4 text-center">
        <Loader2 className="w-5 h-5 text-primary animate-spin mx-auto mb-2" />
        <p className="text-[10px] text-muted-foreground">Đang tải dữ liệu đa khung thời gian...</p>
      </div>
    );
  }

  if (!analysis || analysis.timeframes.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-4 text-center">
        <Layers className="w-5 h-5 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-[10px] text-muted-foreground">Không có dữ liệu khung thời gian cao hơn</p>
      </div>
    );
  }

  const TrendIcon = ({ trend }: { trend: string }) => {
    if (trend === 'UP') return <TrendingUp className="w-3.5 h-3.5 text-bull" />;
    if (trend === 'DOWN') return <TrendingDown className="w-3.5 h-3.5 text-bear" />;
    return <Minus className="w-3.5 h-3.5 text-pivot" />;
  };

  return (
    <div className="bg-card rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-primary flex items-center gap-1.5">
          <Layers className="w-4 h-4" />
          ĐA KHUNG THỜI GIAN
        </h3>
        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
          analysis.overallBias === 'LONG' ? 'bg-bull/20 text-bull' :
          analysis.overallBias === 'SHORT' ? 'bg-bear/20 text-bear' :
          'bg-pivot/20 text-pivot'
        }`}>
          HTF: {analysis.overallBias} ({analysis.confluenceScore}%)
        </span>
      </div>

      <div className="space-y-2">
        {analysis.timeframes.map((tf, i) => (
          <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/30 border border-border/30">
            <span className="text-[10px] font-mono font-bold text-foreground w-8">{tf.timeframe}</span>
            <TrendIcon trend={tf.trend} />
            <span className={`text-[10px] font-bold ${
              tf.trend === 'UP' ? 'text-bull' : tf.trend === 'DOWN' ? 'text-bear' : 'text-pivot'
            }`}>
              {tf.trend}
            </span>
            <div className="flex-1 flex items-center gap-2">
              <span className="text-[9px] text-muted-foreground font-mono">RSI:{tf.rsi.toFixed(0)}</span>
              <span className={`text-[9px] font-mono ${tf.macdHistogram >= 0 ? 'text-bull' : 'text-bear'}`}>
                MACD:{tf.macdHistogram.toFixed(1)}
              </span>
            </div>
            {/* Mini sentiment bar */}
            <div className="w-16 flex h-1.5 rounded-full overflow-hidden bg-secondary/50">
              <div className="h-full bg-bull/60" style={{ width: `${tf.bullPct}%` }} />
              <div className="h-full bg-bear/60" style={{ width: `${100 - tf.bullPct}%` }} />
            </div>
            <span className="text-[9px] text-muted-foreground font-mono w-8 text-right">{tf.bullPct}%</span>
          </div>
        ))}
      </div>

      {analysis.timeframes.some(tf => tf.patterns.length > 0) && (
        <div className="pt-1">
          <p className="text-[9px] text-muted-foreground mb-1">Patterns HTF:</p>
          <div className="flex flex-wrap gap-1">
            {analysis.timeframes.flatMap(tf => 
              tf.patterns.slice(0, 2).map((p, i) => (
                <span key={`${tf.timeframe}-${i}`} className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[8px]">
                  {tf.timeframe}: {p}
                </span>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
