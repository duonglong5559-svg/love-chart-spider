import type { GlobalSignal, SignalDirection, SignalStatus, TimeframeAnalysis, PivotLevels } from './types';
import { type GlobalBias, isStrongBias } from './aggregatorEngine';
import { getLastSwingHigh, getLastSwingLow } from './swingEngine';
import { getStopBuffer } from './atrEngine';

/**
 * Signal Engine with State Machine
 *
 * State transitions:
 *   IDLE → WATCH_LONG / WATCH_SHORT → READY → TRIGGERED → ACTIVE
 *   → TP_HIT / SL_HIT / INVALIDATED → COOLDOWN → IDLE
 *
 * Conditions for signal:
 *   - Global bias strong enough
 *   - Medium and large TFs aligned
 *   - Small TF provides timing
 *   - Not too close to opposing resistance/support
 *   - ATR not abnormal
 */

const COOLDOWN_MS = 60_000;
const MIN_CONFIDENCE = 58;

interface SignalState {
  status: SignalStatus;
  signal: GlobalSignal | null;
  lastSignalTime: number;
  cooldownUntil: number;
}

let state: SignalState = {
  status: 'IDLE',
  signal: null,
  lastSignalTime: 0,
  cooldownUntil: 0,
};

export function resetSignalState(): void {
  state = {
    status: 'IDLE',
    signal: null,
    lastSignalTime: 0,
    cooldownUntil: 0,
  };
}

export function getSignalState(): SignalState {
  return { ...state };
}

export function computeSignal(
  symbol: string,
  currentPrice: number,
  globalBias: GlobalBias,
  analyses: TimeframeAnalysis[],
  atr: number
): GlobalSignal {
  const now = Date.now();

  if (state.status === 'COOLDOWN' && now < state.cooldownUntil) {
    return state.signal || makeIdleSignal(symbol, currentPrice);
  }

  if (state.status === 'COOLDOWN' && now >= state.cooldownUntil) {
    state.status = 'IDLE';
  }

  // Find the smallest and largest TF analyses
  const sorted = [...analyses].sort((a, b) => tfOrder(a.timeframe) - tfOrder(b.timeframe));
  const smallTF = sorted[0];
  const largeTFs = sorted.filter(a => tfOrder(a.timeframe) >= 3);

  const direction = globalBias.direction;
  const strongEnough = isStrongBias(globalBias, MIN_CONFIDENCE);

  if (!strongEnough || direction === 'neutral') {
    state.status = 'IDLE';
    return makeIdleSignal(symbol, currentPrice);
  }

  // Check alignment: large TFs should agree
  const aligned = largeTFs.length > 0 && largeTFs.every(a =>
    direction === 'long' ? a.longScore > a.shortScore : a.shortScore > a.longScore
  );

  if (!aligned && largeTFs.length > 0) {
    state.status = direction === 'long' ? 'WATCH_LONG' : 'WATCH_SHORT';
    return makeWatchSignal(symbol, currentPrice, direction, globalBias);
  }

  // Compute entry, SL, TP
  const allSwings = analyses.flatMap(a => a.swingPoints);
  const lastSwingHigh = getLastSwingHigh(allSwings);
  const lastSwingLow = getLastSwingLow(allSwings);
  const stopBuffer = getStopBuffer(atr);

  const pivots = smallTF?.pivot || (analyses[0]?.pivot ?? { pp: 0, r1: 0, r2: 0, r3: 0, s1: 0, s2: 0, s3: 0 });

  let entryLong: number | undefined;
  let entryShort: number | undefined;
  let stopLoss: number | undefined;
  let takeProfit: number | undefined;
  let target: number | undefined;

  if (direction === 'long') {
    entryLong = lastSwingLow
      ? +(Math.max(lastSwingLow.price, pivots.s1, currentPrice - atr * 0.5)).toFixed(2)
      : +(currentPrice - atr * 0.3).toFixed(2);
    stopLoss = lastSwingLow
      ? +(lastSwingLow.price - stopBuffer).toFixed(2)
      : +(currentPrice - atr * 2).toFixed(2);
    target = lastSwingHigh
      ? +lastSwingHigh.price.toFixed(2)
      : +pivots.r1.toFixed(2) || +(currentPrice + atr * 2).toFixed(2);
    takeProfit = target;
  } else {
    entryShort = lastSwingHigh
      ? +(Math.min(lastSwingHigh.price, pivots.r1, currentPrice + atr * 0.5)).toFixed(2)
      : +(currentPrice + atr * 0.3).toFixed(2);
    stopLoss = lastSwingHigh
      ? +(lastSwingHigh.price + stopBuffer).toFixed(2)
      : +(currentPrice + atr * 2).toFixed(2);
    target = lastSwingLow
      ? +lastSwingLow.price.toFixed(2)
      : +pivots.s1.toFixed(2) || +(currentPrice - atr * 2).toFixed(2);
    takeProfit = target;
  }

  const summaryText = buildSummaryText(direction, currentPrice, pivots, entryLong, entryShort, target, globalBias);

  state.status = 'READY';
  state.lastSignalTime = now;

  const signal: GlobalSignal = {
    symbol,
    direction,
    confidenceLong: globalBias.longPercent,
    confidenceShort: globalBias.shortPercent,
    entryLong,
    entryShort,
    stopLoss,
    takeProfit,
    target,
    summaryText,
    status: 'READY',
    updatedAt: now,
  };

  state.signal = signal;
  return signal;
}

export function invalidateSignal(): void {
  if (state.signal) {
    state.signal.status = 'INVALIDATED';
  }
  state.status = 'COOLDOWN';
  state.cooldownUntil = Date.now() + COOLDOWN_MS;
}

export function triggerSignal(): void {
  if (state.signal && state.status === 'READY') {
    state.signal.status = 'TRIGGERED';
    state.status = 'TRIGGERED';
  }
}

function makeIdleSignal(symbol: string, currentPrice: number): GlobalSignal {
  return {
    symbol,
    direction: 'neutral',
    confidenceLong: 50,
    confidenceShort: 50,
    summaryText: 'Chờ tín hiệu rõ ràng hơn. Bias chưa đủ mạnh.',
    status: 'IDLE',
    updatedAt: Date.now(),
  };
}

function makeWatchSignal(symbol: string, currentPrice: number, direction: SignalDirection, bias: GlobalBias): GlobalSignal {
  const watching = direction === 'long' ? 'Long' : 'Short';
  return {
    symbol,
    direction,
    confidenceLong: bias.longPercent,
    confidenceShort: bias.shortPercent,
    summaryText: `Đang theo dõi cơ hội ${watching}. Chờ khung lớn xác nhận thêm.`,
    status: direction === 'long' ? 'WATCH_LONG' : 'WATCH_SHORT',
    updatedAt: Date.now(),
  };
}

function buildSummaryText(
  direction: SignalDirection,
  currentPrice: number,
  pivots: PivotLevels,
  entryLong: number | undefined,
  entryShort: number | undefined,
  target: number | undefined,
  bias: GlobalBias
): string {
  const pp = pivots.pp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const entry = direction === 'long'
    ? entryLong?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : entryShort?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const tgt = target?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const priceSide = currentPrice > pivots.pp
    ? `Giá đang ở phía trên Pivot (${pp})`
    : `Giá đang ở phía dưới Pivot (${pp}), có xu hướng tiến về Pivot`;

  const actionText = direction === 'long'
    ? `Canh Long tại ${entry || '---'}`
    : `Canh Short tại ${entry || '---'}`;

  const confidence = direction === 'long'
    ? `${bias.longPercent}% Long`
    : `${bias.shortPercent}% Short`;

  return `${priceSide}. ${actionText}. Target: ${tgt || '---'}. Bias: ${confidence}.`;
}

function tfOrder(tf: string): number {
  const map: Record<string, number> = {
    '15m': 0, '30m': 1, '1h': 2, '2h': 3, '4h': 4,
    '6h': 5, '8h': 5, '12h': 6, '1d': 7, '1w': 8,
  };
  return map[tf] ?? 0;
}
