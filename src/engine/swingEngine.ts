import type { Candle, SwingPoint } from './types';

/**
 * Swing Engine
 *
 * Detects swing highs and swing lows as local extremes.
 * These are the foundation for trendlines, structure, and SL placement.
 *
 * A swing high at index i: high[i] > high of `strength` candles on both sides
 * A swing low at index i: low[i] < low of `strength` candles on both sides
 */

export function detectSwings(candles: Candle[], strength = 3): SwingPoint[] {
  const swings: SwingPoint[] = [];
  if (candles.length < strength * 2 + 1) return swings;

  for (let i = strength; i < candles.length - strength; i++) {
    let isHigh = true;
    let isLow = true;

    for (let j = 1; j <= strength; j++) {
      if (candles[i].high <= candles[i - j].high || candles[i].high <= candles[i + j].high) {
        isHigh = false;
      }
      if (candles[i].low >= candles[i - j].low || candles[i].low >= candles[i + j].low) {
        isLow = false;
      }
    }

    if (isHigh) {
      swings.push({
        index: i,
        price: candles[i].high,
        type: 'high',
        time: candles[i].openTime,
      });
    }

    if (isLow) {
      swings.push({
        index: i,
        price: candles[i].low,
        type: 'low',
        time: candles[i].openTime,
      });
    }
  }

  return deduplicateSwings(swings, candles);
}

function deduplicateSwings(swings: SwingPoint[], candles: Candle[]): SwingPoint[] {
  if (swings.length <= 1) return swings;

  const atr = simpleATR(candles, 14);
  const minGap = Math.max(3, Math.floor(candles.length / 80));
  const result: SwingPoint[] = [];

  for (const s of swings) {
    const tooClose = result.some(r =>
      r.type === s.type &&
      Math.abs(r.index - s.index) < minGap &&
      Math.abs(r.price - s.price) < atr * 0.3
    );
    if (!tooClose) {
      result.push(s);
    }
  }

  return result;
}

function simpleATR(candles: Candle[], period = 14): number {
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

export function getSwingHighs(swings: SwingPoint[]): SwingPoint[] {
  return swings.filter(s => s.type === 'high');
}

export function getSwingLows(swings: SwingPoint[]): SwingPoint[] {
  return swings.filter(s => s.type === 'low');
}

export function getLastSwingHigh(swings: SwingPoint[]): SwingPoint | undefined {
  const highs = getSwingHighs(swings);
  return highs[highs.length - 1];
}

export function getLastSwingLow(swings: SwingPoint[]): SwingPoint | undefined {
  const lows = getSwingLows(swings);
  return lows[lows.length - 1];
}

export function getNearestSwingHigh(swings: SwingPoint[], currentPrice: number): SwingPoint | undefined {
  const highs = getSwingHighs(swings).filter(s => s.price > currentPrice);
  if (highs.length === 0) return undefined;
  return highs.reduce((nearest, s) =>
    Math.abs(s.price - currentPrice) < Math.abs(nearest.price - currentPrice) ? s : nearest
  );
}

export function getNearestSwingLow(swings: SwingPoint[], currentPrice: number): SwingPoint | undefined {
  const lows = getSwingLows(swings).filter(s => s.price < currentPrice);
  if (lows.length === 0) return undefined;
  return lows.reduce((nearest, s) =>
    Math.abs(s.price - currentPrice) < Math.abs(nearest.price - currentPrice) ? s : nearest
  );
}
