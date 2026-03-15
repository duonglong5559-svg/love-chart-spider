import type { Candle } from './types';

/**
 * Candle State Engine
 *
 * Manages the critical distinction between forming (live) candles
 * and closed (locked) candles. Analysis should only confirm on
 * closed candles to avoid repaint.
 *
 * State machine per candle:
 *   new → live updates → close condition → lock → push to analysis → spawn next
 */

export class CandleStateEngine {
  private cache: Map<string, Candle[]> = new Map();
  private formingCandle: Map<string, Candle> = new Map();
  private maxCandles: number;

  constructor(maxCandles = 500) {
    this.maxCandles = maxCandles;
  }

  private key(symbol: string, timeframe: string): string {
    return `${symbol}:${timeframe}`;
  }

  initCache(symbol: string, timeframe: string, candles: Candle[]): void {
    const k = this.key(symbol, timeframe);
    const closed = candles.filter(c => c.isClosed);
    const forming = candles.find(c => !c.isClosed);

    this.cache.set(k, closed.slice(-this.maxCandles));
    if (forming) {
      this.formingCandle.set(k, forming);
    }
  }

  getClosedCandles(symbol: string, timeframe: string): Candle[] {
    return this.cache.get(this.key(symbol, timeframe)) || [];
  }

  getFormingCandle(symbol: string, timeframe: string): Candle | undefined {
    return this.formingCandle.get(this.key(symbol, timeframe));
  }

  getAllCandles(symbol: string, timeframe: string): Candle[] {
    const closed = this.getClosedCandles(symbol, timeframe);
    const forming = this.getFormingCandle(symbol, timeframe);
    return forming ? [...closed, forming] : [...closed];
  }

  /**
   * Process a kline update event.
   * Returns { candleClosed: boolean } to tell the pipeline
   * whether to run full analysis.
   */
  updateCandle(candle: Candle): { candleClosed: boolean } {
    const k = this.key(candle.symbol, candle.timeframe);

    if (candle.isClosed) {
      const locked: Candle = { ...candle, isClosed: true };
      const existing = this.cache.get(k) || [];
      existing.push(locked);
      if (existing.length > this.maxCandles) existing.shift();
      this.cache.set(k, existing);

      const nextCandle: Candle = {
        symbol: candle.symbol,
        timeframe: candle.timeframe,
        openTime: candle.closeTime,
        closeTime: candle.closeTime + (candle.closeTime - candle.openTime),
        open: candle.close,
        high: candle.close,
        low: candle.close,
        close: candle.close,
        volume: 0,
        isClosed: false,
      };
      this.formingCandle.set(k, nextCandle);

      return { candleClosed: true };
    }

    const forming = this.formingCandle.get(k);
    if (forming) {
      forming.high = Math.max(forming.high, candle.high);
      forming.low = Math.min(forming.low, candle.low);
      forming.close = candle.close;
      forming.volume = candle.volume;
    } else {
      this.formingCandle.set(k, { ...candle, isClosed: false });
    }

    return { candleClosed: false };
  }

  clearAll(): void {
    this.cache.clear();
    this.formingCandle.clear();
  }

  clearSymbol(symbol: string): void {
    for (const [k] of this.cache) {
      if (k.startsWith(`${symbol}:`)) {
        this.cache.delete(k);
        this.formingCandle.delete(k);
      }
    }
  }
}

export const candleStateEngine = new CandleStateEngine();
