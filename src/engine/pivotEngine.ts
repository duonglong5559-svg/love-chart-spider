import type { Candle, PivotLevels, PivotRelation } from './types';

/**
 * Pivot Engine
 *
 * Computes classic pivot points from a higher-timeframe reference candle.
 * Also determines the price's relation to pivot and generates text descriptions.
 *
 * Pivot = (H + L + C) / 3
 * R1 = 2 * P - L,  S1 = 2 * P - H
 * R2 = P + (H - L), S2 = P - (H - L)
 * R3 = H + 2 * (P - L), S3 = L - 2 * (H - P)
 */

export function calculatePivots(candles: Candle[]): PivotLevels {
  if (candles.length === 0) {
    return { pp: 0, r1: 0, r2: 0, r3: 0, s1: 0, s2: 0, s3: 0 };
  }

  const recent = candles.slice(-20);
  const h = Math.max(...recent.map(c => c.high));
  const l = Math.min(...recent.map(c => c.low));
  const c = candles[candles.length - 1].close;

  const pp = (h + l + c) / 3;

  return {
    pp: round(pp),
    r1: round(2 * pp - l),
    r2: round(pp + (h - l)),
    r3: round(h + 2 * (pp - l)),
    s1: round(2 * pp - h),
    s2: round(pp - (h - l)),
    s3: round(l - 2 * (h - pp)),
  };
}

export function calculateDailyPivots(dailyCandles: Candle[]): PivotLevels {
  if (dailyCandles.length === 0) {
    return { pp: 0, r1: 0, r2: 0, r3: 0, s1: 0, s2: 0, s3: 0 };
  }

  const yesterday = dailyCandles[dailyCandles.length - 1];
  const h = yesterday.high;
  const l = yesterday.low;
  const c = yesterday.close;

  const pp = (h + l + c) / 3;

  return {
    pp: round(pp),
    r1: round(2 * pp - l),
    r2: round(pp + (h - l)),
    r3: round(h + 2 * (pp - l)),
    s1: round(2 * pp - h),
    s2: round(pp - (h - l)),
    s3: round(l - 2 * (h - pp)),
  };
}

export function getPivotRelation(currentPrice: number, pivots: PivotLevels): PivotRelation {
  const threshold = Math.abs(pivots.r1 - pivots.pp) * 0.1;
  if (Math.abs(currentPrice - pivots.pp) < threshold) return 'at_pivot';
  return currentPrice > pivots.pp ? 'above_pivot' : 'below_pivot';
}

export function getPivotAnalysisText(currentPrice: number, pivots: PivotLevels): string {
  const relation = getPivotRelation(currentPrice, pivots);
  const pp = pivots.pp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (relation === 'at_pivot') {
    return `Giá đang ở gần Pivot (${pp}), chờ breakout hoặc rejection.`;
  }

  if (relation === 'above_pivot') {
    const nearestR = [pivots.r1, pivots.r2, pivots.r3].find(r => r > currentPrice);
    const target = nearestR
      ? nearestR.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '';
    return `Giá ở phía trên Pivot (${pp}), có xu hướng tăng.${target ? ` Target: ${target}` : ''}`;
  }

  const nearestS = [pivots.s1, pivots.s2, pivots.s3].reverse().find(s => s < currentPrice);
  const support = nearestS
    ? nearestS.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '';
  return `Giá ở phía dưới Pivot (${pp}), có xu hướng tiến về Pivot.${support ? ` Hỗ trợ: ${support}` : ''}`;
}

export function pivotScore(currentPrice: number, pivots: PivotLevels): { longScore: number; shortScore: number } {
  let longScore = 0;
  let shortScore = 0;

  const relation = getPivotRelation(currentPrice, pivots);

  if (relation === 'above_pivot') {
    longScore += 10;
  } else if (relation === 'below_pivot') {
    shortScore += 10;
  }

  const distToR1 = pivots.r1 - currentPrice;
  const distToS1 = currentPrice - pivots.s1;
  const pivotRange = pivots.r1 - pivots.s1;

  if (pivotRange > 0) {
    if (distToR1 > 0 && distToR1 < pivotRange * 0.2) {
      shortScore += 8;
    }
    if (distToS1 > 0 && distToS1 < pivotRange * 0.2) {
      longScore += 8;
    }
  }

  return { longScore, shortScore };
}

export function getSupportResistanceLevels(pivots: PivotLevels): { supports: number[]; resistances: number[] } {
  return {
    supports: [pivots.s1, pivots.s2, pivots.s3],
    resistances: [pivots.r1, pivots.r2, pivots.r3],
  };
}

function round(v: number): number {
  return +v.toFixed(2);
}
