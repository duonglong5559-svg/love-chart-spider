import { useState, useEffect, useRef, useCallback } from 'react';
import type { Candle, UIUpdatePayload } from '@/engine/types';
import {
  initializePipeline,
  loadTimeframeData,
  runInitialAnalysis,
  processRealtimeUpdate,
  clearPipeline,
} from '@/engine/pipeline';

/**
 * Binance data hook with automatic endpoint fallback.
 *
 * Tries in order:
 *   1. Binance Futures (fapi.binance.com)
 *   2. Binance Spot (api.binance.com)
 *   3. Binance US (api.binance.us)
 *
 * Fetches historical klines for all 9 timeframes, initializes the
 * analysis pipeline, then subscribes to WebSocket for real-time updates.
 */

interface APIEndpoint {
  rest: string;
  ws: string;
  label: string;
}

const ENDPOINTS: APIEndpoint[] = [
  { rest: 'https://fapi.binance.com/fapi/v1', ws: 'wss://fstream.binance.com/ws', label: 'Futures' },
  { rest: 'https://api.binance.com/api/v3', ws: 'wss://stream.binance.com:9443/ws', label: 'Spot' },
  { rest: 'https://api.binance.us/api/v3', ws: 'wss://stream.binance.us:9443/ws', label: 'US' },
];

const INTERVAL_MAP: Record<string, string> = {
  '15m': '15m', '1h': '1h', '2h': '2h', '4h': '4h',
  '6h': '6h', '8h': '8h', '12h': '12h', '1d': '1d', '1w': '1w',
};

const POLL_INTERVAL = 15_000;

interface BinanceKline {
  0: number;
  1: string;
  2: string;
  3: string;
  4: string;
  5: string;
  6: number;
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

async function detectEndpoint(): Promise<APIEndpoint> {
  for (const ep of ENDPOINTS) {
    try {
      const res = await fetch(`${ep.rest}/klines?symbol=BTCUSDT&interval=1h&limit=1`, {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          console.log(`[Spider] Using Binance ${ep.label} endpoint`);
          return ep;
        }
      }
    } catch {
      /* try next */
    }
  }
  return ENDPOINTS[0];
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
  endpointLabel: string;
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
  const [endpointLabel, setEndpointLabel] = useState('');

  const wsRef = useRef<WebSocket | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const endpointRef = useRef<APIEndpoint | null>(null);

  const fetchAllTimeframes = useCallback(async () => {
    setLoading(true);
    setError(null);

    clearPipeline(symbol);
    initializePipeline(symbol);

    if (!endpointRef.current) {
      endpointRef.current = await detectEndpoint();
      setEndpointLabel(endpointRef.current.label);
    }

    const ep = endpointRef.current;
    const timeframesToLoad = ['15m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '1w'];
    const candleMap: Record<string, Candle[]> = {};

    try {
      const results = await Promise.allSettled(
        timeframesToLoad.map(async (tf) => {
          const binanceTf = INTERVAL_MAP[tf] || tf;
          const res = await fetch(
            `${ep.rest}/klines?symbol=${symbol.toUpperCase()}&interval=${binanceTf}&limit=500`
          );
          if (!res.ok) throw new Error(`Failed ${tf}: ${res.status}`);
          const data = await res.json();
          if (!Array.isArray(data)) throw new Error(`Invalid data for ${tf}`);
          return { tf, candles: parseKlines(symbol, tf, data as BinanceKline[]) };
        })
      );

      let loadedCount = 0;
      for (const result of results) {
        if (result.status === 'fulfilled') {
          const { tf, candles } = result.value;
          loadTimeframeData(symbol, tf, candles);
          candleMap[tf] = candles;
          loadedCount++;

          if (candles.length > 0) {
            setCurrentPrice(candles[candles.length - 1].close);
          }
        }
      }

      if (!mountedRef.current) return;

      if (loadedCount === 0) {
        setError('Không thể tải dữ liệu từ Binance. Thử lại sau.');
        return;
      }

      setAllCandles(candleMap);
      const payload = runInitialAnalysis(symbol);
      if (payload) {
        setUiPayload(payload);
        setCurrentPrice(payload.currentPrice);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Lỗi kết nối Binance');
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [symbol]);

  const connectWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const ep = endpointRef.current;
    if (!ep) return;

    const streams = ['15m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '1w']
      .map(tf => `${symbol.toLowerCase()}@kline_${tf}`)
      .join('/');

    const wsUrl = ep.label === 'Futures'
      ? `${ep.ws}/stream?streams=${streams}`
      : `${ep.ws}/${streams}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (mountedRef.current) setConnected(true);
      };

      ws.onclose = () => {
        if (mountedRef.current) {
          setConnected(false);
          startPolling();
        }
      };

      ws.onerror = () => {
        if (mountedRef.current) {
          setConnected(false);
          ws.close();
          startPolling();
        }
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

          if (payload) setUiPayload(payload);
        } catch {
          /* ignore parse errors */
        }
      };
    } catch {
      startPolling();
    }
  }, [symbol]);

  const startPolling = useCallback(() => {
    if (pollRef.current) return;

    console.log('[Spider] WebSocket unavailable, falling back to polling');

    pollRef.current = setInterval(async () => {
      if (!mountedRef.current || !endpointRef.current) return;

      const ep = endpointRef.current;
      const tf = '15m';
      try {
        const res = await fetch(
          `${ep.rest}/klines?symbol=${symbol.toUpperCase()}&interval=${tf}&limit=2`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) return;

        const lastKline = data[data.length - 1] as BinanceKline;
        const price = parseFloat(lastKline[4]);
        setCurrentPrice(price);

        const candle: Candle = {
          symbol,
          timeframe: tf,
          openTime: lastKline[0],
          closeTime: lastKline[6],
          open: parseFloat(lastKline[1]),
          high: parseFloat(lastKline[2]),
          low: parseFloat(lastKline[3]),
          close: price,
          volume: parseFloat(lastKline[5]),
          isClosed: false,
        };

        const { payload } = processRealtimeUpdate(symbol, tf, candle);
        if (payload) setUiPayload(payload);
      } catch {
        /* ignore poll errors */
      }
    }, POLL_INTERVAL);
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
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
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
    endpointLabel,
  };
}
