import type { Candle, SwingPoint, Trendline, TrendlineState } from './types';
import { getSwingHighs, getSwingLows } from './swingEngine';

/**
 * Trendline Engine
 *
 * Creates, scores, and manages trendlines from swing points.
 *
 * A good trendline needs:
 *   - At least 2 touch points
 *   - More touches = stronger
 *   - Not broken through excessively
 *   - Near current price = more relevant
 */

interface CandidateLine {
  a: SwingPoint;
  b: SwingPoint;
  touches: number;
  recentTouch: boolean;
  score: number;
}

export function detectTrendlines(
  candles: Candle[],
  swings: SwingPoint[],
  maxLines = 4
): Trendline[] {
  if (candles.length < 20 || swings.length < 2) return [];

  const atr = computeATR(candles, 14);
  const tolerance = atr * 0.25;
  const minGap = Math.max(8, Math.floor(candles.length / 30));
  const len = candles.length;

  const highs = getSwingHighs(swings);
  const lows = getSwingLows(swings);

  const resistanceCandidates = buildCandidates(highs, candles, tolerance, minGap, len, true);
  const supportCandidates = buildCandidates(lows, candles, tolerance, minGap, len, false);

  resistanceCandidates.sort(candidateSort);
  supportCandidates.sort(candidateSort);

  const result: Trendline[] = [];
  const maxPerType = Math.ceil(maxLines / 2);

  for (const c of resistanceCandidates) {
    if (result.filter(t => t.kind === 'descending' || isResistanceLine(t)).length >= maxPerType) break;
    const tl = candidateToTrendline(c, candles, atr, 'resistance');
    if (!isDuplicate(tl, result, atr)) result.push(tl);
  }

  for (const c of supportCandidates) {
    if (result.filter(t => t.kind === 'ascending' || isSupportLine(t)).length >= maxPerType) break;
    const tl = candidateToTrendline(c, candles, atr, 'support');
    if (!isDuplicate(tl, result, atr)) result.push(tl);
  }

  return result;
}

function buildCandidates(
  points: SwingPoint[],
  candles: Candle[],
  tolerance: number,
  minGap: number,
  len: number,
  useHigh: boolean
): CandidateLine[] {
  const candidates: CandidateLine[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const a = points[i];
      const b = points[j];
      if (b.index - a.index < minGap) continue;

      const { touches, recentTouch } = scoreLine(a, b, candles, len, tolerance, useHigh);
      if (touches >= 2) {
        const recencyBonus = recentTouch ? 5 : 0;
        const score = touches * 10 + recencyBonus;
        candidates.push({ a, b, touches, recentTouch, score });
      }
    }
  }

  return candidates;
}

function scoreLine(
  a: SwingPoint,
  b: SwingPoint,
  candles: Candle[],
  len: number,
  tolerance: number,
  useHigh: boolean
): { touches: number; recentTouch: boolean } {
  const slope = (b.price - a.price) / (b.index - a.index);
  let touches = 0;
  let recentTouch = false;
  const recentThreshold = len - Math.floor(len * 0.15);

  for (let i = a.index; i < len; i++) {
    const linePrice = a.price + slope * (i - a.index);
    const candlePrice = useHigh ? candles[i].high : candles[i].low;

    if (Math.abs(candlePrice - linePrice) < tolerance ||
        (linePrice >= candles[i].low - tolerance * 0.5 && linePrice <= candles[i].high + tolerance * 0.5)) {
      touches++;
      if (i >= recentThreshold) recentTouch = true;
    }
  }

  return { touches, recentTouch };
}

function candidateSort(a: CandidateLine, b: CandidateLine): number {
  if (a.recentTouch !== b.recentTouch) return a.recentTouch ? -1 : 1;
  return b.score - a.score;
}

function candidateToTrendline(
  c: CandidateLine,
  candles: Candle[],
  atr: number,
  role: 'support' | 'resistance'
): Trendline {
  const slope = (c.b.price - c.a.price) / (c.b.index - c.a.index);
  const endIdx = candles.length - 1;
  const endPrice = c.a.price + slope * (endIdx - c.a.index);
  const currentPrice = candles[endIdx].close;

  const kind = slope >= 0 ? 'ascending' as const : 'descending' as const;
  const state = determineTrendlineState(endPrice, currentPrice, atr, role);

  return {
    kind,
    x1: c.a.index,
    y1: c.a.price,
    x2: endIdx,
    y2: endPrice,
    touches: c.touches,
    isActive: state === 'active_support' || state === 'active_resistance',
    state,
    score: c.score,
  };
}

function determineTrendlineState(
  linePrice: number,
  currentPrice: number,
  atr: number,
  role: 'support' | 'resistance'
): TrendlineState {
  const dist = currentPrice - linePrice;
  const threshold = atr * 0.5;

  if (role === 'support') {
    if (dist < -threshold) return 'broken';
    if (Math.abs(dist) < threshold) return 'retested';
    return 'active_support';
  } else {
    if (dist > threshold) return 'broken';
    if (Math.abs(dist) < threshold) return 'retested';
    return 'active_resistance';
  }
}

function isResistanceLine(t: Trendline): boolean {
  return t.state === 'active_resistance' || (t.kind === 'descending' && t.isActive);
}

function isSupportLine(t: Trendline): boolean {
  return t.state === 'active_support' || (t.kind === 'ascending' && t.isActive);
}

function isDuplicate(newLine: Trendline, existing: Trendline[], atr: number): boolean {
  for (const ex of existing) {
    const slopeNew = (newLine.y2 - newLine.y1) / Math.max(1, newLine.x2 - newLine.x1);
    const slopeEx = (ex.y2 - ex.y1) / Math.max(1, ex.x2 - ex.x1);
    if (Math.abs(slopeNew - slopeEx) < atr * 0.01 && Math.abs(newLine.y1 - ex.y1) < atr * 0.5) {
      return true;
    }
  }
  return false;
}

function computeATR(candles: Candle[], period = 14): number {
  if (candles.length < period + 1) {
    const last = candles[candles.length - 1];
    return last ? last.high - last.low : 1;
  }
  let sum = 0;
  for (let i = candles.length - period; i < candles.length; i++) {
    const tr = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close)
    );
    sum += tr;
  }
  return sum / period;
}

export function getActiveTrendlines(trendlines: Trendline[]): Trendline[] {
  return trendlines.filter(t => t.isActive);
}

export function trendlineScore(trendlines: Trendline[], currentPrice: number): { longScore: number; shortScore: number } {
  let longScore = 0;
  let shortScore = 0;

  for (const t of trendlines) {
    if (!t.isActive) continue;
    const weight = Math.min(t.touches, 5) * 3;

    if (t.state === 'active_support') {
      longScore += weight;
    } else if (t.state === 'active_resistance') {
      shortScore += weight;
    } else if (t.state === 'retested') {
      if (currentPrice > t.y2) longScore += weight * 0.5;
      else shortScore += weight * 0.5;
    }
  }

  return { longScore, shortScore };
}
