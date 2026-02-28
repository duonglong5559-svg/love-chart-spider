interface Props {
  bullPct: number;
  bearPct: number;
}

const SentimentBar = ({ bullPct, bearPct }: Props) => {
  return (
    <div className="flex items-center gap-3 text-xs font-mono">
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-bull animate-pulse" />
        <span className="text-bull font-bold">{bullPct}%</span>
        <span className="text-muted-foreground text-[10px]">Bull</span>
      </div>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden flex bg-secondary/50 relative">
        <div 
          className="h-full rounded-l-full transition-all duration-1000 ease-out relative overflow-hidden" 
          style={{ 
            width: `${bullPct}%`,
            background: 'linear-gradient(90deg, hsl(145, 100%, 35%), hsl(145, 100%, 50%))'
          }} 
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[tickerScroll_3s_linear_infinite]" />
        </div>
        <div 
          className="h-full rounded-r-full transition-all duration-1000 ease-out" 
          style={{ 
            width: `${bearPct}%`,
            background: 'linear-gradient(90deg, hsl(348, 100%, 50%), hsl(348, 100%, 60%))'
          }} 
        />
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground text-[10px]">Bear</span>
        <span className="text-bear font-bold">{bearPct}%</span>
        <span className="w-2 h-2 rounded-full bg-bear animate-pulse" />
      </div>
    </div>
  );
};

export default SentimentBar;
