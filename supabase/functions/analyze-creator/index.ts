import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// CPM rates by niche ($ per 1000 views)
const CPM_RATES: { [key: string]: { low: number; high: number } } = {
  finance: { low: 12, high: 30 },
  tech: { low: 4, high: 15 },
  gaming: { low: 2, high: 8 },
  entertainment: { low: 2, high: 6 },
  education: { low: 5, high: 15 },
  health: { low: 8, high: 25 },
  travel: { low: 4, high: 12 },
  food: { low: 3, high: 10 },
  fashion: { low: 3, high: 12 },
  general: { low: 2, high: 8 },
};

// AdSense CPC rates by niche
const ADSENSE_CPC: { [key: string]: { low: number; high: number } } = {
  finance: { low: 0.50, high: 3.00 },
  tech: { low: 0.25, high: 1.50 },
  gaming: { low: 0.10, high: 0.50 },
  entertainment: { low: 0.08, high: 0.30 },
  education: { low: 0.20, high: 1.00 },
  health: { low: 0.30, high: 2.00 },
  travel: { low: 0.20, high: 1.00 },
  food: { low: 0.15, high: 0.60 },
  fashion: { low: 0.15, high: 0.80 },
  general: { low: 0.10, high: 0.50 },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { platform } = body;

    console.log('Analyzing creator for platform:', platform);

    let stats;

    switch (platform) {
      case 'youtube':
        stats = await analyzeYouTube(body);
        break;
      case 'facebook':
        stats = analyzeFacebook(body);
        break;
      case 'adsense':
        stats = analyzeAdSense(body);
        break;
      default:
        throw new Error('Invalid platform');
    }

    return new Response(
      JSON.stringify({ success: true, stats }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error analyzing creator:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to analyze creator' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function analyzeYouTube(body: any) {
  const { input } = body;
  
  // Extract channel name from URL or use directly
  let channelName = input;
  if (input.includes('youtube.com') || input.includes('youtu.be')) {
    const match = input.match(/@([^\/\?]+)/) || input.match(/channel\/([^\/\?]+)/) || input.match(/c\/([^\/\?]+)/);
    channelName = match ? match[1] : input;
  }
  channelName = channelName.replace('@', '');

  // Use AI to estimate stats based on channel name
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  let estimatedData = {
    subscribers: 100000,
    totalViews: 50000000,
    videoCount: 200,
    category: 'Entertainment'
  };

  if (LOVABLE_API_KEY) {
    try {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
              content: 'You estimate YouTube channel statistics. Respond with JSON only: {"subscribers": number, "totalViews": number, "videoCount": number, "category": string}. Make realistic estimates for popular channels or reasonable guesses for unknown ones.'
            },
            {
              role: 'user',
              content: `Estimate statistics for YouTube channel: ${channelName}. If you know this channel, provide accurate estimates. If not, provide reasonable estimates based on the name.`
            }
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          estimatedData = { ...estimatedData, ...JSON.parse(jsonMatch[0]) };
        }
      }
    } catch (e) {
      console.error('AI estimation failed:', e);
    }
  }

  const subscribers = estimatedData.subscribers;
  const totalViews = estimatedData.totalViews;
  const videoCount = estimatedData.videoCount;
  const category = estimatedData.category.toLowerCase();
  const averageViews = Math.round(totalViews / Math.max(videoCount, 1));
  
  // Get CPM rates for category
  const cpm = CPM_RATES[category] || CPM_RATES.general;
  
  // Estimate monthly views (based on average views and typical upload frequency)
  const estimatedMonthlyViews = averageViews * 4; // Assuming ~4 videos/month or view decay
  
  // Calculate earnings
  const monthlyLow = Math.round((estimatedMonthlyViews / 1000) * cpm.low);
  const monthlyHigh = Math.round((estimatedMonthlyViews / 1000) * cpm.high);
  
  // Determine grade
  const grade = getGrade(subscribers);

  return {
    channelName: channelName,
    subscribers,
    totalViews,
    videoCount,
    averageViews,
    estimatedMonthlyEarnings: { low: monthlyLow, high: monthlyHigh },
    estimatedYearlyEarnings: { low: monthlyLow * 12, high: monthlyHigh * 12 },
    cpm,
    grade,
    category: estimatedData.category,
  };
}

function analyzeFacebook(body: any) {
  const { input, followers } = body;
  
  const followerCount = parseInt(followers) || 10000;
  
  // Estimate engagement rate (typically 1-5% for pages)
  const engagementRate = followerCount > 1000000 ? 1.5 : followerCount > 100000 ? 2.5 : 4;
  
  // Estimated reach (typically 10-30% of followers for organic)
  const estimatedReach = Math.round(followerCount * 0.2);
  
  // Sponsorship rates (typically $10-$25 per 1000 followers)
  const ratePerThousand = followerCount > 1000000 ? 15 : followerCount > 100000 ? 20 : 25;
  const perPostLow = Math.round((followerCount / 1000) * ratePerThousand * 0.7);
  const perPostHigh = Math.round((followerCount / 1000) * ratePerThousand * 1.5);
  
  // Monthly earnings (assuming 2-4 sponsored posts)
  const monthlyLow = perPostLow * 2;
  const monthlyHigh = perPostHigh * 4;
  
  const grade = getGrade(followerCount);

  return {
    pageName: input,
    followers: followerCount,
    estimatedReach,
    engagementRate,
    estimatedMonthlyEarnings: { low: monthlyLow, high: monthlyHigh },
    estimatedPerPost: { low: perPostLow, high: perPostHigh },
    grade,
  };
}

function analyzeAdSense(body: any) {
  const { url, monthlyVisitors, niche } = body;
  
  const visitors = parseInt(monthlyVisitors) || 10000;
  const websiteNiche = niche || 'general';
  
  // Estimate page views (avg 2-3 pages per visit)
  const pageViewsPerVisit = 2.5;
  const estimatedPageViews = Math.round(visitors * pageViewsPerVisit);
  
  // CTR typically 1-3%
  const estimatedCTR = websiteNiche === 'finance' ? 2.5 : websiteNiche === 'tech' ? 2 : 1.5;
  
  // Get CPC for niche
  const cpc = ADSENSE_CPC[websiteNiche] || ADSENSE_CPC.general;
  const avgCPC = (cpc.low + cpc.high) / 2;
  
  // Calculate clicks
  const estimatedClicks = Math.round(estimatedPageViews * (estimatedCTR / 100));
  
  // Calculate earnings
  const monthlyLow = Math.round(estimatedClicks * cpc.low);
  const monthlyHigh = Math.round(estimatedClicks * cpc.high);
  
  const grade = getGrade(visitors);

  return {
    websiteUrl: url,
    estimatedMonthlyVisitors: visitors,
    estimatedPageViews,
    estimatedCTR,
    estimatedCPC: avgCPC,
    estimatedMonthlyEarnings: { low: monthlyLow, high: monthlyHigh },
    estimatedYearlyEarnings: { low: monthlyLow * 12, high: monthlyHigh * 12 },
    niche: websiteNiche.charAt(0).toUpperCase() + websiteNiche.slice(1),
    grade,
  };
}

function getGrade(metric: number): string {
  if (metric >= 10000000) return 'A++';
  if (metric >= 5000000) return 'A+';
  if (metric >= 1000000) return 'A';
  if (metric >= 500000) return 'A-';
  if (metric >= 100000) return 'B+';
  if (metric >= 50000) return 'B';
  if (metric >= 10000) return 'B-';
  if (metric >= 5000) return 'C+';
  if (metric >= 1000) return 'C';
  if (metric >= 500) return 'C-';
  if (metric >= 100) return 'D';
  return 'F';
}
