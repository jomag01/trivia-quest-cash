import { supabase } from "@/integrations/supabase/client";

/**
 * Convert a File/Blob to base64 data URL (fallback)
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
 * Upload to storage using Edge Function (primary) or base64 fallback
 */
export async function uploadToStorage(
  bucket: string,
  path: string,
  file: File | Blob,
  options?: { contentType?: string; upsert?: boolean }
): Promise<{ data: { path: string; publicUrl?: string } | null; error: Error | null }> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    
    // Try Edge Function upload first
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      
      const response = await fetch(`${supabaseUrl}/functions/v1/storage-upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'Content-Type': file.type || 'application/octet-stream',
          'x-bucket': bucket,
          'x-path': path,
        },
        body: file,
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.publicUrl) {
          return { 
            data: { 
              path: result.path, 
              publicUrl: result.publicUrl 
            }, 
            error: null 
          };
        }
      }
      
      // If edge function fails, log and fall through to base64
      const errorText = await response.text();
      console.warn('Edge function upload failed, falling back to base64:', errorText);
    } catch (edgeFnError) {
      console.warn('Edge function error, falling back to base64:', edgeFnError);
    }
    
    // Fallback: Convert file to base64 data URL
    const base64Url = await fileToBase64(file);
    
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
