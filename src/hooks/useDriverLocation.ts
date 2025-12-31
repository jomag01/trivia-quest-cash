import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface UseDriverLocationProps {
  riderId: string | null;
  orderId: string | null;
  isActive: boolean;
  updateInterval?: number; // in milliseconds
}

export const useDriverLocation = ({
  riderId,
  orderId,
  isActive,
  updateInterval = 10000, // 10 seconds default
}: UseDriverLocationProps) => {
  const { user } = useAuth();
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastLocationRef = useRef<{ lat: number; lng: number } | null>(null);

  const updateLocation = useCallback(
    async (position: GeolocationPosition) => {
      if (!riderId || !orderId || !user) return;

      const { latitude, longitude, heading, speed } = position.coords;

      // Skip if location hasn't changed significantly (5 meters)
      if (lastLocationRef.current) {
        const distance = calculateDistance(
          lastLocationRef.current.lat,
          lastLocationRef.current.lng,
          latitude,
          longitude
        );
        if (distance < 0.005) return; // Less than 5 meters
      }

      lastLocationRef.current = { lat: latitude, lng: longitude };

      try {
        // Upsert location to database
        const { error } = await (supabase as any)
          .from("driver_locations")
          .upsert(
            {
              driver_id: riderId,
              order_id: orderId,
              latitude,
              longitude,
              heading: heading || null,
              speed: speed ? speed * 3.6 : null, // Convert m/s to km/h
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: "driver_id,order_id",
              ignoreDuplicates: false,
            }
          );

        if (error) {
          console.error("Failed to update location:", error);
        }
      } catch (err) {
        console.error("Location update error:", err);
      }
    },
    [riderId, orderId, user]
  );

  const handleError = useCallback((error: GeolocationPositionError) => {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        toast.error("Please enable location access for live tracking");
        break;
      case error.POSITION_UNAVAILABLE:
        toast.error("Location unavailable. Check GPS settings.");
        break;
      case error.TIMEOUT:
        console.warn("Location request timed out");
        break;
    }
  }, []);

  useEffect(() => {
    if (!isActive || !riderId || !orderId) {
      // Clean up when not active
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Check if geolocation is available
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by this browser");
      return;
    }

    // Request permission and start watching
    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 5000,
    };

    // Initial position
    navigator.geolocation.getCurrentPosition(updateLocation, handleError, options);

    // Watch for changes
    watchIdRef.current = navigator.geolocation.watchPosition(
      updateLocation,
      handleError,
      options
    );

    // Also update on interval as backup
    intervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(updateLocation, handleError, options);
    }, updateInterval);

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, riderId, orderId, updateLocation, handleError, updateInterval]);

  return null;
};

// Helper function to calculate distance in km
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
}
