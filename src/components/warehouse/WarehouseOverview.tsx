import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Warehouse, Package, TruckIcon, MapPin } from 'lucide-react';
import type { Warehouse as WarehouseType, WarehouseInventory, FulfillmentOrder } from '@/hooks/useWarehouse';

interface WarehouseOverviewProps {
  warehouses: WarehouseType[];
  inventory: WarehouseInventory[];
  fulfillmentOrders: FulfillmentOrder[];
  userRole: string;
}

export default function WarehouseOverview({
  warehouses,
  inventory,
  fulfillmentOrders,
  userRole,
}: WarehouseOverviewProps) {
  // Group inventory by warehouse
  const inventoryByWarehouse = inventory.reduce((acc, inv) => {
    if (!acc[inv.warehouse_id]) {
      acc[inv.warehouse_id] = { total: 0, reserved: 0, items: 0 };
    }
    acc[inv.warehouse_id].total += inv.quantity;
    acc[inv.warehouse_id].reserved += inv.reserved_quantity;
    acc[inv.warehouse_id].items += 1;
    return acc;
  }, {} as Record<string, { total: number; reserved: number; items: number }>);

  // Group fulfillment by status
  const fulfillmentByStatus = fulfillmentOrders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500',
    picking: 'bg-blue-500',
    picked: 'bg-indigo-500',
    packing: 'bg-purple-500',
    packed: 'bg-pink-500',
    shipped: 'bg-green-500',
    delivered: 'bg-emerald-500',
    cancelled: 'bg-red-500',
  };

  return (
    <div className="space-y-6">
      {/* Warehouse Cards */}
      {(userRole === 'admin' || userRole === 'manager') && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Warehouse className="h-5 w-5" />
            Warehouse Status
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {warehouses.map((wh) => {
              const whInventory = inventoryByWarehouse[wh.id] || { total: 0, reserved: 0, items: 0 };
              const capacityUsed = wh.capacity_units > 0 
                ? (wh.current_units / wh.capacity_units) * 100 
                : 0;

              return (
                <Card key={wh.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{wh.name}</CardTitle>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" />
                          {wh.city}, {wh.province}
                        </p>
                      </div>
                      <Badge variant={wh.is_central ? 'default' : 'secondary'}>
                        {wh.is_central ? 'Central' : wh.code}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Capacity</span>
                        <span>{capacityUsed.toFixed(0)}%</span>
                      </div>
                      <Progress value={capacityUsed} className="h-2" />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-muted rounded p-2">
                        <p className="text-lg font-bold">{whInventory.items}</p>
                        <p className="text-xs text-muted-foreground">SKUs</p>
                      </div>
                      <div className="bg-muted rounded p-2">
                        <p className="text-lg font-bold">{whInventory.total.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Units</p>
                      </div>
                      <div className="bg-muted rounded p-2">
                        <p className="text-lg font-bold">{whInventory.reserved.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Reserved</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Fulfillment Pipeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TruckIcon className="h-5 w-5" />
            Fulfillment Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {Object.entries(fulfillmentByStatus).map(([status, count]) => (
              <div
                key={status}
                className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2"
              >
                <div className={`w-3 h-3 rounded-full ${statusColors[status] || 'bg-gray-500'}`} />
                <span className="text-sm capitalize">{status}</span>
                <Badge variant="secondary">{count}</Badge>
              </div>
            ))}
            {Object.keys(fulfillmentByStatus).length === 0 && (
              <p className="text-sm text-muted-foreground">No orders in pipeline</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Inventory Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-5 w-5" />
            Inventory by State
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {['available', 'reserved', 'in_transit', 'damaged', 'returned', 'quarantine'].map((state) => {
              const count = inventory.filter(i => i.state === state).reduce((sum, i) => sum + i.quantity, 0);
              const stateColors: Record<string, string> = {
                available: 'text-green-500 bg-green-500/10',
                reserved: 'text-blue-500 bg-blue-500/10',
                in_transit: 'text-yellow-500 bg-yellow-500/10',
                damaged: 'text-red-500 bg-red-500/10',
                returned: 'text-orange-500 bg-orange-500/10',
                quarantine: 'text-purple-500 bg-purple-500/10',
              };

              return (
                <div
                  key={state}
                  className={`rounded-lg p-3 text-center ${stateColors[state]}`}
                >
                  <p className="text-2xl font-bold">{count.toLocaleString()}</p>
                  <p className="text-xs capitalize">{state.replace('_', ' ')}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
