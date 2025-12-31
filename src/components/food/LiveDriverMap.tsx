import { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navigation, Clock, MapPin, Phone } from "lucide-react";

interface LiveDriverMapProps {
  orderId: string;
  driverId: string;
  customerLat?: number;
  customerLng?: number;
  vendorLat?: number;
  vendorLng?: number;
  orderStatus: string;
}

interface DriverLocation {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  updated_at: string;
}

export const LiveDriverMap = ({
  orderId,
  driverId,
  customerLat,
  customerLng,
  vendorLat,
  vendorLng,
  orderStatus,
}: LiveDriverMapProps) => {
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [eta, setEta] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  // Fetch initial driver location
  const { data: initialLocation } = useQuery({
    queryKey: ["driver-location", driverId, orderId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("driver_locations")
        .select("*")
        .eq("driver_id", driverId)
        .eq("order_id", orderId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as DriverLocation | null;
    },
    enabled: !!driverId && !!orderId,
  });

  // Subscribe to realtime location updates
  useEffect(() => {
    if (!driverId || !orderId) return;

    const channel = supabase
      .channel(`driver-location-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "driver_locations",
          filter: `order_id=eq.${orderId}`,
        },
        (payload: any) => {
          if (payload.new) {
            setDriverLocation({
              latitude: parseFloat(payload.new.latitude),
              longitude: parseFloat(payload.new.longitude),
              heading: payload.new.heading,
              speed: payload.new.speed,
              updated_at: payload.new.updated_at,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driverId, orderId]);

  // Set initial location
  useEffect(() => {
    if (initialLocation) {
      setDriverLocation({
        latitude: parseFloat(String(initialLocation.latitude)),
        longitude: parseFloat(String(initialLocation.longitude)),
        heading: initialLocation.heading,
        speed: initialLocation.speed,
        updated_at: initialLocation.updated_at,
      });
    }
  }, [initialLocation]);

  // Calculate ETA based on distance and average speed
  useEffect(() => {
    if (!driverLocation || !customerLat || !customerLng) return;

    const distance = calculateDistance(
      driverLocation.latitude,
      driverLocation.longitude,
      customerLat,
      customerLng
    );

    // Assume average speed of 25 km/h in city traffic
    const avgSpeed = driverLocation.speed && driverLocation.speed > 5 ? driverLocation.speed : 25;
    const timeMinutes = Math.round((distance / avgSpeed) * 60);
    setEta(timeMinutes <= 1 ? "< 1 min" : `${timeMinutes} min`);
  }, [driverLocation, customerLat, customerLng]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getStatusMessage = () => {
    switch (orderStatus) {
      case "assigned":
        return "Driver is heading to the restaurant";
      case "picked_up":
      case "in_transit":
        return "Driver is on the way to you";
      case "delivered":
        return "Order delivered!";
      default:
        return "Tracking driver...";
    }
  };

  const openInMaps = () => {
    if (driverLocation) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${customerLat},${customerLng}&origin=${driverLocation.latitude},${driverLocation.longitude}`,
        "_blank"
      );
    }
  };

  if (!driverLocation) {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <Navigation className="w-8 h-8 mx-auto text-muted-foreground animate-pulse mb-2" />
          <p className="text-sm text-muted-foreground">Waiting for driver location...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Map placeholder - using static map image */}
        <div 
          ref={mapRef}
          className="relative h-48 bg-muted cursor-pointer"
          onClick={openInMaps}
        >
          <img
            src={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s-car+ff6b35(${driverLocation.longitude},${driverLocation.latitude}),pin-s-home+22c55e(${customerLng},${customerLat})/${driverLocation.longitude},${driverLocation.latitude},13,0/400x200@2x?access_token=pk.eyJ1IjoibG92YWJsZS1kZXYiLCJhIjoiY2x2cWxxMHJqMDQ4ZDJsbzd5YmxkY3N5MiJ9.mock`}
            alt="Driver location map"
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
            <Badge variant="secondary" className="bg-background/90">
              <Navigation className="w-3 h-3 mr-1" />
              {getStatusMessage()}
            </Badge>
            {eta && (
              <Badge className="bg-primary">
                <Clock className="w-3 h-3 mr-1" />
                ETA: {eta}
              </Badge>
            )}
          </div>
        </div>

        {/* Driver info */}
        <div className="p-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Last updated</span>
            <span className="font-medium">
              {new Date(driverLocation.updated_at).toLocaleTimeString()}
            </span>
          </div>
          {driverLocation.speed && driverLocation.speed > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Speed</span>
              <span className="font-medium">{Math.round(driverLocation.speed)} km/h</span>
            </div>
          )}
          <button
            onClick={openInMaps}
            className="w-full py-2 text-sm text-primary font-medium flex items-center justify-center gap-1"
          >
            <MapPin className="w-4 h-4" />
            Open in Google Maps
          </button>
        </div>
      </CardContent>
    </Card>
  );
};
