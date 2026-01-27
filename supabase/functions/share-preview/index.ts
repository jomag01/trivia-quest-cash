import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EntityMeta {
  title: string;
  description: string;
  image: string;
  price?: string;
  type: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const entityType = url.searchParams.get('type') || 'product';
    const entityId = url.searchParams.get('id');
    const ref = url.searchParams.get('ref');
    const src = url.searchParams.get('src') || 'share';

    if (!entityId) {
      return new Response('Missing entity ID', { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let meta: EntityMeta | null = null;
    const baseUrl = Deno.env.get('SITE_URL') || 'https://triviabees.lovable.app';
    
    // Path mapping for different entity types
    const pathMap: Record<string, string> = {
      product: '/shop',
      auction: '/auction',
      restaurant: '/food',
      marketplace: '/marketplace',
      service: '/booking',
      blog: '/blog',
    };

    const targetPath = pathMap[entityType] || '/shop';

    switch (entityType) {
      case 'product': {
        const { data } = await supabase
          .from('products')
          .select('id, name, description, image_url, price')
          .eq('id', entityId)
          .maybeSingle();
        
        if (data) {
          meta = {
            title: data.name,
            description: data.description?.substring(0, 160) || `Check out ${data.name} on Triviabees!`,
            image: data.image_url || `${baseUrl}/og-image.png`,
            price: data.price ? `₱${data.price.toLocaleString()}` : undefined,
            type: 'product',
          };
        }
        break;
      }
      
      case 'auction': {
        const { data } = await supabase
          .from('auctions')
          .select('id, title, description, images, starting_bid, current_bid')
          .eq('id', entityId)
          .maybeSingle();
        
        if (data) {
          const bid = data.current_bid || data.starting_bid;
          meta = {
            title: data.title,
            description: data.description?.substring(0, 160) || `Bid on ${data.title} - Live Auction on Triviabees!`,
            image: data.images?.[0] || `${baseUrl}/og-image.png`,
            price: bid ? `₱${bid.toLocaleString()} current bid` : undefined,
            type: 'product',
          };
        }
        break;
      }
      
      case 'restaurant': {
        const { data } = await supabase
          .from('restaurants')
          .select('id, name, description, image_url, banner_url')
          .eq('id', entityId)
          .maybeSingle();
        
        if (data) {
          meta = {
            title: data.name,
            description: data.description?.substring(0, 160) || `Order from ${data.name} on Triviabees Food Delivery!`,
            image: data.banner_url || data.image_url || `${baseUrl}/og-image.png`,
            type: 'restaurant.menu',
          };
        }
        break;
      }
      
      case 'marketplace': {
        const { data } = await supabase
          .from('marketplace_listings')
          .select('id, title, description, thumbnail_url, images, price, category')
          .eq('id', entityId)
          .maybeSingle();
        
        if (data) {
          meta = {
            title: data.title,
            description: data.description?.substring(0, 160) || `Check out ${data.title} on Triviabees Marketplace!`,
            image: data.thumbnail_url || data.images?.[0] || `${baseUrl}/og-image.png`,
            price: data.price ? `₱${data.price.toLocaleString()}` : undefined,
            type: 'product',
          };
        }
        break;
      }

      case 'service': {
        const { data } = await supabase
          .from('booking_services')
          .select('id, name, description, images, price')
          .eq('id', entityId)
          .maybeSingle();
        
        if (data) {
          meta = {
            title: data.name,
            description: data.description?.substring(0, 160) || `Book ${data.name} on Triviabees!`,
            image: data.images?.[0] || `${baseUrl}/og-image.png`,
            price: data.price ? `From ₱${data.price.toLocaleString()}` : undefined,
            type: 'service',
          };
        }
        break;
      }
    }

    // Default fallback
    if (!meta) {
      meta = {
        title: 'Triviabees - AI, Play, Win, Earn',
        description: 'Discover amazing products, services, and auctions on Triviabees!',
        image: `${baseUrl}/og-image.png`,
        type: 'website',
      };
    }

    // Build redirect URL with all params
    const redirectParams = new URLSearchParams();
    redirectParams.set(entityType, entityId);
    if (ref) redirectParams.set('ref', ref);
    redirectParams.set('src', src);
    
    const redirectUrl = `${baseUrl}${targetPath}?${redirectParams.toString()}`;
    
    // Ensure image is absolute URL
    const imageUrl = meta.image.startsWith('http') ? meta.image : `${baseUrl}${meta.image}`;
    
    // Check if request is from a social media crawler
    const userAgent = req.headers.get('user-agent')?.toLowerCase() || '';
    const isCrawler = 
      userAgent.includes('facebookexternalhit') ||
      userAgent.includes('facebot') ||
      userAgent.includes('twitterbot') ||
      userAgent.includes('whatsapp') ||
      userAgent.includes('telegrambot') ||
      userAgent.includes('linkedinbot') ||
      userAgent.includes('slackbot') ||
      userAgent.includes('discordbot');

    // For crawlers, return HTML with OG meta tags
    // For regular users, redirect to the actual page
    if (isCrawler) {
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(meta.title)} | Triviabees</title>
  
  <!-- Primary Meta Tags -->
  <meta name="title" content="${escapeHtml(meta.title)} | Triviabees">
  <meta name="description" content="${escapeHtml(meta.description)}">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="${meta.type}">
  <meta property="og:url" content="${redirectUrl}">
  <meta property="og:title" content="${escapeHtml(meta.title)}">
  <meta property="og:description" content="${escapeHtml(meta.description)}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="Triviabees">
  ${meta.price ? `<meta property="product:price:amount" content="${meta.price}">` : ''}
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${redirectUrl}">
  <meta name="twitter:title" content="${escapeHtml(meta.title)}">
  <meta name="twitter:description" content="${escapeHtml(meta.description)}">
  <meta name="twitter:image" content="${imageUrl}">
  
  <!-- Redirect for regular browsers -->
  <meta http-equiv="refresh" content="0;url=${redirectUrl}">
  <link rel="canonical" href="${redirectUrl}">
</head>
<body>
  <p>Redirecting to <a href="${redirectUrl}">${escapeHtml(meta.title)}</a>...</p>
  <script>window.location.href = "${redirectUrl}";</script>
</body>
</html>`;

      return new Response(html, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    // For regular browsers, just redirect
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': redirectUrl,
      },
    });
  } catch (error) {
    console.error('Error in share-preview:', error);
    return new Response('Internal server error', { status: 500 });
  }
});

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
