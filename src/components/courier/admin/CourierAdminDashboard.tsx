import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, Users, MapPin, Truck, Wallet, Settings, BarChart3 } from "lucide-react";
import CourierOverview from "./CourierOverview";
import RiderManagement from "./RiderManagement";
import HubManagement from "./HubManagement";
import ShipmentManagement from "./ShipmentManagement";
import CODAdminPanel from "./CODAdminPanel";
import CourierAnalytics from "./CourierAnalytics";
import CourierSettings from "./CourierSettings";

const CourierAdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Courier Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage your courier and parcel delivery operations</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="shipments" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Shipments
          </TabsTrigger>
          <TabsTrigger value="riders" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Riders
          </TabsTrigger>
          <TabsTrigger value="hubs" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Hubs
          </TabsTrigger>
          <TabsTrigger value="cod" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            COD
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <CourierOverview />
        </TabsContent>

        <TabsContent value="shipments" className="mt-6">
          <ShipmentManagement />
        </TabsContent>

        <TabsContent value="riders" className="mt-6">
          <RiderManagement />
        </TabsContent>

        <TabsContent value="hubs" className="mt-6">
          <HubManagement />
        </TabsContent>

        <TabsContent value="cod" className="mt-6">
          <CODAdminPanel />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <CourierAnalytics />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <CourierSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CourierAdminDashboard;
