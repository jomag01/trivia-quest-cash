import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Store, ShoppingBag, UtensilsCrossed, Bike, Truck } from "lucide-react";
import Navigation from "@/components/Navigation";
import { RestaurantList } from "@/components/food/RestaurantList";
import { FoodCart } from "@/components/food/FoodCart";
import { MyFoodOrders } from "@/components/food/MyFoodOrders";
import { MyRestaurant } from "@/components/food/MyRestaurant";
import { RiderApplication } from "@/components/food/RiderApplication";
import { RiderDashboard } from "@/components/food/RiderDashboard";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CreateRestaurantDialog } from "@/components/food/CreateRestaurantDialog";

const Food = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("browse");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border shadow-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold">Food Delivery</h1>
          </div>
          <FoodCart />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Sticky Tabs */}
        <div className="sticky top-[73px] z-40 bg-background/95 backdrop-blur-lg border-b border-border px-4 py-2">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="browse" className="text-[10px] sm:text-xs px-1">
              <Store className="w-3 h-3 mr-0.5" />
              Browse
            </TabsTrigger>
            <TabsTrigger value="orders" className="text-[10px] sm:text-xs px-1">
              <ShoppingBag className="w-3 h-3 mr-0.5" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="restaurant" className="text-[10px] sm:text-xs px-1">
              <UtensilsCrossed className="w-3 h-3 mr-0.5" />
              Restaurant
            </TabsTrigger>
            <TabsTrigger value="rider" className="text-[10px] sm:text-xs px-1">
              <Bike className="w-3 h-3 mr-0.5" />
              Rider
            </TabsTrigger>
            <TabsTrigger value="deliver" className="text-[10px] sm:text-xs px-1">
              <Truck className="w-3 h-3 mr-0.5" />
              Deliver
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="p-4">
          <TabsContent value="browse">
            <RestaurantList />
          </TabsContent>

          <TabsContent value="orders">
            {user ? (
              <MyFoodOrders />
            ) : (
              <div className="text-center py-8">
                <p className="text-xs text-muted-foreground">Please log in to view your orders</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="restaurant">
            {user ? (
              <MyRestaurant onCreateNew={() => setCreateDialogOpen(true)} />
            ) : (
              <div className="text-center py-8">
                <p className="text-xs text-muted-foreground">Please log in to manage your restaurant</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="rider">
            {user ? (
              <RiderApplication />
            ) : (
              <div className="text-center py-8">
                <p className="text-xs text-muted-foreground">Please log in to apply as a rider</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="deliver">
            {user ? (
              <RiderDashboard />
            ) : (
              <div className="text-center py-8">
                <p className="text-xs text-muted-foreground">Please log in to access deliveries</p>
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <CreateRestaurantDialog onClose={() => setCreateDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      <Navigation />
    </div>
  );
};

export default Food;
