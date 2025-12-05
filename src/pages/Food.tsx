import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Store, ShoppingBag, UtensilsCrossed } from "lucide-react";
import Navigation from "@/components/Navigation";
import { RestaurantList } from "@/components/food/RestaurantList";
import { FoodCart } from "@/components/food/FoodCart";
import { MyFoodOrders } from "@/components/food/MyFoodOrders";
import { MyRestaurant } from "@/components/food/MyRestaurant";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { CreateRestaurantDialog } from "@/components/food/CreateRestaurantDialog";

const Food = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("browse");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold">Food Delivery</h1>
          </div>
          <FoodCart />
        </div>
      </div>

      <div className="p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="browse" className="text-xs sm:text-sm">
              <Store className="w-4 h-4 mr-1" />
              Browse
            </TabsTrigger>
            <TabsTrigger value="orders" className="text-xs sm:text-sm">
              <ShoppingBag className="w-4 h-4 mr-1" />
              My Orders
            </TabsTrigger>
            <TabsTrigger value="restaurant" className="text-xs sm:text-sm">
              <UtensilsCrossed className="w-4 h-4 mr-1" />
              My Restaurant
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browse">
            <RestaurantList />
          </TabsContent>

          <TabsContent value="orders">
            {user ? (
              <MyFoodOrders />
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Please log in to view your orders</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="restaurant">
            {user ? (
              <MyRestaurant onCreateNew={() => setCreateDialogOpen(true)} />
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Please log in to manage your restaurant</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

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
