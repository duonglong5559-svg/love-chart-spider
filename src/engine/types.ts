// ─── Core Data Types for the 8-Layer Trading Pipeline ───

export type TrendBias = 'bullish' | 'bearish' | 'neutral';
export type SignalDirection = 'long' | 'short' | 'neutral';
export type StructureState = 'HH-HL' | 'LH-LL' | 'range' | 'breakout' | 'breakdown' | 'retest' | 'CHOCH-bull' | 'CHOCH-bear';
export type PivotRelation = 'above_pivot' | 'below_pivot' | 'at_pivot';
export type TrendlineKind = 'ascending' | 'descending';
export type TrendlineState = 'active_support' | 'active_resistance' | 'broken' | 'retested' | 'invalid';

export type SignalStatus =
  | 'IDLE'
  | 'WATCH_LONG'
  | 'WATCH_SHORT'
  | 'READY'
  | 'TRIGGERED'
  | 'ACTIVE'
  | 'TP_HIT'
  | 'SL_HIT'
  | 'INVALIDATED'
  | 'COOLDOWN';

export interface Candle {
  symbol: string;
  timeframe: string;
  openTime: number;
  closeTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isClosed: boolean;
}

export interface SwingPoint {
  index: number;
  price: number;
  type: 'high' | 'low';
  time: number;
}

export interface Trendline {
  kind: TrendlineKind;
  x1: number; y1: number;
  x2: number; y2: number;
  touches: number;
  isActive: boolean;
  state: TrendlineState;
  score: number;
}

export interface PatternSignal {
  name: string;
  nameVi: string;
  type: 'bullish' | 'bearish' | 'neutral';
  description: string;
  index: number;
  score: number;
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

export interface TimeframeAnalysis {
  symbol: string;
  timeframe: string;

  trendBias: TrendBias;
  trendScore: number;

  patternSignals: PatternSignal[];
  structureState: StructureState;
  pivotRelation: PivotRelation;

  pivot: PivotLevels;
  supportLevels: number[];
  resistanceLevels: number[];

  trendlines: Trendline[];
  swingPoints: SwingPoint[];

  atr: number;
  volatilityScore: number;

  longScore: number;
  shortScore: number;

  ema9: number;
  ema21: number;
  rsi: number;
  macdHistogram: number;
}

export interface GlobalSignal {
  symbol: string;

  direction: SignalDirection;
  confidenceLong: number;
  confidenceShort: number;

  entryLong?: number;
  entryShort?: number;

  stopLoss?: number;
  takeProfit?: number;
  target?: number;

  summaryText: string;
  status: SignalStatus;
  updatedAt: number;
}

export interface UIUpdatePayload {
  symbol: string;
  currentPrice: number;
  globalBias: {
    long: number;
    short: number;
    direction: SignalDirection;
  };
  timeframes: Record<string, {
    long: number;
    short: number;
    state: TrendBias;
    price: number;
  }>;
  signal: {
    entryLong?: number;
    entryShort?: number;
    target?: number;
    stopLoss?: number;
    summary: string;
    status: SignalStatus;
    direction: SignalDirection;
  };
  trendlineCount: number;
  pivotLevels: PivotLevels;
  patterns: PatternSignal[];
  structureState: StructureState;
}

export interface NewsItem {
  id: string;
  title: string;
  description: string;
  source: string;
  publishedAt: number;
  relatedAssets: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number;
  impactScore: number;
}

export const TIMEFRAMES = ['15m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '1w'] as const;
export type Timeframe = typeof TIMEFRAMES[number];

export const TIMEFRAME_WEIGHTS: Record<string, number> = {
  '15m': 1,
  '1h': 2,
  '2h': 2,
  '4h': 3,
  '6h': 3,
  '8h': 3,
  '12h': 4,
  '1d': 5,
  '1w': 6,
};

export const BINANCE_FUTURES_REST = 'https://fapi.binance.com/fapi/v1';
export const BINANCE_FUTURES_WS = 'wss://fstream.binance.com/ws';
