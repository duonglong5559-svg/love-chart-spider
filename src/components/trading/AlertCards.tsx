import { PriceAlert } from '@/lib/tradingData';
import { Eye, Trash2, Circle } from 'lucide-react';

interface Props {
  alerts: PriceAlert[];
}

const AlertCards = ({ alerts }: Props) => {
  if (alerts.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground text-sm">
        Chưa có cảnh báo giá nào gần vùng hiện tại
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => {
        const isResistance = alert.type === 'resistance';
        
        return (
          <div
            key={alert.id}
            className="bg-card border border-border rounded-lg p-4 animate-ticker"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <Circle
                  className={`w-3.5 h-3.5 ${isResistance ? 'text-bear fill-bear' : 'text-bull fill-bull'}`}
                />
                <span className={`text-sm font-bold ${isResistance ? 'text-bear' : 'text-bull'}`}>
                  {isResistance ? 'KHÁNG CỰ' : 'HỖ TRỢ'} @ ${alert.price.toLocaleString()}
                </span>
                {alert.auto && (
                  <span className="px-1.5 py-0.5 text-[9px] font-bold bg-secondary text-muted-foreground rounded">
                    AUTO
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <button className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                  <Eye className="w-4 h-4" />
                </button>
                <button className="p-1 text-muted-foreground hover:text-bear transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ATR Description */}
            <div className="flex items-center gap-1.5 mb-2">
              <Circle className={`w-2.5 h-2.5 ${isResistance ? 'text-bear fill-bear' : 'text-bull fill-bull'}`} />
              <span className="text-xs text-muted-foreground">
                Giá đang test {isResistance ? 'kháng cự' : 'hỗ trợ'} (dưới {alert.atrDistance} ATR)
              </span>
            </div>

            {/* Strength & Stats */}
            <div className="mb-2">
              <span className={`text-xs font-bold ${
                alert.strength === 'Rất mạnh' ? (isResistance ? 'text-bear' : 'text-bull') :
                alert.strength === 'Mạnh' ? 'text-pivot' : 'text-muted-foreground'
              }`}>
                {alert.strength}
              </span>
              <span className="text-xs text-muted-foreground">
                {' '}• {alert.confidence}% tin cậy • {alert.testCount} lần test • RR {alert.rrRatio}
              </span>
            </div>

            {/* Action */}
            <p className="text-xs text-primary mb-2">{alert.action}</p>

            {/* Pattern */}
            <div className={`px-3 py-1.5 rounded text-xs font-medium mb-3 ${
              isResistance ? 'bg-bear-muted text-bear' : 'bg-bull-muted text-bull'
            }`}>
              {alert.pattern}
            </div>

            {/* Scalp / Swing / Stop Loss */}
            <div className="text-[11px] text-muted-foreground space-y-0.5 font-mono">
              <p>
                Scalp: <span className="text-foreground">${alert.scalp.toLocaleString()}</span>
                {' | '}Swing: <span className="text-foreground">${alert.swing.toLocaleString()}</span>
              </p>
              <p>
                Stop Loss: <span className="text-foreground">${alert.stopLoss.toLocaleString()}</span>
                {' '}
                <span className={`inline-block w-2 h-2 rounded-full ${alert.stopLossAdjusted ? 'bg-bull' : 'bg-bear'}`} />
                {' '}
                <span className="text-muted-foreground">
                  {alert.stopLossAdjusted ? '(đã điều chỉnh +0.6%)' : '(chưa điều chỉnh)'}
                </span>
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AlertCards;
