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

    // Format URL
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log('Scraping product URL:', formattedUrl);

    let html = '';
    let metadata: Record<string, string> = {};

    // Try Firecrawl first
    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    let firecrawlSuccess = false;

    if (apiKey) {
      try {
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
            waitFor: 3000,
          }),
        });

        const data = await response.json();

        if (response.ok && data.success !== false) {
          const scrapedData = data.data || data;
          html = scrapedData.html || '';
          metadata = scrapedData.metadata || {};
          firecrawlSuccess = true;
          console.log('Firecrawl scrape successful');
        } else {
          console.log('Firecrawl failed, trying direct fetch:', data.error);
        }
      } catch (e) {
        console.log('Firecrawl error, trying direct fetch:', e);
      }
    }

    // Fallback to direct fetch if Firecrawl fails
    if (!firecrawlSuccess) {
      try {
        const response = await fetch(formattedUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
          },
        });

        if (response.ok) {
          html = await response.text();
          console.log('Direct fetch successful, HTML length:', html.length);
        } else {
          console.log('Direct fetch failed with status:', response.status);
        }
      } catch (e) {
        console.log('Direct fetch error:', e);
      }
    }

    // Extract metadata from HTML
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
                      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
    const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
                         html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
    const ogDescMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
                        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i);
    const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
                         html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);

    if (!metadata.title) {
      metadata.title = ogTitleMatch?.[1] || titleMatch?.[1] || '';
    }
    if (!metadata.description) {
      metadata.description = ogDescMatch?.[1] || descMatch?.[1] || '';
    }

    // Extract price patterns from HTML
    const pricePatterns = [
      // Common price formats
      /["']price["']\s*:\s*["']?([₱$€£¥]?\s*[\d,]+\.?\d*)["']?/gi,
      /data-price=["']([₱$€£¥]?\s*[\d,]+\.?\d*)["']/gi,
      /<span[^>]*class=["'][^"']*price[^"']*["'][^>]*>([₱$€£¥]?\s*[\d,]+\.?\d*)<\/span>/gi,
      /["']salePrice["']\s*:\s*["']?(\d+\.?\d*)["']?/gi,
      /["']currentPrice["']\s*:\s*["']?(\d+\.?\d*)["']?/gi,
      /["']discountedPrice["']\s*:\s*["']?(\d+\.?\d*)["']?/gi,
      /₱\s*([\d,]+\.?\d*)/g,
      /\$\s*([\d,]+\.?\d*)/g,
      /PHP\s*([\d,]+\.?\d*)/gi,
      /USD\s*([\d,]+\.?\d*)/gi,
    ];

    let extractedPrice = 0;
    for (const pattern of pricePatterns) {
      const matches = html.matchAll(pattern);
      for (const match of matches) {
        const priceStr = match[1].replace(/[₱$€£¥,\s]/g, '');
        const price = parseFloat(priceStr);
        if (price > 0 && price < 1000000) {
          extractedPrice = price;
          break;
        }
      }
      if (extractedPrice > 0) break;
    }

    // Extract images
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    const dataImgRegex = /["'](?:image|img|photo|picture)(?:Url|URL|_url)?["']\s*:\s*["']([^"']+)["']/gi;
    const ogImages: string[] = [];
    
    if (ogImageMatch?.[1]) {
      ogImages.push(ogImageMatch[1]);
    }

    const htmlImages: string[] = [];
    let match;
    
    // Extract from img tags
    while ((match = imgRegex.exec(html)) !== null) {
      const imgUrl = match[1];
      if (imgUrl && 
          !imgUrl.includes('icon') && 
          !imgUrl.includes('logo') &&
          !imgUrl.includes('sprite') &&
          !imgUrl.includes('avatar') &&
          !imgUrl.includes('placeholder') &&
          imgUrl.length > 20 &&
          (imgUrl.includes('.jpg') || imgUrl.includes('.jpeg') || imgUrl.includes('.png') || imgUrl.includes('.webp') || imgUrl.includes('image'))) {
        let absoluteUrl = imgUrl;
        if (imgUrl.startsWith('//')) {
          absoluteUrl = 'https:' + imgUrl;
        } else if (imgUrl.startsWith('/')) {
          try {
            const urlObj = new URL(formattedUrl);
            absoluteUrl = urlObj.origin + imgUrl;
          } catch {
            absoluteUrl = imgUrl;
          }
        }
        if (absoluteUrl.startsWith('http')) {
          htmlImages.push(absoluteUrl);
        }
      }
    }

    // Extract from JSON data
    while ((match = dataImgRegex.exec(html)) !== null) {
      const imgUrl = match[1];
      if (imgUrl && imgUrl.startsWith('http') && !imgUrl.includes('icon') && !imgUrl.includes('logo')) {
        htmlImages.push(imgUrl);
      }
    }

    // Use AI to extract product info if we have HTML content
    let productInfo = {
      name: metadata.title || 'Imported Product',
      description: metadata.description || '',
      price: extractedPrice,
      images: [] as string[],
      variants: [] as string[],
    };

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (LOVABLE_API_KEY && html.length > 100) {
      try {
        // Extract a reasonable portion of HTML for analysis
        const htmlSample = html.substring(0, 15000);
        
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
                content: `You are a product data extractor. Extract product information from e-commerce page HTML and return ONLY valid JSON with these fields:
                - name: product title/name (clean, without special characters or extra info)
                - description: detailed product description (combine all relevant details, clean text)
                - price: numeric price value (just the number, no currency symbols, use the sale/discounted price if available)
                - currency: currency code (USD, PHP, etc.)
                - images: array of product image URLs found (full URLs only, prioritize main product images)
                - variants: array of variant options (sizes, colors, etc.)
                
                Return ONLY the JSON object, no markdown formatting, no code blocks.`
              },
              {
                role: 'user',
                content: `Extract product data from this e-commerce page HTML. Look for JSON-LD schema data, meta tags, and visible content:\n\n${htmlSample}`
              }
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content || '';
          
          try {
            let jsonStr = content.trim();
            // Remove markdown code blocks if present
            if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
            if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
            if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);
            
            const parsed = JSON.parse(jsonStr.trim());
            productInfo = {
              name: parsed.name || productInfo.name,
              description: parsed.description || productInfo.description,
              price: parseFloat(parsed.price) || extractedPrice || 0,
              images: Array.isArray(parsed.images) ? parsed.images.filter((img: string) => img && img.startsWith('http')) : [],
              variants: Array.isArray(parsed.variants) ? parsed.variants : [],
            };
            console.log('AI extraction successful:', productInfo.name);
          } catch (parseError) {
            console.error('Failed to parse AI response:', parseError);
          }
        }
      } catch (aiError) {
        console.error('AI extraction error:', aiError);
      }
    }

    // Combine and deduplicate images
    const allImages = [...new Set([
      ...ogImages,
      ...productInfo.images,
      ...htmlImages
    ])].filter(img => img && img.startsWith('http')).slice(0, 10);

    // Clean up name and description
    const cleanName = productInfo.name
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 200);

    const cleanDescription = productInfo.description
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();

    console.log('Scrape result:', {
      name: cleanName,
      price: productInfo.price,
      imagesCount: allImages.length,
      descriptionLength: cleanDescription.length
    });

    return new Response(
      JSON.stringify({
        success: true,
        product: {
          name: cleanName || 'Imported Product',
          description: cleanDescription,
          price: productInfo.price || 0,
          images: allImages,
          variants: productInfo.variants,
          sourceUrl: formattedUrl,
          metadata: {
            title: metadata.title,
            description: metadata.description,
          }
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error scraping product:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to import product. Please check the URL and try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
