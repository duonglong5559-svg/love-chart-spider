import { useState, useEffect, useCallback } from 'react';
import { Candle, calculatePivots, calculateRSI, calculateEMA, calculateMACD, detectPatterns, PivotLevels } from '@/lib/tradingData';

const BINANCE_REST = 'https://api.binance.com/api/v3';

interface TimeframeData {
  timeframe: string;
  candles: Candle[];
  pivots: PivotLevels | null;
  rsi: number;
  macdHistogram: number;
  ema9: number;
  ema21: number;
  trend: 'UP' | 'DOWN' | 'SIDEWAYS';
  patterns: string[];
  bullPct: number;
}

export interface MultiTFAnalysis {
  timeframes: TimeframeData[];
  overallBias: 'LONG' | 'SHORT' | 'NEUTRAL';
  confluenceScore: number; // 0-100
  htfTrend: string;
  summary: string;
}

const HIGHER_TFS: Record<string, string[]> = {
  'M1': ['5m', '15m', '1h'],
  'M5': ['15m', '1h', '4h'],
  'M15': ['1h', '4h', '1d'],
  'M30': ['1h', '4h', '1d'],
  'H1': ['4h', '1d', '1w'],
  'H4': ['1d', '1w'],
  'D1': ['1w'],
  'W1': [],
  '1M': [],
};

const TF_LABELS: Record<string, string> = {
  '1m': 'M1', '5m': 'M5', '15m': 'M15', '30m': 'M30',
  '1h': 'H1', '4h': 'H4', '1d': 'D1', '1w': 'W1',
};

function parseKline(k: any): Candle {
  return {
    time: new Date(k[0]).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
  };
}

function determineTrend(candles: Candle[]): 'UP' | 'DOWN' | 'SIDEWAYS' {
  if (candles.length < 10) return 'SIDEWAYS';
  const ema9 = calculateEMA(candles, 9);
  const ema21 = calculateEMA(candles, 21);
  const last9 = ema9[ema9.length - 1];
  const last21 = ema21[ema21.length - 1];
  const price = candles[candles.length - 1].close;
  
  if (price > last9 && last9 > last21) return 'UP';
  if (price < last9 && last9 < last21) return 'DOWN';
  return 'SIDEWAYS';
}

export function useMultiTimeframe(symbol: string, currentTimeframe: string) {
  const [analysis, setAnalysis] = useState<MultiTFAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchHTFData = useCallback(async () => {
    const higherTFs = HIGHER_TFS[currentTimeframe] || [];
    if (higherTFs.length === 0) {
      setAnalysis(null);
      return;
    }

    setLoading(true);
    try {
      const results = await Promise.all(
        higherTFs.map(async (tf) => {
          const res = await fetch(
            `${BINANCE_REST}/klines?symbol=${symbol.toUpperCase()}&interval=${tf}&limit=500`
          );
          if (!res.ok) return null;
          const data = await res.json();
          const candles = data.map(parseKline);
          return { tf, candles };
        })
      );

      const timeframes: TimeframeData[] = [];
      let longScore = 0;
      let shortScore = 0;

      for (const r of results) {
        if (!r || r.candles.length < 10) continue;
        const { tf, candles } = r;
        const pivots = calculatePivots(candles);
        const rsiData = calculateRSI(candles);
        const macdData = calculateMACD(candles);
        const ema9 = calculateEMA(candles, 9);
        const ema21 = calculateEMA(candles, 21);
        const trend = determineTrend(candles);
        const patterns = detectPatterns(candles);
        const recent = candles.slice(-20);
        const bulls = recent.filter(c => c.close >= c.open).length;
        const bullPct = Math.round((bulls / recent.length) * 100);

        const tfData: TimeframeData = {
          timeframe: TF_LABELS[tf] || tf,
          candles,
          pivots,
          rsi: rsiData[rsiData.length - 1] || 50,
          macdHistogram: macdData.histogram[macdData.histogram.length - 1] || 0,
          ema9: ema9[ema9.length - 1],
          ema21: ema21[ema21.length - 1],
          trend,
          patterns: patterns.map(p => `${p.nameVi}(${p.type})`),
          bullPct,
        };
        timeframes.push(tfData);

        // Score: higher TFs have more weight
        const weight = tf === '1d' || tf === '1w' ? 3 : tf === '4h' ? 2 : 1;
        if (trend === 'UP') longScore += weight;
        else if (trend === 'DOWN') shortScore += weight;
        
        if (tfData.rsi < 30) longScore += weight;
        else if (tfData.rsi > 70) shortScore += weight;
        
        if (tfData.macdHistogram > 0) longScore += weight * 0.5;
        else if (tfData.macdHistogram < 0) shortScore += weight * 0.5;
      }

      const totalScore = longScore + shortScore;
      const confluenceScore = totalScore > 0 
        ? Math.round(Math.max(longScore, shortScore) / totalScore * 100) 
        : 50;
      
      const overallBias: 'LONG' | 'SHORT' | 'NEUTRAL' = 
        longScore > shortScore * 1.3 ? 'LONG' :
        shortScore > longScore * 1.3 ? 'SHORT' : 'NEUTRAL';

      const htfTrend = timeframes.length > 0 
        ? timeframes[timeframes.length - 1].trend === 'UP' ? 'UPTREND' 
          : timeframes[timeframes.length - 1].trend === 'DOWN' ? 'DOWNTREND' : 'SIDEWAYS'
        : 'N/A';

      const summary = `HTF: ${timeframes.map(t => `${t.timeframe}=${t.trend}`).join(', ')}. Bias: ${overallBias} (${confluenceScore}%)`;

      setAnalysis({ timeframes, overallBias, confluenceScore, htfTrend, summary });
    } catch (err) {
      console.error('Multi-TF fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [symbol, currentTimeframe]);

  useEffect(() => {
    fetchHTFData();
    const interval = setInterval(fetchHTFData, 120000); // refresh every 2 min
    return () => clearInterval(interval);
  }, [fetchHTFData]);

  return { analysis, loading, refetch: fetchHTFData };
}
