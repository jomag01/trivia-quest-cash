import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, ArrowDownUp, FileText, Settings } from "lucide-react";
import CODDashboard from "./CODDashboard";
import SellerWalletManagement from "./SellerWalletManagement";
import RiderTurnoverManagement from "./RiderTurnoverManagement";
import CODReconciliationReport from "./CODReconciliationReport";

const CODManagementPage = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">COD & Wallet Management</h1>
        <p className="text-muted-foreground">Manage cash on delivery transactions and seller wallets</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="turnovers" className="flex items-center gap-2">
            <ArrowDownUp className="h-4 w-4" />
            Turnovers
          </TabsTrigger>
          <TabsTrigger value="wallets" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Seller Wallets
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <CODDashboard />
        </TabsContent>

        <TabsContent value="turnovers" className="mt-6">
          <RiderTurnoverManagement />
        </TabsContent>

        <TabsContent value="wallets" className="mt-6">
          <SellerWalletManagement />
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <CODReconciliationReport />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CODManagementPage;
