import type { SwingPoint, StructureState } from './types';
import { getSwingHighs, getSwingLows } from './swingEngine';

/**
 * Structure Engine
 *
 * Determines market structure:
 *   - Uptrend: Higher Highs + Higher Lows (HH-HL)
 *   - Downtrend: Lower Highs + Lower Lows (LH-LL)
 *   - Range / Breakout / Breakdown / Retest
 *   - Change of Character (CHOCH): structure flip
 *   - Break of Structure (BOS): continuation
 */

export interface StructureResult {
  state: StructureState;
  lastHH?: number;
  lastHL?: number;
  lastLH?: number;
  lastLL?: number;
  bosLevel?: number;
  chochDetected: boolean;
  description: string;
}

export function analyzeStructure(swings: SwingPoint[], currentPrice: number): StructureResult {
  const highs = getSwingHighs(swings);
  const lows = getSwingLows(swings);

  if (highs.length < 2 || lows.length < 2) {
    return {
      state: 'range',
      chochDetected: false,
      description: 'Chưa đủ dữ liệu để xác định cấu trúc',
    };
  }

  const recentHighs = highs.slice(-4);
  const recentLows = lows.slice(-4);

  const h1 = recentHighs[recentHighs.length - 2];
  const h2 = recentHighs[recentHighs.length - 1];
  const l1 = recentLows[recentLows.length - 2];
  const l2 = recentLows[recentLows.length - 1];

  const higherHigh = h2.price > h1.price;
  const higherLow = l2.price > l1.price;
  const lowerHigh = h2.price < h1.price;
  const lowerLow = l2.price < l1.price;

  let previousState: 'up' | 'down' | 'range' = 'range';
  if (recentHighs.length >= 3 && recentLows.length >= 3) {
    const h0 = recentHighs[recentHighs.length - 3];
    const l0 = recentLows[recentLows.length - 3];
    if (h1.price > h0.price && l1.price > l0.price) previousState = 'up';
    else if (h1.price < h0.price && l1.price < l0.price) previousState = 'down';
  }

  // Break of key level?
  const brokeAboveLastHigh = currentPrice > h2.price;
  const brokeBelowLastLow = currentPrice < l2.price;

  // CHOCH: Change of Character
  if (previousState === 'up' && lowerHigh && lowerLow) {
    return {
      state: 'CHOCH-bear',
      lastLH: h2.price,
      lastLL: l2.price,
      bosLevel: l1.price,
      chochDetected: true,
      description: `CHOCH bearish: cấu trúc tăng bị phá, đỉnh ${h2.price.toFixed(2)} thấp hơn, đáy ${l2.price.toFixed(2)} thấp hơn`,
    };
  }

  if (previousState === 'down' && higherHigh && higherLow) {
    return {
      state: 'CHOCH-bull',
      lastHH: h2.price,
      lastHL: l2.price,
      bosLevel: h1.price,
      chochDetected: true,
      description: `CHOCH bullish: cấu trúc giảm bị phá, đỉnh ${h2.price.toFixed(2)} cao hơn, đáy ${l2.price.toFixed(2)} cao hơn`,
    };
  }

  // Standard structure
  if (higherHigh && higherLow) {
    if (brokeAboveLastHigh) {
      return {
        state: 'breakout',
        lastHH: h2.price,
        lastHL: l2.price,
        bosLevel: h2.price,
        chochDetected: false,
        description: `Breakout bullish: giá phá đỉnh ${h2.price.toFixed(2)}, xu hướng tăng tiếp diễn`,
      };
    }
    return {
      state: 'HH-HL',
      lastHH: h2.price,
      lastHL: l2.price,
      chochDetected: false,
      description: `Uptrend: HH ${h2.price.toFixed(2)} / HL ${l2.price.toFixed(2)}`,
    };
  }

  if (lowerHigh && lowerLow) {
    if (brokeBelowLastLow) {
      return {
        state: 'breakdown',
        lastLH: h2.price,
        lastLL: l2.price,
        bosLevel: l2.price,
        chochDetected: false,
        description: `Breakdown bearish: giá phá đáy ${l2.price.toFixed(2)}, xu hướng giảm tiếp diễn`,
      };
    }
    return {
      state: 'LH-LL',
      lastLH: h2.price,
      lastLL: l2.price,
      chochDetected: false,
      description: `Downtrend: LH ${h2.price.toFixed(2)} / LL ${l2.price.toFixed(2)}`,
    };
  }

  // Near broken level = retest
  if (brokeBelowLastLow && Math.abs(currentPrice - l2.price) / l2.price < 0.005) {
    return {
      state: 'retest',
      lastLH: h2.price,
      lastLL: l2.price,
      bosLevel: l2.price,
      chochDetected: false,
      description: `Retest vùng phá ${l2.price.toFixed(2)} từ phía dưới`,
    };
  }
  if (brokeAboveLastHigh && Math.abs(currentPrice - h2.price) / h2.price < 0.005) {
    return {
      state: 'retest',
      lastHH: h2.price,
      lastHL: l2.price,
      bosLevel: h2.price,
      chochDetected: false,
      description: `Retest vùng phá ${h2.price.toFixed(2)} từ phía trên`,
    };
  }

  return {
    state: 'range',
    chochDetected: false,
    description: `Sideway: HH/HL không đồng nhất, đỉnh ${h2.price.toFixed(2)}, đáy ${l2.price.toFixed(2)}`,
  };
}

export function structureScore(structure: StructureResult): { longScore: number; shortScore: number } {
  let longScore = 0;
  let shortScore = 0;

  switch (structure.state) {
    case 'HH-HL':
      longScore += 20;
      break;
    case 'LH-LL':
      shortScore += 20;
      break;
    case 'breakout':
      longScore += 25;
      break;
    case 'breakdown':
      shortScore += 25;
      break;
    case 'CHOCH-bull':
      longScore += 30;
      break;
    case 'CHOCH-bear':
      shortScore += 30;
      break;
    case 'retest':
      longScore += 5;
      shortScore += 5;
      break;
    case 'range':
      break;
  }

  return { longScore, shortScore };
}
