import { useState, useCallback, useEffect } from 'react';
import { Geolocation, Position, PermissionStatus } from '@capacitor/geolocation';
import { isNativeApp } from '@/lib/mobileConfig';

interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

interface UseGeolocationResult {
  position: Position | null;
  loading: boolean;
  error: string | null;
  permissionStatus: PermissionStatus | null;
  getCurrentPosition: (options?: GeolocationOptions) => Promise<Position | null>;
  watchPosition: (callback: (position: Position) => void, options?: GeolocationOptions) => Promise<string | null>;
  clearWatch: (watchId: string) => Promise<void>;
  requestPermission: () => Promise<boolean>;
}

export const useNativeGeolocation = (): UseGeolocationResult => {
  const [position, setPosition] = useState<Position | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus | null>(null);

  // Check permissions on mount
  useEffect(() => {
    const checkPermission = async () => {
      try {
        if (isNativeApp()) {
          const status = await Geolocation.checkPermissions();
          setPermissionStatus(status);
        }
      } catch (err) {
        console.error('Error checking geolocation permissions:', err);
      }
    };
    checkPermission();
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      if (isNativeApp()) {
        const status = await Geolocation.requestPermissions();
        setPermissionStatus(status);
        return status.location === 'granted';
      }
      
      // Web fallback - permission is requested when getting position
      return true;
    } catch (err) {
      console.error('Permission request error:', err);
      return false;
    }
  }, []);

  const getCurrentPosition = useCallback(async (options?: GeolocationOptions): Promise<Position | null> => {
    setLoading(true);
    setError(null);

    try {
      let pos: Position;

      if (isNativeApp()) {
        // Use Capacitor Geolocation for native
        pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: options?.enableHighAccuracy ?? true,
          timeout: options?.timeout ?? 10000,
          maximumAge: options?.maximumAge ?? 0,
        });
      } else {
        // Fallback to browser Geolocation API
        pos = await new Promise<Position>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (browserPos) => {
              resolve({
                coords: {
                  latitude: browserPos.coords.latitude,
                  longitude: browserPos.coords.longitude,
                  accuracy: browserPos.coords.accuracy,
                  altitude: browserPos.coords.altitude,
                  altitudeAccuracy: browserPos.coords.altitudeAccuracy,
                  heading: browserPos.coords.heading,
                  speed: browserPos.coords.speed,
                },
                timestamp: browserPos.timestamp,
              });
            },
            (err) => reject(err),
            {
              enableHighAccuracy: options?.enableHighAccuracy ?? true,
              timeout: options?.timeout ?? 10000,
              maximumAge: options?.maximumAge ?? 0,
            }
          );
        });
      }

      setPosition(pos);
      return pos;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get location';
      setError(message);
      console.error('Geolocation error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const watchPosition = useCallback(async (
    callback: (position: Position) => void,
    options?: GeolocationOptions
  ): Promise<string | null> => {
    try {
      if (isNativeApp()) {
        const watchId = await Geolocation.watchPosition(
          {
            enableHighAccuracy: options?.enableHighAccuracy ?? true,
            timeout: options?.timeout ?? 10000,
            maximumAge: options?.maximumAge ?? 0,
          },
          (pos, err) => {
            if (err) {
              setError(err.message);
              return;
            }
            if (pos) {
              setPosition(pos);
              callback(pos);
            }
          }
        );
        return watchId;
      }

      // Web fallback
      const watchId = navigator.geolocation.watchPosition(
        (browserPos) => {
          const pos: Position = {
            coords: {
              latitude: browserPos.coords.latitude,
              longitude: browserPos.coords.longitude,
              accuracy: browserPos.coords.accuracy,
              altitude: browserPos.coords.altitude,
              altitudeAccuracy: browserPos.coords.altitudeAccuracy,
              heading: browserPos.coords.heading,
              speed: browserPos.coords.speed,
            },
            timestamp: browserPos.timestamp,
          };
          setPosition(pos);
          callback(pos);
        },
        (err) => setError(err.message),
        {
          enableHighAccuracy: options?.enableHighAccuracy ?? true,
          timeout: options?.timeout ?? 10000,
          maximumAge: options?.maximumAge ?? 0,
        }
      );
      
      return String(watchId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to watch position';
      setError(message);
      return null;
    }
  }, []);

  const clearWatch = useCallback(async (watchId: string): Promise<void> => {
    try {
      if (isNativeApp()) {
        await Geolocation.clearWatch({ id: watchId });
      } else {
        navigator.geolocation.clearWatch(Number(watchId));
      }
    } catch (err) {
      console.error('Error clearing watch:', err);
    }
  }, []);

  return {
    position,
    loading,
    error,
    permissionStatus,
    getCurrentPosition,
    watchPosition,
    clearWatch,
    requestPermission,
  };
};

// Utility: Calculate distance between two coordinates (Haversine formula)
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (deg: number): number => deg * (Math.PI / 180);
