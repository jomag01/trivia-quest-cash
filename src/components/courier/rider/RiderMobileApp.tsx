import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Truck, Wallet, User } from "lucide-react";
import RiderJobList from "./RiderJobList";
import RiderActiveDelivery from "./RiderActiveDelivery";
import RiderCODWallet from "./RiderCODWallet";
import RiderProfile from "./RiderProfile";

const RiderMobileApp = () => {
  const [activeTab, setActiveTab] = useState("jobs");

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-md mx-auto pb-20">
        <div className="sticky top-0 bg-background z-10 p-4 border-b">
          <h1 className="text-xl font-bold">Rider App</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsContent value="jobs" className="m-0 p-4">
            <RiderJobList />
          </TabsContent>

          <TabsContent value="active" className="m-0 p-4">
            <RiderActiveDelivery />
          </TabsContent>

          <TabsContent value="wallet" className="m-0 p-4">
            <RiderCODWallet />
          </TabsContent>

          <TabsContent value="profile" className="m-0 p-4">
            <RiderProfile />
          </TabsContent>

          <TabsList className="fixed bottom-0 left-0 right-0 h-16 grid grid-cols-4 rounded-none border-t bg-background">
            <TabsTrigger value="jobs" className="flex flex-col items-center gap-1 data-[state=active]:bg-transparent">
              <Package className="h-5 w-5" />
              <span className="text-xs">Jobs</span>
            </TabsTrigger>
            <TabsTrigger value="active" className="flex flex-col items-center gap-1 data-[state=active]:bg-transparent">
              <Truck className="h-5 w-5" />
              <span className="text-xs">Active</span>
            </TabsTrigger>
            <TabsTrigger value="wallet" className="flex flex-col items-center gap-1 data-[state=active]:bg-transparent">
              <Wallet className="h-5 w-5" />
              <span className="text-xs">COD</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex flex-col items-center gap-1 data-[state=active]:bg-transparent">
              <User className="h-5 w-5" />
              <span className="text-xs">Profile</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
};

export default RiderMobileApp;
