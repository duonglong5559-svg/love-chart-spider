import type {
  Candle, TimeframeAnalysis, GlobalSignal, UIUpdatePayload,
  SignalDirection, PivotLevels,
} from './types';
import { candleStateEngine } from './candleStateEngine';
import { analyzeTimeframe } from './scoringEngine';
import { aggregateTimeframes, type GlobalBias, getBiasText } from './aggregatorEngine';
import { computeSignal, resetSignalState, getSignalState } from './signalEngine';
import { calculateATR } from './atrEngine';
import { getPivotAnalysisText } from './pivotEngine';

/**
 * Pipeline Orchestrator
 *
 * Coordinates the full 8-layer analysis pipeline:
 *   1. Data intake
 *   2. Normalization
 *   3. Candle state management
 *   4. Feature extraction (per timeframe)
 *   5. Timeframe analysis
 *   6. Global aggregation
 *   7. Signal composition
 *   8. UI payload generation
 */

export interface PipelineState {
  symbol: string;
  analyses: Map<string, TimeframeAnalysis>;
  globalBias: GlobalBias;
  signal: GlobalSignal;
  currentPrice: number;
  lastUpdate: number;
}

const pipelineStates: Map<string, PipelineState> = new Map();

export function getPipelineState(symbol: string): PipelineState | undefined {
  return pipelineStates.get(symbol);
}

export function initializePipeline(symbol: string): PipelineState {
  const state: PipelineState = {
    symbol,
    analyses: new Map(),
    globalBias: {
      longPercent: 50,
      shortPercent: 50,
      direction: 'neutral',
      rawLong: 0,
      rawShort: 0,
      confidence: 0,
      dominantTimeframes: [],
    },
    signal: {
      symbol,
      direction: 'neutral',
      confidenceLong: 50,
      confidenceShort: 50,
      summaryText: 'Đang khởi tạo phân tích...',
      status: 'IDLE',
      updatedAt: Date.now(),
    },
    currentPrice: 0,
    lastUpdate: Date.now(),
  };

  pipelineStates.set(symbol, state);
  resetSignalState();
  return state;
}

/**
 * Process historical candles for a timeframe.
 * Called during initialization.
 */
export function loadTimeframeData(
  symbol: string,
  timeframe: string,
  candles: Candle[]
): void {
  candleStateEngine.initCache(symbol, timeframe, candles);

  const state = pipelineStates.get(symbol);
  if (!state) return;

  const closedCandles = candleStateEngine.getClosedCandles(symbol, timeframe);
  const analysis = analyzeTimeframe(symbol, timeframe, closedCandles);

  if (analysis) {
    state.analyses.set(timeframe, analysis);
  }
}

/**
 * Run initial aggregation after all timeframes loaded.
 */
export function runInitialAnalysis(symbol: string): UIUpdatePayload | null {
  const state = pipelineStates.get(symbol);
  if (!state) return null;

  return recomputeGlobal(state);
}

/**
 * Process a real-time candle update.
 * Returns a UI payload only when something meaningful changed.
 */
export function processRealtimeUpdate(
  symbol: string,
  timeframe: string,
  candle: Candle
): { payload: UIUpdatePayload | null; candleClosed: boolean } {
  const state = pipelineStates.get(symbol);
  if (!state) return { payload: null, candleClosed: false };

  const { candleClosed } = candleStateEngine.updateCandle(candle);
  state.currentPrice = candle.close;

  if (candleClosed) {
    const closedCandles = candleStateEngine.getClosedCandles(symbol, timeframe);
    const analysis = analyzeTimeframe(symbol, timeframe, closedCandles);

    if (analysis) {
      state.analyses.set(timeframe, analysis);
    }

    const payload = recomputeGlobal(state);
    return { payload, candleClosed: true };
  }

  // Tick update: only update price, forming candle, and light bias refresh
  return {
    payload: buildLightPayload(state),
    candleClosed: false,
  };
}

/**
 * Full recomputation: aggregation + signal.
 */
function recomputeGlobal(state: PipelineState): UIUpdatePayload {
  const allAnalyses = Array.from(state.analyses.values());

  state.globalBias = aggregateTimeframes(allAnalyses);

  const referenceAnalysis = allAnalyses.find(a => a.timeframe === '4h') || allAnalyses[0];
  const atr = referenceAnalysis?.atr || 0;

  state.signal = computeSignal(
    state.symbol,
    state.currentPrice,
    state.globalBias,
    allAnalyses,
    atr
  );

  state.lastUpdate = Date.now();

  return buildFullPayload(state);
}

function buildFullPayload(state: PipelineState): UIUpdatePayload {
  const timeframes: UIUpdatePayload['timeframes'] = {};
  for (const [tf, analysis] of state.analyses) {
    timeframes[tf] = {
      long: analysis.longScore,
      short: analysis.shortScore,
      state: analysis.trendBias,
      price: analysis.ema9,
    };
  }

  const referenceAnalysis = state.analyses.get('4h') || state.analyses.get('1h') || Array.from(state.analyses.values())[0];
  const pivotLevels = referenceAnalysis?.pivot || { pp: 0, r1: 0, r2: 0, r3: 0, s1: 0, s2: 0, s3: 0 };
  const patterns = referenceAnalysis?.patternSignals || [];
  const structureState = referenceAnalysis?.structureState || 'range';

  let trendlineCount = 0;
  for (const a of state.analyses.values()) {
    trendlineCount += a.trendlines.filter(t => t.isActive).length;
  }

  return {
    symbol: state.symbol,
    currentPrice: state.currentPrice,
    globalBias: {
      long: state.globalBias.longPercent,
      short: state.globalBias.shortPercent,
      direction: state.globalBias.direction,
    },
    timeframes,
    signal: {
      entryLong: state.signal.entryLong,
      entryShort: state.signal.entryShort,
      target: state.signal.target,
      stopLoss: state.signal.stopLoss,
      summary: state.signal.summaryText,
      status: state.signal.status,
      direction: state.signal.direction,
    },
    trendlineCount,
    pivotLevels,
    patterns,
    structureState,
  };
}

function buildLightPayload(state: PipelineState): UIUpdatePayload {
  return buildFullPayload(state);
}

export function clearPipeline(symbol: string): void {
  pipelineStates.delete(symbol);
  candleStateEngine.clearSymbol(symbol);
  resetSignalState();
}
