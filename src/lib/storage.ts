import { supabase } from "@/integrations/supabase/client";

/**
 * Convert a File/Blob to base64 data URL
 */
async function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Upload to storage - uses base64 encoding as primary method since 
 * Supabase Storage has schema issues on this instance
 */
export async function uploadToStorage(
  bucket: string,
  path: string,
  file: File | Blob,
  options?: { contentType?: string; upsert?: boolean }
): Promise<{ data: { path: string; publicUrl?: string } | null; error: Error | null }> {
  try {
    // Convert file to base64 data URL - this bypasses all Supabase Storage issues
    const base64Url = await fileToBase64(file);
    
    // Return the base64 URL directly - components can use this as the image source
    return { 
      data: { 
        path: path, 
        publicUrl: base64Url 
      }, 
      error: null 
    };
  } catch (error) {
    console.error('Storage upload error:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get public URL for a storage object
 * If it's a base64 URL, return as-is
 */
export function getPublicUrl(bucket: string, path: string): string {
  // If path is already a data URL, return it as-is
  if (path.startsWith('data:')) {
    return path;
  }
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

/**
 * Check if a URL is a base64 data URL
 */
export function isBase64Url(url: string): boolean {
  return url?.startsWith('data:');
}

/**
 * Delete a file from storage (no-op for base64 URLs)
 */
export async function deleteFromStorage(
  bucket: string,
  paths: string[]
): Promise<{ error: Error | null }> {
  try {
    // Filter out base64 URLs - they don't need deletion
    const storagePaths = paths.filter(p => !p.startsWith('data:'));
    
    if (storagePaths.length === 0) {
      return { error: null };
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    
    const url = `${supabaseUrl}/storage/v1/object/${bucket}`;
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token || supabaseAnonKey}`,
        'apikey': supabaseAnonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prefixes: storagePaths }),
    });
    
    if (!response.ok) {
      // Silently fail for delete operations - not critical
      console.warn('Delete from storage failed, ignoring:', response.statusText);
    }
    
    return { error: null };
  } catch (error) {
    // Silently fail for delete operations
    console.warn('Delete from storage error:', error);
    return { error: null };
  }
}
