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

// TikTok CPM rates (varies widely)
const TIKTOK_CPM: { [key: string]: { low: number; high: number } } = {
  entertainment: { low: 0.02, high: 0.08 },
  gaming: { low: 0.015, high: 0.06 },
  music: { low: 0.02, high: 0.07 },
  fashion: { low: 0.03, high: 0.12 },
  food: { low: 0.025, high: 0.10 },
  education: { low: 0.03, high: 0.10 },
  sports: { low: 0.02, high: 0.08 },
  tech: { low: 0.025, high: 0.09 },
  general: { low: 0.02, high: 0.06 },
};

// Instagram sponsorship rates per 1000 followers
const INSTAGRAM_RATES: { [key: string]: { low: number; high: number } } = {
  fashion: { low: 10, high: 25 },
  beauty: { low: 10, high: 25 },
  fitness: { low: 8, high: 20 },
  travel: { low: 8, high: 20 },
  food: { low: 6, high: 15 },
  tech: { low: 8, high: 18 },
  entertainment: { low: 5, high: 15 },
  general: { low: 5, high: 12 },
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
      case 'tiktok':
        stats = await analyzeTikTok(body);
        break;
      case 'instagram':
        stats = await analyzeInstagram(body);
        break;
      case 'twitter':
        stats = await analyzeTwitter(body);
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
  
  // Extract page name/ID from URL
  let pageName = input.replace(/^@/, '').replace(/https?:\/\/(www\.)?facebook\.com\//, '').split('/')[0].split('?')[0];
  
  // For Facebook, we'll try to scrape public page data using their open graph
  let pageData: any = {
    name: pageName,
    followers: parseInt(followers) || 10000,
    likes: 0,
    verified: false,
    category: 'General',
    about: '',
    website: '',
    pageImage: null,
    coverImage: null,
  };
  
  try {
    // Try to get page picture using graph API (public, no token needed)
    pageData.pageImage = `https://graph.facebook.com/${pageName}/picture?type=large`;
    
    // Try to fetch Open Graph data from the page
    const ogUrl = `https://www.facebook.com/${pageName}`;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(ogUrl)}`;
    
    try {
      const resp = await fetch(proxyUrl, { 
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' }
      });
      
      if (resp.ok) {
        const html = await resp.text();
        
        // Extract page name from title
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch) {
          const title = titleMatch[1].replace(/ \| Facebook$/i, '').replace(/ - Home$/i, '');
          pageData.name = title || pageName;
        }
        
        // Try to find follower count in page content
        const followersMatch = html.match(/(\d[\d,\.]+[KMB]?)\s*(?:followers|people follow)/i);
        if (followersMatch && !followers) {
          const count = followersMatch[1].replace(/,/g, '');
          let multiplier = 1;
          if (count.includes('K')) multiplier = 1000;
          else if (count.includes('M')) multiplier = 1000000;
          else if (count.includes('B')) multiplier = 1000000000;
          pageData.followers = Math.round(parseFloat(count.replace(/[KMB]/g, '')) * multiplier);
        }
        
        // Try to find likes count
        const likesMatch = html.match(/(\d[\d,\.]+[KMB]?)\s*(?:likes|people like)/i);
        if (likesMatch) {
          const count = likesMatch[1].replace(/,/g, '');
          let multiplier = 1;
          if (count.includes('K')) multiplier = 1000;
          else if (count.includes('M')) multiplier = 1000000;
          pageData.likes = Math.round(parseFloat(count.replace(/[KMB]/g, '')) * multiplier);
        }
        
        // Check for verified badge
        pageData.verified = html.includes('verified') || html.includes('Verified');
        
        // Extract description/about
        const descMatch = html.match(/content="([^"]+)"\s+property="og:description"/i) || 
                          html.match(/property="og:description"\s+content="([^"]+)"/i);
        if (descMatch) {
          pageData.about = descMatch[1].substring(0, 200);
        }
        
        // Extract cover image
        const coverMatch = html.match(/content="([^"]+)"\s+property="og:image"/i) ||
                          html.match(/property="og:image"\s+content="([^"]+)"/i);
        if (coverMatch) {
          pageData.coverImage = coverMatch[1];
        }
      }
    } catch (scrapeError) {
      console.log('Could not scrape Facebook page, using estimates:', scrapeError);
    }
  } catch (e) {
    console.error('Error fetching Facebook page data:', e);
  }
  
  const followerCount = pageData.followers || parseInt(followers) || 10000;
  
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
    pageName: pageData.name,
    pageImage: pageData.pageImage,
    coverImage: pageData.coverImage,
    followers: followerCount,
    likes: pageData.likes || followerCount,
    estimatedReach,
    engagementRate,
    verified: pageData.verified,
    about: pageData.about,
    category: 'General',
    estimatedMonthlyEarnings: { low: monthlyLow, high: monthlyHigh },
    estimatedPerPost: { low: perPostLow, high: perPostHigh },
    grade,
  };
}

async function analyzeTikTok(body: any) {
  const { input, followers: providedFollowers, niche } = body;
  
  // Extract username from URL or use directly
  let username = input.trim()
    .replace(/^@/, '')
    .replace(/https?:\/\/(www\.)?(tiktok\.com|vm\.tiktok\.com)\//, '')
    .replace(/^@/, '')
    .split('/')[0]
    .split('?')[0];
  
  if (username.startsWith('@')) {
    username = username.substring(1);
  }
  
  let profileData: any = {
    username: username,
    nickname: username,
    followers: parseInt(providedFollowers) || 10000,
    following: 0,
    likes: 0,
    videos: 0,
    verified: false,
    bio: '',
    profileImage: null,
    region: 'Unknown',
  };
  
  try {
    // Try to fetch TikTok profile data using a proxy/scraper approach
    const profileUrl = `https://www.tiktok.com/@${username}`;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(profileUrl)}`;
    
    try {
      const resp = await fetch(proxyUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      
      if (resp.ok) {
        const html = await resp.text();
        
        // Try to parse JSON data from TikTok page
        const scriptMatch = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([^<]+)<\/script>/);
        if (scriptMatch) {
          try {
            const jsonData = JSON.parse(scriptMatch[1]);
            const userInfo = jsonData?.['__DEFAULT_SCOPE__']?.['webapp.user-detail']?.userInfo;
            
            if (userInfo) {
              const user = userInfo.user || {};
              const stats = userInfo.stats || {};
              
              profileData = {
                username: user.uniqueId || username,
                nickname: user.nickname || username,
                followers: stats.followerCount || parseInt(providedFollowers) || 10000,
                following: stats.followingCount || 0,
                likes: stats.heartCount || stats.heart || 0,
                videos: stats.videoCount || 0,
                verified: user.verified || false,
                bio: user.signature || '',
                profileImage: user.avatarLarger || user.avatarMedium || user.avatarThumb || null,
                region: user.region || 'Unknown',
              };
            }
          } catch (parseErr) {
            console.log('Could not parse TikTok JSON data:', parseErr);
          }
        }
        
        // Fallback: Try to extract from meta tags
        if (!profileData.profileImage) {
          const imageMatch = html.match(/content="([^"]+)"\s+property="og:image"/i) ||
                            html.match(/property="og:image"\s+content="([^"]+)"/i);
          if (imageMatch) {
            profileData.profileImage = imageMatch[1];
          }
        }
        
        // Extract title for nickname
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch && !profileData.nickname) {
          profileData.nickname = titleMatch[1].replace(/ \| TikTok$/i, '').split('(')[0].trim();
        }
      }
    } catch (scrapeError) {
      console.log('Could not scrape TikTok profile, using estimates:', scrapeError);
    }
  } catch (e) {
    console.error('Error fetching TikTok profile:', e);
  }
  
  const followerCount = profileData.followers;
  const videoCount = profileData.videos || 50;
  const totalLikes = profileData.likes || followerCount * 5;
  
  // Calculate engagement rate (likes per video / followers)
  const avgLikesPerVideo = videoCount > 0 ? totalLikes / videoCount : totalLikes;
  const engagementRate = followerCount > 0 ? Math.min(((avgLikesPerVideo / followerCount) * 100), 30) : 5;
  
  // Estimate views (TikTok views are typically 10-30x likes)
  const estimatedMonthlyViews = avgLikesPerVideo * 15 * 4; // Assuming 4 videos per week
  
  // Get CPM for niche
  const nicheLower = (niche || 'general').toLowerCase();
  const cpm = TIKTOK_CPM[nicheLower] || TIKTOK_CPM.general;
  
  // TikTok Creator Fund earnings (lower than YouTube)
  const creatorFundLow = Math.round((estimatedMonthlyViews / 1000) * cpm.low);
  const creatorFundHigh = Math.round((estimatedMonthlyViews / 1000) * cpm.high);
  
  // Sponsorship rates (typically $0.01-0.02 per follower per post)
  const sponsorshipRate = followerCount > 1000000 ? 0.015 : followerCount > 100000 ? 0.02 : 0.025;
  const perPostLow = Math.round(followerCount * sponsorshipRate * 0.5);
  const perPostHigh = Math.round(followerCount * sponsorshipRate * 1.5);
  
  // Total monthly earnings (Creator Fund + 2-4 sponsored posts)
  const monthlyLow = creatorFundLow + (perPostLow * 2);
  const monthlyHigh = creatorFundHigh + (perPostHigh * 4);
  
  const grade = getGrade(followerCount);

  return {
    username: profileData.username,
    nickname: profileData.nickname,
    profileImage: profileData.profileImage,
    followers: followerCount,
    following: profileData.following,
    likes: totalLikes,
    videos: videoCount,
    verified: profileData.verified,
    bio: profileData.bio,
    region: profileData.region,
    engagementRate: Math.round(engagementRate * 100) / 100,
    estimatedMonthlyViews,
    estimatedCreatorFund: { low: creatorFundLow, high: creatorFundHigh },
    estimatedPerPost: { low: perPostLow, high: perPostHigh },
    estimatedMonthlyEarnings: { low: monthlyLow, high: monthlyHigh },
    cpm,
    grade,
    niche: niche || 'Entertainment',
  };
}

async function analyzeInstagram(body: any) {
  const { input, followers: providedFollowers, niche } = body;
  
  // Extract username from URL or use directly
  let username = input.trim()
    .replace(/^@/, '')
    .replace(/https?:\/\/(www\.)?instagram\.com\//, '')
    .split('/')[0]
    .split('?')[0];
  
  let profileData: any = {
    username: username,
    fullName: username,
    followers: parseInt(providedFollowers) || 10000,
    following: 0,
    posts: 0,
    verified: false,
    bio: '',
    profileImage: null,
    isPrivate: false,
    category: 'Creator',
  };
  
  try {
    // Try to fetch Instagram profile data
    const profileUrl = `https://www.instagram.com/${username}/`;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(profileUrl)}`;
    
    try {
      const resp = await fetch(proxyUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      
      if (resp.ok) {
        const html = await resp.text();
        
        // Try to extract from meta tags
        const imageMatch = html.match(/content="([^"]+)"\s+property="og:image"/i) ||
                          html.match(/property="og:image"\s+content="([^"]+)"/i);
        if (imageMatch) {
          profileData.profileImage = imageMatch[1];
        }
        
        // Extract title for name
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch) {
          const title = titleMatch[1];
          const nameMatch = title.match(/^([^(]+)/);
          if (nameMatch) {
            profileData.fullName = nameMatch[1].trim();
          }
        }
        
        // Extract description for bio
        const descMatch = html.match(/content="([^"]+)"\s+property="og:description"/i) ||
                         html.match(/property="og:description"\s+content="([^"]+)"/i);
        if (descMatch) {
          const desc = descMatch[1];
          // Try to parse followers from description
          const followersMatch = desc.match(/([\d,\.]+[KMB]?)\s*Followers/i);
          if (followersMatch && !providedFollowers) {
            const count = followersMatch[1].replace(/,/g, '');
            let multiplier = 1;
            if (count.includes('K')) multiplier = 1000;
            else if (count.includes('M')) multiplier = 1000000;
            else if (count.includes('B')) multiplier = 1000000000;
            profileData.followers = Math.round(parseFloat(count.replace(/[KMB]/g, '')) * multiplier);
          }
          
          const followingMatch = desc.match(/([\d,\.]+[KMB]?)\s*Following/i);
          if (followingMatch) {
            const count = followingMatch[1].replace(/,/g, '');
            let multiplier = 1;
            if (count.includes('K')) multiplier = 1000;
            else if (count.includes('M')) multiplier = 1000000;
            profileData.following = Math.round(parseFloat(count.replace(/[KMB]/g, '')) * multiplier);
          }
          
          const postsMatch = desc.match(/([\d,\.]+[KMB]?)\s*Posts/i);
          if (postsMatch) {
            const count = postsMatch[1].replace(/,/g, '');
            let multiplier = 1;
            if (count.includes('K')) multiplier = 1000;
            else if (count.includes('M')) multiplier = 1000000;
            profileData.posts = Math.round(parseFloat(count.replace(/[KMB]/g, '')) * multiplier);
          }
          
          // Extract bio part
          const bioParts = desc.split(' - ');
          if (bioParts.length > 1) {
            profileData.bio = bioParts.slice(1).join(' - ').substring(0, 150);
          }
        }
        
        // Check for verified
        profileData.verified = html.includes('is_verified":true') || html.includes('"verified":true');
      }
    } catch (scrapeError) {
      console.log('Could not scrape Instagram profile, using estimates:', scrapeError);
    }
  } catch (e) {
    console.error('Error fetching Instagram profile:', e);
  }
  
  const followerCount = profileData.followers;
  const postCount = profileData.posts || 100;
  
  // Estimate engagement rate (typically 1-5% for Instagram)
  const engagementRate = followerCount > 1000000 ? 1.5 : followerCount > 100000 ? 3 : followerCount > 10000 ? 4 : 6;
  
  // Get rates for niche
  const nicheLower = (niche || 'general').toLowerCase();
  const rates = INSTAGRAM_RATES[nicheLower] || INSTAGRAM_RATES.general;
  
  // Sponsorship rates per post
  const perPostLow = Math.round((followerCount / 1000) * rates.low);
  const perPostHigh = Math.round((followerCount / 1000) * rates.high);
  
  // Story rates (typically 50-70% of post rate)
  const perStoryLow = Math.round(perPostLow * 0.5);
  const perStoryHigh = Math.round(perPostHigh * 0.7);
  
  // Reel rates (typically 1.5-2x post rate)
  const perReelLow = Math.round(perPostLow * 1.5);
  const perReelHigh = Math.round(perPostHigh * 2);
  
  // Monthly earnings (assuming 2-4 posts, 4-8 stories, 1-2 reels)
  const monthlyLow = (perPostLow * 2) + (perStoryLow * 4) + (perReelLow * 1);
  const monthlyHigh = (perPostHigh * 4) + (perStoryHigh * 8) + (perReelHigh * 2);
  
  const grade = getGrade(followerCount);

  return {
    username: profileData.username,
    fullName: profileData.fullName,
    profileImage: profileData.profileImage,
    followers: followerCount,
    following: profileData.following,
    posts: postCount,
    verified: profileData.verified,
    bio: profileData.bio,
    isPrivate: profileData.isPrivate,
    category: profileData.category,
    engagementRate,
    estimatedPerPost: { low: perPostLow, high: perPostHigh },
    estimatedPerStory: { low: perStoryLow, high: perStoryHigh },
    estimatedPerReel: { low: perReelLow, high: perReelHigh },
    estimatedMonthlyEarnings: { low: monthlyLow, high: monthlyHigh },
    grade,
    niche: niche || 'General',
  };
}

async function analyzeTwitter(body: any) {
  const { input, followers: providedFollowers, niche } = body;
  
  // Extract username from URL or use directly
  let username = input.trim()
    .replace(/^@/, '')
    .replace(/https?:\/\/(www\.)?(twitter\.com|x\.com)\//, '')
    .split('/')[0]
    .split('?')[0];
  
  let profileData: any = {
    username: username,
    displayName: username,
    followers: parseInt(providedFollowers) || 10000,
    following: 0,
    tweets: 0,
    verified: false,
    bio: '',
    profileImage: null,
    bannerImage: null,
    joinedDate: null,
  };
  
  try {
    // Try to fetch Twitter/X profile data
    const profileUrl = `https://twitter.com/${username}`;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(profileUrl)}`;
    
    try {
      const resp = await fetch(proxyUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      
      if (resp.ok) {
        const html = await resp.text();
        
        // Extract from meta tags
        const imageMatch = html.match(/content="([^"]+)"\s+property="og:image"/i) ||
                          html.match(/property="og:image"\s+content="([^"]+)"/i);
        if (imageMatch) {
          profileData.profileImage = imageMatch[1];
        }
        
        // Extract title for name
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch) {
          const title = titleMatch[1];
          const nameMatch = title.match(/^([^(]+)\s*\(@/);
          if (nameMatch) {
            profileData.displayName = nameMatch[1].trim();
          }
        }
        
        // Extract description
        const descMatch = html.match(/content="([^"]+)"\s+property="og:description"/i) ||
                         html.match(/property="og:description"\s+content="([^"]+)"/i);
        if (descMatch) {
          profileData.bio = descMatch[1].substring(0, 160);
        }
        
        // Check for verified
        profileData.verified = html.includes('is_blue_verified') || html.includes('"verified":true');
      }
    } catch (scrapeError) {
      console.log('Could not scrape Twitter profile, using estimates:', scrapeError);
    }
  } catch (e) {
    console.error('Error fetching Twitter profile:', e);
  }
  
  const followerCount = profileData.followers;
  
  // Estimate engagement rate (typically 0.5-3% for Twitter)
  const engagementRate = followerCount > 1000000 ? 0.5 : followerCount > 100000 ? 1 : followerCount > 10000 ? 2 : 3;
  
  // Twitter sponsorship rates (typically $2-$5 per 1000 followers per tweet)
  const ratePerThousand = followerCount > 1000000 ? 3 : followerCount > 100000 ? 4 : 5;
  const perTweetLow = Math.round((followerCount / 1000) * ratePerThousand * 0.7);
  const perTweetHigh = Math.round((followerCount / 1000) * ratePerThousand * 1.5);
  
  // Thread rates (typically 1.5-2x single tweet)
  const perThreadLow = Math.round(perTweetLow * 1.5);
  const perThreadHigh = Math.round(perTweetHigh * 2);
  
  // Monthly earnings (assuming 4-8 sponsored tweets, 1-2 threads)
  const monthlyLow = (perTweetLow * 4) + (perThreadLow * 1);
  const monthlyHigh = (perTweetHigh * 8) + (perThreadHigh * 2);
  
  // X Premium revenue share estimate
  const impressionsPerTweet = followerCount * 0.1;
  const monthlyImpressions = impressionsPerTweet * 30; // Assuming daily tweets
  const premiumRevLow = Math.round(monthlyImpressions * 0.000005); // ~$5 per million impressions
  const premiumRevHigh = Math.round(monthlyImpressions * 0.00002); // ~$20 per million impressions
  
  const grade = getGrade(followerCount);

  return {
    username: profileData.username,
    displayName: profileData.displayName,
    profileImage: profileData.profileImage,
    bannerImage: profileData.bannerImage,
    followers: followerCount,
    following: profileData.following,
    tweets: profileData.tweets,
    verified: profileData.verified,
    bio: profileData.bio,
    joinedDate: profileData.joinedDate,
    engagementRate,
    estimatedPerTweet: { low: perTweetLow, high: perTweetHigh },
    estimatedPerThread: { low: perThreadLow, high: perThreadHigh },
    estimatedPremiumRevenue: { low: premiumRevLow, high: premiumRevHigh },
    estimatedMonthlyEarnings: { low: monthlyLow + premiumRevLow, high: monthlyHigh + premiumRevHigh },
    grade,
    niche: niche || 'General',
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
