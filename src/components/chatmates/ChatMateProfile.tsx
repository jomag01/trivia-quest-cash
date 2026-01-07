import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  User, Heart, Plus, X, Save, Eye, EyeOff,
  MessageSquare, Briefcase, Gamepad2, GraduationCap, Shield, Crown
} from "lucide-react";
import { motion } from "framer-motion";
import { BeesMateProfileGallery } from "./BeesMateProfileGallery";
import { BeesMatePremiumUpgrade } from "./BeesMatePremiumUpgrade";
import { BeesMateReferralDashboard } from "./BeesMateReferralDashboard";
import { BeesMateShopShowcase } from "./BeesMateShopShowcase";
import { ASPNUserDashboard } from "./ASPNUserDashboard";

const INTEREST_SUGGESTIONS = [
  "AI & Technology", "Business", "Gaming", "Music", "Art & Design",
  "Travel", "Fitness", "Reading", "Movies", "Cooking",
  "Photography", "Sports", "Nature", "Science", "Fashion",
  "Crypto & NFT", "Entrepreneurship", "Marketing", "Writing", "Podcasts"
];

const LOOKING_FOR_OPTIONS = [
  { id: "chat", label: "Casual Chat", icon: MessageSquare },
  { id: "business", label: "Business Networking", icon: Briefcase },
  { id: "games", label: "Game Partners", icon: Gamepad2 },
  { id: "learning", label: "Learning & Growth", icon: GraduationCap },
];

export function ChatMateProfile() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState("");
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [userSubscription, setUserSubscription] = useState<{ tier_key: string; tier_name: string } | null>(null);
  const [personalityProfile, setPersonalityProfile] = useState({
    communication_style: "friendly",
    conversation_depth: "casual",
    tone_preference: "friendly",
    looking_for: [] as string[],
    languages: ["English"],
    is_visible: true
  });
  const [bio, setBio] = useState(profile?.bio || "");

  useEffect(() => {
    if (user) {
      fetchProfileData();
      fetchSubscription();
    }
  }, [user]);

  const fetchSubscription = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('beesmate_subscriptions')
      .select('tier_id, beesmate_premium_tiers(tier_key, tier_name)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();
    if (data?.beesmate_premium_tiers) {
      const tier = data.beesmate_premium_tiers as any;
      setUserSubscription({ tier_key: tier.tier_key, tier_name: tier.tier_name });
    }
  };

  const fetchProfileData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch interests
      const { data: interestsData } = await supabase
        .from("user_interests")
        .select("interest_tag")
        .eq("user_id", user.id);
      
      setInterests(interestsData?.map(i => i.interest_tag) || []);

      // Fetch personality profile
      const { data: personalityData } = await supabase
        .from("user_personality_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (personalityData) {
        setPersonalityProfile({
          communication_style: personalityData.communication_style || "friendly",
          conversation_depth: personalityData.conversation_depth || "casual",
          tone_preference: personalityData.tone_preference || "friendly",
          looking_for: (personalityData.looking_for as string[]) || [],
          languages: (personalityData.languages as string[]) || ["English"],
          is_visible: personalityData.is_visible ?? true
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const addInterest = async (interest: string) => {
    if (!user || !interest.trim() || interests.includes(interest)) return;
    
    try {
      await supabase
        .from("user_interests")
        .insert({ user_id: user.id, interest_tag: interest.trim() });
      
      setInterests(prev => [...prev, interest.trim()]);
      setNewInterest("");
      toast.success("Interest added!");
    } catch (error) {
      console.error("Error adding interest:", error);
      toast.error("Failed to add interest");
    }
  };

  const removeInterest = async (interest: string) => {
    if (!user) return;
    
    try {
      await supabase
        .from("user_interests")
        .delete()
        .eq("user_id", user.id)
        .eq("interest_tag", interest);
      
      setInterests(prev => prev.filter(i => i !== interest));
      toast.success("Interest removed");
    } catch (error) {
      console.error("Error removing interest:", error);
      toast.error("Failed to remove interest");
    }
  };

  const toggleLookingFor = (id: string) => {
    setPersonalityProfile(prev => ({
      ...prev,
      looking_for: prev.looking_for.includes(id)
        ? prev.looking_for.filter(l => l !== id)
        : [...prev.looking_for, id]
    }));
  };

  const saveProfile = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      // Update bio in profiles
      await supabase
        .from("profiles")
        .update({ bio })
        .eq("id", user.id);

      // Upsert personality profile
      await supabase
        .from("user_personality_profiles")
        .upsert({
          user_id: user.id,
          ...personalityProfile,
          updated_at: new Date().toISOString()
        });

      toast.success("Profile saved!");
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8">
      {/* Profile Gallery */}
      <BeesMateProfileGallery 
        userSubscription={userSubscription}
        onUpgradeClick={() => setUpgradeDialogOpen(true)}
      />

      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="border-0 shadow-lg bg-gradient-to-br from-rose-50 to-purple-50 dark:from-rose-950/20 dark:to-purple-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Avatar className="w-20 h-20 border-4 border-white dark:border-muted shadow-lg">
                <AvatarImage src={profile?.avatar_url || ""} />
                <AvatarFallback className="bg-gradient-to-br from-rose-400 to-purple-500 text-white text-2xl">
                  {(profile?.full_name || "U")[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-2xl font-bold">{profile?.full_name || "Your Name"}</h2>
                <div className="flex items-center gap-2 mt-1">
                  {personalityProfile.is_visible ? (
                    <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30">
                      <Eye className="w-3 h-3 mr-1" />
                      Visible
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <EyeOff className="w-3 h-3 mr-1" />
                      Hidden
                    </Badge>
                  )}
                  <Badge variant="outline">
                    <Shield className="w-3 h-3 mr-1" />
                    Trust Score: {(profile as any)?.trust_score || 100}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Visibility Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Profile Visibility</Label>
                <p className="text-sm text-muted-foreground">
                  When visible, other users can discover and match with you
                </p>
              </div>
              <Switch
                checked={personalityProfile.is_visible}
                onCheckedChange={(checked) => 
                  setPersonalityProfile(prev => ({ ...prev, is_visible: checked }))
                }
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Bio */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              About You
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Tell others about yourself..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="min-h-[100px]"
              maxLength={300}
            />
            <p className="text-xs text-muted-foreground mt-2 text-right">
              {bio.length}/300
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Looking For */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5" />
              What are you looking for?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {LOOKING_FOR_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isSelected = personalityProfile.looking_for.includes(option.id);
                return (
                  <button
                    key={option.id}
                    onClick={() => toggleLookingFor(option.id)}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? "border-rose-500 bg-rose-50 dark:bg-rose-950/30"
                        : "border-muted hover:border-muted-foreground/30"
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isSelected ? "text-rose-500" : "text-muted-foreground"}`} />
                    <span className={`text-sm font-medium ${isSelected ? "text-rose-700 dark:text-rose-400" : ""}`}>
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Interests */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Your Interests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current Interests */}
            <div className="flex flex-wrap gap-2">
              {interests.map((interest) => (
                <Badge
                  key={interest}
                  variant="secondary"
                  className="pl-3 pr-1 py-1.5 text-sm"
                >
                  {interest}
                  <button
                    onClick={() => removeInterest(interest)}
                    className="ml-2 hover:bg-muted-foreground/20 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
              {interests.length === 0 && (
                <p className="text-sm text-muted-foreground">No interests added yet</p>
              )}
            </div>

            {/* Add Interest */}
            <div className="flex gap-2">
              <Input
                placeholder="Add an interest..."
                value={newInterest}
                onChange={(e) => setNewInterest(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addInterest(newInterest)}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => addInterest(newInterest)}
                disabled={!newInterest.trim()}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Suggestions */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Suggestions:</p>
              <div className="flex flex-wrap gap-1.5">
                {INTEREST_SUGGESTIONS.filter(s => !interests.includes(s)).slice(0, 10).map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => addInterest(suggestion)}
                    className="text-xs px-2.5 py-1 rounded-full border hover:bg-muted transition-colors"
                  >
                    + {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Personality Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Communication Style</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Communication Style</Label>
                <Select
                  value={personalityProfile.communication_style}
                  onValueChange={(value) => 
                    setPersonalityProfile(prev => ({ ...prev, communication_style: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="calm">Calm & Thoughtful</SelectItem>
                    <SelectItem value="energetic">Energetic & Enthusiastic</SelectItem>
                    <SelectItem value="analytical">Analytical & Direct</SelectItem>
                    <SelectItem value="friendly">Friendly & Casual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Conversation Depth</Label>
                <Select
                  value={personalityProfile.conversation_depth}
                  onValueChange={(value) => 
                    setPersonalityProfile(prev => ({ ...prev, conversation_depth: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="casual">Light & Casual</SelectItem>
                    <SelectItem value="deep">Deep & Meaningful</SelectItem>
                    <SelectItem value="both">Both / Depends</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Save Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <Button
          onClick={saveProfile}
          disabled={saving}
          className="w-full bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-600 hover:to-purple-700"
          size="lg"
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Profile
            </>
          )}
        </Button>
      </motion.div>

      {/* Shop Showcase (Pro only) */}
      <BeesMateShopShowcase 
        canShowcase={userSubscription?.tier_key === 'pro'}
        onUpgradeClick={() => setUpgradeDialogOpen(true)}
      />

      {/* Referral Dashboard */}
      <BeesMateReferralDashboard />

      {/* ASPN Dashboard */}
      <ASPNUserDashboard />

      {/* Premium Upgrade Dialog */}
      <BeesMatePremiumUpgrade
        open={upgradeDialogOpen}
        onOpenChange={setUpgradeDialogOpen}
        currentTierKey={userSubscription?.tier_key}
        onUpgradeSuccess={fetchSubscription}
      />
    </div>
  );
}
