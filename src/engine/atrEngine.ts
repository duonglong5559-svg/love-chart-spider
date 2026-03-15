import type { Candle } from './types';

/**
 * ATR / Volatility Engine
 *
 * Filters noise, sizes stops, and detects abnormal volatility.
 *
 * ATR = average True Range over N periods.
 * True Range = max(H-L, |H-prevC|, |L-prevC|)
 *
 * Volatility score: current ATR vs historical average ATR.
 *   - score < -1: abnormally low volatility (squeeze)
 *   - score > 1: abnormally high volatility (expansion)
 */

export function calculateATR(candles: Candle[], period = 14): number {
  if (candles.length < 2) return candles.length === 1 ? candles[0].high - candles[0].low : 0;
  if (candles.length < period + 1) {
    let sum = 0;
    for (let i = 1; i < candles.length; i++) {
      sum += trueRange(candles[i], candles[i - 1]);
    }
    return sum / (candles.length - 1);
  }

  let sum = 0;
  for (let i = candles.length - period; i < candles.length; i++) {
    sum += trueRange(candles[i], candles[i - 1]);
  }
  return sum / period;
}

export function calculateATRSeries(candles: Candle[], period = 14): number[] {
  const result: number[] = [];
  if (candles.length < 2) return [0];

  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      result.push(candles[0].high - candles[0].low);
      continue;
    }
    const start = Math.max(1, i - period + 1);
    let sum = 0;
    let count = 0;
    for (let j = start; j <= i; j++) {
      sum += trueRange(candles[j], candles[j - 1]);
      count++;
    }
    result.push(sum / count);
  }

  return result;
}

export function trueRange(candle: Candle, prevCandle: Candle): number {
  return Math.max(
    candle.high - candle.low,
    Math.abs(candle.high - prevCandle.close),
    Math.abs(candle.low - prevCandle.close)
  );
}

export function volatilityScore(candles: Candle[], period = 14, historyPeriod = 50): number {
  if (candles.length < period + 1) return 0;

  const currentATR = calculateATR(candles, period);

  const lookback = Math.min(historyPeriod, candles.length - period);
  if (lookback <= 0) return 0;

  let sumHistorical = 0;
  let sumSq = 0;
  for (let end = candles.length - lookback; end < candles.length; end++) {
    const slice = candles.slice(Math.max(0, end - period), end + 1);
    const atr = calculateATR(slice, period);
    sumHistorical += atr;
    sumSq += atr * atr;
  }

  const mean = sumHistorical / lookback;
  const variance = sumSq / lookback - mean * mean;
  const stdDev = Math.sqrt(Math.max(0, variance));

  if (stdDev === 0) return 0;
  return (currentATR - mean) / stdDev;
}

export function isVolatilityAbnormal(candles: Candle[], threshold = 1.5): boolean {
  return Math.abs(volatilityScore(candles)) > threshold;
}

export function getStopBuffer(atr: number, multiplier = 1.5): number {
  return atr * multiplier;
}

export function atrFilterScore(candles: Candle[]): { longScore: number; shortScore: number; atr: number; volScore: number } {
  const atr = calculateATR(candles);
  const volScore = volatilityScore(candles);

  let longScore = 0;
  let shortScore = 0;

  if (volScore > 2) {
    longScore -= 5;
    shortScore -= 5;
  } else if (volScore > 1.5) {
    longScore -= 3;
    shortScore -= 3;
  }

  if (volScore < -1) {
    longScore -= 2;
    shortScore -= 2;
  }

  return { longScore, shortScore, atr, volScore };
}

export function calculateEMA(values: number[], period: number): number[] {
  if (values.length === 0) return [];
  const k = 2 / (period + 1);
  const ema: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    ema.push(values[i] * k + ema[i - 1] * (1 - k));
  }
  return ema;
}

export function calculateRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return +(100 - 100 / (1 + rs)).toFixed(1);
}

export function calculateMACD(closes: number[]): { macd: number; signal: number; histogram: number } {
  if (closes.length < 26) return { macd: 0, signal: 0, histogram: 0 };

  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const macdLine = ema12.map((v, i) => v - ema26[i]);

  const signalLine = calculateEMA(macdLine, 9);

  const lastMacd = macdLine[macdLine.length - 1];
  const lastSignal = signalLine[signalLine.length - 1];

  return {
    macd: +lastMacd.toFixed(4),
    signal: +lastSignal.toFixed(4),
    histogram: +(lastMacd - lastSignal).toFixed(4),
  };
}
