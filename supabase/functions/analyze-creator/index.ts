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
  music: { low: 2, high: 6 },
  sports: { low: 3, high: 10 },
  news: { low: 3, high: 10 },
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

// YouTube category mapping
const YOUTUBE_CATEGORIES: { [key: string]: string } = {
  '1': 'Film & Animation',
  '2': 'Autos & Vehicles',
  '10': 'Music',
  '15': 'Pets & Animals',
  '17': 'Sports',
  '18': 'Short Movies',
  '19': 'Travel & Events',
  '20': 'Gaming',
  '21': 'Videoblogging',
  '22': 'People & Blogs',
  '23': 'Comedy',
  '24': 'Entertainment',
  '25': 'News & Politics',
  '26': 'Howto & Style',
  '27': 'Education',
  '28': 'Science & Technology',
  '29': 'Nonprofits & Activism',
  '30': 'Movies',
  '31': 'Anime/Animation',
  '32': 'Action/Adventure',
  '33': 'Classics',
  '34': 'Comedy',
  '35': 'Documentary',
  '36': 'Drama',
  '37': 'Family',
  '38': 'Foreign',
  '39': 'Horror',
  '40': 'Sci-Fi/Fantasy',
  '41': 'Thriller',
  '42': 'Shorts',
  '43': 'Shows',
  '44': 'Trailers',
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
        stats = await analyzeFacebook(body);
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
  const GOOGLE_API_KEY = Deno.env.get('GOOGLE_CLOUD_API_KEY');
  
  if (!GOOGLE_API_KEY) {
    throw new Error('YouTube API not configured');
  }

  // Extract channel identifier from URL or use directly
  let channelIdentifier = input.trim();
  let searchType: 'handle' | 'id' | 'username' | 'search' = 'search';
  
  if (channelIdentifier.includes('youtube.com') || channelIdentifier.includes('youtu.be')) {
    // Handle different URL formats
    const handleMatch = channelIdentifier.match(/@([^\/\?\s]+)/);
    const channelIdMatch = channelIdentifier.match(/channel\/([^\/\?\s]+)/);
    const userMatch = channelIdentifier.match(/user\/([^\/\?\s]+)/);
    const customMatch = channelIdentifier.match(/c\/([^\/\?\s]+)/);
    
    if (handleMatch) {
      channelIdentifier = handleMatch[1];
      searchType = 'handle';
    } else if (channelIdMatch) {
      channelIdentifier = channelIdMatch[1];
      searchType = 'id';
    } else if (userMatch) {
      channelIdentifier = userMatch[1];
      searchType = 'username';
    } else if (customMatch) {
      channelIdentifier = customMatch[1];
      searchType = 'search';
    }
  } else if (channelIdentifier.startsWith('@')) {
    channelIdentifier = channelIdentifier.substring(1);
    searchType = 'handle';
  } else if (channelIdentifier.startsWith('UC') && channelIdentifier.length === 24) {
    searchType = 'id';
  }

  console.log('Channel identifier:', channelIdentifier, 'Type:', searchType);

  let channelId: string | null = null;

  // Step 1: Find channel ID
  if (searchType === 'id') {
    channelId = channelIdentifier;
  } else if (searchType === 'handle') {
    // Search for channel by handle
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=@${channelIdentifier}&maxResults=1&key=${GOOGLE_API_KEY}`;
    const searchResp = await fetch(searchUrl);
    const searchData = await searchResp.json();
    
    if (searchData.items && searchData.items.length > 0) {
      channelId = searchData.items[0].snippet.channelId;
    }
  } else if (searchType === 'username') {
    // Try forUsername parameter
    const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=id&forUsername=${channelIdentifier}&key=${GOOGLE_API_KEY}`;
    const channelResp = await fetch(channelUrl);
    const channelData = await channelResp.json();
    
    if (channelData.items && channelData.items.length > 0) {
      channelId = channelData.items[0].id;
    }
  }
  
  // Fallback to search if no channel found
  if (!channelId) {
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(channelIdentifier)}&maxResults=1&key=${GOOGLE_API_KEY}`;
    const searchResp = await fetch(searchUrl);
    const searchData = await searchResp.json();
    
    if (searchData.items && searchData.items.length > 0) {
      channelId = searchData.items[0].snippet.channelId;
    }
  }

  if (!channelId) {
    throw new Error('Channel not found. Please check the channel name or URL.');
  }

  // Step 2: Get channel details with statistics and branding
  const detailsUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings,contentDetails&id=${channelId}&key=${GOOGLE_API_KEY}`;
  const detailsResp = await fetch(detailsUrl);
  const detailsData = await detailsResp.json();

  if (!detailsData.items || detailsData.items.length === 0) {
    throw new Error('Could not retrieve channel details');
  }

  const channel = detailsData.items[0];
  const snippet = channel.snippet;
  const statistics = channel.statistics;
  const branding = channel.brandingSettings;

  // Get channel thumbnails
  const thumbnails = snippet.thumbnails;
  const channelImage = thumbnails?.high?.url || thumbnails?.medium?.url || thumbnails?.default?.url;
  const bannerImage = branding?.image?.bannerExternalUrl || null;

  // Parse statistics
  const subscribers = parseInt(statistics.subscriberCount) || 0;
  const totalViews = parseInt(statistics.viewCount) || 0;
  const videoCount = parseInt(statistics.videoCount) || 0;
  const averageViews = videoCount > 0 ? Math.round(totalViews / videoCount) : 0;

  // Get recent videos to estimate monthly views
  let recentViews = 0;
  let recentVideos: any[] = [];
  
  try {
    const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;
    if (uploadsPlaylistId) {
      const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=10&key=${GOOGLE_API_KEY}`;
      const playlistResp = await fetch(playlistUrl);
      const playlistData = await playlistResp.json();
      
      if (playlistData.items && playlistData.items.length > 0) {
        const videoIds = playlistData.items.map((item: any) => item.snippet.resourceId.videoId).join(',');
        
        const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}&key=${GOOGLE_API_KEY}`;
        const videosResp = await fetch(videosUrl);
        const videosData = await videosResp.json();
        
        if (videosData.items) {
          recentVideos = videosData.items.map((v: any) => ({
            id: v.id,
            title: v.snippet.title,
            thumbnail: v.snippet.thumbnails?.medium?.url || v.snippet.thumbnails?.default?.url,
            views: parseInt(v.statistics.viewCount) || 0,
            likes: parseInt(v.statistics.likeCount) || 0,
            comments: parseInt(v.statistics.commentCount) || 0,
            publishedAt: v.snippet.publishedAt,
          }));
          
          recentViews = recentVideos.reduce((sum, v) => sum + v.views, 0);
        }
      }
    }
  } catch (e) {
    console.error('Error fetching recent videos:', e);
  }

  // Determine category from channel keywords or recent video categories
  let category = 'Entertainment';
  const keywords = branding?.channel?.keywords || '';
  const description = snippet.description?.toLowerCase() || '';
  
  // Try to detect category from keywords/description
  if (keywords.includes('gaming') || keywords.includes('game') || description.includes('gaming')) {
    category = 'Gaming';
  } else if (keywords.includes('music') || description.includes('music') || description.includes('song')) {
    category = 'Music';
  } else if (keywords.includes('tech') || keywords.includes('technology') || description.includes('tech')) {
    category = 'Tech';
  } else if (keywords.includes('education') || keywords.includes('learn') || description.includes('education')) {
    category = 'Education';
  } else if (keywords.includes('finance') || keywords.includes('money') || description.includes('finance')) {
    category = 'Finance';
  } else if (keywords.includes('health') || keywords.includes('fitness') || description.includes('health')) {
    category = 'Health';
  } else if (keywords.includes('travel') || description.includes('travel')) {
    category = 'Travel';
  } else if (keywords.includes('food') || keywords.includes('cooking') || description.includes('food')) {
    category = 'Food';
  } else if (keywords.includes('sports') || description.includes('sports')) {
    category = 'Sports';
  } else if (keywords.includes('news') || description.includes('news')) {
    category = 'News';
  }

  // Get CPM rates for category
  const categoryLower = category.toLowerCase();
  const cpm = CPM_RATES[categoryLower] || CPM_RATES.general;

  // Estimate monthly views based on recent video performance
  let estimatedMonthlyViews = recentViews > 0 ? recentViews : averageViews * 4;
  
  // Adjust based on subscriber count for more accuracy
  if (subscribers > 1000000) {
    estimatedMonthlyViews = Math.max(estimatedMonthlyViews, subscribers * 0.1);
  }

  // Calculate earnings
  const monthlyLow = Math.round((estimatedMonthlyViews / 1000) * cpm.low);
  const monthlyHigh = Math.round((estimatedMonthlyViews / 1000) * cpm.high);

  // Determine grade
  const grade = getGrade(subscribers);

  return {
    channelName: snippet.title,
    channelHandle: snippet.customUrl || `@${channelIdentifier}`,
    channelImage,
    bannerImage,
    description: snippet.description?.substring(0, 300) || '',
    country: snippet.country || 'Unknown',
    publishedAt: snippet.publishedAt,
    subscribers,
    totalViews,
    videoCount,
    averageViews,
    estimatedMonthlyViews,
    estimatedMonthlyEarnings: { low: monthlyLow, high: monthlyHigh },
    estimatedYearlyEarnings: { low: monthlyLow * 12, high: monthlyHigh * 12 },
    cpm,
    grade,
    category,
    recentVideos: recentVideos.slice(0, 5),
    verified: statistics.hiddenSubscriberCount === false && subscribers > 100000,
  };
}

async function analyzeFacebook(body: any) {
  const { input, followers } = body;
  
  // For Facebook, we use the provided follower count since Graph API requires authentication
  const followerCount = parseInt(followers) || 10000;
  
  // Try to get page icon from Facebook
  let pageImage = null;
  const pageName = input.replace(/^@/, '').replace(/https?:\/\/(www\.)?facebook\.com\//, '').split('/')[0];
  
  // Use Facebook graph API for public page picture (no token needed for public pages)
  try {
    pageImage = `https://graph.facebook.com/${pageName}/picture?type=large`;
  } catch (e) {
    console.error('Could not fetch Facebook page image');
  }
  
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
    pageImage,
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
  
  // Try to get favicon
  let websiteFavicon = null;
  try {
    const domain = url.replace(/^https?:\/\//, '').split('/')[0];
    websiteFavicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  } catch (e) {
    console.error('Could not fetch favicon');
  }
  
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
    websiteFavicon,
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
