import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Clock, Star, MapPin, Navigation, AlertCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import BookServiceDialog from "./BookServiceDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useGeolocation, isWithinServiceArea, calculateDistance } from "@/hooks/useGeolocation";

interface Service {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  duration_minutes: number;
  image_url: string | null;
  diamond_reward: number;
  provider_id: string;
  latitude: number | null;
  longitude: number | null;
  service_radius_km: number | null;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface Category {
  id: string;
  name: string;
  icon: string;
}

const ServicesList = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showBookDialog, setShowBookDialog] = useState(false);
  const { latitude, longitude, error: locationError, loading: locationLoading } = useGeolocation();

  useEffect(() => {
    fetchCategories();
    fetchServices();
  }, [selectedCategory]);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("service_categories")
      .select("*")
      .eq("is_active", true)
      .order("display_order");
    if (data) setCategories(data);
  };

  const fetchServices = async () => {
    setLoading(true);
    let query = supabase
      .from("services")
      .select(`
        *,
        profiles!services_provider_id_fkey (full_name, avatar_url)
      `)
      .eq("is_active", true)
      .eq("approval_status", "approved");

    if (selectedCategory && selectedCategory !== "all") {
      query = query.eq("category", selectedCategory);
    }

    const { data, error } = await query.order("created_at", { ascending: false });
    
    if (!error && data) {
      setServices(data as Service[]);
    }
    setLoading(false);
  };

  // Filter services by search, then by location
  const filteredServices = useMemo(() => {
    let result = services.filter(service =>
      service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Apply location filter
    if (latitude && longitude) {
      result = result.filter(service =>
        isWithinServiceArea(
          latitude,
          longitude,
          service.latitude,
          service.longitude,
          service.service_radius_km || 10
        )
      );
    }

    // Add distance and sort
    return result.map(service => ({
      ...service,
      distance: latitude && longitude && service.latitude && service.longitude
        ? calculateDistance(latitude, longitude, service.latitude, service.longitude)
        : null
    })).sort((a, b) => {
      if (a.distance !== null && b.distance !== null) {
        return a.distance - b.distance;
      }
      return 0;
    });
  }, [services, searchQuery, latitude, longitude]);

  const handleBookService = (service: Service) => {
    setSelectedService(service);
    setShowBookDialog(true);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Location Status */}
      {locationLoading && (
        <Alert>
          <Navigation className="h-4 w-4 animate-pulse" />
          <AlertDescription>Getting your location to show nearby services...</AlertDescription>
        </Alert>
      )}
      {locationError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{locationError} - Showing all services.</AlertDescription>
        </Alert>
      )}
      {latitude && longitude && !locationError && (
        <Alert className="bg-primary/10 border-primary/20">
          <MapPin className="h-4 w-4 text-primary" />
          <AlertDescription className="text-primary">
            Showing services available in your area
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat.id} value={cat.name}>
                {cat.icon} {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map(cat => (
          <Badge
            key={cat.id}
            variant={selectedCategory === cat.name ? "default" : "outline"}
            className="cursor-pointer whitespace-nowrap"
            onClick={() => setSelectedCategory(cat.name === selectedCategory ? "all" : cat.name)}
          >
            {cat.icon} {cat.name}
          </Badge>
        ))}
      </div>

      {/* Services Grid */}
      {filteredServices.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {latitude && longitude 
              ? "No services available in your area" 
              : "No services found"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServices.map(service => (
            <Card key={service.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-video bg-muted relative">
                {service.image_url ? (
                  <img 
                    src={service.image_url} 
                    alt={service.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">
                    {categories.find(c => c.name === service.category)?.icon || "🔧"}
                  </div>
                )}
                {service.diamond_reward > 0 && (
                  <Badge className="absolute top-2 right-2 bg-primary">
                    💎 +{service.diamond_reward}
                  </Badge>
                )}
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold line-clamp-1">{service.title}</h3>
                  <span className="font-bold text-primary">₱{service.price}</span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {service.description}
                </p>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {service.duration_minutes} mins
                    </span>
                  </div>
                  {service.distance !== null && (
                    <div className="flex items-center gap-1 text-primary">
                      <Navigation className="h-4 w-4" />
                      <span className="text-sm">{service.distance.toFixed(1)} km</span>
                    </div>
                  )}
                  <Badge variant="secondary" className="text-xs">
                    {service.category}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={service.profiles?.avatar_url || undefined} />
                      <AvatarFallback>
                        {service.profiles?.full_name?.[0] || "P"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-muted-foreground">
                      {service.profiles?.full_name || "Provider"}
                    </span>
                  </div>
                  <Button size="sm" onClick={() => handleBookService(service)}>
                    Book Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <BookServiceDialog
        open={showBookDialog}
        onOpenChange={setShowBookDialog}
        service={selectedService}
      />
    </div>
  );
};

export default ServicesList;