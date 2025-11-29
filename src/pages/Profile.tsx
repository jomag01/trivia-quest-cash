import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserPlus, UserCheck, ArrowLeft, Users, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

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
  });

  useEffect(() => {
    if (userId) {
      fetchProfile();
      fetchStats();
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
      const [followersRes, followingRes, postsRes] = await Promise.all([
        supabase.from("user_follows").select("id", { count: "exact" }).eq("following_id", userId),
        supabase.from("user_follows").select("id", { count: "exact" }).eq("follower_id", userId),
        supabase.from("posts").select("id", { count: "exact" }).eq("user_id", userId),
      ]);

      setStats({
        followers: followersRes.count || 0,
        following: followingRes.count || 0,
        posts: postsRes.count || 0,
      });
    } catch (error: any) {
      console.error("Error fetching stats:", error);
    }
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

  if (loading) {
    return (
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-64 w-full mb-8" />
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
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

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {/* Profile Header */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex flex-col md:flex-row items-center gap-6">
              <Avatar className="w-32 h-32">
                <AvatarFallback className="text-4xl">
                  {profile.full_name?.charAt(0) || profile.email?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl font-bold mb-2">
                  {profile.full_name || "Anonymous User"}
                </h1>
                <p className="text-muted-foreground mb-4">{profile.email}</p>

                <div className="flex gap-6 justify-center md:justify-start mb-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{stats.posts}</p>
                    <p className="text-sm text-muted-foreground">Posts</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{stats.followers}</p>
                    <p className="text-sm text-muted-foreground">Followers</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{stats.following}</p>
                    <p className="text-sm text-muted-foreground">Following</p>
                  </div>
                </div>

                {user && user.id !== userId && (
                  <Button
                    variant={isFollowing ? "outline" : "default"}
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
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Credits</p>
                <p className="text-2xl font-bold">{profile.credits || 0}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Referral Code</p>
                <p className="text-2xl font-bold">{profile.referral_code}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;
