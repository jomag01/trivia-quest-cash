import { supabase } from "@/integrations/supabase/client";

interface UploadResult {
  cdnUrl: string;
  fileName: string;
}

/**
 * Upload media to AWS S3 via CloudFront for fast global delivery
 * Falls back to Supabase storage if AWS is not configured
 */
export async function uploadToAWS(
  file: File | Blob,
  folder: string = 'posts'
): Promise<UploadResult | null> {
  try {
    const fileExt = file instanceof File ? file.name.split('.').pop() : 'bin';
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const contentType = file.type || 'application/octet-stream';

    // For larger files, use pre-signed URL for direct upload
    if (file.size > 5 * 1024 * 1024) { // > 5MB
      // Get pre-signed URL
      const { data: urlData, error: urlError } = await supabase.functions.invoke('aws-media', {
        body: {
          operation: 'get_upload_url',
          fileName,
          contentType
        }
      });

      if (urlError || !urlData?.uploadUrl) {
        console.warn('Failed to get pre-signed URL, falling back to direct upload');
        return await directUpload(file, fileName, contentType);
      }

      // Upload directly to S3 using pre-signed URL
      const uploadResponse = await fetch(urlData.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': contentType
        }
      });

      if (!uploadResponse.ok) {
        throw new Error('Direct S3 upload failed');
      }

      return {
        cdnUrl: urlData.cdnUrl,
        fileName
      };
    } else {
      // For smaller files, upload through edge function
      return await directUpload(file, fileName, contentType);
    }
  } catch (error) {
    console.error('AWS upload error:', error);
    return null;
  }
}

async function directUpload(
  file: File | Blob,
  fileName: string,
  contentType: string
): Promise<UploadResult | null> {
  try {
    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const base64Data = btoa(binary);

    const { data, error } = await supabase.functions.invoke('aws-media', {
      body: {
        operation: 'upload',
        fileName,
        contentType,
        fileData: base64Data
      }
    });

    if (error || !data?.cdnUrl) {
      console.error('Direct upload error:', error);
      return null;
    }

    return {
      cdnUrl: data.cdnUrl,
      fileName: data.fileName
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
 * Check if a URL is from AWS CDN
 */
export function isAWSUrl(url: string): boolean {
  return url.includes('cloudfront.net') || url.includes('s3.amazonaws.com') || url.includes('s3.');
}

/**
 * Optimize image URL for different sizes
 * If using CloudFront with Lambda@Edge, you can add size parameters
 */
export function getOptimizedImageUrl(url: string, size: 'thumbnail' | 'medium' | 'large' = 'medium'): string {
  // If it's a CloudFront URL and you have image optimization set up,
  // you can add size parameters here
  // For now, return the original URL
  return url;
}
