import { useState, useEffect, useRef, useCallback } from 'react';
import { Candle } from '@/lib/tradingData';

const BINANCE_REST = 'https://api.binance.com/api/v3';
const BINANCE_WS = 'wss://stream.binance.com:9443/ws';

const INTERVAL_MAP: Record<string, string> = {
  'M1': '1m',
  'M5': '5m',
  'M15': '15m',
  'H1': '1h',
  'H4': '4h',
  'D1': '1d',
};

interface BinanceKline {
  0: number;
  1: string;
  2: string;
  3: string;
  4: string;
  5: string;
  6: number;
}

function parseKline(k: BinanceKline): Candle {
  return {
    time: new Date(k[0]).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
  };
}

export function useBinanceData(symbol: string, timeframe: string, onCandleClose?: () => void) {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [candleCloseCount, setCandleCloseCount] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const onCandleCloseRef = useRef(onCandleClose);
  onCandleCloseRef.current = onCandleClose;

  const binanceInterval = INTERVAL_MAP[timeframe] || '5m';
  const binanceSymbol = symbol.toLowerCase();

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${BINANCE_REST}/klines?symbol=${symbol.toUpperCase()}&interval=${binanceInterval}&limit=80`
      );
      if (!res.ok) throw new Error(`Binance API error: ${res.status}`);
      const data: BinanceKline[] = await res.json();
      setCandles(data.map(parseKline));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi kết nối Binance');
    } finally {
      setLoading(false);
    }
  }, [symbol, binanceInterval]);

  useEffect(() => {
    fetchHistory();

    const streamName = `${binanceSymbol}@kline_${binanceInterval}`;
    const ws = new WebSocket(`${BINANCE_WS}/${streamName}`);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.e !== 'kline') return;

      const k = msg.k;
      const updatedCandle: Candle = {
        time: new Date(k.t).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        open: parseFloat(k.o),
        high: parseFloat(k.h),
        low: parseFloat(k.l),
        close: parseFloat(k.c),
        volume: parseFloat(k.v),
      };

      const isClosed = k.x as boolean;

      setCandles(prev => {
        if (prev.length === 0) return prev;
        const copy = [...prev];
        if (isClosed) {
          copy.push(updatedCandle);
          if (copy.length > 80) copy.shift();
        } else {
          copy[copy.length - 1] = updatedCandle;
        }
        return copy;
      });

      if (isClosed) {
        setCandleCloseCount(c => c + 1);
        onCandleCloseRef.current?.();
      }
    };

    return () => {
      ws.close();
    };
  }, [binanceSymbol, binanceInterval, fetchHistory]);

  return { candles, loading, error, connected, candleCloseCount };
}
