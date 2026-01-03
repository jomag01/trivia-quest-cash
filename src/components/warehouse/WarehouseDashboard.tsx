import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Warehouse, TruckIcon, BarChart3, AlertTriangle, ScanLine, ClipboardList, RotateCcw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useWarehouses, useWarehouseInventory, useFulfillmentOrders, useStockAlerts } from '@/hooks/useWarehouse';
import WarehouseInventoryTable from './WarehouseInventoryTable';
import WarehouseOverview from './WarehouseOverview';
import SKUManagement from './SKUManagement';
import FulfillmentQueue from './FulfillmentQueue';
import BarcodeScanner from './BarcodeScanner';
import StockAlertsPanel from './StockAlertsPanel';
import WarehouseTransfers from './WarehouseTransfers';
import PurchaseOrders from './PurchaseOrders';

interface WarehouseDashboardProps {
  userRole: 'admin' | 'manager' | 'staff' | 'seller' | 'supplier';
}

export default function WarehouseDashboard({ userRole }: WarehouseDashboardProps) {
  const { user } = useAuth();
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState('overview');

  const { data: warehouses = [], isLoading: loadingWarehouses } = useWarehouses();
  const { data: inventory = [] } = useWarehouseInventory(selectedWarehouse);
  const { data: fulfillmentOrders = [] } = useFulfillmentOrders(selectedWarehouse);
  const { data: alerts = [] } = useStockAlerts(userRole === 'seller' ? user?.id : undefined);

  // Calculate stats
  const totalStock = inventory.reduce((sum, inv) => sum + inv.quantity, 0);
  const reservedStock = inventory.reduce((sum, inv) => sum + inv.reserved_quantity, 0);
  const pendingFulfillment = fulfillmentOrders.filter(f => f.status === 'pending').length;
  const activeAlerts = alerts.length;

  const stats = [
    { label: 'Total Stock', value: totalStock.toLocaleString(), icon: Package, color: 'text-blue-500' },
    { label: 'Reserved', value: reservedStock.toLocaleString(), icon: ClipboardList, color: 'text-orange-500' },
    { label: 'Pending Fulfillment', value: pendingFulfillment, icon: TruckIcon, color: 'text-green-500' },
    { label: 'Active Alerts', value: activeAlerts, icon: AlertTriangle, color: 'text-red-500' },
  ];

  // Define available tabs based on role
  const getTabs = () => {
    const baseTabs = [
      { id: 'overview', label: 'Overview', icon: BarChart3 },
      { id: 'inventory', label: 'Inventory', icon: Package },
    ];

    if (userRole === 'admin' || userRole === 'manager') {
      baseTabs.push(
        { id: 'skus', label: 'SKU Management', icon: ScanLine },
        { id: 'fulfillment', label: 'Fulfillment', icon: TruckIcon },
        { id: 'transfers', label: 'Transfers', icon: RotateCcw },
        { id: 'purchase-orders', label: 'Purchase Orders', icon: ClipboardList },
        { id: 'scanner', label: 'Barcode Scanner', icon: ScanLine },
        { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
      );
    } else if (userRole === 'staff') {
      baseTabs.push(
        { id: 'fulfillment', label: 'Fulfillment', icon: TruckIcon },
        { id: 'scanner', label: 'Barcode Scanner', icon: ScanLine },
      );
    } else if (userRole === 'seller') {
      baseTabs.push(
        { id: 'skus', label: 'My SKUs', icon: ScanLine },
        { id: 'alerts', label: 'Low Stock Alerts', icon: AlertTriangle },
      );
    } else if (userRole === 'supplier') {
      baseTabs.push(
        { id: 'purchase-orders', label: 'Purchase Orders', icon: ClipboardList },
      );
    }

    return baseTabs;
  };

  const tabs = getTabs();

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Warehouse Selector for Admin/Manager */}
      {(userRole === 'admin' || userRole === 'manager') && warehouses.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Warehouse className="h-4 w-4" />
              Select Warehouse
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedWarehouse(undefined)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  !selectedWarehouse
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                All Warehouses
              </button>
              {warehouses.map((wh) => (
                <button
                  key={wh.id}
                  onClick={() => setSelectedWarehouse(wh.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selectedWarehouse === wh.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {wh.name} ({wh.code})
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full overflow-x-auto flex justify-start gap-1 h-auto p-1">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="flex items-center gap-1.5 text-xs sm:text-sm whitespace-nowrap"
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <WarehouseOverview
            warehouses={warehouses}
            inventory={inventory}
            fulfillmentOrders={fulfillmentOrders}
            userRole={userRole}
          />
        </TabsContent>

        <TabsContent value="inventory" className="mt-4">
          <WarehouseInventoryTable
            inventory={inventory}
            userRole={userRole}
            warehouseId={selectedWarehouse}
          />
        </TabsContent>

        <TabsContent value="skus" className="mt-4">
          <SKUManagement userRole={userRole} />
        </TabsContent>

        <TabsContent value="fulfillment" className="mt-4">
          <FulfillmentQueue
            orders={fulfillmentOrders}
            userRole={userRole}
            warehouseId={selectedWarehouse}
          />
        </TabsContent>

        <TabsContent value="transfers" className="mt-4">
          <WarehouseTransfers
            warehouses={warehouses}
            userRole={userRole}
          />
        </TabsContent>

        <TabsContent value="purchase-orders" className="mt-4">
          <PurchaseOrders
            userRole={userRole}
            warehouseId={selectedWarehouse}
          />
        </TabsContent>

        <TabsContent value="scanner" className="mt-4">
          <BarcodeScanner warehouseId={selectedWarehouse} />
        </TabsContent>

        <TabsContent value="alerts" className="mt-4">
          <StockAlertsPanel alerts={alerts} userRole={userRole} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
