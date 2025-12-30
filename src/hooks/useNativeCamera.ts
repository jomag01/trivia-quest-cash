import { useState, useCallback } from 'react';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { isNativeApp } from '@/lib/mobileConfig';

interface CameraOptions {
  quality?: number;
  allowEditing?: boolean;
  resultType?: CameraResultType;
  source?: CameraSource;
  width?: number;
  height?: number;
}

interface UseCameraResult {
  photo: Photo | null;
  loading: boolean;
  error: string | null;
  takePhoto: (options?: CameraOptions) => Promise<Photo | null>;
  pickFromGallery: (options?: CameraOptions) => Promise<Photo | null>;
  clearPhoto: () => void;
}

export const useNativeCamera = (): UseCameraResult => {
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkPermissions = async (): Promise<boolean> => {
    try {
      const permissions = await Camera.checkPermissions();
      
      if (permissions.camera !== 'granted' || permissions.photos !== 'granted') {
        const requested = await Camera.requestPermissions();
        return requested.camera === 'granted';
      }
      
      return true;
    } catch (err) {
      console.error('Camera permission error:', err);
      return false;
    }
  };

  const takePhoto = useCallback(async (options?: CameraOptions): Promise<Photo | null> => {
    setLoading(true);
    setError(null);

    try {
      // For native apps, use Capacitor Camera
      if (isNativeApp()) {
        const hasPermission = await checkPermissions();
        if (!hasPermission) {
          throw new Error('Camera permission denied');
        }

        const image = await Camera.getPhoto({
          quality: options?.quality ?? 90,
          allowEditing: options?.allowEditing ?? false,
          resultType: options?.resultType ?? CameraResultType.Uri,
          source: CameraSource.Camera,
          width: options?.width,
          height: options?.height,
        });

        setPhoto(image);
        return image;
      }

      // Fallback for web: use file input
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment';
        
        input.onchange = async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            const webPhoto: Photo = {
              webPath: URL.createObjectURL(file),
              format: file.type.split('/')[1] || 'jpeg',
              saved: false,
            };
            setPhoto(webPhoto);
            resolve(webPhoto);
          } else {
            resolve(null);
          }
        };
        
        input.click();
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to take photo';
      setError(message);
      console.error('Camera error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const pickFromGallery = useCallback(async (options?: CameraOptions): Promise<Photo | null> => {
    setLoading(true);
    setError(null);

    try {
      if (isNativeApp()) {
        const hasPermission = await checkPermissions();
        if (!hasPermission) {
          throw new Error('Photo library permission denied');
        }

        const image = await Camera.getPhoto({
          quality: options?.quality ?? 90,
          allowEditing: options?.allowEditing ?? false,
          resultType: options?.resultType ?? CameraResultType.Uri,
          source: CameraSource.Photos,
          width: options?.width,
          height: options?.height,
        });

        setPhoto(image);
        return image;
      }

      // Fallback for web
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        input.onchange = async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            const webPhoto: Photo = {
              webPath: URL.createObjectURL(file),
              format: file.type.split('/')[1] || 'jpeg',
              saved: false,
            };
            setPhoto(webPhoto);
            resolve(webPhoto);
          } else {
            resolve(null);
          }
        };
        
        input.click();
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to pick photo';
      setError(message);
      console.error('Gallery error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearPhoto = useCallback(() => {
    setPhoto(null);
    setError(null);
  }, []);

  return {
    photo,
    loading,
    error,
    takePhoto,
    pickFromGallery,
    clearPhoto,
  };
};
