import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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
    
    // Format URL
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log('Scraping URL:', formattedUrl);

    let scrapedData: any = null;

    if (apiKey) {
      // Use Firecrawl API
      try {
        const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: formattedUrl,
            formats: ['markdown', 'html', 'links'],
            onlyMainContent: false,
          }),
        });

        const data = await response.json();
        
        if (response.ok && data.success) {
          scrapedData = {
            url: formattedUrl,
            title: data.data?.metadata?.title || '',
            description: data.data?.metadata?.description || '',
            markdown: data.data?.markdown || '',
            html: data.data?.html || '',
            links: data.data?.links || [],
            images: extractImages(data.data?.html || ''),
            metadata: data.data?.metadata || {},
            branding: data.data?.branding || null,
          };
          console.log('Firecrawl scrape successful');
        } else {
          console.log('Firecrawl returned error, will try fallback:', data?.error || 'Unknown error');
        }
      } catch (firecrawlError) {
        console.log('Firecrawl request failed, falling back to direct fetch:', firecrawlError);
      }
    }

    // Fallback to direct fetch if Firecrawl fails or is not configured
    if (!scrapedData) {
      console.log('Using direct fetch fallback for:', formattedUrl);
      
      try {
        const response = await fetch(formattedUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
          },
          redirect: 'follow',
        });

        if (!response.ok) {
          console.log('Direct fetch failed with status:', response.status);
          // Return basic info even if fetch fails
          scrapedData = {
            url: formattedUrl,
            title: extractDomainName(formattedUrl),
            description: `Website at ${formattedUrl}`,
            markdown: '',
            html: '',
            links: [],
            images: [],
            metadata: {},
            branding: null,
          };
        } else {
          const html = await response.text();
          
          scrapedData = {
            url: formattedUrl,
            title: extractTitle(html) || extractDomainName(formattedUrl),
            description: extractMetaDescription(html) || `Website at ${formattedUrl}`,
            markdown: htmlToMarkdown(html),
            html: html.substring(0, 50000),
            links: extractLinks(html, formattedUrl),
            images: extractImages(html),
            metadata: extractMetadata(html),
            branding: null,
          };
          console.log('Direct fetch successful');
        }
      } catch (fetchError) {
        console.log('Direct fetch error:', fetchError);
        // Return minimal data so the user can still proceed
        scrapedData = {
          url: formattedUrl,
          title: extractDomainName(formattedUrl),
          description: `Website at ${formattedUrl}`,
          markdown: '',
          html: '',
          links: [],
          images: [],
          metadata: {},
          branding: null,
        };
      }
    }

    console.log('Scrape successful');
    return new Response(
      JSON.stringify({ success: true, data: scrapedData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error scraping website:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to scrape website' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function extractDomainName(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url;
  }
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1].trim() : '';
}

function extractMetaDescription(html: string): string {
  const match = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
  return match ? match[1].trim() : '';
}

function extractMetadata(html: string): any {
  const metadata: any = {};
  
  // OG tags
  const ogMatches = html.matchAll(/<meta[^>]*property=["']og:([^"']+)["'][^>]*content=["']([^"']+)["']/gi);
  for (const match of ogMatches) {
    metadata[`og:${match[1]}`] = match[2];
  }
  
  return metadata;
}

function extractLinks(html: string, baseUrl: string): string[] {
  const links: string[] = [];
  const matches = html.matchAll(/<a[^>]*href=["']([^"'#]+)["']/gi);
  
  for (const match of matches) {
    let href = match[1];
    if (href.startsWith('/')) {
      try {
        const url = new URL(baseUrl);
        href = `${url.origin}${href}`;
      } catch {}
    }
    if (href.startsWith('http') && !links.includes(href)) {
      links.push(href);
    }
  }
  
  return links.slice(0, 100);
}

function extractImages(html: string): string[] {
  const images: string[] = [];
  const matches = html.matchAll(/<img[^>]*src=["']([^"']+)["']/gi);
  
  for (const match of matches) {
    const src = match[1];
    if (src.startsWith('http') && !images.includes(src)) {
      images.push(src);
    }
  }
  
  return images.slice(0, 50);
}

function htmlToMarkdown(html: string): string {
  // Simple HTML to text conversion
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<h1[^>]*>/gi, '\n# ')
    .replace(/<h2[^>]*>/gi, '\n## ')
    .replace(/<h3[^>]*>/gi, '\n### ')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  
  return text.substring(0, 20000);
}
