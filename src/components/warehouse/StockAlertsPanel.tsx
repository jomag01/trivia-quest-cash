import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Bell, BellOff, Package, TrendingDown, Clock } from 'lucide-react';
import { useAcknowledgeAlert, type StockAlert } from '@/hooks/useWarehouse';

interface StockAlertsPanelProps {
  alerts: StockAlert[];
  userRole: string;
}

export default function StockAlertsPanel({ alerts, userRole }: StockAlertsPanelProps) {
  const acknowledgeAlert = useAcknowledgeAlert();

  const alertIcons: Record<string, typeof AlertTriangle> = {
    low_stock: TrendingDown,
    out_of_stock: Package,
    overstock: Package,
    expiring_soon: Clock,
  };

  const alertColors: Record<string, string> = {
    low_stock: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
    out_of_stock: 'bg-red-500/10 text-red-600 border-red-500/30',
    overstock: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
    expiring_soon: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
  };

  const formatAlertType = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  if (alerts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BellOff className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Active Alerts</h3>
          <p className="text-sm text-muted-foreground">
            All inventory levels are within normal parameters.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Stock Alerts ({alerts.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.map((alert) => {
            const Icon = alertIcons[alert.alert_type] || AlertTriangle;

            return (
              <div
                key={alert.id}
                className={`flex items-start gap-4 p-4 rounded-lg border ${
                  alertColors[alert.alert_type] || 'bg-muted'
                }`}
              >
                <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      {formatAlertType(alert.alert_type)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(alert.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="font-medium">
                    {alert.sku?.name || 'Unknown Product'}
                  </p>
                  <p className="text-sm font-mono text-muted-foreground">
                    SKU: {alert.sku?.sku || '-'}
                  </p>
                  {alert.threshold !== undefined && alert.current_level !== undefined && (
                    <p className="text-sm mt-1">
                      Current: <strong>{alert.current_level}</strong> / Threshold:{' '}
                      <strong>{alert.threshold}</strong>
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => acknowledgeAlert.mutate(alert.id)}
                  disabled={acknowledgeAlert.isPending}
                >
                  Acknowledge
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
