import type { TimeframeAnalysis, SignalDirection, TIMEFRAME_WEIGHTS } from './types';

/**
 * Global Aggregator
 *
 * Combines per-timeframe scores into a single global bias.
 * Higher timeframes get more weight.
 *
 * Result:
 *   GlobalLong  = sum(longScore * weight)
 *   GlobalShort = sum(shortScore * weight)
 *   Normalized to 100%.
 */

const DEFAULT_WEIGHTS: Record<string, number> = {
  '15m': 1,
  '30m': 1,
  '1h': 2,
  '2h': 2,
  '4h': 3,
  '6h': 3,
  '8h': 3,
  '12h': 4,
  '1d': 5,
  '1w': 6,
};

export interface GlobalBias {
  longPercent: number;
  shortPercent: number;
  direction: SignalDirection;
  rawLong: number;
  rawShort: number;
  confidence: number;
  dominantTimeframes: string[];
}

export function aggregateTimeframes(
  analyses: TimeframeAnalysis[],
  weights?: Record<string, number>
): GlobalBias {
  const w = weights || DEFAULT_WEIGHTS;

  if (analyses.length === 0) {
    return {
      longPercent: 50,
      shortPercent: 50,
      direction: 'neutral',
      rawLong: 0,
      rawShort: 0,
      confidence: 0,
      dominantTimeframes: [],
    };
  }

  let totalLong = 0;
  let totalShort = 0;
  let totalWeight = 0;
  const dominantTimeframes: string[] = [];

  for (const a of analyses) {
    const weight = w[a.timeframe] ?? 1;
    totalLong += a.longScore * weight;
    totalShort += a.shortScore * weight;
    totalWeight += weight;

    if (weight >= 3) {
      if (a.longScore > a.shortScore + 15) dominantTimeframes.push(`${a.timeframe}↑`);
      else if (a.shortScore > a.longScore + 15) dominantTimeframes.push(`${a.timeframe}↓`);
    }
  }

  const sum = totalLong + totalShort;
  if (sum === 0) {
    return {
      longPercent: 50,
      shortPercent: 50,
      direction: 'neutral',
      rawLong: 0,
      rawShort: 0,
      confidence: 0,
      dominantTimeframes,
    };
  }

  const longPercent = Math.round((totalLong / sum) * 100);
  const shortPercent = 100 - longPercent;

  const direction: SignalDirection =
    longPercent > 60 ? 'long' :
    shortPercent > 60 ? 'short' : 'neutral';

  const confidence = Math.abs(longPercent - shortPercent);

  return {
    longPercent,
    shortPercent,
    direction,
    rawLong: totalLong,
    rawShort: totalShort,
    confidence,
    dominantTimeframes,
  };
}

export function isStrongBias(bias: GlobalBias, threshold = 65): boolean {
  return Math.max(bias.longPercent, bias.shortPercent) >= threshold;
}

export function getBiasText(bias: GlobalBias): string {
  if (bias.direction === 'neutral') {
    return `Thị trường đang cân bằng (${bias.longPercent}% Long / ${bias.shortPercent}% Short). Chờ tín hiệu rõ hơn.`;
  }

  const dominant = bias.dominantTimeframes.join(', ');
  if (bias.direction === 'long') {
    return `Xu hướng tăng ưu thế (${bias.longPercent}% Long).${dominant ? ` Khung mạnh: ${dominant}.` : ''} Ưu tiên canh Long.`;
  }

  return `Xu hướng giảm ưu thế (${bias.shortPercent}% Short).${dominant ? ` Khung mạnh: ${dominant}.` : ''} Ưu tiên canh Short.`;
}
