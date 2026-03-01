import { useState, useMemo, useCallback } from 'react';
import { calculatePivots, detectPatterns, generateSignals, generateAlerts, calculateRSI, calculateMACD, generateTrendLines, getSentiment, getPivotAnalysis } from '@/lib/tradingData';
import { type AIAnalysis } from '@/components/trading/AISignalPanel';
import { useBinanceData } from '@/hooks/useBinanceData';
import { useMultiTimeframe } from '@/hooks/useMultiTimeframe';
import TradingViewChart from '@/components/trading/TradingViewChart';
import PriceTicker from '@/components/trading/PriceTicker';
import PivotTable from '@/components/trading/PivotTable';
import PatternPanel from '@/components/trading/PatternPanel';
import SignalPanel from '@/components/trading/SignalPanel';
import VolumeChart from '@/components/trading/VolumeChart';
import SentimentBar from '@/components/trading/SentimentBar';
import AlertCards from '@/components/trading/AlertCards';
import RSIChart from '@/components/trading/RSIChart';
import MACDChart from '@/components/trading/MACDChart';
import AIChatPanel from '@/components/trading/AIChatPanel';
import AISignalPanel from '@/components/trading/AISignalPanel';
import NewsPanel from '@/components/trading/NewsPanel';
import ConfluenceScoring from '@/components/trading/ConfluenceScoring';
import MultiTFPanel from '@/components/trading/MultiTFPanel';
import { Activity, Wifi, WifiOff, Loader2, TrendingUp, Target, BarChart3, Bot, Brain, Newspaper, Sparkles, Layers } from 'lucide-react';

const SYMBOLS = [
  { value: 'BTCUSDT', label: 'BTC', icon: '₿' },
  { value: 'ETHUSDT', label: 'ETH', icon: 'Ξ' },
  { value: 'PAXGUSDT', label: 'XAU', icon: '🥇' },
  { value: 'BNBUSDT', label: 'BNB', icon: '◆' },
  { value: 'SOLUSDT', label: 'SOL', icon: '◎' },
  { value: 'XRPUSDT', label: 'XRP', icon: '✕' },
  { value: 'DOGEUSDT', label: 'DOGE', icon: '🐕' },
];

type TabKey = 'signals' | 'analysis' | 'trends' | 'indicators' | 'news' | 'ai' | 'mtf';

const Index = () => {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [timeframe, setTimeframe] = useState('M5');
  const [activeTab, setActiveTab] = useState<TabKey>('signals');
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);

  const { candles, loading, error, connected, candleCloseCount } = useBinanceData(symbol, timeframe);
  const { analysis: multiTFAnalysis, loading: mtfLoading } = useMultiTimeframe(symbol, timeframe);

  const pivots = useMemo(() => candles.length > 0 ? calculatePivots(candles) : null, [candles]);
  const patterns = useMemo(() => detectPatterns(candles), [candles]);
  const signals = useMemo(() => pivots ? generateSignals(candles, pivots) : [], [candles, pivots]);
  const alerts = useMemo(() => pivots ? generateAlerts(candles, pivots, patterns) : [], [candles, pivots, patterns]);
  const rsiData = useMemo(() => calculateRSI(candles), [candles]);
  const macdData = useMemo(() => calculateMACD(candles), [candles]);
  const trendLines = useMemo(() => generateTrendLines(candles), [candles]);
  const sentiment = useMemo(() => getSentiment(candles), [candles]);
  const pivotAnalysis = useMemo(() => pivots && candles.length > 0 ? getPivotAnalysis(candles[candles.length - 1].close, pivots) : '', [candles, pivots]);

  const buyZone = pivots?.s1;
  const sellZone = pivots?.r1;

  const handleAIAnalysisUpdate = useCallback((analysis: AIAnalysis | null) => {
    setAiAnalysis(analysis);
  }, []);

  const timeframes = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1', '1M'];

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'signals', label: 'AI Signals', icon: <Brain className="w-3.5 h-3.5" /> },
    { key: 'analysis', label: 'Phân tích', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { key: 'mtf', label: 'Đa khung TG', icon: <Layers className="w-3.5 h-3.5" />, count: multiTFAnalysis?.timeframes?.length },
    { key: 'trends', label: 'Xu hướng', icon: <Target className="w-3.5 h-3.5" />, count: aiAnalysis?.aiTrendLines?.length || trendLines.length },
    { key: 'indicators', label: 'Chỉ báo', icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { key: 'news', label: 'Tin tức', icon: <Newspaper className="w-3.5 h-3.5" /> },
    { key: 'ai', label: 'Chat AI', icon: <Bot className="w-3.5 h-3.5" /> },
  ];

  const currentPrice = candles.length > 0 ? candles[candles.length - 1].close : 0;
  const prevPrice = candles.length > 1 ? candles[candles.length - 2].close : currentPrice;
  const priceChange = currentPrice - prevPrice;
  const priceChangePct = prevPrice > 0 ? (priceChange / prevPrice) * 100 : 0;
  const isBullish = priceChange >= 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar - Glass effect */}
      <header className="sticky top-0 z-50 border-b border-border/50 px-4 py-2.5 backdrop-blur-xl bg-background/80">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-primary/20 group-hover:shadow-[0_0_20px_hsl(187,100%,45%,0.3)] transition-all duration-500">
              <Activity className="w-4 h-4 text-primary" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Spider</span>
              <span className="text-sm font-bold text-foreground/80">Analysis</span>
              <Sparkles className="w-3 h-3 text-primary/50 animate-pulse" />
            </div>
          </div>

          {/* AI Bias indicator with glow */}
          {aiAnalysis?.marketStructure ? (
            <div className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all duration-500 ${
              aiAnalysis.marketStructure.bias === 'LONG' 
                ? 'bg-bull/10 text-bull border border-bull/20 shadow-[0_0_15px_hsl(145,100%,45%,0.15)]' 
                : aiAnalysis.marketStructure.bias === 'SHORT' 
                  ? 'bg-bear/10 text-bear border border-bear/20 shadow-[0_0_15px_hsl(348,100%,55%,0.15)]' 
                  : 'bg-secondary text-pivot border border-pivot/20'
            }`}>
              AI: {aiAnalysis.marketStructure.bias === 'LONG' ? '🟢 LONG' :
                aiAnalysis.marketStructure.bias === 'SHORT' ? '🔴 SHORT' : '⏳ NEUTRAL'}
            </div>
          ) : (
            <div className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all duration-500 ${
              isBullish
                ? 'bg-bull/10 text-bull border border-bull/20'
                : 'bg-bear/10 text-bear border border-bear/20'
            }`}>
              {isBullish ? '🟢 LONG' : '🔴 SHORT'}
            </div>
          )}

          {/* Price display */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card/80 border border-border/50">
            <span className="text-lg">{SYMBOLS.find(s => s.value === symbol)?.icon}</span>
            <span className="text-xs font-bold font-mono text-foreground">{SYMBOLS.find(s => s.value === symbol)?.label}/USDT</span>
            {candles.length > 0 && (
              <>
                <span className={`text-sm font-bold font-mono ${isBullish ? 'text-bull' : 'text-bear'}`}>
                  {currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className={`text-[10px] font-mono ${isBullish ? 'text-bull' : 'text-bear'}`}>
                  {isBullish ? '+' : ''}{priceChangePct.toFixed(2)}%
                </span>
              </>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {connected ? (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-bull/5 border border-bull/10">
                <Wifi className="w-3 h-3 text-bull" />
                <span className="w-1.5 h-1.5 rounded-full bg-bull animate-pulse" />
                <span className="text-[10px] text-bull font-mono font-bold">LIVE</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-bear/5 border border-bear/10">
                <WifiOff className="w-3 h-3 text-bear" />
                <span className="text-[10px] text-bear font-mono">OFFLINE</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Sentiment Bar */}
      {candles.length > 0 && (
        <div className="px-4 py-2 border-b border-border/50 bg-card/30">
          <SentimentBar bullPct={sentiment.bullPct} bearPct={sentiment.bearPct} />
        </div>
      )}

      {/* Timeframe + Symbol Selector */}
      <div className="px-4 py-2.5 border-b border-border/50 flex flex-wrap gap-2.5 bg-card/20">
        <div className="flex items-center gap-0.5 bg-card/80 border border-border/50 rounded-lg p-1 overflow-x-auto backdrop-blur-sm">
          {timeframes.map(tf => (
            <button key={tf} onClick={() => setTimeframe(tf)}
              className={`px-3 py-1.5 text-[11px] font-mono rounded-md transition-all duration-300 whitespace-nowrap ${
                tf === timeframe 
                  ? 'bg-primary text-primary-foreground shadow-[0_0_12px_hsl(187,100%,45%,0.3)] font-bold' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}>{tf}</button>
          ))}
        </div>
        <div className="flex items-center gap-0.5 bg-card/80 border border-border/50 rounded-lg p-1 overflow-x-auto backdrop-blur-sm">
          {SYMBOLS.map(s => (
            <button key={s.value} onClick={() => setSymbol(s.value)}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-mono rounded-md transition-all duration-300 whitespace-nowrap ${
                s.value === symbol 
                  ? 'bg-primary/20 text-primary border border-primary/30 font-bold' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}>
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-3 bg-bear/10 border border-bear/20 rounded-lg p-3 backdrop-blur-sm animate-fade-in">
          <p className="text-xs text-bear">{error}</p>
        </div>
      )}

      {loading && candles.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <div className="relative">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <div className="absolute inset-0 w-10 h-10 rounded-full bg-primary/10 animate-ping" />
          </div>
          <span className="text-sm text-muted-foreground font-mono">Đang tải dữ liệu từ Binance...</span>
        </div>
      ) : candles.length > 0 && pivots ? (
        <>
          {/* Ticker Banner */}
          <div className="px-4 py-2 border-b border-border/50 overflow-hidden relative bg-gradient-to-r from-card/50 via-transparent to-card/50">
            <div className="flex items-center gap-2">
              <span className="flex-shrink-0 px-2 py-0.5 rounded-md bg-primary/20 text-primary text-[10px] font-bold border border-primary/20">
                <span className="animate-pulse">●</span> LIVE
              </span>
              <div className="overflow-hidden flex-1">
                <p className="text-xs text-muted-foreground whitespace-nowrap animate-ticker">
                  <span className="font-mono text-foreground">📊 Giá: {currentPrice.toLocaleString()}</span>
                  {'  •  '}
                  <span className="text-pivot">{pivotAnalysis}</span>
                  {'  •  '}
                  <span className="text-bull">RSI: {rsiData[rsiData.length - 1]?.toFixed(1)}</span>
                  {'  •  '}
                  <span className={macdData.histogram[macdData.histogram.length - 1] >= 0 ? 'text-bull' : 'text-bear'}>
                    MACD: {macdData.histogram[macdData.histogram.length - 1]?.toFixed(2)}
                  </span>
                  {'  •  '}
                  {aiAnalysis && (
                    <>
                      <span className="text-primary font-bold">🧠 AI: {aiAnalysis.trend} ({aiAnalysis.trendStrength}/10)</span>
                      {'  •  '}
                    </>
                  )}
                  <span className="text-foreground">Sentiment: {sentiment.bullPct}% Bull / {sentiment.bearPct}% Bear</span>
                </p>
              </div>
            </div>
          </div>

          {/* TradingView Chart */}
          <div className="px-3 pt-3">
            <TradingViewChart
              candles={candles}
              pivots={pivots}
              buyZone={buyZone}
              sellZone={sellZone}
              aiLevels={aiAnalysis?.validatedLevels}
            />
          </div>

          {/* Bottom Tabs */}
          <div className="border-t border-border/50 mt-2">
            <div className="flex overflow-x-auto bg-card/30 backdrop-blur-sm">
              {tabs.map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`relative flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap transition-all duration-300 ${
                    activeTab === tab.key 
                      ? 'text-primary bg-card/60' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-card/30'
                  }`}>
                  {tab.icon}
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold ${
                      activeTab === tab.key ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'
                    }`}>{tab.count}</span>
                  )}
                  {activeTab === tab.key && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent" />
                  )}
                </button>
              ))}
            </div>

            <div className="p-4 max-h-[60vh] overflow-y-auto">
              <div className="animate-fade-in">
                {activeTab === 'signals' && (
                  <div className="space-y-3">
                    <ConfluenceScoring
                      candles={candles}
                      pivots={pivots}
                      patterns={patterns}
                      rsiValue={rsiData[rsiData.length - 1]}
                      macdValue={macdData.histogram[macdData.histogram.length - 1]}
                      sentiment={sentiment}
                      multiTF={multiTFAnalysis}
                    />
                    <AISignalPanel
                      candles={candles}
                      pivots={pivots}
                      patterns={patterns}
                      rsiValue={rsiData[rsiData.length - 1]}
                      macdValue={macdData.histogram[macdData.histogram.length - 1]}
                      symbol={symbol}
                      timeframe={timeframe}
                      sentiment={sentiment}
                      onAnalysisUpdate={handleAIAnalysisUpdate}
                      autoRefresh={true}
                      candleCloseCount={candleCloseCount}
                      multiTFData={multiTFAnalysis}
                    />
                  </div>
                )}

                {activeTab === 'analysis' && (
                  <div className="space-y-3">
                    <PriceTicker candles={candles} symbol={symbol} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <PivotTable pivots={pivots} currentPrice={candles[candles.length - 1]?.close ?? 0} />
                      <PatternPanel patterns={patterns} />
                    </div>
                  </div>
                )}

                {activeTab === 'mtf' && (
                  <MultiTFPanel analysis={multiTFAnalysis} loading={mtfLoading} />
                )}

                {activeTab === 'trends' && (
                  <div className="space-y-3">
                    <VolumeChart candles={candles} />
                    {aiAnalysis?.aiTrendLines && aiAnalysis.aiTrendLines.length > 0 ? (
                      <div className="bg-card/80 backdrop-blur-sm rounded-lg border border-border/50 p-4">
                        <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
                          <Brain className="w-3.5 h-3.5" />
                          ĐƯỜNG XU HƯỚNG AI ({aiAnalysis.aiTrendLines.length})
                        </h3>
                        <div className="space-y-2">
                          {aiAnalysis.aiTrendLines.map((line, i) => (
                            <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/30 text-xs border border-border/30 hover:bg-secondary/50 transition-all duration-300">
                              <div className="w-6 h-0.5 rounded" style={{
                                backgroundColor: line.type === 'resistance' ? 'hsl(348, 90%, 60%)' :
                                  line.type === 'support' ? 'hsl(145, 90%, 50%)' : 'hsl(45, 100%, 55%)'
                              }} />
                              <span className="text-foreground font-medium capitalize">{line.label || line.type}</span>
                              <span className="text-muted-foreground font-mono">
                                {line.startPrice.toFixed(2)} → {line.endPrice.toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-card/80 backdrop-blur-sm rounded-lg border border-border/50 p-4">
                        <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
                          <Target className="w-3.5 h-3.5" />
                          ĐƯỜNG XU HƯỚNG ({trendLines.length})
                        </h3>
                        <div className="space-y-2">
                          {trendLines.map((line, i) => (
                            <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/30 text-xs border border-border/30 hover:bg-secondary/50 transition-all duration-300">
                              <div className="w-6 h-0.5 rounded" style={{ backgroundColor: line.color }} />
                              <span className="text-foreground font-medium capitalize">{line.type}</span>
                              <span className="text-muted-foreground font-mono">
                                {line.startPrice.toFixed(2)} → {line.endPrice.toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'indicators' && (
                  <div className="space-y-3">
                    <RSIChart rsiData={rsiData} candles={candles} />
                    <MACDChart macd={macdData.macd} signal={macdData.signal} histogram={macdData.histogram} candles={candles} />
                    <VolumeChart candles={candles} />
                  </div>
                )}

                {activeTab === 'news' && (
                  <NewsPanel
                    symbol={symbol}
                    currentPrice={candles[candles.length - 1]?.close}
                    trend={aiAnalysis?.trend}
                  />
                )}

                {activeTab === 'ai' && (
                  <AIChatPanel
                    candles={candles}
                    pivots={pivots}
                    patterns={patterns}
                    rsiValue={rsiData[rsiData.length - 1]}
                    macdValue={macdData.histogram[macdData.histogram.length - 1]}
                    symbol={symbol}
                    timeframe={timeframe}
                  />
                )}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default Index;
