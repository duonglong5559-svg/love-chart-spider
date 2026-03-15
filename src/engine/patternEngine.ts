import type { Candle, PatternSignal } from './types';

/**
 * Pattern Engine
 *
 * Detects candlestick patterns from OHLC data only.
 * Patterns are features, not standalone signals.
 * Only confirmed on closed candles.
 */

function body(c: Candle): number {
  return Math.abs(c.close - c.open);
}

function range(c: Candle): number {
  return c.high - c.low;
}

function upperWick(c: Candle): number {
  return c.high - Math.max(c.open, c.close);
}

function lowerWick(c: Candle): number {
  return Math.min(c.open, c.close) - c.low;
}

function isBullish(c: Candle): boolean {
  return c.close > c.open;
}

function isBearish(c: Candle): boolean {
  return c.close < c.open;
}

function isInDowntrend(candles: Candle[], idx: number, lookback = 5): boolean {
  if (idx < lookback) return false;
  let count = 0;
  for (let i = idx - lookback; i < idx; i++) {
    if (candles[i].close < candles[i].open) count++;
  }
  return count >= Math.ceil(lookback * 0.6);
}

function isInUptrend(candles: Candle[], idx: number, lookback = 5): boolean {
  if (idx < lookback) return false;
  let count = 0;
  for (let i = idx - lookback; i < idx; i++) {
    if (candles[i].close > candles[i].open) count++;
  }
  return count >= Math.ceil(lookback * 0.6);
}

export function detectPatterns(candles: Candle[]): PatternSignal[] {
  const patterns: PatternSignal[] = [];
  if (candles.length < 3) return patterns;

  const minRange = range(candles[candles.length - 1]) * 0.001;

  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    if (!c.isClosed) continue;

    const b = body(c);
    const r = range(c);
    const uw = upperWick(c);
    const lw = lowerWick(c);

    if (r < minRange) continue;

    const prev = candles[i - 1];
    const prevB = body(prev);

    // ─── Single Candle Patterns ───

    // Doji
    if (b < r * 0.1) {
      if (uw > r * 0.6 && lw < r * 0.1) {
        patterns.push({
          name: 'Gravestone Doji', nameVi: 'Doji Bia Mộ',
          type: 'bearish', description: 'Phe mua bị từ chối hoàn toàn',
          index: i, score: -15,
        });
      } else if (lw > r * 0.6 && uw < r * 0.1) {
        patterns.push({
          name: 'Dragonfly Doji', nameVi: 'Doji Chuồn Chuồn',
          type: 'bullish', description: 'Phe bán bị từ chối',
          index: i, score: 15,
        });
      } else {
        patterns.push({
          name: 'Doji', nameVi: 'Nến Doji',
          type: 'neutral', description: 'Thị trường do dự',
          index: i, score: 0,
        });
      }
    }

    // Hammer
    if (lw > b * 2 && uw < b * 0.5 && isBullish(c) && b > r * 0.1) {
      const contextScore = isInDowntrend(candles, i) ? 20 : 10;
      patterns.push({
        name: 'Hammer', nameVi: 'Nến Búa',
        type: 'bullish', description: 'Tín hiệu đảo chiều tăng',
        index: i, score: contextScore,
      });
    }

    // Inverted Hammer
    if (uw > b * 2 && lw < b * 0.5 && isBullish(c) && b > r * 0.1) {
      patterns.push({
        name: 'Inverted Hammer', nameVi: 'Búa Ngược',
        type: 'bullish', description: 'Tín hiệu đảo chiều tăng tiềm năng',
        index: i, score: 10,
      });
    }

    // Shooting Star
    if (uw > b * 2 && lw < b * 0.5 && isBearish(c) && b > r * 0.1) {
      const contextScore = isInUptrend(candles, i) ? -20 : -10;
      patterns.push({
        name: 'Shooting Star', nameVi: 'Sao Băng',
        type: 'bearish', description: 'Tín hiệu đảo chiều giảm',
        index: i, score: contextScore,
      });
    }

    // Hanging Man
    if (lw > b * 2 && uw < b * 0.5 && isBearish(c) && b > r * 0.1) {
      patterns.push({
        name: 'Hanging Man', nameVi: 'Người Treo Cổ',
        type: 'bearish', description: 'Tín hiệu đảo chiều giảm tại đỉnh',
        index: i, score: -15,
      });
    }

    // ─── Two Candle Patterns ───

    // Bullish Engulfing
    if (isBearish(prev) && isBullish(c) && c.open <= prev.close && c.close >= prev.open && b > prevB) {
      const contextScore = isInDowntrend(candles, i) ? 25 : 15;
      patterns.push({
        name: 'Bullish Engulfing', nameVi: 'Nhấn Chìm Tăng',
        type: 'bullish', description: 'Đảo chiều tăng mạnh',
        index: i, score: contextScore,
      });
    }

    // Bearish Engulfing
    if (isBullish(prev) && isBearish(c) && c.open >= prev.close && c.close <= prev.open && b > prevB) {
      const contextScore = isInUptrend(candles, i) ? -25 : -15;
      patterns.push({
        name: 'Bearish Engulfing', nameVi: 'Nhấn Chìm Giảm',
        type: 'bearish', description: 'Đảo chiều giảm mạnh',
        index: i, score: contextScore,
      });
    }

    // Piercing Line
    if (isBearish(prev) && isBullish(c) && c.open < prev.low &&
        c.close > (prev.open + prev.close) / 2 && c.close < prev.open) {
      patterns.push({
        name: 'Piercing Line', nameVi: 'Đường Xuyên',
        type: 'bullish', description: 'Nến xuyên qua >50% thân nến giảm',
        index: i, score: 15,
      });
    }

    // Dark Cloud Cover
    if (isBullish(prev) && isBearish(c) && c.open > prev.high &&
        c.close < (prev.open + prev.close) / 2 && c.close > prev.open) {
      patterns.push({
        name: 'Dark Cloud Cover', nameVi: 'Mây Đen Bao Phủ',
        type: 'bearish', description: 'Nến giảm xuyên qua >50% thân nến tăng',
        index: i, score: -15,
      });
    }

    // Tweezer Bottom
    if (Math.abs(c.low - prev.low) < r * 0.05 && isBearish(prev) && isBullish(c)) {
      patterns.push({
        name: 'Tweezer Bottom', nameVi: 'Đáy Nhíp',
        type: 'bullish', description: 'Hỗ trợ mạnh - hai đáy bằng nhau',
        index: i, score: 15,
      });
    }

    // Tweezer Top
    if (Math.abs(c.high - prev.high) < r * 0.05 && isBullish(prev) && isBearish(c)) {
      patterns.push({
        name: 'Tweezer Top', nameVi: 'Đỉnh Nhíp',
        type: 'bearish', description: 'Kháng cự mạnh - hai đỉnh bằng nhau',
        index: i, score: -15,
      });
    }

    // ─── Three Candle Patterns ───
    if (i >= 2) {
      const pp = candles[i - 2];
      const ppB = body(pp);
      const ppR = range(pp);

      // Three White Soldiers
      if (isBullish(pp) && isBullish(prev) && isBullish(c) &&
          prev.close > pp.close && c.close > prev.close &&
          ppB > ppR * 0.4 && prevB > range(prev) * 0.4 && b > r * 0.4) {
        patterns.push({
          name: 'Three White Soldiers', nameVi: 'Ba Lính Trắng',
          type: 'bullish', description: 'Xu hướng tăng mạnh - 3 nến tăng liên tiếp',
          index: i, score: 25,
        });
      }

      // Three Black Crows
      if (isBearish(pp) && isBearish(prev) && isBearish(c) &&
          prev.close < pp.close && c.close < prev.close &&
          ppB > ppR * 0.4 && prevB > range(prev) * 0.4 && b > r * 0.4) {
        patterns.push({
          name: 'Three Black Crows', nameVi: 'Ba Con Quạ Đen',
          type: 'bearish', description: 'Xu hướng giảm mạnh - 3 nến giảm liên tiếp',
          index: i, score: -25,
        });
      }

      // Morning Star
      if (isBearish(pp) && ppB > ppR * 0.5 &&
          body(prev) < range(prev) * 0.3 &&
          isBullish(c) && b > r * 0.5 &&
          c.close > (pp.open + pp.close) / 2) {
        patterns.push({
          name: 'Morning Star', nameVi: 'Sao Mai',
          type: 'bullish', description: 'Đảo chiều tăng mạnh - 3 nến',
          index: i, score: 25,
        });
      }

      // Evening Star
      if (isBullish(pp) && ppB > ppR * 0.5 &&
          body(prev) < range(prev) * 0.3 &&
          isBearish(c) && b > r * 0.5 &&
          c.close < (pp.open + pp.close) / 2) {
        patterns.push({
          name: 'Evening Star', nameVi: 'Sao Hôm',
          type: 'bearish', description: 'Đảo chiều giảm mạnh - 3 nến',
          index: i, score: -25,
        });
      }
    }
  }

  return patterns;
}

export function getRecentPatterns(patterns: PatternSignal[], count = 5): PatternSignal[] {
  return patterns.slice(-count);
}

export function getPatternScore(patterns: PatternSignal[], lookback = 5): number {
  const recent = patterns.slice(-lookback);
  if (recent.length === 0) return 0;
  return recent.reduce((sum, p) => sum + p.score, 0) / recent.length;
}
