import { supabase } from "@/integrations/supabase/client";

interface UploadResult {
  cdnUrl: string;
  fileName: string;
  size?: number;
}

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

// File size limits (in bytes)
const FILE_SIZE_LIMITS = {
  image: 10 * 1024 * 1024,  // 10MB
  video: 100 * 1024 * 1024, // 100MB
  audio: 50 * 1024 * 1024,  // 50MB
  file: 50 * 1024 * 1024,   // 50MB
};

// Allowed MIME types
const ALLOWED_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic'],
  video: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3', 'audio/m4a'],
  file: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
};

function getMediaCategory(contentType: string): 'image' | 'video' | 'audio' | 'file' {
  if (contentType.startsWith('image/')) return 'image';
  if (contentType.startsWith('video/')) return 'video';
  if (contentType.startsWith('audio/')) return 'audio';
  return 'file';
}

export function validateFile(file: File | Blob): { valid: boolean; error?: string } {
  const contentType = file.type || 'application/octet-stream';
  const category = getMediaCategory(contentType);
  const allowedTypes = ALLOWED_TYPES[category];
  const maxSize = FILE_SIZE_LIMITS[category];

  if (!allowedTypes.some(type => contentType.includes(type.split('/')[1]))) {
    return { valid: false, error: `File type ${contentType} is not allowed` };
  }

  if (file.size > maxSize) {
    const maxMB = maxSize / (1024 * 1024);
    return { valid: false, error: `File size exceeds maximum of ${maxMB}MB for ${category}` };
  }

  return { valid: true };
}

/**
 * Upload media to AWS S3 via CloudFront for fast global delivery
 * Uses presigned URLs for large files, direct upload for smaller ones
 */
export async function uploadToAWS(
  file: File | Blob,
  folder: string = 'posts',
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult | null> {
  try {
    // Client-side validation
    const validation = validateFile(file);
    if (!validation.valid) {
      console.error('File validation failed:', validation.error);
      throw new Error(validation.error);
    }

    const originalFileName = file instanceof File ? file.name : `file-${Date.now()}.bin`;
    const contentType = file.type || 'application/octet-stream';
    
    // Extract userId from folder path (format: posts/{userId})
    const userId = folder.includes('/') ? folder.split('/')[1] : folder;

    // For larger files (>5MB), use pre-signed URL for direct upload with progress
    if (file.size > 5 * 1024 * 1024) {
      return await uploadWithPresignedUrl(file, userId, originalFileName, contentType, onProgress);
    } else {
      // For smaller files, upload through edge function
      return await directUpload(file, userId, originalFileName, contentType, onProgress);
    }
  } catch (error) {
    console.error('AWS upload error:', error);
    return null;
  }
}

async function uploadWithPresignedUrl(
  file: File | Blob,
  userId: string,
  originalFileName: string,
  contentType: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult | null> {
  try {
    // Get pre-signed URL from edge function
    const { data: urlData, error: urlError } = await supabase.functions.invoke('aws-media', {
      body: {
        operation: 'get_upload_url',
        userId,
        originalFileName,
        contentType,
        fileSize: file.size
      }
    });

    if (urlError || !urlData?.uploadUrl) {
      console.warn('Failed to get pre-signed URL:', urlError);
      // Fallback to direct upload
      return await directUpload(file, userId, originalFileName, contentType, onProgress);
    }

    // Upload directly to S3 using pre-signed URL with XMLHttpRequest for progress
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress({
            loaded: event.loaded,
            total: event.total,
            percentage: Math.round((event.loaded / event.total) * 100)
          });
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({
            cdnUrl: urlData.cdnUrl,
            fileName: urlData.fileName,
            size: file.size
          });
        } else {
          console.error('S3 upload failed:', xhr.status, xhr.responseText);
          reject(new Error('S3 upload failed'));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.open('PUT', urlData.uploadUrl);
      xhr.setRequestHeader('Content-Type', contentType);
      xhr.send(file);
    });
  } catch (error) {
    console.error('Presigned URL upload error:', error);
    return null;
  }
}

async function directUpload(
  file: File | Blob,
  userId: string,
  originalFileName: string,
  contentType: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult | null> {
  try {
    // Simulate progress for smaller files
    if (onProgress) {
      onProgress({ loaded: 0, total: file.size, percentage: 0 });
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      binary += String.fromCharCode.apply(null, Array.from(chunk));
      
      // Update progress during base64 conversion
      if (onProgress && i % (chunkSize * 10) === 0) {
        onProgress({ 
          loaded: Math.floor(i / 2), 
          total: file.size, 
          percentage: Math.round((i / uint8Array.length) * 50) 
        });
      }
    }
    const base64Data = btoa(binary);

    if (onProgress) {
      onProgress({ loaded: file.size / 2, total: file.size, percentage: 50 });
    }

    const { data, error } = await supabase.functions.invoke('aws-media', {
      body: {
        operation: 'upload',
        fileName: `posts/${userId}/${Date.now()}-${originalFileName}`,
        userId,
        originalFileName,
        contentType,
        fileData: base64Data
      }
    });

    if (onProgress) {
      onProgress({ loaded: file.size, total: file.size, percentage: 100 });
    }

    if (error || !data?.cdnUrl) {
      console.error('Direct upload error:', error || data?.error);
      return null;
    }

    return {
      cdnUrl: data.cdnUrl,
      fileName: data.fileName,
      size: data.size
    };
  } catch (error) {
    console.error('Direct upload error:', error);
    return null;
  }
}

/**
 * Get CDN URL for a file
 */
export async function getCDNUrl(fileName: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke('aws-media', {
      body: {
        operation: 'get_cdn_url',
        fileName
      }
    });

    if (error || !data?.cdnUrl) {
      return null;
    }

    return data.cdnUrl;
  } catch (error) {
    console.error('Get CDN URL error:', error);
    return null;
  }
}

/**
 * Delete a file from AWS S3
 */
export async function deleteFromAWS(fileName: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('aws-media', {
      body: {
        operation: 'delete',
        fileName
      }
    });

    if (error) {
      console.error('Delete from AWS error:', error);
      return false;
    }

    return data?.success || false;
  } catch (error) {
    console.error('Delete from AWS error:', error);
    return false;
  }
}

/**
 * Check if a URL is from AWS CDN
 */
export function isAWSUrl(url: string): boolean {
  if (!url) return false;
  return url.includes('cloudfront.net') || url.includes('s3.amazonaws.com') || url.includes('.s3.');
}

/**
 * Get optimized image URL for different sizes
 * If using CloudFront with Lambda@Edge image optimization
 */
export function getOptimizedImageUrl(
  url: string, 
  options: { width?: number; height?: number; quality?: number } = {}
): string {
  if (!isAWSUrl(url)) return url;
  
  // If CloudFront has image optimization set up, you can add query params
  // Example: ?w=400&h=400&q=80
  const params = new URLSearchParams();
  if (options.width) params.set('w', options.width.toString());
  if (options.height) params.set('h', options.height.toString());
  if (options.quality) params.set('q', options.quality.toString());
  
  const queryString = params.toString();
  return queryString ? `${url}?${queryString}` : url;
}

/**
 * Preload an image for faster display
 */
export function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Get file size limits
 */
export function getFileSizeLimits() {
  return FILE_SIZE_LIMITS;
}

/**
 * Get allowed file types
 */
export function getAllowedTypes() {
  return ALLOWED_TYPES;
}