const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format URL
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log('Scraping product URL:', formattedUrl);

    // Use Firecrawl to scrape the product page
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ['markdown', 'html', 'links', 'screenshot'],
        onlyMainContent: true,
        waitFor: 3000, // Wait for dynamic content to load
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Firecrawl API error:', data);
      return new Response(
        JSON.stringify({ success: false, error: data.error || `Request failed with status ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract product data from the scraped content
    const scrapedData = data.data || data;
    const markdown = scrapedData.markdown || '';
    const html = scrapedData.html || '';
    const metadata = scrapedData.metadata || {};
    const links = scrapedData.links || [];
    const screenshot = scrapedData.screenshot || null;

    // Parse product information using AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    let productInfo = {
      name: metadata.title || 'Imported Product',
      description: metadata.description || '',
      price: 0,
      images: [] as string[],
      variants: [] as string[],
    };

    if (LOVABLE_API_KEY) {
      try {
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: `You are a product data extractor. Extract product information from e-commerce page content and return ONLY valid JSON with these fields:
                - name: product title/name
                - description: detailed product description (combine all relevant details)
                - price: numeric price value (just the number, no currency symbols)
                - currency: currency code (USD, PHP, etc.)
                - images: array of image URLs found on the page
                - variants: array of variant options (sizes, colors, etc.)
                
                Return ONLY the JSON object, no markdown formatting.`
              },
              {
                role: 'user',
                content: `Extract product data from this e-commerce page:\n\nTitle: ${metadata.title}\nDescription: ${metadata.description}\n\nPage Content:\n${markdown.substring(0, 8000)}`
              }
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content || '';
          
          // Try to parse the JSON from the AI response
          try {
            // Clean up the response - remove markdown code blocks if present
            let jsonStr = content.trim();
            if (jsonStr.startsWith('```json')) {
              jsonStr = jsonStr.slice(7);
            }
            if (jsonStr.startsWith('```')) {
              jsonStr = jsonStr.slice(3);
            }
            if (jsonStr.endsWith('```')) {
              jsonStr = jsonStr.slice(0, -3);
            }
            
            const parsed = JSON.parse(jsonStr.trim());
            productInfo = {
              name: parsed.name || productInfo.name,
              description: parsed.description || productInfo.description,
              price: parseFloat(parsed.price) || 0,
              images: Array.isArray(parsed.images) ? parsed.images : [],
              variants: Array.isArray(parsed.variants) ? parsed.variants : [],
            };
          } catch (parseError) {
            console.error('Failed to parse AI response:', parseError);
          }
        }
      } catch (aiError) {
        console.error('AI extraction error:', aiError);
      }
    }

    // Extract image URLs from HTML using regex
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    const htmlImages: string[] = [];
    let match;
    while ((match = imgRegex.exec(html)) !== null) {
      const imgUrl = match[1];
      // Filter for product images (usually larger images, not icons)
      if (imgUrl && 
          !imgUrl.includes('icon') && 
          !imgUrl.includes('logo') &&
          !imgUrl.includes('sprite') &&
          (imgUrl.includes('.jpg') || imgUrl.includes('.jpeg') || imgUrl.includes('.png') || imgUrl.includes('.webp') || imgUrl.includes('image'))) {
        // Make sure URL is absolute
        if (imgUrl.startsWith('//')) {
          htmlImages.push('https:' + imgUrl);
        } else if (imgUrl.startsWith('/')) {
          try {
            const urlObj = new URL(formattedUrl);
            htmlImages.push(urlObj.origin + imgUrl);
          } catch {
            htmlImages.push(imgUrl);
          }
        } else if (imgUrl.startsWith('http')) {
          htmlImages.push(imgUrl);
        }
      }
    }

    // Combine and deduplicate images
    const allImages = [...new Set([...productInfo.images, ...htmlImages])].slice(0, 10);

    console.log('Scrape successful:', productInfo.name);

    return new Response(
      JSON.stringify({
        success: true,
        product: {
          name: productInfo.name,
          description: productInfo.description,
          price: productInfo.price,
          images: allImages,
          variants: productInfo.variants,
          sourceUrl: formattedUrl,
          screenshot: screenshot,
          metadata: {
            title: metadata.title,
            description: metadata.description,
            language: metadata.language,
            sourceURL: metadata.sourceURL,
          }
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error scraping product:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to scrape product';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
