interface Props {
  bullPct: number;
  bearPct: number;
}

const SentimentBar = ({ bullPct, bearPct }: Props) => {
  return (
    <div className="flex items-center gap-2 text-xs font-mono">
      <span className="text-bull font-bold">{bullPct}%</span>
      <div className="flex-1 h-2 rounded-full overflow-hidden flex bg-secondary">
        <div 
          className="h-full bg-bull rounded-l-full transition-all duration-700" 
          style={{ width: `${bullPct}%` }} 
        />
        <div 
          className="h-full bg-bear rounded-r-full transition-all duration-700" 
          style={{ width: `${bearPct}%` }} 
        />
      </div>
      <span className="text-bear font-bold">{bearPct}%</span>
    </div>
  );
};

export default SentimentBar;
