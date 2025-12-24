import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Search, Star, Clock, MapPin, Navigation, AlertCircle } from "lucide-react";
import { RestaurantMenu } from "./RestaurantMenu";
import { useGeolocation, isWithinServiceArea, calculateDistance } from "@/hooks/useGeolocation";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FoodCategory {
  id: string;
  name: string;
  icon: string | null;
}

interface FoodVendor {
  id: string;
  name: string;
  cuisine_type: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  address: string | null;
  is_open: boolean;
  rating: number | null;
  estimated_delivery_time: string | null;
  delivery_fee: number;
  minimum_order: number;
  latitude: number | null;
  longitude: number | null;
  service_radius_km: number | null;
}

export const RestaurantList = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
  const { latitude, longitude, error: locationError, loading: locationLoading } = useGeolocation();

  const { data: categories } = useQuery({
    queryKey: ["food-categories"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("food_categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data as FoodCategory[];
    },
  });

  const { data: vendors, isLoading } = useQuery({
    queryKey: ["food-vendors", selectedCategory, searchQuery, latitude, longitude],
    queryFn: async () => {
      let query = (supabase as any)
        .from("food_vendors")
        .select("*")
        .eq("approval_status", "approved")
        .eq("is_active", true);

      if (selectedCategory) {
        query = query.eq("category_id", selectedCategory);
      }

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,cuisine_type.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query.order("rating", { ascending: false });
      if (error) throw error;
      return data as FoodVendor[];
    },
  });

  // Filter vendors by user location
  const filteredVendors = vendors?.filter((vendor) => {
    if (!latitude || !longitude) return true; // Show all if no location
    return isWithinServiceArea(
      latitude,
      longitude,
      vendor.latitude,
      vendor.longitude,
      vendor.service_radius_km || 10
    );
  }).map(vendor => ({
    ...vendor,
    distance: latitude && longitude && vendor.latitude && vendor.longitude
      ? calculateDistance(latitude, longitude, vendor.latitude, vendor.longitude)
      : null
  })).sort((a, b) => {
    // Sort by distance if available, otherwise by rating
    if (a.distance !== null && b.distance !== null) {
      return a.distance - b.distance;
    }
    return (b.rating || 0) - (a.rating || 0);
  });

  if (selectedVendor) {
    return <RestaurantMenu vendorId={selectedVendor} onBack={() => setSelectedVendor(null)} />;
  }

  return (
    <div className="space-y-4">
      {/* Location Status */}
      {locationLoading && (
        <Alert>
          <Navigation className="h-4 w-4 animate-pulse" />
          <AlertDescription>Getting your location to show nearby restaurants...</AlertDescription>
        </Alert>
      )}
      {locationError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{locationError} - Showing all restaurants.</AlertDescription>
        </Alert>
      )}
      {latitude && longitude && !locationError && (
        <Alert className="bg-primary/10 border-primary/20">
          <MapPin className="h-4 w-4 text-primary" />
          <AlertDescription className="text-primary">
            Showing restaurants that deliver to your location
          </AlertDescription>
        </Alert>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search restaurants or cuisine..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Categories */}
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-2 pb-2">
          <Badge
            variant={selectedCategory === null ? "default" : "outline"}
            className="cursor-pointer shrink-0"
            onClick={() => setSelectedCategory(null)}
          >
            All
          </Badge>
          {categories?.map((category) => (
            <Badge
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "outline"}
              className="cursor-pointer shrink-0"
              onClick={() => setSelectedCategory(category.id)}
            >
              {category.icon} {category.name}
            </Badge>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Restaurant List */}
      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-0">
                <div className="h-40 bg-muted rounded-t-lg" />
                <div className="p-4 space-y-2">
                  <div className="h-5 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredVendors?.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            {latitude && longitude 
              ? "No restaurants deliver to your area" 
              : "No restaurants found"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredVendors?.map((vendor) => (
            <Card
              key={vendor.id}
              className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden"
              onClick={() => setSelectedVendor(vendor.id)}
            >
              <CardContent className="p-0">
                <div className="relative">
                  <img
                    src={vendor.cover_image_url || "/placeholder.svg"}
                    alt={vendor.name}
                    className="w-full h-40 object-cover"
                  />
                  {!vendor.is_open && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white font-semibold">Currently Closed</span>
                    </div>
                  )}
                  {vendor.logo_url && (
                    <img
                      src={vendor.logo_url}
                      alt={`${vendor.name} logo`}
                      className="absolute bottom-2 left-2 w-16 h-16 rounded-full border-2 border-white object-cover"
                    />
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{vendor.name}</h3>
                      <p className="text-sm text-muted-foreground">{vendor.cuisine_type}</p>
                    </div>
                    <div className="flex items-center gap-1 bg-primary/10 px-2 py-1 rounded">
                      <Star className="w-4 h-4 fill-primary text-primary" />
                      <span className="text-sm font-medium">{vendor.rating || "New"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{vendor.estimated_delivery_time}</span>
                    </div>
                    {vendor.distance !== null ? (
                      <div className="flex items-center gap-1 text-primary">
                        <Navigation className="w-4 h-4" />
                        <span>{vendor.distance.toFixed(1)} km away</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span className="truncate max-w-[150px]">{vendor.address || "No address"}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {vendor.delivery_fee === 0 ? (
                      <Badge variant="secondary" className="text-xs">Free Delivery</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">₱{vendor.delivery_fee} delivery</Badge>
                    )}
                    {vendor.minimum_order > 0 && (
                      <Badge variant="outline" className="text-xs">Min ₱{vendor.minimum_order}</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
