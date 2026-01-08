import imageCompression from "browser-image-compression";
import { uploadToAWS } from "@/lib/awsMedia";

// Supported image types
const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Max file sizes in bytes (increased to 10MB for better UX)
const MAX_SIZES = {
  profile: 10 * 1024 * 1024, // 10MB
  verification: 10 * 1024 * 1024, // 10MB
};

// Compression options
const COMPRESSION_OPTIONS = {
  profile: {
    maxSizeMB: 1,
    maxWidthOrHeight: 1024,
    useWebWorker: true,
    fileType: 'image/webp' as const,
  },
  verification: {
    maxSizeMB: 2,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: 'image/webp' as const,
  },
};

// Uploads are routed through our AWS-backed media pipeline to avoid
// storage schema mismatches (e.g. missing file_size_limit / allowed_mime_types
// columns) that can break managed storage uploads.

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

    const timestamp = Date.now();

    const aws = await uploadToAWS(compressed, `beesmate/${userId}`, (p) => {
      onProgress?.({
        progress: 40 + Math.round(p.percentage * 0.6),
        status: "uploading",
        message: `Uploading... ${p.percentage}%`,
      });
    });

    if (!aws?.cdnUrl) {
      throw new Error("Failed to upload image. Please try again.");
    }

    onProgress?.({
      progress: 100,
      status: "complete",
      message: "Upload complete!",
    });

    return {
      success: true,
      publicUrl: `${aws.cdnUrl}?t=${timestamp}`, // Cache bust
      path: aws.fileName,
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
