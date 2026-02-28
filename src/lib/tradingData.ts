// Generate realistic candlestick data
export interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PivotLevels {
  pp: number;
  r1: number;
  r2: number;
  r3: number;
  s1: number;
  s2: number;
  s3: number;
}

export interface CandlePattern {
  name: string;
  nameVi: string;
  type: 'bullish' | 'bearish' | 'neutral';
  description: string;
  index: number;
}

export interface Signal {
  type: 'BUY' | 'SELL';
  price: number;
  time: string;
  reason: string;
  strength: number;
}

export interface PriceAlert {
  id: string;
  type: 'resistance' | 'support';
  price: number;
  label: string;
  atrDistance: number;
  strength: 'Rất mạnh' | 'Mạnh' | 'Trung bình';
  confidence: number;
  testCount: number;
  rrRatio: string;
  action: string;
  pattern: string;
  scalp: number;
  swing: number;
  stopLoss: number;
  stopLossAdjusted: boolean;
  auto: boolean;
}

export interface TrendLine {
  startIndex: number;
  endIndex: number;
  startPrice: number;
  endPrice: number;
  type: 'support' | 'resistance' | 'channel';
  color: string;
}

let basePrice = 1920 + Math.random() * 80;

export function generateCandles(count: number): Candle[] {
  const candles: Candle[] = [];
  const now = Date.now();
  
  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.48) * 15;
    const open = basePrice;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * 8;
    const low = Math.min(open, close) - Math.random() * 8;
    const volume = Math.floor(50000 + Math.random() * 150000);
    
    candles.push({
      time: new Date(now - (count - i) * 5 * 60000).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      open: +open.toFixed(2),
      high: +high.toFixed(2),
      low: +low.toFixed(2),
      close: +close.toFixed(2),
      volume,
    });
    
    basePrice = close;
  }
  
  return candles;
}

export function addNewCandle(candles: Candle[]): Candle[] {
  const last = candles[candles.length - 1];
  const change = (Math.random() - 0.48) * 12;
  const open = last.close;
  const close = open + change;
  const high = Math.max(open, close) + Math.random() * 6;
  const low = Math.min(open, close) - Math.random() * 6;
  
  const newCandle: Candle = {
    time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    open: +open.toFixed(2),
    high: +high.toFixed(2),
    low: +low.toFixed(2),
    close: +close.toFixed(2),
    volume: Math.floor(50000 + Math.random() * 150000),
  };
  
  basePrice = close;
  return [...candles.slice(1), newCandle];
}

export function calculatePivots(candles: Candle[]): PivotLevels {
  // Use a wider range for more meaningful pivots
  const recent = candles.slice(-20);
  const h = Math.max(...recent.map(c => c.high));
  const l = Math.min(...recent.map(c => c.low));
  const c = candles[candles.length - 1].close;
  
  const pp = (h + l + c) / 3;
  
  return {
    pp: +pp.toFixed(2),
    r1: +(2 * pp - l).toFixed(2),
    r2: +(pp + (h - l)).toFixed(2),
    r3: +(h + 2 * (pp - l)).toFixed(2),
    s1: +(2 * pp - h).toFixed(2),
    s2: +(pp - (h - l)).toFixed(2),
    s3: +(l - 2 * (h - pp)).toFixed(2),
  };
}

export function detectPatterns(candles: Candle[]): CandlePattern[] {
  const patterns: CandlePattern[] = [];
  
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const prev = candles[i - 1];
    const body = Math.abs(c.close - c.open);
    const range = c.high - c.low;
    const upperShadow = c.high - Math.max(c.open, c.close);
    const lowerShadow = Math.min(c.open, c.close) - c.low;
    
    if (body < range * 0.1 && range > 2) {
      patterns.push({ name: 'Doji', nameVi: 'Nến Doji', type: 'neutral', description: 'Thị trường do dự, có thể đảo chiều', index: i });
    }
    
    if (lowerShadow > body * 2 && upperShadow < body * 0.5 && c.close > c.open) {
      patterns.push({ name: 'Hammer', nameVi: 'Nến Búa', type: 'bullish', description: 'Tín hiệu đảo chiều tăng', index: i });
    }
    
    if (upperShadow > body * 2 && lowerShadow < body * 0.5 && c.close < c.open) {
      patterns.push({ name: 'Shooting Star', nameVi: 'Sao Băng', type: 'bearish', description: 'Tín hiệu đảo chiều giảm', index: i });
    }
    
    if (prev.close < prev.open && c.close > c.open && c.open < prev.close && c.close > prev.open) {
      patterns.push({ name: 'Bullish Engulfing', nameVi: 'Nhấn Chìm Tăng', type: 'bullish', description: 'Mẫu hình đảo chiều tăng mạnh', index: i });
    }
    
    if (prev.close > prev.open && c.close < c.open && c.open > prev.close && c.close < prev.open) {
      patterns.push({ name: 'Bearish Engulfing', nameVi: 'Nhấn Chìm Giảm', type: 'bearish', description: 'Mẫu hình đảo chiều giảm mạnh', index: i });
    }

    // Three White Soldiers
    if (i >= 2) {
      const pp = candles[i - 2];
      if (pp.close > pp.open && prev.close > prev.open && c.close > c.open && prev.close > pp.close && c.close > prev.close) {
        patterns.push({ name: 'Three White Soldiers', nameVi: 'Ba Lính Trắng', type: 'bullish', description: 'Ba nến tăng liên tiếp - xu hướng tăng mạnh', index: i });
      }
      if (pp.close < pp.open && prev.close < prev.open && c.close < c.open && prev.close < pp.close && c.close < prev.close) {
        patterns.push({ name: 'Three Black Crows', nameVi: 'Ba Con Quạ Đen', type: 'bearish', description: 'Ba nến giảm liên tiếp - xu hướng giảm mạnh', index: i });
      }
    }
  }
  
  return patterns.slice(-8);
}

export function generateSignals(candles: Candle[], pivots: PivotLevels): Signal[] {
  const signals: Signal[] = [];
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  
  if (prev.close < pivots.s1 && last.close > pivots.s1) {
    signals.push({ type: 'BUY', price: last.close, time: last.time, reason: 'Giá vượt S1 - hỗ trợ phản hồi', strength: 3 });
  }
  if (prev.close > pivots.r1 && last.close < pivots.r1) {
    signals.push({ type: 'SELL', price: last.close, time: last.time, reason: 'Giá thủng R1 - kháng cự từ chối', strength: 3 });
  }
  if (last.close > last.open && prev.close > prev.open && last.close > prev.close) {
    signals.push({ type: 'BUY', price: last.close, time: last.time, reason: 'Xu hướng tăng liên tiếp 2 nến', strength: 2 });
  }
  if (last.close < last.open && prev.close < prev.open && last.close < prev.close) {
    signals.push({ type: 'SELL', price: last.close, time: last.time, reason: 'Xu hướng giảm liên tiếp 2 nến', strength: 2 });
  }
  if (Math.abs(last.close - pivots.pp) < 3) {
    signals.push({ type: last.close > last.open ? 'BUY' : 'SELL', price: last.close, time: last.time, reason: 'Giá gần Pivot Point - chờ breakout', strength: 4 });
  }
  
  return signals.slice(-5);
}

// Deterministic hash for stable random-like values based on price level
function stableHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

export function generateAlerts(candles: Candle[], pivots: PivotLevels, patterns: CandlePattern[]): PriceAlert[] {
  const last = candles[candles.length - 1];
  const atr = calculateATR(candles);
  const alerts: PriceAlert[] = [];
  
  const resistanceLevels = [
    { price: pivots.r1, label: 'R1' },
    { price: pivots.r2, label: 'R2' },
    { price: pivots.r3, label: 'R3' },
  ];
  
  const supportLevels = [
    { price: pivots.s1, label: 'S1' },
    { price: pivots.s2, label: 'S2' },
    { price: pivots.s3, label: 'S3' },
  ];

  resistanceLevels.forEach((level, idx) => {
    const dist = Math.abs(last.close - level.price) / atr;
    if (dist < 2) {
      const nearestPattern = patterns.find(p => p.type === 'bearish');
      const hash = stableHash(`res-${level.label}-${level.price.toFixed(0)}`);
      const confidence = Math.max(65, Math.min(95, Math.round(90 - dist * 10 + (hash % 10))));
      const testCount = 2 + (hash % 4);
      const rrVal = 1 + ((hash % 15) / 10);
      
      // Resistance: Short trade - entry near resistance, TP below, SL above
      const entry = level.price;
      const scalp = +(entry - atr * 0.5).toFixed(2);  // Quick TP: 0.5 ATR below resistance
      const swing = +(entry - atr * 1.5).toFixed(2);   // Swing TP: 1.5 ATR below resistance
      const stopLoss = +(entry + atr * 0.8).toFixed(2); // SL: 0.8 ATR above resistance
      
      alerts.push({
        id: `res-${idx}`,
        type: 'resistance',
        price: level.price,
        label: level.label,
        atrDistance: +dist.toFixed(1),
        strength: dist < 0.6 ? 'Rất mạnh' : dist < 1.2 ? 'Mạnh' : 'Trung bình',
        confidence,
        testCount,
        rrRatio: `1:${rrVal.toFixed(1)}`,
        action: dist < 0.5 ? 'Chờ rejection để Short' : 'Quan sát breakout hoặc rejection',
        pattern: nearestPattern ? `Mô hình: ${nearestPattern.nameVi}` : 'Chưa có mô hình xác nhận',
        scalp,
        swing,
        stopLoss,
        stopLossAdjusted: (hash % 2) === 0,
        auto: true,
      });
    }
  });

  supportLevels.forEach((level, idx) => {
    const dist = Math.abs(last.close - level.price) / atr;
    if (dist < 2) {
      const nearestPattern = patterns.find(p => p.type === 'bullish');
      const hash = stableHash(`sup-${level.label}-${level.price.toFixed(0)}`);
      const confidence = Math.max(65, Math.min(95, Math.round(90 - dist * 10 + (hash % 10))));
      const testCount = 2 + (hash % 4);
      const rrVal = 1 + ((hash % 15) / 10);
      
      // Support: Long trade - entry near support, TP above, SL below
      const entry = level.price;
      const scalp = +(entry + atr * 0.5).toFixed(2);  // Quick TP: 0.5 ATR above support
      const swing = +(entry + atr * 1.5).toFixed(2);   // Swing TP: 1.5 ATR above support
      const stopLoss = +(entry - atr * 0.8).toFixed(2); // SL: 0.8 ATR below support
      
      alerts.push({
        id: `sup-${idx}`,
        type: 'support',
        price: level.price,
        label: level.label,
        atrDistance: +dist.toFixed(1),
        strength: dist < 0.6 ? 'Rất mạnh' : dist < 1.2 ? 'Mạnh' : 'Trung bình',
        confidence,
        testCount,
        rrRatio: `1:${rrVal.toFixed(1)}`,
        action: dist < 0.5 ? 'Chờ bounce để Long' : 'Quan sát bounce hoặc breakdown',
        pattern: nearestPattern ? `Mô hình: ${nearestPattern.nameVi}` : 'Chưa có mô hình xác nhận',
        scalp,
        swing,
        stopLoss,
        stopLossAdjusted: (hash % 2) === 0,
        auto: true,
      });
    }
  });

  return alerts;
}

export function calculateATR(candles: Candle[], period = 14): number {
  if (candles.length < period + 1) return candles[candles.length - 1].high - candles[candles.length - 1].low;
  
  let atrSum = 0;
  for (let i = candles.length - period; i < candles.length; i++) {
    const tr = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close)
    );
    atrSum += tr;
  }
  return atrSum / period;
}

export function calculateRSI(candles: Candle[], period = 14): number[] {
  const rsi: number[] = [];
  const closes = candles.map(c => c.close);
  
  for (let i = 0; i < period; i++) rsi.push(50);
  
  for (let i = period; i < closes.length; i++) {
    let gains = 0, losses = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const diff = closes[j] - closes[j - 1];
      if (diff > 0) gains += diff;
      else losses -= diff;
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi.push(+(100 - 100 / (1 + rs)).toFixed(1));
  }
  return rsi;
}

export function calculateEMA(candles: Candle[], period: number): number[] {
  const closes = candles.map(c => c.close);
  const ema: number[] = [closes[0]];
  const k = 2 / (period + 1);
  
  for (let i = 1; i < closes.length; i++) {
    ema.push(closes[i] * k + ema[i - 1] * (1 - k));
  }
  return ema;
}

export function calculateMACD(candles: Candle[]): { macd: number[]; signal: number[]; histogram: number[] } {
  const ema12 = calculateEMA(candles, 12);
  const ema26 = calculateEMA(candles, 26);
  const macdLine = ema12.map((v, i) => v - ema26[i]);
  
  // Signal line (9-period EMA of MACD)
  const signalLine: number[] = [macdLine[0]];
  const k = 2 / 10;
  for (let i = 1; i < macdLine.length; i++) {
    signalLine.push(macdLine[i] * k + signalLine[i - 1] * (1 - k));
  }
  
  const histogram = macdLine.map((v, i) => v - signalLine[i]);
  
  return { macd: macdLine, signal: signalLine, histogram };
}

export function generateTrendLines(candles: Candle[]): TrendLine[] {
  const lines: TrendLine[] = [];
  const len = candles.length;
  if (len < 10) return lines;

  // Find swing highs (local maxima)
  const swingHighs: { index: number; price: number }[] = [];
  const swingLows: { index: number; price: number }[] = [];

  for (let i = 3; i < len - 3; i++) {
    const isHigh = candles[i].high >= candles[i - 1].high && candles[i].high >= candles[i - 2].high &&
                   candles[i].high >= candles[i + 1].high && candles[i].high >= candles[i + 2].high;
    const isLow = candles[i].low <= candles[i - 1].low && candles[i].low <= candles[i - 2].low &&
                  candles[i].low <= candles[i + 1].low && candles[i].low <= candles[i + 2].low;

    if (isHigh) swingHighs.push({ index: i, price: candles[i].high });
    if (isLow) swingLows.push({ index: i, price: candles[i].low });
  }

  // Connect swing highs for resistance trend lines
  for (let i = 0; i < swingHighs.length - 1 && lines.length < 4; i++) {
    const a = swingHighs[i];
    const b = swingHighs[i + 1];
    if (b.index - a.index >= 5) {
      // Extend the line to the end of the chart
      const slope = (b.price - a.price) / (b.index - a.index);
      const endIdx = Math.min(len - 1, b.index + 15);
      const endPrice = b.price + slope * (endIdx - b.index);
      lines.push({
        startIndex: a.index,
        endIndex: endIdx,
        startPrice: a.price,
        endPrice: endPrice,
        type: 'resistance',
        color: 'hsl(348, 80%, 55%)',
      });
    }
  }

  // Connect swing lows for support trend lines
  for (let i = 0; i < swingLows.length - 1 && lines.length < 8; i++) {
    const a = swingLows[i];
    const b = swingLows[i + 1];
    if (b.index - a.index >= 5) {
      const slope = (b.price - a.price) / (b.index - a.index);
      const endIdx = Math.min(len - 1, b.index + 15);
      const endPrice = b.price + slope * (endIdx - b.index);
      lines.push({
        startIndex: a.index,
        endIndex: endIdx,
        startPrice: a.price,
        endPrice: endPrice,
        type: 'support',
        color: 'hsl(145, 80%, 45%)',
      });
    }
  }

  // Add horizontal channel lines at key swing levels
  if (swingHighs.length > 0) {
    const topSwing = swingHighs.reduce((a, b) => b.price > a.price ? b : a);
    lines.push({
      startIndex: topSwing.index,
      endIndex: len - 1,
      startPrice: topSwing.price,
      endPrice: topSwing.price,
      type: 'channel',
      color: 'hsl(45, 90%, 55%)',
    });
  }
  if (swingLows.length > 0) {
    const bottomSwing = swingLows.reduce((a, b) => b.price < a.price ? b : a);
    lines.push({
      startIndex: bottomSwing.index,
      endIndex: len - 1,
      startPrice: bottomSwing.price,
      endPrice: bottomSwing.price,
      type: 'channel',
      color: 'hsl(45, 90%, 55%)',
    });
  }

  return lines.slice(0, 10);
}

export function getSentiment(candles: Candle[]): { bullPct: number; bearPct: number } {
  const recent = candles.slice(-20);
  const bulls = recent.filter(c => c.close >= c.open).length;
  const pct = Math.round((bulls / recent.length) * 100);
  return { bullPct: pct, bearPct: 100 - pct };
}

export function getPivotAnalysis(price: number, pivots: PivotLevels): string {
  if (price > pivots.pp) {
    const nearestR = [pivots.r1, pivots.r2, pivots.r3].find(r => r > price);
    return `Giá đang ở phía trên Pivot (${pivots.pp.toLocaleString()}), có xu hướng tăng${nearestR ? `. Kháng cự gần nhất: ${nearestR.toLocaleString()}` : ''}`;
  } else {
    const nearestS = [pivots.s1, pivots.s2, pivots.s3].reverse().find(s => s < price);
    return `Giá đang ở phía dưới Pivot (${pivots.pp.toLocaleString()}), có xu hướng giảm${nearestS ? `. Hỗ trợ gần nhất: ${nearestS.toLocaleString()}` : ''}`;
  }
}
