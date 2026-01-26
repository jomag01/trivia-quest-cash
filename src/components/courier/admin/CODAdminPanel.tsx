import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CODDashboard from "../cod/CODDashboard";
import RiderTurnoverManagement from "../cod/RiderTurnoverManagement";
import SellerWalletManagement from "../cod/SellerWalletManagement";
import CODReconciliationReport from "../cod/CODReconciliationReport";
import CODExceptionHandler from "./CODExceptionHandler";

const CODAdminPanel = () => {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="turnovers">Turnovers</TabsTrigger>
        <TabsTrigger value="wallets">Seller Wallets</TabsTrigger>
        <TabsTrigger value="exceptions">Exceptions</TabsTrigger>
        <TabsTrigger value="reports">Reports</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-6">
        <CODDashboard />
      </TabsContent>

      <TabsContent value="turnovers" className="mt-6">
        <RiderTurnoverManagement />
      </TabsContent>

      <TabsContent value="wallets" className="mt-6">
        <SellerWalletManagement />
      </TabsContent>

      <TabsContent value="exceptions" className="mt-6">
        <CODExceptionHandler />
      </TabsContent>

      <TabsContent value="reports" className="mt-6">
        <CODReconciliationReport />
      </TabsContent>
    </Tabs>
  );
};

export default CODAdminPanel;
