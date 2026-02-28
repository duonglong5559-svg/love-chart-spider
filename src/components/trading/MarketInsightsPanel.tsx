import { Droplets, Fish, TrendingUp, TrendingDown, BarChart3, Activity, Zap, Minus } from 'lucide-react';

interface LiquidityZone {
  price: number;
  type: 'high_liquidity' | 'liquidity_void';
  note: string;
}

interface WhaleActivity {
  status: 'accumulating' | 'distributing' | 'inactive';
  description: string;
  signals: string[];
}

interface FundingRate {
  bias: 'positive' | 'negative' | 'neutral';
  description: string;
}

interface OpenInterest {
  trend: 'increasing' | 'decreasing' | 'stable';
  description: string;
}

interface OrderFlow {
  dominance: 'buyers' | 'sellers' | 'balanced';
  description: string;
}

interface Volatility {
  level: 'low' | 'medium' | 'high' | 'extreme';
  atr: string;
  description: string;
}

export interface MarketInsights {
  liquidityZones?: LiquidityZone[];
  whaleActivity?: WhaleActivity;
  fundingRate?: FundingRate;
  openInterest?: OpenInterest;
  orderFlow?: OrderFlow;
  volatility?: Volatility;
}

interface Props {
  insights: MarketInsights;
}

const whaleStatusConfig = {
  accumulating: { label: 'Đang tích lũy', color: 'text-bull', bg: 'bg-bull/10' },
  distributing: { label: 'Đang phân phối', color: 'text-bear', bg: 'bg-bear/10' },
  inactive: { label: 'Không hoạt động', color: 'text-muted-foreground', bg: 'bg-secondary' },
};

const fundingConfig = {
  positive: { label: 'Dương (Long trả phí)', color: 'text-bull', icon: TrendingUp },
  negative: { label: 'Âm (Short trả phí)', color: 'text-bear', icon: TrendingDown },
  neutral: { label: 'Trung tính', color: 'text-pivot', icon: Minus },
};

const oiConfig = {
  increasing: { label: 'Tăng', color: 'text-bull' },
  decreasing: { label: 'Giảm', color: 'text-bear' },
  stable: { label: 'Ổn định', color: 'text-pivot' },
};

const orderFlowConfig = {
  buyers: { label: 'Bên Mua áp đảo', color: 'text-bull', bg: 'bg-bull/10' },
  sellers: { label: 'Bên Bán áp đảo', color: 'text-bear', bg: 'bg-bear/10' },
  balanced: { label: 'Cân bằng', color: 'text-pivot', bg: 'bg-pivot/10' },
};

const volatilityConfig = {
  low: { label: 'Thấp', color: 'text-muted-foreground', bars: 1 },
  medium: { label: 'Trung bình', color: 'text-pivot', bars: 2 },
  high: { label: 'Cao', color: 'text-bear', bars: 3 },
  extreme: { label: 'Cực cao ⚡', color: 'text-bear', bars: 4 },
};

export default function MarketInsightsPanel({ insights }: Props) {
  const { liquidityZones, whaleActivity, fundingRate, openInterest, orderFlow, volatility } = insights;

  return (
    <div className="space-y-3">
      {/* Whale Activity */}
      {whaleActivity && (
        <div className="bg-card rounded-lg border border-border p-3">
          <div className="flex items-center gap-2 mb-2">
            <Fish className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-bold text-primary">CÁ VOI</span>
            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${whaleStatusConfig[whaleActivity.status]?.bg} ${whaleStatusConfig[whaleActivity.status]?.color}`}>
              {whaleStatusConfig[whaleActivity.status]?.label}
            </span>
          </div>
          <p className="text-[11px] text-foreground leading-relaxed">{whaleActivity.description}</p>
          {whaleActivity.signals?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {whaleActivity.signals.map((s, i) => (
                <span key={i} className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[9px]">
                  🐋 {s}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Order Flow + Funding + OI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {/* Order Flow */}
        {orderFlow && (
          <div className="bg-card rounded-lg border border-border p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-primary" />
              <span className="text-[9px] font-bold text-primary">DÒNG LỆNH</span>
            </div>
            <span className={`text-xs font-bold ${orderFlowConfig[orderFlow.dominance]?.color}`}>
              {orderFlowConfig[orderFlow.dominance]?.label}
            </span>
            <p className="text-[10px] text-muted-foreground mt-1">{orderFlow.description}</p>
          </div>
        )}

        {/* Funding Rate */}
        {fundingRate && (() => {
          const cfg = fundingConfig[fundingRate.bias];
          const Icon = cfg?.icon || Minus;
          return (
            <div className="bg-card rounded-lg border border-border p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Icon className="w-3.5 h-3.5 text-primary" />
                <span className="text-[9px] font-bold text-primary">FUNDING RATE</span>
              </div>
              <span className={`text-xs font-bold ${cfg?.color}`}>{cfg?.label}</span>
              <p className="text-[10px] text-muted-foreground mt-1">{fundingRate.description}</p>
            </div>
          );
        })()}

        {/* Open Interest */}
        {openInterest && (
          <div className="bg-card rounded-lg border border-border p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Activity className="w-3.5 h-3.5 text-primary" />
              <span className="text-[9px] font-bold text-primary">OPEN INTEREST</span>
            </div>
            <span className={`text-xs font-bold ${oiConfig[openInterest.trend]?.color}`}>
              {oiConfig[openInterest.trend]?.label}
            </span>
            <p className="text-[10px] text-muted-foreground mt-1">{openInterest.description}</p>
          </div>
        )}
      </div>

      {/* Volatility */}
      {volatility && (() => {
        const cfg = volatilityConfig[volatility.level];
        return (
          <div className="bg-card rounded-lg border border-border p-3">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-primary" />
                <span className="text-[9px] font-bold text-primary">BIẾN ĐỘNG</span>
                <span className={`text-xs font-bold ${cfg?.color}`}>{cfg?.label}</span>
              </div>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4].map(b => (
                  <div key={b} className={`w-3 h-2 rounded-sm ${b <= (cfg?.bars || 0) ? (volatility.level === 'extreme' || volatility.level === 'high' ? 'bg-bear' : volatility.level === 'medium' ? 'bg-pivot' : 'bg-muted-foreground') : 'bg-secondary'}`} />
                ))}
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">{volatility.description}</p>
            {volatility.atr && <p className="text-[9px] text-pivot font-mono mt-1">ATR: {volatility.atr}</p>}
          </div>
        );
      })()}

      {/* Liquidity Zones */}
      {liquidityZones && liquidityZones.length > 0 && (
        <div className="bg-card rounded-lg border border-border p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Droplets className="w-3.5 h-3.5 text-primary" />
            <span className="text-[9px] font-bold text-primary">VÙNG THANH KHOẢN ({liquidityZones.length})</span>
          </div>
          <div className="space-y-1.5">
            {liquidityZones.map((zone, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded bg-secondary/50 text-xs">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${zone.type === 'high_liquidity' ? 'bg-primary' : 'bg-bear/60'}`} />
                  <span className="font-mono text-foreground font-bold">{zone.price.toLocaleString()}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">{zone.note}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
