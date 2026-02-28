import { useEffect, useRef, useMemo } from 'react';
import { createChart, ColorType, CrosshairMode, IChartApi, ISeriesApi, CandlestickData, HistogramData, Time, LineData } from 'lightweight-charts';
import { Candle, PivotLevels, calculateEMA } from '@/lib/tradingData';

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
}

// Convert candle time string to unix timestamp
function candleToTimestamp(candle: Candle, index: number, totalCandles: number): Time {
  // Use index-based time since we only have HH:MM format
  const baseTime = Math.floor(Date.now() / 1000) - (totalCandles - index) * 300;
  return baseTime as Time;
}

const TradingViewChart = ({ candles, pivots, buyZone, sellZone, aiLevels }: Props) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const ema9SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ema21SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  const ema9 = useMemo(() => calculateEMA(candles, 9), [candles]);
  const ema21 = useMemo(() => calculateEMA(candles, 21), [candles]);

  // Create chart once
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'hsl(220, 20%, 7%)' },
        textColor: 'hsl(215, 15%, 50%)',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
      },
      grid: {
        vertLines: { color: 'hsl(220, 15%, 12%)', style: 1 },
        horzLines: { color: 'hsl(220, 15%, 12%)', style: 1 },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: 'hsl(187, 100%, 45%)',
          width: 1,
          style: 2,
          labelBackgroundColor: 'hsl(220, 18%, 15%)',
        },
        horzLine: {
          color: 'hsl(187, 100%, 45%)',
          width: 1,
          style: 2,
          labelBackgroundColor: 'hsl(220, 18%, 15%)',
        },
      },
      rightPriceScale: {
        borderColor: 'hsl(220, 15%, 18%)',
        scaleMargins: { top: 0.1, bottom: 0.25 },
      },
      timeScale: {
        borderColor: 'hsl(220, 15%, 18%)',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: { vertTouchDrag: false },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: 'hsl(145, 80%, 50%)',
      downColor: 'hsl(348, 80%, 55%)',
      borderUpColor: 'hsl(145, 80%, 50%)',
      borderDownColor: 'hsl(348, 80%, 55%)',
      wickUpColor: 'hsl(145, 60%, 45%)',
      wickDownColor: 'hsl(348, 60%, 50%)',
    });

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });

    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });

    const ema9Series = chart.addLineSeries({
      color: 'hsl(187, 100%, 55%)',
      lineWidth: 1,
      title: 'EMA 9',
      crosshairMarkerVisible: false,
    });

    const ema21Series = chart.addLineSeries({
      color: 'hsl(45, 100%, 55%)',
      lineWidth: 1,
      title: 'EMA 21',
      crosshairMarkerVisible: false,
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
    };
  }, []);

  // Update data
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || !ema9SeriesRef.current || !ema21SeriesRef.current) return;
    if (candles.length === 0) return;

    const candleData: CandlestickData[] = candles.map((c, i) => ({
      time: candleToTimestamp(c, i, candles.length),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    const volumeData: HistogramData[] = candles.map((c, i) => ({
      time: candleToTimestamp(c, i, candles.length),
      value: c.volume,
      color: c.close >= c.open ? 'rgba(38, 198, 130, 0.3)' : 'rgba(239, 83, 80, 0.3)',
    }));

    const ema9Data: LineData[] = ema9.map((v, i) => ({
      time: candleToTimestamp(candles[i], i, candles.length),
      value: v,
    }));

    const ema21Data: LineData[] = ema21.map((v, i) => ({
      time: candleToTimestamp(candles[i], i, candles.length),
      value: v,
    }));

    candleSeriesRef.current.setData(candleData);
    volumeSeriesRef.current.setData(volumeData);
    ema9SeriesRef.current.setData(ema9Data);
    ema21SeriesRef.current.setData(ema21Data);

    // Add price lines for pivots and AI levels
    candleSeriesRef.current.createPriceLine({
      price: pivots.pp,
      color: 'hsl(45, 100%, 55%)',
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: 'PP',
    });

    const pivotLines = [
      { price: pivots.r1, color: 'hsl(348, 80%, 50%)', title: 'R1' },
      { price: pivots.r2, color: 'hsl(348, 90%, 55%)', title: 'R2' },
      { price: pivots.r3, color: 'hsl(348, 100%, 60%)', title: 'R3' },
      { price: pivots.s1, color: 'hsl(145, 60%, 45%)', title: 'S1' },
      { price: pivots.s2, color: 'hsl(145, 80%, 50%)', title: 'S2' },
      { price: pivots.s3, color: 'hsl(145, 100%, 55%)', title: 'S3' },
    ];

    pivotLines.forEach(pl => {
      candleSeriesRef.current?.createPriceLine({
        price: pl.price,
        color: pl.color,
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: pl.title,
      });
    });

    // AI levels
    if (aiLevels) {
      aiLevels.forEach(level => {
        const color = level.type === 'resistance' ? 'hsl(348, 100%, 55%)' : 'hsl(145, 100%, 45%)';
        candleSeriesRef.current?.createPriceLine({
          price: level.price,
          color,
          lineWidth: level.strength === 'Rất mạnh' ? 2 : 1,
          lineStyle: level.strength === 'Rất mạnh' ? 0 : 2,
          axisLabelVisible: true,
          title: `AI ${level.type === 'resistance' ? '🔴' : '🟢'}`,
        });
      });
    }

    // Buy/Sell zones
    if (buyZone) {
      candleSeriesRef.current.createPriceLine({
        price: buyZone,
        color: 'hsl(145, 100%, 45%)',
        lineWidth: 2,
        lineStyle: 1,
        axisLabelVisible: true,
        title: 'BUY ZONE',
      });
    }
    if (sellZone) {
      candleSeriesRef.current.createPriceLine({
        price: sellZone,
        color: 'hsl(348, 100%, 55%)',
        lineWidth: 2,
        lineStyle: 1,
        axisLabelVisible: true,
        title: 'SELL ZONE',
      });
    }

    // Scroll to latest
    chartRef.current?.timeScale().scrollToRealTime();
  }, [candles, pivots, buyZone, sellZone, aiLevels, ema9, ema21]);

  return (
    <div className="relative rounded-lg overflow-hidden border border-border bg-card">
      <div ref={chartContainerRef} className="w-full" style={{ height: '420px' }} />
      
      {/* Legend overlay */}
      <div className="absolute top-2 left-2 flex items-center gap-3 px-3 py-1.5 rounded-md bg-background/80 backdrop-blur-sm border border-border/50">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 rounded bg-[hsl(187,100%,55%)]" />
          <span className="text-[10px] font-mono text-muted-foreground">EMA 9</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 rounded bg-[hsl(45,100%,55%)]" />
          <span className="text-[10px] font-mono text-muted-foreground">EMA 21</span>
        </div>
        {aiLevels && aiLevels.length > 0 && (
          <span className="text-[10px] font-mono text-primary font-bold animate-pulse">🧠 AI Active</span>
        )}
      </div>
    </div>
  );
};

export default TradingViewChart;
