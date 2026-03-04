import { useEffect, useRef, useMemo, useCallback } from 'react';
import { createChart, ColorType, CrosshairMode, IChartApi, ISeriesApi, CandlestickData, HistogramData, Time, LineData, IPriceLine, SeriesMarker } from 'lightweight-charts';
import { Candle, PivotLevels, calculateEMA, TrendLine, CandlePattern } from '@/lib/tradingData';

interface AIValidatedLevel {
  price: number;
  type: 'resistance' | 'support';
  strength: 'Rất mạnh' | 'Mạnh' | 'Trung bình';
  testCount?: number;
  note: string;
}

interface Props {
  candles: Candle[];
  pivots: PivotLevels;
  buyZone?: number;
  sellZone?: number;
  aiLevels?: AIValidatedLevel[];
  trendLines?: TrendLine[];
  patterns?: CandlePattern[];
}

function candleToTimestamp(candle: Candle, index: number, totalCandles: number): Time {
  const baseTime = Math.floor(Date.now() / 1000) - (totalCandles - index) * 300;
  return baseTime as Time;
}

const TradingViewChart = ({ candles, pivots, buyZone, sellZone, aiLevels, trendLines, patterns }: Props) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const ema9SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ema21SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const trendLineSeriesRef = useRef<ISeriesApi<'Line'>[]>([]);
  const priceLinesRef = useRef<IPriceLine[]>([]);

  const ema9 = useMemo(() => calculateEMA(candles, 9), [candles]);
  const ema21 = useMemo(() => calculateEMA(candles, 21), [candles]);

  const clearPriceLines = useCallback(() => {
    if (!candleSeriesRef.current) return;
    priceLinesRef.current.forEach(line => {
      try { candleSeriesRef.current?.removePriceLine(line); } catch {}
    });
    priceLinesRef.current = [];
  }, []);

  // Create chart once
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0f1318' },
        textColor: '#6b7280',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
      },
      grid: {
        vertLines: { color: '#1e2530', style: 1 },
        horzLines: { color: '#1e2530', style: 1 },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#00c8e6', width: 1, style: 2, labelBackgroundColor: '#1a2030' },
        horzLine: { color: '#00c8e6', width: 1, style: 2, labelBackgroundColor: '#1a2030' },
      },
      rightPriceScale: { borderColor: '#252d3a', scaleMargins: { top: 0.1, bottom: 0.25 } },
      timeScale: { borderColor: '#252d3a', timeVisible: true, secondsVisible: false },
      handleScroll: { vertTouchDrag: false },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#26c682', downColor: '#ef5350',
      borderUpColor: '#26c682', borderDownColor: '#ef5350',
      wickUpColor: '#1fa06a', wickDownColor: '#d44040',
    });

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });

    const ema9Series = chart.addLineSeries({
      color: '#00d4ff', lineWidth: 1, title: 'EMA 9', crosshairMarkerVisible: false,
    });
    const ema21Series = chart.addLineSeries({
      color: '#ffcc00', lineWidth: 1, title: 'EMA 21', crosshairMarkerVisible: false,
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;
    ema9SeriesRef.current = ema9Series;
    ema21SeriesRef.current = ema21Series;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      trendLineSeriesRef.current = [];
    };
  }, []);

  // Update data
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || !ema9SeriesRef.current || !ema21SeriesRef.current || !chartRef.current) return;
    if (candles.length === 0) return;

    const candleData: CandlestickData[] = candles.map((c, i) => ({
      time: candleToTimestamp(c, i, candles.length),
      open: c.open, high: c.high, low: c.low, close: c.close,
    }));

    const volumeData: HistogramData[] = candles.map((c, i) => ({
      time: candleToTimestamp(c, i, candles.length),
      value: c.volume,
      color: c.close >= c.open ? 'rgba(38, 198, 130, 0.3)' : 'rgba(239, 83, 80, 0.3)',
    }));

    const ema9Data: LineData[] = ema9.map((v, i) => ({
      time: candleToTimestamp(candles[i], i, candles.length), value: v,
    }));
    const ema21Data: LineData[] = ema21.map((v, i) => ({
      time: candleToTimestamp(candles[i], i, candles.length), value: v,
    }));

    candleSeriesRef.current.setData(candleData);
    volumeSeriesRef.current.setData(volumeData);
    ema9SeriesRef.current.setData(ema9Data);
    ema21SeriesRef.current.setData(ema21Data);

    // Pattern markers on candles
    if (patterns && patterns.length > 0) {
      const markers: SeriesMarker<Time>[] = patterns
        .filter(p => p.index >= 0 && p.index < candles.length)
        .map(p => ({
          time: candleToTimestamp(candles[p.index], p.index, candles.length),
          position: p.type === 'bearish' ? 'aboveBar' as const : 'belowBar' as const,
          color: p.type === 'bullish' ? '#26c682' : p.type === 'bearish' ? '#ef5350' : '#ffcc00',
          shape: p.type === 'bullish' ? 'arrowUp' as const : p.type === 'bearish' ? 'arrowDown' as const : 'circle' as const,
          text: p.name,
        }));
      // Sort by time (required by lightweight-charts)
      markers.sort((a, b) => (a.time as number) - (b.time as number));
      candleSeriesRef.current.setMarkers(markers);
    } else {
      candleSeriesRef.current.setMarkers([]);
    }

    // Remove old trendline series
    trendLineSeriesRef.current.forEach(s => {
      try { chartRef.current?.removeSeries(s); } catch {}
    });
    trendLineSeriesRef.current = [];

    // Draw trendlines as individual line series
    if (trendLines && trendLines.length > 0 && candles.length > 0) {
      trendLines.forEach(tl => {
        if (tl.startIndex < 0 || tl.startIndex >= candles.length) return;
        const endIdx = Math.min(tl.endIndex, candles.length - 1);
        if (endIdx <= tl.startIndex) return;

        // Create intermediate points for smooth diagonal line
        const points: LineData[] = [];
        const steps = endIdx - tl.startIndex;
        const slope = (tl.endPrice - tl.startPrice) / steps;

        for (let i = 0; i <= steps; i++) {
          const idx = tl.startIndex + i;
          if (idx >= candles.length) break;
          points.push({
            time: candleToTimestamp(candles[idx], idx, candles.length),
            value: tl.startPrice + slope * i,
          });
        }

        if (points.length >= 2) {
          const color = tl.type === 'resistance' ? '#ef5350' :
                        tl.type === 'support' ? '#26c682' : '#ffcc00';
          const series = chartRef.current!.addLineSeries({
            color,
            lineWidth: 2,
            lineStyle: tl.type === 'channel' ? 1 : 0, // dashed for channel
            crosshairMarkerVisible: false,
            lastValueVisible: false,
            priceLineVisible: false,
          });
          series.setData(points);
          trendLineSeriesRef.current.push(series);
        }
      });
    }

    // Clear old price lines before adding new ones
    clearPriceLines();

    const addLine = (opts: { price: number; color: string; lineWidth?: 1 | 2 | 3 | 4; lineStyle?: number; title: string }) => {
      const line = candleSeriesRef.current!.createPriceLine({
        price: opts.price,
        color: opts.color,
        lineWidth: opts.lineWidth ?? 1,
        lineStyle: opts.lineStyle ?? 2,
        axisLabelVisible: true,
        title: opts.title,
      });
      priceLinesRef.current.push(line);
    };

    // Pivot Point
    addLine({ price: pivots.pp, color: '#ffcc00', title: 'PP' });
    addLine({ price: pivots.r1, color: '#e05050', title: 'R1' });
    addLine({ price: pivots.r2, color: '#e83e3e', title: 'R2' });
    addLine({ price: pivots.r3, color: '#ff3333', title: 'R3' });
    addLine({ price: pivots.s1, color: '#20a060', title: 'S1' });
    addLine({ price: pivots.s2, color: '#26c682', title: 'S2' });
    addLine({ price: pivots.s3, color: '#2ee68e', title: 'S3' });

    // AI levels
    if (aiLevels && aiLevels.length > 0) {
      const seen = new Set<string>();
      aiLevels.forEach(level => {
        const key = `${level.price.toFixed(2)}-${level.type}`;
        if (seen.has(key)) return;
        seen.add(key);
        addLine({
          price: level.price,
          color: level.type === 'resistance' ? '#ff3333' : '#00e676',
          lineWidth: level.strength === 'Rất mạnh' ? 2 : 1,
          lineStyle: level.strength === 'Rất mạnh' ? 0 : 2,
          title: `AI ${level.type === 'resistance' ? '▼' : '▲'}`,
        });
      });
    }

    // Buy/Sell zones
    if (buyZone && Math.abs(buyZone - pivots.s1) > 0.01) {
      addLine({ price: buyZone, color: '#00e676', lineWidth: 2, lineStyle: 1, title: 'BUY' });
    }
    if (sellZone && Math.abs(sellZone - pivots.r1) > 0.01) {
      addLine({ price: sellZone, color: '#ff3333', lineWidth: 2, lineStyle: 1, title: 'SELL' });
    }

    chartRef.current?.timeScale().scrollToRealTime();
  }, [candles, pivots, buyZone, sellZone, aiLevels, trendLines, patterns, ema9, ema21, clearPriceLines]);

  return (
    <div className="relative rounded-lg overflow-hidden border border-border bg-card shadow-[0_0_30px_rgba(0,200,230,0.05)]">
      <div ref={chartContainerRef} className="w-full" style={{ height: '420px' }} />
      
      <div className="absolute top-2 left-2 flex items-center gap-3 px-3 py-1.5 rounded-lg bg-background/80 backdrop-blur-sm border border-border/50">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 rounded" style={{ background: '#00d4ff' }} />
          <span className="text-[10px] font-mono text-muted-foreground">EMA 9</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 rounded" style={{ background: '#ffcc00' }} />
          <span className="text-[10px] font-mono text-muted-foreground">EMA 21</span>
        </div>
        {trendLines && trendLines.length > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 rounded bg-bear" />
            <span className="text-[10px] font-mono text-muted-foreground">Trend ({trendLines.length})</span>
          </div>
        )}
        {aiLevels && aiLevels.length > 0 && (
          <span className="text-[10px] font-mono text-primary font-bold animate-pulse">🧠 AI</span>
        )}
      </div>
    </div>
  );
};

export default TradingViewChart;
