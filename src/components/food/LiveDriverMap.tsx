import { useEffect, useState, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Navigation, Clock, MapPin, Loader2, Car, Home, Store } from "lucide-react";

declare global {
  interface Window {
    google: any;
    initLiveMap: () => void;
  }
}

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
  const [distance, setDistance] = useState<string | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);
  const directionsRendererRef = useRef<any>(null);

  // Fetch Google Maps API key
  const { data: mapsConfig, isLoading: isLoadingKey } = useQuery({
    queryKey: ["maps-api-key"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-maps-key");
      if (error) throw error;
      return data;
    },
    staleTime: Infinity,
  });

  // Fetch initial driver location
  const { data: initialLocation } = useQuery({
    queryKey: ["driver-location", driverId, orderId],
    queryFn: async () => {
      const { data, error } = await supabase
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

  // Load Google Maps script
  useEffect(() => {
    if (!mapsConfig?.apiKey || isMapLoaded) return;

    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript && window.google?.maps) {
      setIsMapLoaded(true);
      return;
    }

    window.initLiveMap = () => setIsMapLoaded(true);

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${mapsConfig.apiKey}&callback=initLiveMap&libraries=places,geometry`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    return () => {
      delete window.initLiveMap;
    };
  }, [mapsConfig?.apiKey, isMapLoaded]);

  // Initialize map
  useEffect(() => {
    if (!isMapLoaded || !mapRef.current || !window.google?.maps) return;

    const defaultCenter = vendorLat && vendorLng 
      ? { lat: vendorLat, lng: vendorLng }
      : customerLat && customerLng 
      ? { lat: customerLat, lng: customerLng }
      : { lat: 14.5995, lng: 120.9842 }; // Manila default

    mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
      center: defaultCenter,
      zoom: 14,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
      styles: [
        { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
      ],
    });

    // Add vendor marker (green - pickup)
    if (vendorLat && vendorLng) {
      new window.google.maps.Marker({
        position: { lat: vendorLat, lng: vendorLng },
        map: mapInstanceRef.current,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#22c55e",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
        title: "Restaurant",
      });
    }

    // Add customer marker (red - dropoff)
    if (customerLat && customerLng) {
      new window.google.maps.Marker({
        position: { lat: customerLat, lng: customerLng },
        map: mapInstanceRef.current,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#ef4444",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
        title: "Delivery Location",
      });
    }

    // Initialize directions renderer
    directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
      map: mapInstanceRef.current,
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: "#3b82f6",
        strokeWeight: 4,
        strokeOpacity: 0.8,
      },
    });
  }, [isMapLoaded, vendorLat, vendorLng, customerLat, customerLng]);

  // Update driver marker and route
  const updateDriverOnMap = useCallback((location: DriverLocation) => {
    if (!mapInstanceRef.current || !window.google?.maps) return;

    const driverPos = { lat: location.latitude, lng: location.longitude };

    // Create or update driver marker
    if (!driverMarkerRef.current) {
      driverMarkerRef.current = new window.google.maps.Marker({
        position: driverPos,
        map: mapInstanceRef.current,
        icon: {
          path: "M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z",
          fillColor: "#f97316",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2,
          scale: 1.5,
          anchor: new window.google.maps.Point(12, 12),
          rotation: location.heading || 0,
        },
        title: "Driver",
        zIndex: 999,
      });
    } else {
      driverMarkerRef.current.setPosition(driverPos);
      if (location.heading) {
        const icon = driverMarkerRef.current.getIcon();
        icon.rotation = location.heading;
        driverMarkerRef.current.setIcon(icon);
      }
    }

    // Determine destination based on order status
    const destination = orderStatus === "assigned" 
      ? (vendorLat && vendorLng ? { lat: vendorLat, lng: vendorLng } : null)
      : (customerLat && customerLng ? { lat: customerLat, lng: customerLng } : null);

    if (destination && directionsRendererRef.current) {
      const directionsService = new window.google.maps.DirectionsService();
      
      directionsService.route(
        {
          origin: driverPos,
          destination,
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result: any, status: string) => {
          if (status === "OK") {
            directionsRendererRef.current.setDirections(result);
            
            // Extract ETA and distance
            const route = result.routes[0]?.legs[0];
            if (route) {
              setEta(route.duration?.text || null);
              setDistance(route.distance?.text || null);
            }
          }
        }
      );
    }

    // Fit bounds to show all markers
    const bounds = new window.google.maps.LatLngBounds();
    bounds.extend(driverPos);
    if (vendorLat && vendorLng) bounds.extend({ lat: vendorLat, lng: vendorLng });
    if (customerLat && customerLng) bounds.extend({ lat: customerLat, lng: customerLng });
    mapInstanceRef.current.fitBounds(bounds, { padding: 60 });
  }, [orderStatus, vendorLat, vendorLng, customerLat, customerLng]);

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
            const newLocation: DriverLocation = {
              latitude: parseFloat(payload.new.latitude),
              longitude: parseFloat(payload.new.longitude),
              heading: payload.new.heading,
              speed: payload.new.speed,
              updated_at: payload.new.updated_at,
            };
            setDriverLocation(newLocation);
            updateDriverOnMap(newLocation);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driverId, orderId, updateDriverOnMap]);

  // Set initial location
  useEffect(() => {
    if (initialLocation) {
      const location: DriverLocation = {
        latitude: parseFloat(String(initialLocation.latitude)),
        longitude: parseFloat(String(initialLocation.longitude)),
        heading: initialLocation.heading,
        speed: initialLocation.speed,
        updated_at: initialLocation.updated_at,
      };
      setDriverLocation(location);
      if (isMapLoaded) {
        updateDriverOnMap(location);
      }
    }
  }, [initialLocation, isMapLoaded, updateDriverOnMap]);

  const getStatusMessage = () => {
    switch (orderStatus) {
      case "assigned":
        return "Driver heading to restaurant";
      case "picked_up":
      case "in_transit":
        return "Driver on the way to you";
      case "nearby":
        return "Driver is nearby!";
      case "delivered":
        return "Order delivered!";
      default:
        return "Tracking driver...";
    }
  };

  const getStatusColor = () => {
    switch (orderStatus) {
      case "assigned":
        return "bg-blue-500";
      case "picked_up":
      case "in_transit":
        return "bg-orange-500";
      case "nearby":
        return "bg-green-500";
      case "delivered":
        return "bg-green-600";
      default:
        return "bg-muted";
    }
  };

  const openInMaps = () => {
    const destination = orderStatus === "assigned"
      ? `${vendorLat},${vendorLng}`
      : `${customerLat},${customerLng}`;
    
    const origin = driverLocation 
      ? `${driverLocation.latitude},${driverLocation.longitude}`
      : "";
    
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${destination}${origin ? `&origin=${origin}` : ""}&travelmode=driving`,
      "_blank"
    );
  };

  if (isLoadingKey) {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <Loader2 className="w-8 h-8 mx-auto text-muted-foreground animate-spin mb-2" />
          <p className="text-sm text-muted-foreground">Loading map...</p>
        </CardContent>
      </Card>
    );
  }

  if (!mapsConfig?.apiKey) {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <MapPin className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Map unavailable</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={openInMaps}>
            <Navigation className="w-4 h-4 mr-1" />
            Open in Google Maps
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Live Google Map */}
        <div className="relative">
          <div ref={mapRef} className="h-56 w-full" />
          
          {/* Status overlay */}
          <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-2">
            <Badge className={`${getStatusColor()} text-white`}>
              <Car className="w-3 h-3 mr-1" />
              {getStatusMessage()}
            </Badge>
            {eta && (
              <Badge variant="secondary" className="bg-background/95">
                <Clock className="w-3 h-3 mr-1" />
                {eta}
              </Badge>
            )}
          </div>

          {/* Legend */}
          <div className="absolute bottom-2 left-2 flex gap-2">
            <Badge variant="outline" className="bg-background/95 text-xs">
              <div className="w-2 h-2 rounded-full bg-green-500 mr-1" />
              Restaurant
            </Badge>
            <Badge variant="outline" className="bg-background/95 text-xs">
              <div className="w-2 h-2 rounded-full bg-red-500 mr-1" />
              You
            </Badge>
          </div>
        </div>

        {/* Driver info panel */}
        <div className="p-3 space-y-2 bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              {distance && (
                <div className="flex items-center gap-1 text-sm">
                  <MapPin className="w-3 h-3 text-muted-foreground" />
                  <span className="font-medium">{distance} away</span>
                </div>
              )}
              {driverLocation && (
                <p className="text-xs text-muted-foreground">
                  Updated {new Date(driverLocation.updated_at).toLocaleTimeString()}
                  {driverLocation.speed && driverLocation.speed > 0 && (
                    <span> • {Math.round(driverLocation.speed)} km/h</span>
                  )}
                </p>
              )}
            </div>
            <Button size="sm" variant="outline" onClick={openInMaps}>
              <Navigation className="w-4 h-4 mr-1" />
              Navigate
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
