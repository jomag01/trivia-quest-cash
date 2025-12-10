import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-bucket, x-path, x-filename",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const bucket = req.headers.get("x-bucket");
    const path = req.headers.get("x-path");
    const fileName = req.headers.get("x-filename") || path?.split("/").pop() || "file";
    
    if (!bucket || !path) {
      throw new Error("Missing bucket or path header");
    }

    const fileBuffer = await req.arrayBuffer();
    const contentType = req.headers.get("content-type") || "application/octet-stream";
    const fileSize = fileBuffer.byteLength;

    // Get Supabase config from environment
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create Supabase admin client
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });

    // Get user ID from authorization header if present
    let userId: string | null = null;
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      if (token !== serviceRoleKey) {
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id || null;
      }
    }

    let publicUrl: string | null = null;
    let storageSuccess = false;

    // Try direct REST API upload to storage (bypasses client-side bucket metadata queries)
    try {
      const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${path}`;
      
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${serviceRoleKey}`,
          "apikey": serviceRoleKey,
          "Content-Type": contentType,
          "x-upsert": "true",
        },
        body: fileBuffer,
      });

      if (uploadResponse.ok) {
        publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
        storageSuccess = true;
        console.log("Direct storage upload successful:", publicUrl);
      } else {
        const errorText = await uploadResponse.text();
        console.warn("Direct storage upload failed:", errorText);
      }
    } catch (storageError) {
      console.warn("Storage upload error:", storageError);
    }

    // If storage upload failed, store as base64 in database
    if (!storageSuccess) {
      console.log("Falling back to base64 storage in database");
      
      // Convert ArrayBuffer to base64
      const uint8Array = new Uint8Array(fileBuffer);
      let binary = "";
      for (let i = 0; i < uint8Array.length; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      const base64Data = `data:${contentType};base64,${btoa(binary)}`;
      
      // Store in file_uploads table
      const { error: dbError } = await supabase
        .from("file_uploads")
        .upsert({
          bucket,
          path,
          file_name: fileName,
          content_type: contentType,
          size_bytes: fileSize,
          base64_data: base64Data,
          user_id: userId,
          updated_at: new Date().toISOString()
        }, { onConflict: "bucket,path" });

      if (dbError) {
        console.error("Database fallback failed:", dbError);
        throw new Error(`Upload failed: ${dbError.message}`);
      }

      publicUrl = base64Data;
      console.log("Base64 storage successful");
    } else {
      // Record successful storage upload in file_uploads table (without base64)
      try {
        await supabase
          .from("file_uploads")
          .upsert({
            bucket,
            path,
            file_name: fileName,
            content_type: contentType,
            size_bytes: fileSize,
            storage_url: publicUrl,
            user_id: userId,
            updated_at: new Date().toISOString()
          }, { onConflict: "bucket,path" });
      } catch (recordErr) {
        console.warn("Failed to record upload:", recordErr);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        path, 
        publicUrl,
        storageType: storageSuccess ? "supabase" : "base64"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Storage upload error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});