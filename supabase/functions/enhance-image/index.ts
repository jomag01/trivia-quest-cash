import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Retry helper with exponential backoff
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 120000) // 2 min timeout
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      return response
    } catch (error) {
      lastError = error as Error
      console.error(`Attempt ${attempt + 1} failed:`, error)
      
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000 // 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  throw lastError || new Error('All retry attempts failed')
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured')
    }

    const { imageUrl, operation, newBackground, maskData } = await req.json()

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'Image URL is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (!operation) {
      return new Response(
        JSON.stringify({ error: 'Operation is required (enhance, remove-bg, change-bg, restore, manual-erase)' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log(`Processing image with operation: ${operation}`)

    let prompt = ''
    
    switch (operation) {
      case 'enhance':
        prompt = 'Enhance this image: improve clarity, sharpness, color balance, and overall quality. Make it look professional and high-resolution while preserving the original content and composition.'
        break
      case 'remove-bg':
      case 'remove-background':
        prompt = 'Remove the background from this image completely, leaving only the main subject with a transparent or clean white background. Focus on precise edge detection around the subject.'
        break
      case 'change-bg':
      case 'change-background':
        if (!newBackground) {
          return new Response(
            JSON.stringify({ error: 'New background description is required for change-bg operation' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          )
        }
        prompt = `Change the background of this image to: ${newBackground}. Keep the main subject intact and seamlessly blend it with the new background.`
        break
      case 'restore':
        prompt = 'Restore this old or damaged photo: fix scratches, tears, fading, color degradation, and noise. Enhance clarity while preserving the authentic vintage feel. Make it look like a professionally restored photograph suitable for ID or important documents.'
        break
      case 'upscale':
        prompt = 'Upscale and enhance this image to higher resolution. Improve details, reduce noise, and sharpen edges while maintaining natural appearance.'
        break
      case 'colorize':
        prompt = 'Colorize this black and white photo with realistic, natural colors. Pay attention to skin tones, clothing, and environmental elements to create an authentic colored version.'
        break
      case 'fix-lighting':
        prompt = 'Fix the lighting in this image: correct exposure, balance highlights and shadows, remove harsh lighting artifacts, and create natural, even illumination.'
        break
      case 'denoise':
      case 'remove-noise':
        prompt = 'Remove noise and grain from this image while preserving important details and textures. Create a clean, smooth result suitable for printing or professional use.'
        break
      case 'erase-people':
        prompt = 'Remove ALL people, pedestrians, and passersby from this image. Keep the main subject if they are clearly the focus of the photo. Fill in the removed areas naturally with the surrounding background, maintaining seamless texture and lighting. The result should look like the scene was photographed without any people present.'
        break
      case 'erase-objects':
        prompt = 'Remove unwanted objects, clutter, and distractions from this image. Keep the main subject intact. Fill in removed areas naturally with surrounding background textures and patterns. Create a clean, professional result.'
        break
      case 'remove-reflections':
        prompt = 'Remove unwanted reflections, glare, and lens flares from this image. Fix glass reflections, water reflections, and shiny surface reflections while preserving the natural look of the scene. Keep the main subject clear and visible.'
        break
      case 'remove-watermark':
        prompt = 'Remove any watermarks, logos, text overlays, or stamps from this image. Reconstruct the underlying image content naturally so the result looks seamless and professional.'
        break
      case 'manual-erase':
        if (!maskData) {
          return new Response(
            JSON.stringify({ error: 'Mask data is required for manual-erase operation. Please paint over the areas you want to remove.' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          )
        }
        prompt = 'I am providing you with two images: the first is the original image, and the second is a mask. In the mask, white/bright areas indicate what needs to be REMOVED or ERASED from the original image. Remove those marked areas completely and fill them in naturally with the surrounding background, maintaining seamless texture, color, and lighting. The result should look like those areas were never there. Keep everything in the dark/black areas of the mask unchanged.'
        break
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid operation. Use: enhance, remove-bg, change-bg, restore, upscale, colorize, fix-lighting, denoise, erase-people, erase-objects, remove-reflections, remove-watermark, or manual-erase' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }

    // Build content array for the message
    const contentArray: any[] = [
      {
        type: 'text',
        text: prompt
      },
      {
        type: 'image_url',
        image_url: {
          url: imageUrl
        }
      }
    ]

    // For manual-erase, add the mask as a second image
    if (operation === 'manual-erase' && maskData) {
      contentArray.push({
        type: 'image_url',
        image_url: {
          url: maskData
        }
      })
    }

    // Always use Nano Banana (google/gemini-2.5-flash-image-preview) for all image operations
    const model = 'google/gemini-2.5-flash-image-preview'
    
    console.log(`Using Nano Banana model for operation: ${operation}`)

    // Call Lovable AI with image editing capability and retry logic
    const response = await fetchWithRetry('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'user',
            content: contentArray
          }
        ],
        modalities: ['image', 'text']
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('AI gateway error:', response.status, errorText)
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limits exceeded, please try again in a few seconds.', retryable: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
        )
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required, please add funds to continue.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 402 }
        )
      }
      
      // Check for geo-restriction error
      if (response.status === 400 && errorText.includes('not available in your country')) {
        return new Response(
          JSON.stringify({ 
            error: 'Image processing is temporarily unavailable in your region. Please try again later.',
            code: 'GEO_RESTRICTED'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 }
        )
      }
      
      // Generic error with more info
      return new Response(
        JSON.stringify({ 
          error: 'Image processing failed. Please try again.',
          details: `Status: ${response.status}`,
          retryable: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    const data = await response.json()
    console.log('AI response received successfully')

    // Extract the generated image from the response
    const resultImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url
    const textResponse = data.choices?.[0]?.message?.content

    if (!resultImage) {
      console.error('No image in response:', JSON.stringify(data).substring(0, 500))
      return new Response(
        JSON.stringify({ 
          error: 'Failed to generate image. Please try again with a different image or operation.',
          details: textResponse || 'The AI could not complete the requested operation',
          retryable: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    return new Response(
      JSON.stringify({ 
        imageUrl: resultImage,
        message: textResponse || `Image ${operation} completed successfully`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Error in enhance-image function:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
    const isTimeout = errorMessage.includes('abort') || errorMessage.includes('timeout')
    
    return new Response(
      JSON.stringify({ 
        error: isTimeout 
          ? 'Request timed out. Please try again with a smaller image.' 
          : 'Image processing failed. Please try again.',
        details: errorMessage,
        retryable: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
