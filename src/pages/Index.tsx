import { useState, useMemo, useCallback } from 'react';
import { useBinanceFutures } from '@/hooks/useBinanceFutures';
import PipelineChart from '@/components/trading/PipelineChart';
import BiasBar from '@/components/trading/BiasBar';
import TimeframeCards from '@/components/trading/TimeframeCards';
import SignalDisplay from '@/components/trading/SignalDisplay';
import MarketOverview from '@/components/trading/MarketOverview';
import NewsPanel from '@/components/trading/NewsPanel';
import {
  Activity, Wifi, WifiOff, Loader2, TrendingUp, Target, BarChart3,
  Newspaper, Sparkles, Layers, Shield, Zap, ChevronDown,
} from 'lucide-react';
import type { Candle as EngineCandle, PatternSignal, Trendline } from '@/engine/types';
import { getPipelineState } from '@/engine/pipeline';

const SYMBOLS = [
  { value: 'BTCUSDT', label: 'BTC', icon: '₿' },
  { value: 'ETHUSDT', label: 'ETH', icon: 'Ξ' },
  { value: 'BNBUSDT', label: 'BNB', icon: '◆' },
  { value: 'SOLUSDT', label: 'SOL', icon: '◎' },
  { value: 'XRPUSDT', label: 'XRP', icon: '✕' },
  { value: 'DOGEUSDT', label: 'DOGE', icon: '🐕' },
];

type TabKey = 'live' | 'analysis' | 'news';

const Index = () => {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [activeTab, setActiveTab] = useState<TabKey>('live');

  const {
    uiPayload,
    loading,
    error,
    connected,
    currentPrice,
    candleCloseCount,
    allCandles,
    activeTimeframe,
    setActiveTimeframe,
    endpointLabel,
  } = useBinanceFutures(symbol);

  const chartCandles: EngineCandle[] = useMemo(() => {
    return allCandles[activeTimeframe] || [];
  }, [allCandles, activeTimeframe]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const pipelineState = useMemo(() => getPipelineState(symbol), [symbol, uiPayload]);

  const activeAnalysis = useMemo(() => {
    if (!pipelineState) return null;
    return pipelineState.analyses.get(activeTimeframe) || null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipelineState, activeTimeframe, uiPayload]);

  const trendlines: Trendline[] = useMemo(() => {
    return activeAnalysis?.trendlines || [];
  }, [activeAnalysis]);

  const patterns: PatternSignal[] = useMemo(() => {
    return activeAnalysis?.patternSignals || [];
  }, [activeAnalysis]);

  const prevPrice = chartCandles.length > 1 ? chartCandles[chartCandles.length - 2].close : currentPrice;
  const priceChange = currentPrice - prevPrice;
  const priceChangePct = prevPrice > 0 ? (priceChange / prevPrice) * 100 : 0;
  const isBullish = priceChange >= 0;

  const symbolInfo = SYMBOLS.find(s => s.value === symbol);

  const globalBias = uiPayload?.globalBias || { long: 50, short: 50, direction: 'neutral' as const };
  const pivotLevels = uiPayload?.pivotLevels || { pp: 0, r1: 0, r2: 0, r3: 0, s1: 0, s2: 0, s3: 0 };
  const signalData = uiPayload?.signal || {
    summary: 'Đang khởi tạo pipeline phân tích...', status: 'IDLE' as const, direction: 'neutral' as const,
  };
  const structureState = uiPayload?.structureState || 'range';
  const tfData = uiPayload?.timeframes || {};

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'live', label: 'Tín hiệu Live', icon: <Zap className="w-3.5 h-3.5" /> },
    { key: 'analysis', label: 'Phân tích', icon: <Layers className="w-3.5 h-3.5" /> },
    { key: 'news', label: 'Tin tức', icon: <Newspaper className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="min-h-screen bg-[#0a0e14] text-white">
      {/* ─── Header ─── */}
      <header className="sticky top-0 z-50 border-b border-white/5 px-3 py-2 backdrop-blur-xl bg-[#0a0e14]/90">
        <div className="flex items-center gap-2.5">
          {/* Logo */}
          <div className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 flex items-center justify-center border border-cyan-500/15 group-hover:shadow-[0_0_15px_rgba(0,200,230,0.25)] transition-all duration-500">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold bg-gradient-to-r from-cyan-400 to-cyan-300 bg-clip-text text-transparent">Spider</span>
              <span className="text-xs font-bold text-white/60">Analysis</span>
            </div>
          </div>

          {/* Direction Badge */}
          <div className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide border transition-all duration-500 ${
            globalBias.direction === 'long'
              ? 'bg-green-500/10 text-green-400 border-green-500/20 shadow-[0_0_10px_rgba(0,230,118,0.1)]'
              : globalBias.direction === 'short'
                ? 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_10px_rgba(255,23,68,0.1)]'
                : 'bg-white/5 text-white/40 border-white/10'
          }`}>
            {globalBias.direction === 'long' ? 'Lệnh Chờ Long' :
             globalBias.direction === 'short' ? 'Lệnh Chờ Short' : 'Chờ tín hiệu'}
          </div>

          {/* Symbol + Price */}
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-[10px] font-mono text-white/40">{symbolInfo?.label}/USDT</span>
            {currentPrice > 0 && (
              <span className={`text-sm font-bold font-mono ${isBullish ? 'text-green-400' : 'text-red-400'}`}>
                {currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            )}
          </div>

          {/* Connection */}
          <div className="flex items-center gap-1">
            {connected ? (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-500/5 border border-green-500/10">
                <Wifi className="w-2.5 h-2.5 text-green-400" />
                <span className="w-1 h-1 rounded-full bg-green-400 animate-pulse" />
              </div>
            ) : (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-yellow-500/5 border border-yellow-500/10">
                <Activity className="w-2.5 h-2.5 text-yellow-400" />
                <span className="text-[8px] text-yellow-400 font-mono">POLL</span>
              </div>
            )}
            {endpointLabel && (
              <span className="text-[8px] text-white/20 font-mono">{endpointLabel}</span>
            )}
          </div>
        </div>
      </header>

      {/* ─── Bias Bar ─── */}
      <div className="px-3 py-2 border-b border-white/5 bg-[#0c1018]">
        <BiasBar longPct={globalBias.long} shortPct={globalBias.short} direction={globalBias.direction} />
      </div>

      {/* ─── Timeframe Cards ─── */}
      <div className="px-3 py-2 border-b border-white/5 bg-[#0b0f16]">
        <TimeframeCards
          timeframes={tfData}
          activeTimeframe={activeTimeframe}
          onTimeframeClick={setActiveTimeframe}
        />
      </div>

      {/* ─── Symbol Selector ─── */}
      <div className="px-3 py-1.5 border-b border-white/5 bg-[#0b0f16]">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {SYMBOLS.map(s => (
            <button
              key={s.value}
              onClick={() => setSymbol(s.value)}
              className={`flex items-center gap-1 px-2 py-1 text-[10px] font-mono rounded-md transition-all duration-300 whitespace-nowrap ${
                s.value === symbol
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold'
                  : 'text-white/30 hover:text-white/60 hover:bg-white/5'
              }`}
            >
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ─── Error ─── */}
      {error && (
        <div className="mx-3 mt-2 bg-red-500/10 border border-red-500/20 rounded-lg p-2.5">
          <p className="text-[11px] text-red-400">{error}</p>
        </div>
      )}

      {/* ─── Loading ─── */}
      {loading && chartCandles.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-80 gap-3">
          <div className="relative">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            <div className="absolute inset-0 w-8 h-8 rounded-full bg-cyan-400/10 animate-ping" />
          </div>
          <span className="text-xs text-white/30 font-mono">Đang tải từ Binance Futures...</span>
          <span className="text-[10px] text-white/20 font-mono">Phân tích {Object.keys(allCandles).length}/9 khung thời gian</span>
        </div>
      ) : (
        <>
          {/* ─── Chart ─── */}
          <div className="px-2 pt-2">
            <PipelineChart
              candles={chartCandles}
              pivots={pivotLevels}
              entryLong={signalData.entryLong}
              entryShort={signalData.entryShort}
              target={signalData.target}
              stopLoss={signalData.stopLoss}
              trendlines={trendlines}
              patterns={patterns}
            />
          </div>

          {/* ─── Live Ticker ─── */}
          <div className="px-3 py-1.5 border-t border-white/5 overflow-hidden">
            <div className="flex items-center gap-2">
              <span className="flex-shrink-0 px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 text-[9px] font-bold border border-cyan-500/10">
                <span className="animate-pulse">●</span> LIVE
              </span>
              <div className="overflow-hidden flex-1">
                <p className="text-[10px] text-white/30 whitespace-nowrap animate-ticker font-mono">
                  {signalData.summary}
                  {'  •  '}
                  <span className="text-cyan-400/60">Đường xu hướng ({uiPayload?.trendlineCount || 0})</span>
                  {'  •  '}
                  <span className="text-white/40">Cấu trúc: {structureState}</span>
                </p>
              </div>
            </div>
          </div>

          {/* ─── Tabs ─── */}
          <div className="border-t border-white/5">
            <div className="flex bg-[#0b0f16]">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative flex items-center gap-1.5 px-4 py-2.5 text-[11px] font-medium whitespace-nowrap transition-all duration-300 ${
                    activeTab === tab.key
                      ? 'text-cyan-400 bg-white/[0.02]'
                      : 'text-white/25 hover:text-white/50 hover:bg-white/[0.01]'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  {activeTab === tab.key && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
                  )}
                </button>
              ))}
            </div>

            <div className="p-3 max-h-[55vh] overflow-y-auto">
              {activeTab === 'live' && (
                <div className="space-y-3 animate-fade-in">
                  <SignalDisplay
                    signal={signalData}
                    structureState={structureState}
                    patterns={uiPayload?.patterns || []}
                    currentPrice={currentPrice}
                  />

                  {/* Market Overview with price levels */}
                  <MarketOverview
                    currentPrice={currentPrice}
                    pivots={pivotLevels}
                    direction={globalBias.direction}
                    entryLong={signalData.entryLong}
                    entryShort={signalData.entryShort}
                    target={signalData.target}
                    stopLoss={signalData.stopLoss}
                  />

                  {/* Pivot Table Mini */}
                  {pivotLevels.pp > 0 && (
                    <div className="bg-white/[0.02] border border-white/5 rounded-lg p-3">
                      <h3 className="text-[10px] font-bold text-cyan-400/60 mb-2 flex items-center gap-1.5">
                        <Target className="w-3 h-3" /> PIVOT LEVELS
                      </h3>
                      <div className="grid grid-cols-7 gap-1.5 text-center">
                        {[
                          { label: 'S3', value: pivotLevels.s3, color: 'text-green-400/60' },
                          { label: 'S2', value: pivotLevels.s2, color: 'text-green-400/70' },
                          { label: 'S1', value: pivotLevels.s1, color: 'text-green-400' },
                          { label: 'PP', value: pivotLevels.pp, color: 'text-yellow-400' },
                          { label: 'R1', value: pivotLevels.r1, color: 'text-red-400' },
                          { label: 'R2', value: pivotLevels.r2, color: 'text-red-400/70' },
                          { label: 'R3', value: pivotLevels.r3, color: 'text-red-400/60' },
                        ].map(({ label, value, color }) => (
                          <div key={label} className="py-1 px-0.5 rounded bg-white/[0.02]">
                            <p className="text-[8px] text-white/20 mb-0.5">{label}</p>
                            <p className={`text-[9px] font-mono font-bold ${color}`}>
                              {value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Active Trendlines */}
                  {trendlines.length > 0 && (
                    <div className="bg-white/[0.02] border border-white/5 rounded-lg p-3">
                      <h3 className="text-[10px] font-bold text-cyan-400/60 mb-2 flex items-center gap-1.5">
                        <TrendingUp className="w-3 h-3" /> ĐƯỜNG XU HƯỚNG ({trendlines.filter(t => t.isActive).length})
                      </h3>
                      <div className="space-y-1">
                        {trendlines.filter(t => t.isActive).slice(0, 5).map((tl, i) => (
                          <div key={i} className="flex items-center gap-2 py-1 px-2 rounded bg-white/[0.02] text-[10px]">
                            <div className={`w-4 h-0.5 rounded ${
                              tl.state === 'active_support' ? 'bg-green-400' :
                              tl.state === 'active_resistance' ? 'bg-red-400' : 'bg-yellow-400'
                            }`} />
                            <span className="text-white/50 capitalize font-mono">{tl.kind}</span>
                            <span className="text-white/30 font-mono">
                              {tl.y1.toFixed(2)} → {tl.y2.toFixed(2)}
                            </span>
                            <span className="text-cyan-400/50 font-mono ml-auto">{tl.touches}x</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'analysis' && (
                <div className="space-y-3 animate-fade-in">
                  {/* Per-Timeframe Detail */}
                  {Object.entries(tfData).map(([tf, data]) => (
                    <div key={tf} className="bg-white/[0.02] border border-white/5 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold font-mono text-white/70">{tf.toUpperCase()}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-bold ${
                            data.state === 'bullish' ? 'text-green-400' :
                            data.state === 'bearish' ? 'text-red-400' : 'text-yellow-400'
                          }`}>
                            {data.state.toUpperCase()}
                          </span>
                          <div className="w-12 h-1.5 rounded-full overflow-hidden flex bg-white/5">
                            <div className="h-full bg-green-400/60 rounded-l-full" style={{ width: `${data.long}%` }} />
                            <div className="h-full bg-red-400/60 rounded-r-full" style={{ width: `${data.short}%` }} />
                          </div>
                          <span className="text-[9px] font-mono text-white/30">
                            {data.long}/{data.short}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {Object.keys(tfData).length === 0 && (
                    <div className="text-center py-8">
                      <Layers className="w-6 h-6 text-white/10 mx-auto mb-2" />
                      <p className="text-[11px] text-white/20 font-mono">Đang phân tích các khung thời gian...</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'news' && (
                <NewsPanel
                  symbol={symbol}
                  currentPrice={currentPrice}
                  trend={globalBias.direction === 'long' ? 'UPTREND' : globalBias.direction === 'short' ? 'DOWNTREND' : 'SIDEWAYS'}
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Index;
