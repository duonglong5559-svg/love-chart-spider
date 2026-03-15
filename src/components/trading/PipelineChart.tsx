import { useEffect, useRef, useMemo, useCallback } from 'react';
import { createChart, ColorType, CrosshairMode, IChartApi, ISeriesApi, CandlestickData, HistogramData, Time, LineData, IPriceLine, SeriesMarker } from 'lightweight-charts';
import type { Candle, PivotLevels, PatternSignal, Trendline } from '@/engine/types';
import { calculateEMA } from '@/engine/atrEngine';

interface Props {
  candles: Candle[];
  pivots: PivotLevels;
  entryLong?: number;
  entryShort?: number;
  target?: number;
  stopLoss?: number;
  trendlines?: Trendline[];
  patterns?: PatternSignal[];
}

function toTime(candle: Candle): Time {
  return Math.floor(candle.openTime / 1000) as Time;
}

export default function PipelineChart({
  candles, pivots, entryLong, entryShort, target, stopLoss, trendlines, patterns,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const ema9Ref = useRef<ISeriesApi<'Line'> | null>(null);
  const ema21Ref = useRef<ISeriesApi<'Line'> | null>(null);
  const tlSeriesRef = useRef<ISeriesApi<'Line'>[]>([]);
  const priceLinesRef = useRef<IPriceLine[]>([]);

  const closes = useMemo(() => candles.map(c => c.close), [candles]);
  const ema9 = useMemo(() => calculateEMA(closes, 9), [closes]);
  const ema21 = useMemo(() => calculateEMA(closes, 21), [closes]);

  const clearPriceLines = useCallback(() => {
    if (!candleSeriesRef.current) return;
    priceLinesRef.current.forEach(line => {
      try { candleSeriesRef.current?.removePriceLine(line); } catch { /* ignored */ }
    });
    priceLinesRef.current = [];
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0a0e14' },
        textColor: '#6b7280',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
      },
      grid: {
        vertLines: { color: '#151a22', style: 1 },
        horzLines: { color: '#151a22', style: 1 },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#00c8e6', width: 1, style: 2, labelBackgroundColor: '#1a2030' },
        horzLine: { color: '#00c8e6', width: 1, style: 2, labelBackgroundColor: '#1a2030' },
      },
      rightPriceScale: { borderColor: '#1e2530', scaleMargins: { top: 0.1, bottom: 0.25 } },
      timeScale: { borderColor: '#1e2530', timeVisible: true, secondsVisible: false },
      handleScroll: { vertTouchDrag: false },
    });

    const cs = chart.addCandlestickSeries({
      upColor: '#00e676', downColor: '#ff1744',
      borderUpColor: '#00e676', borderDownColor: '#ff1744',
      wickUpColor: '#00c853', wickDownColor: '#d50000',
    });

    const vs = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });

    const e9 = chart.addLineSeries({
      color: '#00bcd4', lineWidth: 1, title: 'EMA9', crosshairMarkerVisible: false,
    });
    const e21 = chart.addLineSeries({
      color: '#ffc107', lineWidth: 1, title: 'EMA21', crosshairMarkerVisible: false,
    });

    chartRef.current = chart;
    candleSeriesRef.current = cs;
    volumeSeriesRef.current = vs;
    ema9Ref.current = e9;
    ema21Ref.current = e21;

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      tlSeriesRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || !chartRef.current) return;
    if (candles.length === 0) return;

    const candleData: CandlestickData[] = candles.map(c => ({
      time: toTime(c),
      open: c.open, high: c.high, low: c.low, close: c.close,
    }));

    const volumeData: HistogramData[] = candles.map(c => ({
      time: toTime(c),
      value: c.volume,
      color: c.close >= c.open ? 'rgba(0, 230, 118, 0.25)' : 'rgba(255, 23, 68, 0.25)',
    }));

    const ema9Data: LineData[] = ema9.map((v, i) => ({
      time: toTime(candles[i]), value: v,
    }));
    const ema21Data: LineData[] = ema21.map((v, i) => ({
      time: toTime(candles[i]), value: v,
    }));

    candleSeriesRef.current.setData(candleData);
    volumeSeriesRef.current.setData(volumeData);
    ema9Ref.current?.setData(ema9Data);
    ema21Ref.current?.setData(ema21Data);

    // Pattern markers
    if (patterns && patterns.length > 0) {
      const markers: SeriesMarker<Time>[] = patterns
        .filter(p => p.index >= 0 && p.index < candles.length)
        .map(p => ({
          time: toTime(candles[p.index]),
          position: p.type === 'bearish' ? 'aboveBar' as const : 'belowBar' as const,
          color: p.type === 'bullish' ? '#00e676' : p.type === 'bearish' ? '#ff1744' : '#ffc107',
          shape: p.type === 'bullish' ? 'arrowUp' as const : p.type === 'bearish' ? 'arrowDown' as const : 'circle' as const,
          text: p.nameVi,
        }));
      markers.sort((a, b) => (a.time as number) - (b.time as number));
      candleSeriesRef.current.setMarkers(markers);
    } else {
      candleSeriesRef.current.setMarkers([]);
    }

    // Clear old trendline series
    tlSeriesRef.current.forEach(s => {
      try { chartRef.current?.removeSeries(s); } catch { /* ignored */ }
    });
    tlSeriesRef.current = [];

    // Draw trendlines
    if (trendlines && trendlines.length > 0) {
      for (const tl of trendlines) {
        if (tl.x1 < 0 || tl.x1 >= candles.length || tl.x2 < 0 || tl.x2 >= candles.length) continue;
        const startIdx = Math.max(0, tl.x1);
        const endIdx = Math.min(tl.x2, candles.length - 1);
        if (endIdx <= startIdx) continue;

        const steps = endIdx - startIdx;
        const slope = (tl.y2 - tl.y1) / steps;
        const points: LineData[] = [];

        for (let i = 0; i <= steps; i++) {
          const idx = startIdx + i;
          if (idx >= candles.length) break;
          points.push({
            time: toTime(candles[idx]),
            value: tl.y1 + slope * i,
          });
        }

        if (points.length >= 2) {
          const color = tl.state === 'active_resistance' ? '#ff1744' :
                        tl.state === 'active_support' ? '#00e676' :
                        tl.state === 'broken' ? '#666' :
                        tl.state === 'retested' ? '#ffc107' : '#888';
          const series = chartRef.current.addLineSeries({
            color,
            lineWidth: tl.isActive ? 2 : 1,
            lineStyle: tl.isActive ? 0 : 2,
            crosshairMarkerVisible: false,
            lastValueVisible: false,
            priceLineVisible: false,
          });
          series.setData(points);
          tlSeriesRef.current.push(series);
        }
      }
    }

    // Price lines
    clearPriceLines();
    const addLine = (opts: { price: number; color: string; lineWidth?: 1 | 2 | 3 | 4; lineStyle?: number; title: string }) => {
      if (!opts.price || opts.price <= 0) return;
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

    addLine({ price: pivots.pp, color: '#ffc107', title: 'PP' });
    addLine({ price: pivots.r1, color: '#ff5252', title: 'R1' });
    addLine({ price: pivots.r2, color: '#ff1744', title: 'R2' });
    addLine({ price: pivots.s1, color: '#69f0ae', title: 'S1' });
    addLine({ price: pivots.s2, color: '#00e676', title: 'S2' });

    if (entryLong) addLine({ price: entryLong, color: '#00e676', lineWidth: 2, lineStyle: 1, title: 'LONG' });
    if (entryShort) addLine({ price: entryShort, color: '#ff1744', lineWidth: 2, lineStyle: 1, title: 'SHORT' });
    if (target) addLine({ price: target, color: '#ffc107', lineWidth: 2, lineStyle: 0, title: 'TARGET' });
    if (stopLoss) addLine({ price: stopLoss, color: '#ff5252', lineWidth: 1, lineStyle: 3, title: 'SL' });

    chartRef.current.timeScale().scrollToRealTime();
  }, [candles, pivots, entryLong, entryShort, target, stopLoss, trendlines, patterns, ema9, ema21, clearPriceLines]);

  return (
    <div className="relative rounded-lg overflow-hidden border border-border/30 bg-[#0a0e14] shadow-[0_0_40px_rgba(0,200,230,0.04)]">
      <div ref={containerRef} className="w-full" style={{ height: '380px' }} />
      <div className="absolute top-2 left-2 flex items-center gap-2 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-sm border border-white/5">
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 rounded bg-[#00bcd4]" />
          <span className="text-[9px] font-mono text-white/40">EMA9</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 rounded bg-[#ffc107]" />
          <span className="text-[9px] font-mono text-white/40">EMA21</span>
        </div>
        {trendlines && trendlines.filter(t => t.isActive).length > 0 && (
          <span className="text-[9px] font-mono text-primary/60">
            TL: {trendlines.filter(t => t.isActive).length}
          </span>
        )}
      </div>
    </div>
  );
}
