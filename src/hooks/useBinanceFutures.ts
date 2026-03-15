import { useState, useEffect, useRef, useCallback } from 'react';
import type { Candle, UIUpdatePayload } from '@/engine/types';
import { BINANCE_FUTURES_REST, BINANCE_FUTURES_WS, TIMEFRAMES } from '@/engine/types';
import {
  initializePipeline,
  loadTimeframeData,
  runInitialAnalysis,
  processRealtimeUpdate,
  clearPipeline,
  getPipelineState,
} from '@/engine/pipeline';

/**
 * Binance Perpetual Futures data hook.
 *
 * Fetches historical klines for all timeframes, initializes the
 * analysis pipeline, then subscribes to WebSocket for real-time updates.
 */

const INTERVAL_MAP: Record<string, string> = {
  '15m': '15m',
  '1h': '1h',
  '2h': '2h',
  '4h': '4h',
  '6h': '6h',
  '8h': '8h',
  '12h': '12h',
  '1d': '1d',
  '1w': '1w',
};

interface BinanceKline {
  0: number;  // openTime
  1: string;  // open
  2: string;  // high
  3: string;  // low
  4: string;  // close
  5: string;  // volume
  6: number;  // closeTime
}

function parseKlines(symbol: string, timeframe: string, data: BinanceKline[]): Candle[] {
  return data.map((k, i) => ({
    symbol,
    timeframe,
    openTime: k[0],
    closeTime: k[6],
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
    isClosed: i < data.length - 1,
  }));
}

export interface FuturesHookResult {
  uiPayload: UIUpdatePayload | null;
  loading: boolean;
  error: string | null;
  connected: boolean;
  currentPrice: number;
  candleCloseCount: number;
  allCandles: Record<string, Candle[]>;
  activeTimeframe: string;
  setActiveTimeframe: (tf: string) => void;
}

export function useBinanceFutures(symbol: string): FuturesHookResult {
  const [uiPayload, setUiPayload] = useState<UIUpdatePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [candleCloseCount, setCandleCloseCount] = useState(0);
  const [activeTimeframe, setActiveTimeframe] = useState('1h');
  const [allCandles, setAllCandles] = useState<Record<string, Candle[]>>({});

  const wsRef = useRef<WebSocket | null>(null);
  const mountedRef = useRef(true);

  const fetchAllTimeframes = useCallback(async () => {
    setLoading(true);
    setError(null);

    clearPipeline(symbol);
    initializePipeline(symbol);

    const timeframesToLoad = ['15m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '1w'];
    const candleMap: Record<string, Candle[]> = {};

    try {
      const results = await Promise.allSettled(
        timeframesToLoad.map(async (tf) => {
          const binanceTf = INTERVAL_MAP[tf] || tf;
          const res = await fetch(
            `${BINANCE_FUTURES_REST}/klines?symbol=${symbol.toUpperCase()}&interval=${binanceTf}&limit=500`
          );
          if (!res.ok) throw new Error(`Failed to fetch ${tf}: ${res.status}`);
          const data: BinanceKline[] = await res.json();
          return { tf, candles: parseKlines(symbol, tf, data) };
        })
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          const { tf, candles } = result.value;
          loadTimeframeData(symbol, tf, candles);
          candleMap[tf] = candles;

          if (candles.length > 0) {
            const lastCandle = candles[candles.length - 1];
            setCurrentPrice(lastCandle.close);
          }
        }
      }

      if (!mountedRef.current) return;

      setAllCandles(candleMap);
      const payload = runInitialAnalysis(symbol);
      if (payload) {
        setUiPayload(payload);
        setCurrentPrice(payload.currentPrice);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Lỗi kết nối Binance Futures');
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [symbol]);

  const connectWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    const streams = ['15m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '1w']
      .map(tf => `${symbol.toLowerCase()}@kline_${tf}`)
      .join('/');

    const ws = new WebSocket(`${BINANCE_FUTURES_WS}/stream?streams=${streams}`);
    wsRef.current = ws;

    ws.onopen = () => {
      if (mountedRef.current) setConnected(true);
    };

    ws.onclose = () => {
      if (mountedRef.current) setConnected(false);
    };

    ws.onerror = () => {
      if (mountedRef.current) setConnected(false);
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current) return;

      try {
        const msg = JSON.parse(event.data);
        const data = msg.data || msg;
        if (data.e !== 'kline') return;

        const k = data.k;
        const tf = k.i as string;
        const isClosed = k.x as boolean;

        const candle: Candle = {
          symbol,
          timeframe: tf,
          openTime: k.t,
          closeTime: k.T,
          open: parseFloat(k.o),
          high: parseFloat(k.h),
          low: parseFloat(k.l),
          close: parseFloat(k.c),
          volume: parseFloat(k.v),
          isClosed,
        };

        setCurrentPrice(candle.close);

        const { payload, candleClosed } = processRealtimeUpdate(symbol, tf, candle);

        if (candleClosed) {
          setCandleCloseCount(prev => prev + 1);

          setAllCandles(prev => {
            const existing = [...(prev[tf] || [])];
            existing.push({ ...candle, isClosed: true });
            if (existing.length > 500) existing.shift();
            return { ...prev, [tf]: existing };
          });
        } else {
          setAllCandles(prev => {
            const existing = [...(prev[tf] || [])];
            if (existing.length > 0) {
              existing[existing.length - 1] = candle;
            }
            return { ...prev, [tf]: existing };
          });
        }

        if (payload) {
          setUiPayload(payload);
        }
      } catch {
        // Ignore parse errors
      }
    };
  }, [symbol]);

  useEffect(() => {
    mountedRef.current = true;

    fetchAllTimeframes().then(() => {
      if (mountedRef.current) {
        connectWebSocket();
      }
    });

    return () => {
      mountedRef.current = false;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [symbol, fetchAllTimeframes, connectWebSocket]);

  return {
    uiPayload,
    loading,
    error,
    connected,
    currentPrice,
    candleCloseCount,
    allCandles,
    activeTimeframe,
    setActiveTimeframe,
  };
}
