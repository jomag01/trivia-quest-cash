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
 * Upload to storage using Edge Function (handles both Supabase storage and base64 fallback)
 */
export async function uploadToStorage(
  bucket: string,
  path: string,
  file: File | Blob,
  options?: { contentType?: string; upsert?: boolean; fileName?: string }
): Promise<{ data: { path: string; publicUrl?: string; storageType?: string } | null; error: Error | null }> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    
    // Get current session token
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token || supabaseAnonKey;
    
    // Try Edge Function upload
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/storage-upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': options?.contentType || file.type || 'application/octet-stream',
          'x-bucket': bucket,
          'x-path': path,
          'x-filename': options?.fileName || (file instanceof File ? file.name : 'file'),
        },
        body: file,
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.publicUrl) {
          return { 
            data: { 
              path: result.path, 
              publicUrl: result.publicUrl,
              storageType: result.storageType
            }, 
            error: null 
          };
        }
      }
      
      // If edge function fails, try local base64 fallback
      const errorText = await response.text();
      console.warn('Edge function upload failed, using local base64 fallback:', errorText);
    } catch (edgeFnError) {
      console.warn('Edge function error, using local base64 fallback:', edgeFnError);
    }
    
    // Local fallback: Convert file to base64 data URL
    const base64Url = await fileToBase64(file);
    
    return { 
      data: { 
        path: path, 
        publicUrl: base64Url,
        storageType: 'base64-local'
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
 * Handles base64 URLs and Supabase storage URLs
 */
export function getPublicUrl(bucket: string, path: string): string {
  // If path is already a data URL or full URL, return as-is
  if (path.startsWith('data:') || path.startsWith('http://') || path.startsWith('https://')) {
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
 * Get file from file_uploads table (for base64 stored files)
 */
export async function getFileFromUploads(bucket: string, path: string): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('file_uploads')
      .select('storage_url, base64_data')
      .eq('bucket', bucket)
      .eq('path', path)
      .maybeSingle();
    
    if (data) {
      return data.storage_url || data.base64_data || null;
    }
    return null;
  } catch (error) {
    console.warn('Error fetching file from uploads:', error);
    return null;
  }
}

/**
 * Delete a file from storage and database
 */
export async function deleteFromStorage(
  bucket: string,
  paths: string[]
): Promise<{ error: Error | null }> {
  try {
    // Filter out base64 URLs - they don't need storage deletion
    const storagePaths = paths.filter(p => !p.startsWith('data:'));
    
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token || supabaseAnonKey;
    
    // Try to delete from Supabase storage
    if (storagePaths.length > 0) {
      try {
        const url = `${supabaseUrl}/storage/v1/object/${bucket}`;
        
        await fetch(url, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': supabaseAnonKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prefixes: storagePaths }),
        });
      } catch (storageDeleteError) {
        console.warn('Storage delete failed (non-critical):', storageDeleteError);
      }
    }
    
    // Delete from file_uploads table
    for (const path of paths) {
      try {
        await supabase
          .from('file_uploads')
          .delete()
          .eq('bucket', bucket)
          .eq('path', path);
      } catch (deleteErr) {
        console.warn('File uploads delete failed:', deleteErr);
      }
    }
    
    return { error: null };
  } catch (error) {
    console.warn('Delete from storage error:', error);
    return { error: null }; // Non-critical, return success
  }
}

/**
 * Migrate base64 files to Supabase storage (admin tool)
 */
export async function migrateBase64ToStorage(): Promise<{ migrated: number; failed: number }> {
  let migrated = 0;
  let failed = 0;
  
  try {
    // Get all files with base64 data
    const { data: files } = await supabase
      .from('file_uploads')
      .select('*')
      .not('base64_data', 'is', null)
      .is('storage_url', null);
    
    if (!files || files.length === 0) {
      return { migrated: 0, failed: 0 };
    }
    
    for (const file of files) {
      try {
        // Extract base64 content
        const base64Match = file.base64_data.match(/^data:([^;]+);base64,(.+)$/);
        if (!base64Match) continue;
        
        const contentType = base64Match[1];
        const base64Content = base64Match[2];
        
        // Convert base64 to blob
        const binaryString = atob(base64Content);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: contentType });
        
        // Try to upload to storage
        const result = await uploadToStorage(file.bucket, file.path, blob, { 
          contentType,
          fileName: file.file_name 
        });
        
        if (result.data?.storageType === 'supabase') {
          // Update record to remove base64 and add storage URL
          await supabase
            .from('file_uploads')
            .update({
              storage_url: result.data.publicUrl,
              base64_data: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', file.id);
          
          migrated++;
        } else {
          failed++;
        }
      } catch (fileError) {
        console.error('Migration error for file:', file.id, fileError);
        failed++;
      }
    }
  } catch (error) {
    console.error('Migration error:', error);
  }
  
  return { migrated, failed };
}