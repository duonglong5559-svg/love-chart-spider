import type { SignalStatus, SignalDirection, StructureState, PatternSignal } from '@/engine/types';
import { TrendingUp, TrendingDown, Minus, Target, Shield, AlertTriangle, Clock, Zap } from 'lucide-react';

interface SignalData {
  entryLong?: number;
  entryShort?: number;
  target?: number;
  stopLoss?: number;
  summary: string;
  status: SignalStatus;
  direction: SignalDirection;
}

interface Props {
  signal: SignalData;
  structureState: StructureState;
  patterns: PatternSignal[];
  currentPrice: number;
}

const STATUS_CONFIG: Record<SignalStatus, { label: string; color: string; icon: React.ReactNode }> = {
  IDLE: { label: 'Chờ tín hiệu', color: 'text-muted-foreground', icon: <Clock className="w-3.5 h-3.5" /> },
  WATCH_LONG: { label: 'Theo dõi Long', color: 'text-bull/70', icon: <TrendingUp className="w-3.5 h-3.5" /> },
  WATCH_SHORT: { label: 'Theo dõi Short', color: 'text-bear/70', icon: <TrendingDown className="w-3.5 h-3.5" /> },
  READY: { label: 'Sẵn sàng', color: 'text-primary', icon: <Zap className="w-3.5 h-3.5" /> },
  TRIGGERED: { label: 'Đã kích hoạt', color: 'text-pivot', icon: <Target className="w-3.5 h-3.5" /> },
  ACTIVE: { label: 'Đang hoạt động', color: 'text-bull', icon: <Zap className="w-3.5 h-3.5" /> },
  TP_HIT: { label: 'Đạt TP', color: 'text-bull', icon: <Target className="w-3.5 h-3.5" /> },
  SL_HIT: { label: 'Chạm SL', color: 'text-bear', icon: <Shield className="w-3.5 h-3.5" /> },
  INVALIDATED: { label: 'Vô hiệu', color: 'text-muted-foreground', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  COOLDOWN: { label: 'Nghỉ lệnh', color: 'text-muted-foreground', icon: <Clock className="w-3.5 h-3.5" /> },
};

const STRUCTURE_LABELS: Record<StructureState, { label: string; color: string }> = {
  'HH-HL': { label: 'Uptrend (HH-HL)', color: 'text-bull' },
  'LH-LL': { label: 'Downtrend (LH-LL)', color: 'text-bear' },
  'range': { label: 'Sideway', color: 'text-pivot' },
  'breakout': { label: 'Breakout ↑', color: 'text-bull' },
  'breakdown': { label: 'Breakdown ↓', color: 'text-bear' },
  'retest': { label: 'Retest', color: 'text-pivot' },
  'CHOCH-bull': { label: 'CHOCH Bullish', color: 'text-bull' },
  'CHOCH-bear': { label: 'CHOCH Bearish', color: 'text-bear' },
};

function formatPrice(v: number | undefined): string {
  if (!v) return '---';
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function SignalDisplay({ signal, structureState, patterns, currentPrice }: Props) {
  const statusCfg = STATUS_CONFIG[signal.status];
  const structCfg = STRUCTURE_LABELS[structureState] || { label: structureState, color: 'text-muted-foreground' };
  const isLong = signal.direction === 'long';
  const isShort = signal.direction === 'short';

  const recentPatterns = patterns.slice(-3);

  return (
    <div className="space-y-3">
      {/* Signal Status + Structure */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold
          ${isLong ? 'bg-bull/10 border-bull/20 text-bull' :
            isShort ? 'bg-bear/10 border-bear/20 text-bear' :
              'bg-card border-border/50 text-muted-foreground'}`}
        >
          {statusCfg.icon}
          <span>{statusCfg.label}</span>
        </div>

        <div className={`px-2 py-1 rounded-md text-[9px] font-bold font-mono ${structCfg.color} bg-card/50 border border-border/30`}>
          {structCfg.label}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-card/60 backdrop-blur-sm rounded-lg border border-border/50 p-3">
        <p className="text-xs text-foreground/90 leading-relaxed">{signal.summary}</p>
      </div>

      {/* Entry / SL / TP Grid */}
      {(signal.entryLong || signal.entryShort) && (
        <div className="grid grid-cols-4 gap-2">
          {isLong && signal.entryLong && (
            <div className="bg-bull/5 border border-bull/20 rounded-lg p-2.5 text-center">
              <p className="text-[8px] text-bull/70 font-bold mb-1">ENTRY LONG</p>
              <p className="text-[11px] font-mono font-bold text-bull">{formatPrice(signal.entryLong)}</p>
            </div>
          )}
          {isShort && signal.entryShort && (
            <div className="bg-bear/5 border border-bear/20 rounded-lg p-2.5 text-center">
              <p className="text-[8px] text-bear/70 font-bold mb-1">ENTRY SHORT</p>
              <p className="text-[11px] font-mono font-bold text-bear">{formatPrice(signal.entryShort)}</p>
            </div>
          )}

          {signal.stopLoss && (
            <div className="bg-bear/5 border border-bear/15 rounded-lg p-2.5 text-center">
              <p className="text-[8px] text-bear/70 font-bold mb-1">STOP LOSS</p>
              <p className="text-[11px] font-mono font-bold text-bear">{formatPrice(signal.stopLoss)}</p>
            </div>
          )}

          {signal.target && (
            <div className="bg-bull/5 border border-bull/15 rounded-lg p-2.5 text-center">
              <p className="text-[8px] text-bull/70 font-bold mb-1">TARGET</p>
              <p className="text-[11px] font-mono font-bold text-bull">{formatPrice(signal.target)}</p>
            </div>
          )}

          <div className="bg-card/50 border border-border/30 rounded-lg p-2.5 text-center">
            <p className="text-[8px] text-muted-foreground font-bold mb-1">GIÁ HIỆN TẠI</p>
            <p className={`text-[11px] font-mono font-bold ${isLong ? 'text-bull' : isShort ? 'text-bear' : 'text-foreground'}`}>
              {formatPrice(currentPrice)}
            </p>
          </div>
        </div>
      )}

      {/* Recent Patterns */}
      {recentPatterns.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {recentPatterns.map((p, i) => (
            <span
              key={i}
              className={`px-2 py-0.5 rounded-md text-[9px] font-bold border
                ${p.type === 'bullish' ? 'bg-bull/10 text-bull border-bull/20' :
                  p.type === 'bearish' ? 'bg-bear/10 text-bear border-bear/20' :
                    'bg-card text-muted-foreground border-border/30'}`}
            >
              {p.nameVi}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
