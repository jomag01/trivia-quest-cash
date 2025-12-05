import { supabase } from "@/integrations/supabase/client";

/**
 * Upload to storage via edge function (bypasses bucket metadata query issues)
 */
export async function uploadToStorage(
  bucket: string,
  path: string,
  file: File | Blob,
  options?: { contentType?: string; upsert?: boolean }
): Promise<{ data: { path: string } | null; error: Error | null }> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    
    // Use edge function for upload to bypass bucket metadata issues
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/storage-upload`;
    
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token || supabaseAnonKey}`,
      'apikey': supabaseAnonKey,
      'x-bucket': bucket,
      'x-path': path,
      'Content-Type': options?.contentType || file.type || 'application/octet-stream',
    };
    
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers,
      body: file,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || errorData.message || 'Upload failed');
    }
    
    const result = await response.json();
    return { data: { path: result.path }, error: null };
  } catch (error) {
    console.error('Storage upload error:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get public URL for a storage object
 */
export function getPublicUrl(bucket: string, path: string): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

/**
 * Delete a file from storage
 */
export async function deleteFromStorage(
  bucket: string,
  paths: string[]
): Promise<{ error: Error | null }> {
  try {
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
      body: JSON.stringify({ prefixes: paths }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(errorData.message || 'Delete failed');
    }
    
    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}