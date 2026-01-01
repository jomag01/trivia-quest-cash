import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Loader2 } from "lucide-react";

interface DeliveryMapProps {
  pickupLat?: number | null;
  pickupLng?: number | null;
  pickupAddress: string;
  deliveryLat?: number | null;
  deliveryLng?: number | null;
  deliveryAddress: string;
  showDirections?: boolean;
}

declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

export const DeliveryMap = ({
  pickupLat,
  pickupLng,
  pickupAddress,
  deliveryLat,
  deliveryLng,
  deliveryAddress,
  showDirections = true,
}: DeliveryMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

  const { data: mapsConfig } = useQuery({
    queryKey: ["maps-api-key"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-maps-key");
      if (error) throw error;
      return data;
    },
    staleTime: Infinity,
  });

  // Get current location
  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => console.error("Geolocation error:", error),
        { enableHighAccuracy: true, maximumAge: 10000 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  // Load Google Maps script
  useEffect(() => {
    if (!mapsConfig?.apiKey || isLoaded) return;

    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      setIsLoaded(true);
      return;
    }

    window.initMap = () => setIsLoaded(true);

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${mapsConfig.apiKey}&callback=initMap&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      setMapError("Failed to load Google Maps. Please call the customer directly.");
    };
    document.head.appendChild(script);

    return () => {
      delete window.initMap;
    };
  }, [mapsConfig?.apiKey, isLoaded]);

  // Initialize map
  useEffect(() => {
    if (!isLoaded || !mapRef.current || !window.google) return;

    const defaultCenter = currentLocation || 
      (deliveryLat && deliveryLng ? { lat: deliveryLat, lng: deliveryLng } : 
      (pickupLat && pickupLng ? { lat: pickupLat, lng: pickupLng } : 
      { lat: 14.5995, lng: 120.9842 })); // Default to Manila

    mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
      center: defaultCenter,
      zoom: 14,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    const map = mapInstanceRef.current;

    // Add markers
    if (currentLocation) {
      new window.google.maps.Marker({
        position: currentLocation,
        map,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "#4285F4",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
        title: "Your Location",
      });
    }

    if (pickupLat && pickupLng) {
      new window.google.maps.Marker({
        position: { lat: pickupLat, lng: pickupLng },
        map,
        icon: {
          url: "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
        },
        title: "Pickup: " + pickupAddress,
      });
    }

    if (deliveryLat && deliveryLng) {
      new window.google.maps.Marker({
        position: { lat: deliveryLat, lng: deliveryLng },
        map,
        icon: {
          url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
        },
        title: "Delivery: " + deliveryAddress,
      });
    }

    // Fit bounds to show all markers
    const bounds = new window.google.maps.LatLngBounds();
    if (currentLocation) bounds.extend(currentLocation);
    if (pickupLat && pickupLng) bounds.extend({ lat: pickupLat, lng: pickupLng });
    if (deliveryLat && deliveryLng) bounds.extend({ lat: deliveryLat, lng: deliveryLng });
    
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 50 });
    }

    // Draw route if directions enabled
    if (showDirections && currentLocation) {
      const directionsService = new window.google.maps.DirectionsService();
      const directionsRenderer = new window.google.maps.DirectionsRenderer({
        map,
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: "#4285F4",
          strokeWeight: 4,
        },
      });

      const destination = deliveryLat && deliveryLng 
        ? { lat: deliveryLat, lng: deliveryLng }
        : pickupLat && pickupLng 
        ? { lat: pickupLat, lng: pickupLng }
        : null;

      if (destination) {
        directionsService.route(
          {
            origin: currentLocation,
            destination,
            travelMode: window.google.maps.TravelMode.DRIVING,
          },
          (result: any, status: string) => {
            if (status === "OK") {
              directionsRenderer.setDirections(result);
            }
          }
        );
      }
    }
  }, [isLoaded, currentLocation, pickupLat, pickupLng, deliveryLat, deliveryLng, showDirections]);

  const openInGoogleMaps = () => {
    const destination = deliveryLat && deliveryLng
      ? `${deliveryLat},${deliveryLng}`
      : encodeURIComponent(deliveryAddress);
    
    let url = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
    
    if (currentLocation) {
      url += `&origin=${currentLocation.lat},${currentLocation.lng}`;
    }
    
    window.open(url, "_blank");
  };

  // Fallback when Maps API is not available or loading
  const renderMapFallback = (message: string, showContactOption: boolean = false) => (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
          <MapPin className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-amber-800 dark:text-amber-200">{message}</p>
            <p className="text-amber-700 dark:text-amber-300 text-xs mt-1">
              You can call the customer directly or use external navigation.
            </p>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-start gap-2 text-sm">
            <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />
            <div>
              <p className="text-xs text-muted-foreground">Pickup</p>
              <p className="font-medium">{pickupAddress}</p>
            </div>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5" />
            <div>
              <p className="text-xs text-muted-foreground">Delivery</p>
              <p className="font-medium">{deliveryAddress}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs h-9"
            onClick={() => {
              const destination = deliveryLat && deliveryLng
                ? `${deliveryLat},${deliveryLng}`
                : encodeURIComponent(deliveryAddress);
              window.open(`https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`, "_blank");
            }}
          >
            <Navigation className="w-3 h-3 mr-1" /> Open in Maps
          </Button>
        </div>
        
        <p className="text-xs text-muted-foreground text-center">
          💡 Tip: Screenshot the customer details above for reference
        </p>
      </CardContent>
    </Card>
  );

  if (!mapsConfig?.apiKey) {
    return renderMapFallback("Map loading...", true);
  }

  if (mapError) {
    return renderMapFallback(mapError, true);
  }

  return (
    <Card>
      <CardContent className="p-0 overflow-hidden rounded-lg">
        <div ref={mapRef} className="h-48 w-full" />
        <div className="p-2 flex gap-2">
          <div className="flex-1 text-xs space-y-1">
            <div className="flex items-start gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-1" />
              <span className="truncate">{pickupAddress}</span>
            </div>
            <div className="flex items-start gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500 mt-1" />
              <span className="truncate">{deliveryAddress}</span>
            </div>
          </div>
          <Button size="sm" variant="outline" className="text-xs h-8" onClick={openInGoogleMaps}>
            <Navigation className="w-3 h-3 mr-1" /> Navigate
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};