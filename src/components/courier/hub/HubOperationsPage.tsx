import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ScanLine, Truck, BarChart3 } from "lucide-react";
import HubScanningPanel from "./HubScanningPanel";
import HubSortingPanel from "./HubSortingPanel";
import LinehaulManagement from "./LinehaulManagement";
import HubDashboard from "./HubDashboard";

const HubOperationsPage = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hub Operations</h1>
          <p className="text-muted-foreground">Manage scanning, sorting, and linehaul dispatch</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="scanning" className="flex items-center gap-2">
            <ScanLine className="h-4 w-4" />
            Scanning
          </TabsTrigger>
          <TabsTrigger value="sorting" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Sorting
          </TabsTrigger>
          <TabsTrigger value="linehaul" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Linehaul
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <HubDashboard />
        </TabsContent>

        <TabsContent value="scanning" className="mt-6">
          <HubScanningPanel />
        </TabsContent>

        <TabsContent value="sorting" className="mt-6">
          <HubSortingPanel />
        </TabsContent>

        <TabsContent value="linehaul" className="mt-6">
          <LinehaulManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HubOperationsPage;
