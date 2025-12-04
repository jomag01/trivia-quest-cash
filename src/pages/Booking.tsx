import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Plus, Briefcase, Clock } from "lucide-react";
import ServicesList from "@/components/booking/ServicesList";
import MyServices from "@/components/booking/MyServices";
import MyBookings from "@/components/booking/MyBookings";
import CreateServiceDialog from "@/components/booking/CreateServiceDialog";
import { Button } from "@/components/ui/button";

const Booking = () => {
  const { user } = useAuth();
  const [showCreateService, setShowCreateService] = useState(false);
  const [activeTab, setActiveTab] = useState("browse");

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">Book Services</h1>
              <p className="text-sm text-muted-foreground">Find and book services from providers</p>
            </div>
            {user && (
              <Button onClick={() => setShowCreateService(true)} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Offer Service
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="browse" className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Browse</span>
            </TabsTrigger>
            <TabsTrigger value="my-bookings" className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">My Bookings</span>
            </TabsTrigger>
            <TabsTrigger value="my-services" className="flex items-center gap-1">
              <Briefcase className="h-4 w-4" />
              <span className="hidden sm:inline">My Services</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browse">
            <ServicesList />
          </TabsContent>

          <TabsContent value="my-bookings">
            <MyBookings />
          </TabsContent>

          <TabsContent value="my-services">
            <MyServices onCreateNew={() => setShowCreateService(true)} />
          </TabsContent>
        </Tabs>
      </div>

      <CreateServiceDialog 
        open={showCreateService} 
        onOpenChange={setShowCreateService} 
      />
    </div>
  );
};

export default Booking;