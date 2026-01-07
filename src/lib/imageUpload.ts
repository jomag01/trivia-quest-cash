import { supabase } from "@/integrations/supabase/client";
import imageCompression from "browser-image-compression";

// Supported image types
const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Max file sizes in bytes
const MAX_SIZES = {
  profile: 2 * 1024 * 1024, // 2MB
  verification: 5 * 1024 * 1024, // 5MB
};

// Compression options
const COMPRESSION_OPTIONS = {
  profile: {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1024,
    useWebWorker: true,
    fileType: 'image/webp' as const,
  },
  verification: {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: 'image/webp' as const,
  },
};

// Bucket configurations
const BUCKETS = {
  profile: ['profile-images', 'beesmate-profiles', 'avatars'] as const,
  verification: ['verification-images', 'beesmate-profiles'] as const,
};

export interface UploadResult {
  success: boolean;
  publicUrl?: string;
  bucket?: string;
  path?: string;
  error?: string;
}

export interface UploadProgress {
  progress: number;
  status: 'compressing' | 'uploading' | 'complete' | 'error';
  message: string;
}

/**
 * Validate file before upload
 */
export function validateImage(
  file: File,
  type: 'profile' | 'verification'
): { valid: boolean; error?: string } {
  // Check file type
  if (!SUPPORTED_TYPES.includes(file.type)) {
    return { 
      valid: false, 
      error: `Unsupported file type. Please use JPEG, PNG, or WebP.` 
    };
  }

  // Check file size
  const maxSize = MAX_SIZES[type];
  if (file.size > maxSize) {
    const sizeMB = Math.round(maxSize / 1024 / 1024);
    return { 
      valid: false, 
      error: `File too large. Maximum size is ${sizeMB}MB.` 
    };
  }

  return { valid: true };
}

/**
 * Compress image before upload
 */
export async function compressImage(
  file: File,
  type: 'profile' | 'verification',
  onProgress?: (progress: UploadProgress) => void
): Promise<File | Blob> {
  onProgress?.({
    progress: 10,
    status: 'compressing',
    message: 'Compressing image...',
  });

  try {
    const options = COMPRESSION_OPTIONS[type];
    const compressed = await imageCompression(file, {
      ...options,
      onProgress: (p) => {
        onProgress?.({
          progress: 10 + (p * 0.3),
          status: 'compressing',
          message: `Compressing... ${Math.round(p)}%`,
        });
      },
    });
    return compressed;
  } catch (error) {
    console.warn('Compression failed, using original:', error);
    return file;
  }
}

/**
 * Upload image with retry and fallback buckets
 */
export async function uploadImage(
  file: File,
  userId: string,
  type: 'profile' | 'verification',
  options?: {
    subfolder?: string;
    filename?: string;
    onProgress?: (progress: UploadProgress) => void;
    maxRetries?: number;
  }
): Promise<UploadResult> {
  const { subfolder, filename, onProgress, maxRetries = 3 } = options || {};

  // Validate
  const validation = validateImage(file, type);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  try {
    // Compress
    const compressed = await compressImage(file, type, onProgress);
    
    onProgress?.({
      progress: 40,
      status: 'uploading',
      message: 'Uploading image...',
    });

    // Generate file path
    const timestamp = Date.now();
    const ext = 'webp'; // We compress to webp
    const fileName = filename || `${timestamp}.${ext}`;
    const folderPath = subfolder ? `${userId}/${subfolder}` : userId;
    const fullPath = `${folderPath}/${fileName}`;

    // Try each bucket with retries
    const buckets = BUCKETS[type];
    let lastError: Error | null = null;

    for (const bucket of buckets) {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          onProgress?.({
            progress: 40 + (attempt * 10),
            status: 'uploading',
            message: `Uploading... (attempt ${attempt})`,
          });

          const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(fullPath, compressed, { 
              upsert: true,
              contentType: 'image/webp',
            });

          if (!uploadError) {
            // Success! Get public URL
            const { data: { publicUrl } } = supabase.storage
              .from(bucket)
              .getPublicUrl(fullPath);

            onProgress?.({
              progress: 100,
              status: 'complete',
              message: 'Upload complete!',
            });

            return {
              success: true,
              publicUrl: `${publicUrl}?t=${timestamp}`, // Cache bust
              bucket,
              path: fullPath,
            };
          }

          lastError = new Error(uploadError.message);
          console.warn(`Upload attempt ${attempt} to ${bucket} failed:`, uploadError);
          
          // Wait before retry (exponential backoff)
          if (attempt < maxRetries) {
            await new Promise(r => setTimeout(r, 1000 * attempt));
          }
        } catch (err) {
          lastError = err as Error;
          console.warn(`Upload attempt ${attempt} to ${bucket} error:`, err);
        }
      }
      
      // Try next bucket
      console.log(`All retries failed for ${bucket}, trying next bucket...`);
    }

    // All buckets failed
    onProgress?.({
      progress: 0,
      status: 'error',
      message: 'Upload failed. Tap to retry.',
    });

    return {
      success: false,
      error: lastError?.message || 'Failed to upload image. Please try again.',
    };
  } catch (error) {
    console.error('Upload error:', error);
    onProgress?.({
      progress: 0,
      status: 'error',
      message: 'Upload failed. Tap to retry.',
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed. Please try again.',
    };
  }
}

/**
 * Upload profile image (convenience wrapper)
 */
export async function uploadProfileImage(
  file: File,
  userId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  return uploadImage(file, userId, 'profile', {
    filename: 'avatar.webp',
    onProgress,
  });
}

/**
 * Upload verification document (convenience wrapper)
 */
export async function uploadVerificationImage(
  file: File,
  userId: string,
  documentType: 'id' | 'selfie',
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  return uploadImage(file, userId, 'verification', {
    subfolder: 'verifications',
    filename: `${documentType}_${Date.now()}.webp`,
    onProgress,
  });
}
