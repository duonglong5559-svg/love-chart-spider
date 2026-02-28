import { useState, useRef, useCallback, useMemo } from 'react';
import { Candle, PivotLevels, TrendLine, CandlePattern } from '@/lib/tradingData';
import CandlestickChart from './CandlestickChart';
import { Minus, TrendingUp, MousePointer, Trash2, Crosshair, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

type DrawingTool = 'none' | 'hline' | 'trendline' | 'crosshair';

interface DrawnLine {
  id: string;
  type: 'hline' | 'trendline';
  startPrice: number;
  endPrice: number;
  startIndex: number;
  endIndex: number;
  color: string;
}

interface AIValidatedLevel {
  price: number;
  type: 'resistance' | 'support';
  strength: 'Rất mạnh' | 'Mạnh' | 'Trung bình';
  testCount?: number;
  note: string;
}

interface AITrendLine {
  startPrice: number;
  endPrice: number;
  startIndex: number;
  endIndex: number;
  type: 'support' | 'resistance' | 'channel';
  label?: string;
}

interface Props {
  candles: Candle[];
  pivots: PivotLevels;
  trendLines: TrendLine[];
  buyZone?: number;
  sellZone?: number;
  patterns?: CandlePattern[];
  aiLevels?: AIValidatedLevel[];
  aiTrendLines?: AITrendLine[];
}

const CHART_WIDTH = 800;
const CHART_HEIGHT = 450;
const PADDING = { top: 30, right: 90, bottom: 30, left: 10 };
const MIN_VISIBLE = 10;

const InteractiveChart = ({ candles, pivots, trendLines, buyZone, sellZone, patterns, aiLevels, aiTrendLines }: Props) => {
  const [activeTool, setActiveTool] = useState<DrawingTool>('none');
  const [drawnLines, setDrawnLines] = useState<DrawnLine[]>([]);
  const [drawing, setDrawing] = useState<{ startX: number; startY: number } | null>(null);
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);
  const [crosshair, setCrosshair] = useState<{ x: number; y: number; price: number; time: string } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Zoom/Pan state: visible range of candle indices
  const [viewStart, setViewStart] = useState(0);
  const [viewEnd, setViewEnd] = useState(candles.length);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; startIdx: number; endIdx: number } | null>(null);

  // Sync viewEnd when candles grow
  const prevLenRef = useRef(candles.length);
  if (candles.length !== prevLenRef.current) {
    const diff = candles.length - prevLenRef.current;
    if (viewEnd === prevLenRef.current || viewEnd + diff >= candles.length) {
      // Was at the right edge, stay at right edge
      setViewEnd(candles.length);
      if (viewStart + MIN_VISIBLE > candles.length) setViewStart(Math.max(0, candles.length - MIN_VISIBLE));
    }
    prevLenRef.current = candles.length;
  }

  // Derived visible candles
  const visibleStart = Math.max(0, Math.min(viewStart, candles.length - MIN_VISIBLE));
  const visibleEnd = Math.min(candles.length, Math.max(viewEnd, visibleStart + MIN_VISIBLE));
  const visibleCandles = useMemo(() => candles.slice(visibleStart, visibleEnd), [candles, visibleStart, visibleEnd]);

  // Remap patterns and AI lines to visible range
  const visiblePatterns = useMemo(() => {
    if (!patterns) return [];
    return patterns
      .filter(p => p.index >= visibleStart && p.index < visibleEnd)
      .map(p => ({ ...p, index: p.index - visibleStart }));
  }, [patterns, visibleStart, visibleEnd]);

  const visibleAiTrendLines = useMemo(() => {
    if (!aiTrendLines) return undefined;
    return aiTrendLines.map(l => ({
      ...l,
      startIndex: l.startIndex - visibleStart,
      endIndex: l.endIndex - visibleStart,
    })).filter(l => l.endIndex >= 0 && l.startIndex < visibleCandles.length);
  }, [aiTrendLines, visibleStart, visibleCandles.length]);

  const visibleTrendLines = useMemo(() => {
    return trendLines.map(l => ({
      ...l,
      startIndex: l.startIndex - visibleStart,
      endIndex: l.endIndex - visibleStart,
    })).filter(l => l.endIndex >= 0 && l.startIndex < visibleCandles.length);
  }, [trendLines, visibleStart, visibleCandles.length]);

  const innerW = CHART_WIDTH - PADDING.left - PADDING.right;
  const innerH = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  const gap = visibleCandles.length > 0 ? innerW / visibleCandles.length : innerW;

  const { minPrice, maxPrice } = useMemo(() => {
    const allPrices = visibleCandles.flatMap(c => [c.high, c.low]);
    if (allPrices.length === 0) return { minPrice: 0, maxPrice: 1 };
    const pivotValues = [pivots.s3, pivots.s2, pivots.s1, pivots.pp, pivots.r1, pivots.r2, pivots.r3];
    const all = [...allPrices, ...pivotValues];
    if (buyZone) all.push(buyZone);
    if (sellZone) all.push(sellZone);
    if (aiLevels) aiLevels.forEach(l => all.push(l.price));
    return { minPrice: Math.min(...all) - 5, maxPrice: Math.max(...all) + 5 };
  }, [visibleCandles, pivots, buyZone, sellZone, aiLevels]);

  const yToPrice = useCallback((y: number) => {
    return maxPrice - ((y - PADDING.top) / innerH) * (maxPrice - minPrice);
  }, [minPrice, maxPrice, innerH]);

  const priceToY = useCallback((price: number) => {
    return PADDING.top + innerH - ((price - minPrice) / (maxPrice - minPrice)) * innerH;
  }, [minPrice, maxPrice, innerH]);

  const xToIndex = useCallback((x: number) => {
    return Math.round((x - PADDING.left - gap / 2) / gap);
  }, [gap]);

  const getSVGCoords = useCallback((e: React.MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * CHART_WIDTH;
    const y = ((e.clientY - rect.top) / rect.height) * CHART_HEIGHT;
    return { x, y };
  }, []);

  // Zoom via scroll wheel
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const coords = getSVGCoords(e as any);
    if (!coords) return;
    const ratio = (coords.x - PADDING.left) / innerW;
    const visibleCount = visibleEnd - visibleStart;
    const zoomAmount = Math.max(1, Math.round(visibleCount * 0.1));
    
    let newStart: number, newEnd: number;
    if (e.deltaY > 0) {
      // Zoom out
      newStart = visibleStart - Math.round(zoomAmount * ratio);
      newEnd = visibleEnd + Math.round(zoomAmount * (1 - ratio));
    } else {
      // Zoom in
      newStart = visibleStart + Math.round(zoomAmount * ratio);
      newEnd = visibleEnd - Math.round(zoomAmount * (1 - ratio));
    }
    newStart = Math.max(0, newStart);
    newEnd = Math.min(candles.length, newEnd);
    if (newEnd - newStart < MIN_VISIBLE) return;
    setViewStart(newStart);
    setViewEnd(newEnd);
  }, [getSVGCoords, innerW, visibleStart, visibleEnd, candles.length]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const coords = getSVGCoords(e);
    if (!coords) return;

    // Right-click or middle-click for pan, or activeTool is none
    if (activeTool === 'none' || activeTool === 'crosshair') {
      // Start panning with left click drag
      if (e.button === 0 && activeTool === 'none') {
        setIsPanning(true);
        panStartRef.current = { x: e.clientX, startIdx: viewStart, endIdx: viewEnd };
        return;
      }
    }

    if (activeTool === 'hline' || activeTool === 'trendline') {
      setDrawing({ startX: coords.x, startY: coords.y });
    }
  }, [activeTool, getSVGCoords, viewStart, viewEnd]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // Panning
    if (isPanning && panStartRef.current) {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const dx = e.clientX - panStartRef.current.x;
      const candlesPerPixel = (panStartRef.current.endIdx - panStartRef.current.startIdx) / rect.width;
      const shift = Math.round(-dx * candlesPerPixel);
      let newStart = panStartRef.current.startIdx + shift;
      let newEnd = panStartRef.current.endIdx + shift;
      if (newStart < 0) { newEnd -= newStart; newStart = 0; }
      if (newEnd > candles.length) { newStart -= (newEnd - candles.length); newEnd = candles.length; }
      newStart = Math.max(0, newStart);
      setViewStart(newStart);
      setViewEnd(newEnd);
      return;
    }

    const coords = getSVGCoords(e);
    if (!coords) return;
    if (activeTool === 'crosshair' || activeTool === 'none') {
      const idx = xToIndex(coords.x);
      const price = yToPrice(coords.y);
      if (idx >= 0 && idx < visibleCandles.length && coords.x > PADDING.left && coords.x < CHART_WIDTH - PADDING.right) {
        setCrosshair({ x: coords.x, y: coords.y, price, time: visibleCandles[idx]?.time || '' });
      } else {
        setCrosshair(null);
      }
    }
    if (drawing) setCurrentPos(coords);
  }, [drawing, activeTool, getSVGCoords, xToIndex, yToPrice, visibleCandles, isPanning, candles.length]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setIsPanning(false);
      panStartRef.current = null;
      return;
    }
    if (!drawing) return;
    const coords = getSVGCoords(e);
    if (!coords) return;
    const startPrice = yToPrice(drawing.startY);
    const endPrice = yToPrice(coords.y);
    const startIdx = xToIndex(drawing.startX);
    const endIdx = xToIndex(coords.x);

    if (activeTool === 'hline') {
      setDrawnLines(prev => [...prev, {
        id: `drawn-${Date.now()}`, type: 'hline', startPrice, endPrice: startPrice,
        startIndex: 0, endIndex: visibleCandles.length - 1, color: 'hsl(187, 100%, 50%)',
      }]);
    } else if (activeTool === 'trendline' && Math.abs(coords.x - drawing.startX) > 10) {
      setDrawnLines(prev => [...prev, {
        id: `drawn-${Date.now()}`, type: 'trendline', startPrice, endPrice,
        startIndex: Math.max(0, startIdx), endIndex: Math.min(visibleCandles.length - 1, endIdx), color: 'hsl(270, 100%, 65%)',
      }]);
    }
    setDrawing(null);
    setCurrentPos(null);
  }, [drawing, activeTool, getSVGCoords, yToPrice, xToIndex, visibleCandles.length, isPanning]);

  const handleMouseLeave = useCallback(() => {
    setCrosshair(null);
    if (drawing) { setDrawing(null); setCurrentPos(null); }
    if (isPanning) { setIsPanning(false); panStartRef.current = null; }
  }, [drawing, isPanning]);

  const resetZoom = useCallback(() => {
    setViewStart(0);
    setViewEnd(candles.length);
  }, [candles.length]);

  const zoomIn = useCallback(() => {
    const visibleCount = visibleEnd - visibleStart;
    const shrink = Math.max(1, Math.round(visibleCount * 0.15));
    const newStart = visibleStart + shrink;
    const newEnd = visibleEnd - shrink;
    if (newEnd - newStart >= MIN_VISIBLE) {
      setViewStart(newStart);
      setViewEnd(newEnd);
    }
  }, [visibleStart, visibleEnd]);

  const zoomOut = useCallback(() => {
    const visibleCount = visibleEnd - visibleStart;
    const grow = Math.max(1, Math.round(visibleCount * 0.15));
    setViewStart(Math.max(0, visibleStart - grow));
    setViewEnd(Math.min(candles.length, visibleEnd + grow));
  }, [visibleStart, visibleEnd, candles.length]);

  const tools: { key: DrawingTool; icon: React.ReactNode; label: string }[] = [
    { key: 'none', icon: <MousePointer className="w-3.5 h-3.5" />, label: 'Kéo/Pan' },
    { key: 'crosshair', icon: <Crosshair className="w-3.5 h-3.5" />, label: 'Crosshair' },
    { key: 'hline', icon: <Minus className="w-3.5 h-3.5" />, label: 'Đường ngang' },
    { key: 'trendline', icon: <TrendingUp className="w-3.5 h-3.5" />, label: 'Trend Line' },
  ];

  const visiblePct = candles.length > 0 ? Math.round(((visibleEnd - visibleStart) / candles.length) * 100) : 100;

  return (
    <div className="relative">
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border bg-card/50">
        {tools.map(t => (
          <button key={t.key} onClick={() => setActiveTool(t.key)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-all ${
              activeTool === t.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`} title={t.label}>
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}

        <div className="h-4 w-px bg-border mx-1" />

        {/* Zoom controls */}
        <button onClick={zoomIn} className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-all" title="Zoom In">
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button onClick={zoomOut} className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-all" title="Zoom Out">
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button onClick={resetZoom} className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-all" title="Reset">
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
        <span className="text-[9px] text-muted-foreground font-mono ml-1">{visibleEnd - visibleStart}/{candles.length} ({visiblePct}%)</span>

        {aiLevels && aiLevels.length > 0 && (
          <span className="ml-2 px-2 py-0.5 rounded bg-primary/10 text-primary text-[9px] font-bold animate-pulse">
            🧠 AI S/R Active
          </span>
        )}
        {drawnLines.length > 0 && (
          <button onClick={() => setDrawnLines([])}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-bear hover:bg-bear-muted ml-auto transition-all">
            <Trash2 className="w-3 h-3" />
            <span className="hidden sm:inline">Xóa ({drawnLines.length})</span>
          </button>
        )}
      </div>

      <div className="relative">
        <CandlestickChart candles={visibleCandles} pivots={pivots} trendLines={visibleTrendLines}
          buyZone={buyZone} sellZone={sellZone} patterns={visiblePatterns}
          aiLevels={aiLevels} aiTrendLines={visibleAiTrendLines} />
        
        <svg ref={svgRef} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className="w-full h-auto absolute top-0 left-0"
          style={{ cursor: isPanning ? 'grabbing' : activeTool === 'none' ? 'grab' : 'crosshair' }}
          onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp} onMouseLeave={handleMouseLeave}
          onWheel={handleWheel}>
          
          {drawnLines.map(line => {
            if (line.type === 'hline') {
              const y = priceToY(line.startPrice);
              return (
                <g key={line.id}>
                  <line x1={PADDING.left} y1={y} x2={CHART_WIDTH - PADDING.right} y2={y}
                    stroke={line.color} strokeWidth="1.2" strokeDasharray="6 3" opacity={0.9} />
                  <rect x={CHART_WIDTH - PADDING.right + 1} y={y - 8} width={84} height={16} rx="3" fill={line.color} opacity={0.2} />
                  <text x={CHART_WIDTH - PADDING.right + 5} y={y + 3} fill={line.color} fontSize="8" fontFamily="JetBrains Mono" fontWeight="600">
                    ✎ {line.startPrice.toFixed(2)}
                  </text>
                </g>
              );
            } else {
              const x1 = PADDING.left + gap * line.startIndex + gap / 2;
              const x2 = PADDING.left + gap * line.endIndex + gap / 2;
              const y1 = priceToY(line.startPrice);
              const y2 = priceToY(line.endPrice);
              return (
                <g key={line.id}>
                  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={line.color} strokeWidth="3" opacity={0.15} />
                  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={line.color} strokeWidth="1.5" opacity={0.9} />
                  <circle cx={x1} cy={y1} r="3" fill={line.color} opacity={0.9} />
                  <circle cx={x2} cy={y2} r="3" fill={line.color} opacity={0.9} />
                </g>
              );
            }
          })}

          {drawing && currentPos && activeTool === 'hline' && (
            <line x1={PADDING.left} y1={drawing.startY} x2={CHART_WIDTH - PADDING.right} y2={drawing.startY}
              stroke="hsl(187, 100%, 50%)" strokeWidth="1" strokeDasharray="4 2" opacity={0.7} />
          )}
          {drawing && currentPos && activeTool === 'trendline' && (
            <line x1={drawing.startX} y1={drawing.startY} x2={currentPos.x} y2={currentPos.y}
              stroke="hsl(270, 100%, 65%)" strokeWidth="1.5" strokeDasharray="4 2" opacity={0.7} />
          )}

          {crosshair && (activeTool === 'crosshair') && (
            <g>
              <line x1={PADDING.left} y1={crosshair.y} x2={CHART_WIDTH - PADDING.right} y2={crosshair.y}
                stroke="hsl(215, 15%, 40%)" strokeWidth="0.5" strokeDasharray="3 3" opacity={0.6} />
              <line x1={crosshair.x} y1={PADDING.top} x2={crosshair.x} y2={CHART_HEIGHT - PADDING.bottom}
                stroke="hsl(215, 15%, 40%)" strokeWidth="0.5" strokeDasharray="3 3" opacity={0.6} />
              <rect x={CHART_WIDTH - PADDING.right + 1} y={crosshair.y - 8} width={84} height={16} rx="3" fill="hsl(215, 20%, 20%)" />
              <text x={CHART_WIDTH - PADDING.right + 43} y={crosshair.y + 3} fill="hsl(215, 15%, 70%)" fontSize="8" textAnchor="middle" fontFamily="JetBrains Mono">
                {crosshair.price.toFixed(2)}
              </text>
              <rect x={crosshair.x - 20} y={CHART_HEIGHT - PADDING.bottom + 2} width={40} height={14} rx="3" fill="hsl(215, 20%, 20%)" />
              <text x={crosshair.x} y={CHART_HEIGHT - PADDING.bottom + 12} fill="hsl(215, 15%, 70%)" fontSize="7" textAnchor="middle" fontFamily="JetBrains Mono">
                {crosshair.time}
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Scrollbar / minimap */}
      {candles.length > MIN_VISIBLE && (
        <div className="px-2 pb-1">
          <div className="relative h-2 bg-secondary/50 rounded-full overflow-hidden">
            <div
              className="absolute h-full bg-primary/30 rounded-full"
              style={{
                left: `${(visibleStart / candles.length) * 100}%`,
                width: `${((visibleEnd - visibleStart) / candles.length) * 100}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default InteractiveChart;
