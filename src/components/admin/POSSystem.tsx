import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InventoryManagement } from "./InventoryManagement";
import { ProductLabels } from "./ProductLabels";
import { StockReplenishment } from "./StockReplenishment";
import { DeliveryManagement } from "./DeliveryManagement";
import { Package, Barcode, RefreshCw, Truck } from "lucide-react";

export function POSSystem() {
  const [activeTab, setActiveTab] = useState("inventory");

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 lg:grid-cols-4 gap-2 h-auto p-1">
          <TabsTrigger value="inventory" className="flex items-center gap-2 py-2">
            <Package className="w-4 h-4" />
            <span className="hidden sm:inline">Inventory</span>
          </TabsTrigger>
          <TabsTrigger value="labels" className="flex items-center gap-2 py-2">
            <Barcode className="w-4 h-4" />
            <span className="hidden sm:inline">Labels & Barcodes</span>
          </TabsTrigger>
          <TabsTrigger value="replenishment" className="flex items-center gap-2 py-2">
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Replenishment</span>
          </TabsTrigger>
          <TabsTrigger value="delivery" className="flex items-center gap-2 py-2">
            <Truck className="w-4 h-4" />
            <span className="hidden sm:inline">Delivery</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="mt-6">
          <InventoryManagement />
        </TabsContent>

        <TabsContent value="labels" className="mt-6">
          <ProductLabels />
        </TabsContent>

        <TabsContent value="replenishment" className="mt-6">
          <StockReplenishment />
        </TabsContent>

        <TabsContent value="delivery" className="mt-6">
          <DeliveryManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
