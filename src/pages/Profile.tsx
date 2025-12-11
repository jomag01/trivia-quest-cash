import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  UserPlus, UserCheck, ArrowLeft, Camera, Settings, Share2, 
  Grid3X3, Heart, Video, ShoppingBag, Radio, MoreHorizontal,
  Link as LinkIcon, MapPin, Calendar, Verified, TrendingUp, Eye, Diamond,
  Trash2, Play, FileText
} from "lucide-react";
import { PostCard } from "@/components/social/PostCard";
import { supabase } from "@/integrations/supabase/client";
import { uploadToStorage } from "@/lib/storage";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { EditProfileDialog } from "@/components/profile/EditProfileDialog";
import { DeleteContentDialog } from "@/components/profile/DeleteContentDialog";

const Profile = () => {
  const { userId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [stats, setStats] = useState({
    followers: 0,
    following: 0,
    posts: 0,
    likes: 0,
  });
  const [posts, setPosts] = useState<any[]>([]);
  const [videoPosts, setVideoPosts] = useState<any[]>([]);
  const [likedPosts, setLikedPosts] = useState<any[]>([]);
  const [liveStreams, setLiveStreams] = useState<any[]>([]);
  const [userProducts, setUserProducts] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("feed");
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "post" | "product"; id: string; title?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (userId) {
      fetchProfile();
      fetchStats();
      fetchAllContent();
      if (user && user.id !== userId) {
        checkFollowStatus();
      }
    }
  }, [userId, user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error: any) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const [followersRes, followingRes, postsRes, likesRes] = await Promise.all([
        supabase.from("user_follows").select("id", { count: "exact" }).eq("following_id", userId),
        supabase.from("user_follows").select("id", { count: "exact" }).eq("follower_id", userId),
        supabase.from("posts").select("id", { count: "exact" }).eq("user_id", userId),
        supabase.from("post_likes").select("id", { count: "exact" }).eq("user_id", userId),
      ]);

      setStats({
        followers: followersRes.count || 0,
        following: followingRes.count || 0,
        posts: postsRes.count || 0,
        likes: likesRes.count || 0,
      });
    } catch (error: any) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchAllContent = async () => {
    // Fetch all posts
    const { data: allPosts } = await supabase
      .from("posts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    setPosts(allPosts || []);
    setVideoPosts((allPosts || []).filter(p => p.media_type === 'video'));

    // Fetch liked posts
    const { data: likes } = await supabase
      .from("post_likes")
      .select("post_id, posts(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    setLikedPosts(likes?.map(l => l.posts).filter(Boolean) || []);

    // Fetch live streams (ended ones as replays)
    const { data: streams } = await supabase
      .from("live_streams")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "ended")
      .order("ended_at", { ascending: false })
      .limit(20);

    setLiveStreams(streams || []);

    // Fetch user's products
    const { data: products } = await supabase
      .from("products")
      .select("*")
      .eq("seller_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    setUserProducts(products || []);
  };

  const checkFollowStatus = async () => {
    if (!user || !userId) return;

    const { data } = await supabase
      .from("user_follows")
      .select("id")
      .eq("follower_id", user.id)
      .eq("following_id", userId)
      .single();

    setIsFollowing(!!data);
  };

  const handleFollow = async () => {
    if (!user) {
      toast.error("Please login to follow users");
      return;
    }

    setFollowLoading(true);
    try {
      if (isFollowing) {
        const { error } = await supabase
          .from("user_follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", userId);

        if (error) throw error;
        setIsFollowing(false);
        toast.success("Unfollowed user");
      } else {
        const { error } = await supabase
          .from("user_follows")
          .insert({
            follower_id: user.id,
            following_id: userId,
          });

        if (error) throw error;
        setIsFollowing(true);
        toast.success("Following user");
      }
      fetchStats();
    } catch (error: any) {
      console.error("Error toggling follow:", error);
      toast.error("Failed to update follow status");
    } finally {
      setFollowLoading(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (user.id !== userId) {
      toast.error("You can only update your own profile");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${type}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { data: uploadData, error: uploadError } = await uploadToStorage('profile-pictures', filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const publicUrl = uploadData?.publicUrl || "";

      const updateField = type === 'avatar' ? 'avatar_url' : 'cover_url';
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ [updateField]: publicUrl } as any)
        .eq("id", user.id);

      if (updateError) throw updateError;

      toast.success(`${type === 'avatar' ? 'Profile picture' : 'Cover photo'} updated!`);
      fetchProfile();
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteContent = (type: "post" | "product", id: string, title?: string) => {
    setDeleteTarget({ type, id, title });
    setDeleteDialogOpen(true);
  };

  const onContentDeleted = () => {
    fetchAllContent();
    fetchStats();
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Skeleton className="h-48 w-full" />
        <div className="px-4 -mt-16">
          <Skeleton className="h-32 w-32 rounded-full border-4 border-background" />
          <div className="mt-4 space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">User not found</p>
          <Button onClick={() => navigate(-1)} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const isOwnProfile = user?.id === userId;

  const renderPostGrid = (postList: any[], showDelete: boolean = false) => (
    <div className="grid grid-cols-3 gap-0.5">
      {postList.map((post) => (
        <div
          key={post.id}
          className="aspect-square bg-muted relative group cursor-pointer overflow-hidden"
        >
          {post.media_url ? (
            <>
              {post.media_type === 'video' ? (
                <>
                  <video
                    src={post.media_url}
                    className="w-full h-full object-cover"
                    muted
                  />
                  <div className="absolute top-2 right-2">
                    <Play className="w-4 h-4 text-white drop-shadow fill-white" />
                  </div>
                </>
              ) : (
                <img
                  src={post.thumbnail_url || post.media_url}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center p-2 bg-card">
              <p className="text-xs line-clamp-4 text-center">{post.content}</p>
            </div>
          )}
          
          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
            <div className="flex items-center gap-1 text-white">
              <Heart className="w-5 h-5 fill-white" />
              <span className="font-semibold">{formatNumber(post.likes_count || 0)}</span>
            </div>
            <div className="flex items-center gap-1 text-white">
              <Eye className="w-5 h-5" />
              <span className="font-semibold">{formatNumber(post.views_count || 0)}</span>
            </div>
            {showDelete && isOwnProfile && (
              <Button
                size="icon"
                variant="destructive"
                className="h-8 w-8 rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteContent("post", post.id, post.content?.substring(0, 30));
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Cover Photo */}
      <div className="relative h-48 md:h-64 bg-gradient-to-br from-primary/30 via-accent/20 to-secondary/30 overflow-hidden">
        {profile.cover_url && (
          <img src={profile.cover_url} alt="Cover" className="w-full h-full object-cover" />
        )}
        
        {/* Back Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        {/* Actions */}
        <div className="absolute top-4 right-4 flex gap-2">
          {isOwnProfile && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => coverInputRef.current?.click()}
                className="bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 rounded-full"
                disabled={uploading}
              >
                <Camera className="w-5 h-5" />
              </Button>
              <Input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImageUpload(e, 'cover')}
              />
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 rounded-full"
          >
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Profile Info */}
      <div className="px-4 -mt-16 relative z-10">
        {/* Avatar */}
        <div className="relative inline-block">
          <Avatar className="w-32 h-32 border-4 border-background shadow-xl">
            {profile.avatar_url && <AvatarImage src={profile.avatar_url} />}
            <AvatarFallback className="text-4xl bg-gradient-to-br from-primary to-accent text-white">
              {profile.full_name?.charAt(0) || profile.email?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
          {isOwnProfile && (
            <>
              <Button
                size="icon"
                className="absolute bottom-0 right-0 rounded-full h-9 w-9 bg-primary shadow-lg"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Camera className="w-4 h-4" />
              </Button>
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImageUpload(e, 'avatar')}
              />
            </>
          )}
          {profile.is_verified && (
            <div className="absolute -right-1 top-2 bg-primary rounded-full p-1">
              <Verified className="w-4 h-4 text-white" />
            </div>
          )}
        </div>

        {/* Name & Handle */}
        <div className="mt-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{profile.full_name || "Anonymous User"}</h1>
            {profile.is_verified && <Verified className="w-5 h-5 text-primary" />}
          </div>
          <p className="text-muted-foreground">@{profile.username || profile.email?.split('@')[0]}</p>
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="mt-3 text-foreground/80">{profile.bio}</p>
        )}

        {/* Meta Info */}
        <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
          {profile.location && (
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {profile.location}
            </div>
          )}
          {profile.website && (
            <a href={profile.website} className="flex items-center gap-1 text-primary hover:underline">
              <LinkIcon className="w-4 h-4" />
              {profile.website.replace(/https?:\/\//, '')}
            </a>
          )}
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            Joined {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex gap-6 mt-4">
          <button className="text-center hover:opacity-70 transition-opacity">
            <span className="font-bold">{formatNumber(stats.following)}</span>
            <span className="text-muted-foreground ml-1">Following</span>
          </button>
          <button className="text-center hover:opacity-70 transition-opacity">
            <span className="font-bold">{formatNumber(stats.followers)}</span>
            <span className="text-muted-foreground ml-1">Followers</span>
          </button>
          <button className="text-center hover:opacity-70 transition-opacity">
            <span className="font-bold">{formatNumber(stats.likes)}</span>
            <span className="text-muted-foreground ml-1">Likes</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-4">
          {isOwnProfile ? (
            <>
              <Button 
                variant="outline" 
                className="flex-1 rounded-full"
                onClick={() => setEditProfileOpen(true)}
              >
                <Settings className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                className="rounded-full"
                onClick={async () => {
                  const shareUrl = `${window.location.origin}/profile/${userId}?ref=${profile.referral_code || userId}`;
                  if (navigator.share) {
                    try {
                      await navigator.share({
                        title: `${profile.full_name || 'User'}'s Profile`,
                        text: `Check out ${profile.full_name || 'this user'}'s profile!`,
                        url: shareUrl,
                      });
                    } catch (e) {
                      // User cancelled
                    }
                  } else {
                    await navigator.clipboard.writeText(shareUrl);
                    toast.success("Profile link copied to clipboard!");
                  }
                }}
              >
                <Share2 className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant={isFollowing ? "outline" : "default"}
                className="flex-1 rounded-full"
                onClick={handleFollow}
                disabled={followLoading}
              >
                {isFollowing ? (
                  <>
                    <UserCheck className="w-4 h-4 mr-2" />
                    Following
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Follow
                  </>
                )}
              </Button>
              <Button variant="outline" className="rounded-full">
                Message
              </Button>
              <Button variant="outline" size="icon" className="rounded-full">
                <Share2 className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>

        {/* Creator Stats (if applicable) */}
        {profile.is_creator && (
          <div className="mt-6 grid grid-cols-3 gap-4 p-4 bg-card rounded-2xl border">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-primary">
                <Eye className="w-4 h-4" />
                <span className="font-bold">{formatNumber(profile.total_views || 0)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Views</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-pink-500">
                <TrendingUp className="w-4 h-4" />
                <span className="font-bold">{formatNumber(profile.engagement_rate || 0)}%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Engagement</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-amber-500">
                <Diamond className="w-4 h-4" />
                <span className="font-bold">{formatNumber(profile.diamonds || 0)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Diamonds</p>
            </div>
          </div>
        )}
      </div>

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList className="w-full justify-around bg-transparent border-b rounded-none h-12">
          <TabsTrigger 
            value="feed" 
            className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent"
          >
            <FileText className="w-5 h-5" />
          </TabsTrigger>
          <TabsTrigger 
            value="posts" 
            className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent"
          >
            <Grid3X3 className="w-5 h-5" />
          </TabsTrigger>
          <TabsTrigger 
            value="videos" 
            className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent"
          >
            <Video className="w-5 h-5" />
          </TabsTrigger>
          <TabsTrigger 
            value="liked" 
            className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent"
          >
            <Heart className="w-5 h-5" />
          </TabsTrigger>
          <TabsTrigger 
            value="live" 
            className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent"
          >
            <Radio className="w-5 h-5" />
          </TabsTrigger>
          <TabsTrigger 
            value="shop" 
            className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent"
          >
            <ShoppingBag className="w-5 h-5" />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="mt-0">
          {posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <FileText className="w-16 h-16 mb-4 opacity-20" />
              <p className="font-medium">No posts yet</p>
              {isOwnProfile && <p className="text-sm">Share your first post!</p>}
            </div>
          ) : (
            <div className="space-y-4 p-4">
              {posts.map((post) => (
                <PostCard 
                  key={post.id} 
                  post={{
                    id: post.id,
                    content: post.content || '',
                    media_url: post.media_url,
                    media_type: post.media_type,
                    created_at: post.created_at,
                    likes_count: post.likes_count || 0,
                    comments_count: post.comments_count || 0,
                    views_count: post.views_count || 0,
                    shares_count: post.shares_count || 0,
                    user_id: post.user_id,
                    profiles: post.profiles
                  }}
                  onDelete={isOwnProfile ? () => {
                    setDeleteTarget({ type: 'post', id: post.id, title: post.content?.substring(0, 50) || 'Post' });
                    setDeleteDialogOpen(true);
                  } : undefined}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="posts" className="mt-0">
          {posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Grid3X3 className="w-16 h-16 mb-4 opacity-20" />
              <p className="font-medium">No posts yet</p>
              {isOwnProfile && <p className="text-sm">Share your first post!</p>}
            </div>
          ) : (
            renderPostGrid(posts, true)
          )}
        </TabsContent>

        <TabsContent value="videos" className="mt-0">
          {videoPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Video className="w-16 h-16 mb-4 opacity-20" />
              <p className="font-medium">No videos yet</p>
              {isOwnProfile && <p className="text-sm">Upload your first video!</p>}
            </div>
          ) : (
            renderPostGrid(videoPosts, true)
          )}
        </TabsContent>

        <TabsContent value="liked" className="mt-0">
          {!isOwnProfile ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Heart className="w-16 h-16 mb-4 opacity-20" />
              <p className="font-medium">Liked content is private</p>
            </div>
          ) : likedPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Heart className="w-16 h-16 mb-4 opacity-20" />
              <p className="font-medium">No liked posts yet</p>
              <p className="text-sm">Posts you like will appear here</p>
            </div>
          ) : (
            renderPostGrid(likedPosts, false)
          )}
        </TabsContent>

        <TabsContent value="live" className="mt-0">
          {liveStreams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Radio className="w-16 h-16 mb-4 opacity-20" />
              <p className="font-medium">No live replays</p>
              {isOwnProfile && <p className="text-sm">Your past live streams will appear here</p>}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 p-2">
              {liveStreams.map((stream) => (
                <div key={stream.id} className="aspect-video bg-muted rounded-lg overflow-hidden relative group cursor-pointer">
                  {stream.thumbnail_url ? (
                    <img src={stream.thumbnail_url} alt={stream.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                      <Radio className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-2">
                    <p className="text-white text-sm font-medium line-clamp-1">{stream.title}</p>
                    <p className="text-white/70 text-xs">{formatNumber(stream.total_views || 0)} views</p>
                  </div>
                  <div className="absolute top-2 right-2 bg-black/60 px-2 py-0.5 rounded text-xs text-white">
                    Replay
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="shop" className="mt-0">
          {userProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <ShoppingBag className="w-16 h-16 mb-4 opacity-20" />
              <p className="font-medium">No shop items</p>
              {isOwnProfile && <p className="text-sm">List your first product!</p>}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 p-2">
              {userProducts.map((product) => (
                <div key={product.id} className="bg-card rounded-lg overflow-hidden border relative group">
                  <div className="aspect-square bg-muted">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="font-medium text-sm line-clamp-1">{product.name}</p>
                    <p className="text-primary font-bold">₱{product.final_price || product.base_price}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        product.approval_status === 'approved' 
                          ? 'bg-green-500/20 text-green-600' 
                          : product.approval_status === 'rejected'
                          ? 'bg-red-500/20 text-red-600'
                          : 'bg-yellow-500/20 text-yellow-600'
                      }`}>
                        {product.approval_status || 'pending'}
                      </span>
                    </div>
                  </div>
                  {isOwnProfile && (
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-2 right-2 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDeleteContent("product", product.id, product.name)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Profile Dialog */}
      {profile && (
        <EditProfileDialog
          open={editProfileOpen}
          onOpenChange={setEditProfileOpen}
          profile={profile}
          onProfileUpdated={fetchProfile}
        />
      )}

      {/* Delete Content Dialog */}
      {deleteTarget && (
        <DeleteContentDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          contentType={deleteTarget.type}
          contentId={deleteTarget.id}
          contentTitle={deleteTarget.title}
          onDeleted={onContentDeleted}
        />
      )}
    </div>
  );
};

export default Profile;
