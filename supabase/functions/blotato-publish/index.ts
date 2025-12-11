import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BLOTATO_BASE_URL = 'https://backend.blotato.com/v2';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const BLOTATO_API_KEY = Deno.env.get('BLOTATO_API_KEY');
    if (!BLOTATO_API_KEY) {
      throw new Error('BLOTATO_API_KEY is not configured');
    }

    const { action, ...params } = await req.json();
    console.log('Blotato action:', action, 'params:', JSON.stringify(params));

    switch (action) {
      case 'publish': {
        const { platform, accountId, text, mediaUrls = [], videoUrl, title, description, scheduledTime, platformConfig } = params;

        if (!platform || !accountId) {
          throw new Error('Platform and accountId are required');
        }

        // Build target based on platform
        let target: any = { targetType: platform };
        
        // Add platform-specific config
        if (platform === 'tiktok') {
          target = {
            ...target,
            privacyLevel: platformConfig?.privacyLevel || 'PUBLIC_TO_EVERYONE',
            disabledComments: platformConfig?.disabledComments || false,
            disabledDuet: platformConfig?.disabledDuet || false,
            disabledStitch: platformConfig?.disabledStitch || false,
            isBrandedContent: platformConfig?.isBrandedContent || false,
            isYourBrand: platformConfig?.isYourBrand || false,
            isAiGenerated: true,
          };
        } else if (platform === 'youtube') {
          target = {
            ...target,
            title: title || 'Untitled Video',
            privacyStatus: platformConfig?.privacyStatus || 'public',
            shouldNotifySubscribers: platformConfig?.shouldNotifySubscribers !== false,
            containsSyntheticMedia: true,
          };
        } else if (platform === 'instagram') {
          target = {
            ...target,
            mediaType: videoUrl ? 'reel' : undefined,
          };
        } else if (platform === 'facebook') {
          target = {
            ...target,
            pageId: platformConfig?.pageId,
            mediaType: videoUrl ? 'reel' : undefined,
          };
        }

        // Build media URLs array
        const allMediaUrls = [...mediaUrls];
        if (videoUrl) {
          allMediaUrls.push(videoUrl);
        }

        const postPayload: any = {
          post: {
            accountId,
            content: {
              text: text || description || '',
              mediaUrls: allMediaUrls,
              platform,
            },
            target,
          },
        };

        // Add scheduled time if provided
        if (scheduledTime) {
          postPayload.scheduledTime = scheduledTime;
        }

        console.log('Publishing to Blotato:', JSON.stringify(postPayload));

        const response = await fetch(`${BLOTATO_BASE_URL}/posts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'blotato-api-key': BLOTATO_API_KEY,
          },
          body: JSON.stringify(postPayload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Blotato publish error:', response.status, errorText);
          throw new Error(`Blotato error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log('Blotato publish result:', JSON.stringify(result));

        return new Response(
          JSON.stringify({ 
            success: true, 
            postSubmissionId: result.postSubmissionId,
            message: `Post submitted to ${platform}` 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'upload-media': {
        const { mediaUrl, mediaType } = params;

        if (!mediaUrl) {
          throw new Error('mediaUrl is required');
        }

        // First fetch the media from the URL
        const mediaResponse = await fetch(mediaUrl);
        if (!mediaResponse.ok) {
          throw new Error('Failed to fetch media from URL');
        }

        const mediaBlob = await mediaResponse.blob();
        const formData = new FormData();
        formData.append('file', mediaBlob, mediaType === 'video' ? 'video.mp4' : 'image.jpg');

        const uploadResponse = await fetch(`${BLOTATO_BASE_URL}/media`, {
          method: 'POST',
          headers: {
            'blotato-api-key': BLOTATO_API_KEY,
          },
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error('Blotato upload error:', uploadResponse.status, errorText);
          throw new Error(`Blotato upload error: ${uploadResponse.status}`);
        }

        const uploadResult = await uploadResponse.json();
        console.log('Blotato upload result:', JSON.stringify(uploadResult));

        return new Response(
          JSON.stringify({ 
            success: true, 
            mediaUrl: uploadResult.url || uploadResult.mediaUrl 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Blotato function error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
