import type { Candle, TimeframeAnalysis, TrendBias, PivotRelation } from './types';
import { detectPatterns, getPatternScore } from './patternEngine';
import { detectSwings } from './swingEngine';
import { detectTrendlines, trendlineScore } from './trendlineEngine';
import { analyzeStructure, structureScore } from './structureEngine';
import { calculatePivots, getPivotRelation, pivotScore, getSupportResistanceLevels } from './pivotEngine';
import { calculateATR, volatilityScore, atrFilterScore, calculateEMA, calculateRSI, calculateMACD } from './atrEngine';

/**
 * Scoring Engine (per-timeframe)
 *
 * Combines all features into a single long/short score for one timeframe.
 *
 * Score sources:
 *   - Trendline proximity and state
 *   - Market structure (HH-HL, LH-LL, BOS, CHOCH)
 *   - Pivot relation
 *   - Pattern signals
 *   - EMA trend
 *   - RSI / MACD momentum
 *   - ATR / volatility filter
 */

export function analyzeTimeframe(
  symbol: string,
  timeframe: string,
  candles: Candle[]
): TimeframeAnalysis | null {
  if (candles.length < 20) return null;

  const closedCandles = candles.filter(c => c.isClosed);
  if (closedCandles.length < 20) return null;

  const currentPrice = closedCandles[closedCandles.length - 1].close;
  const closes = closedCandles.map(c => c.close);

  // Feature extraction
  const patterns = detectPatterns(closedCandles);
  const swings = detectSwings(closedCandles);
  const trendlines = detectTrendlines(closedCandles, swings);
  const structure = analyzeStructure(swings, currentPrice);
  const pivots = calculatePivots(closedCandles);
  const pivotRelation = getPivotRelation(currentPrice, pivots);
  const { supports, resistances } = getSupportResistanceLevels(pivots);

  const atr = calculateATR(closedCandles);
  const volScore = volatilityScore(closedCandles);

  const ema9Values = calculateEMA(closes, 9);
  const ema21Values = calculateEMA(closes, 21);
  const ema9 = ema9Values[ema9Values.length - 1];
  const ema21 = ema21Values[ema21Values.length - 1];

  const rsi = calculateRSI(closes);
  const macd = calculateMACD(closes);

  // ─── Scoring ───
  let longScore = 0;
  let shortScore = 0;

  // 1. Trend (EMA)
  const trendResult = emaTrendScore(currentPrice, ema9, ema21);
  longScore += trendResult.longScore;
  shortScore += trendResult.shortScore;

  // 2. Structure
  const structResult = structureScore(structure);
  longScore += structResult.longScore;
  shortScore += structResult.shortScore;

  // 3. Pivot
  const pivResult = pivotScore(currentPrice, pivots);
  longScore += pivResult.longScore;
  shortScore += pivResult.shortScore;

  // 4. Pattern
  const patScore = getPatternScore(patterns, 3);
  if (patScore > 0) longScore += Math.min(patScore, 20);
  else if (patScore < 0) shortScore += Math.min(Math.abs(patScore), 20);

  // 5. Trendline
  const tlScore = trendlineScore(trendlines, currentPrice);
  longScore += tlScore.longScore;
  shortScore += tlScore.shortScore;

  // 6. RSI
  const rsiResult = rsiScore(rsi);
  longScore += rsiResult.longScore;
  shortScore += rsiResult.shortScore;

  // 7. MACD
  const macdResult = macdScore(macd.histogram);
  longScore += macdResult.longScore;
  shortScore += macdResult.shortScore;

  // 8. Volatility filter
  const volResult = atrFilterScore(closedCandles);
  longScore += volResult.longScore;
  shortScore += volResult.shortScore;

  // Ensure non-negative
  longScore = Math.max(0, longScore);
  shortScore = Math.max(0, shortScore);

  // Normalize to a comparable scale
  const total = longScore + shortScore;
  if (total > 0) {
    longScore = Math.round((longScore / total) * 100);
    shortScore = 100 - longScore;
  } else {
    longScore = 50;
    shortScore = 50;
  }

  const trendBias: TrendBias = longScore > 60 ? 'bullish' : shortScore > 60 ? 'bearish' : 'neutral';

  return {
    symbol,
    timeframe,
    trendBias,
    trendScore: trendResult.longScore - trendResult.shortScore,
    patternSignals: patterns,
    structureState: structure.state,
    pivotRelation,
    pivot: pivots,
    supportLevels: supports,
    resistanceLevels: resistances,
    trendlines,
    swingPoints: swings,
    atr,
    volatilityScore: volScore,
    longScore,
    shortScore,
    ema9,
    ema21,
    rsi,
    macdHistogram: macd.histogram,
  };
}

function emaTrendScore(price: number, ema9: number, ema21: number): { longScore: number; shortScore: number } {
  let longScore = 0;
  let shortScore = 0;

  if (price > ema9 && ema9 > ema21) {
    longScore += 20;
  } else if (price < ema9 && ema9 < ema21) {
    shortScore += 20;
  } else if (price > ema21) {
    longScore += 8;
  } else if (price < ema21) {
    shortScore += 8;
  }

  return { longScore, shortScore };
}

function rsiScore(rsi: number): { longScore: number; shortScore: number } {
  let longScore = 0;
  let shortScore = 0;

  if (rsi < 30) longScore += 10;
  else if (rsi < 40) longScore += 5;
  else if (rsi > 70) shortScore += 10;
  else if (rsi > 60) shortScore += 5;

  return { longScore, shortScore };
}

function macdScore(histogram: number): { longScore: number; shortScore: number } {
  let longScore = 0;
  let shortScore = 0;

  if (histogram > 0) longScore += 8;
  else if (histogram < 0) shortScore += 8;

  return { longScore, shortScore };
}
