import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { 
  Briefcase, Building2, CheckCircle, Link2, 
  MessageSquare, Save, Shield, Sparkles, Users 
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BusinessProfile {
  id?: string;
  company_name: string;
  job_title: string;
  industry: string;
  linkedin_url: string;
  pitch_template: string;
  business_mode_enabled: boolean;
  is_verified: boolean;
}

const INDUSTRIES = [
  "Technology", "Finance", "Healthcare", "Education", "Marketing",
  "Real Estate", "E-commerce", "Manufacturing", "Consulting", "Media",
  "Legal", "Agriculture", "Hospitality", "Transportation", "Energy", "Other"
];

export function ChatMateBusinessNetworking() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile>({
    company_name: "",
    job_title: "",
    industry: "",
    linkedin_url: "",
    pitch_template: "",
    business_mode_enabled: false,
    is_verified: false
  });
  const [networkingUsers, setNetworkingUsers] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchBusinessProfile();
      fetchNetworkingUsers();
    }
  }, [user]);

  const fetchBusinessProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("chatmate_business_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setBusinessProfile({
          id: data.id,
          company_name: data.company_name || "",
          job_title: data.job_title || "",
          industry: data.industry || "",
          linkedin_url: data.linkedin_url || "",
          pitch_template: data.pitch_template || "",
          business_mode_enabled: data.business_mode_enabled || false,
          is_verified: data.is_verified || false
        });
      }
    } catch (error) {
      // Profile doesn't exist yet
    } finally {
      setLoading(false);
    }
  };

  const fetchNetworkingUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("chatmate_business_profiles")
        .select(`
          *,
          profiles:user_id (
            id, full_name, avatar_url, country
          )
        `)
        .eq("business_mode_enabled", true)
        .neq("user_id", user?.id || "")
        .limit(10);

      if (data) {
        setNetworkingUsers(data);
      }
    } catch (error) {
      console.error("Error fetching networking users:", error);
    }
  };

  const saveBusinessProfile = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const profileData = {
        user_id: user.id,
        company_name: businessProfile.company_name,
        job_title: businessProfile.job_title,
        industry: businessProfile.industry,
        linkedin_url: businessProfile.linkedin_url,
        pitch_template: businessProfile.pitch_template,
        business_mode_enabled: businessProfile.business_mode_enabled,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from("chatmate_business_profiles")
        .upsert(profileData, { onConflict: "user_id" });

      if (error) throw error;

      toast.success("Business profile saved!");
      fetchNetworkingUsers();
    } catch (error) {
      console.error("Error saving business profile:", error);
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
          <Briefcase className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold">Business Networking</h2>
        <p className="text-muted-foreground">
          Connect with professionals for business opportunities
        </p>
      </div>

      {/* Business Mode Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className={businessProfile.business_mode_enabled 
          ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20" 
          : ""
        }>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  businessProfile.business_mode_enabled 
                    ? "bg-blue-500 text-white" 
                    : "bg-muted"
                }`}>
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <Label className="text-base font-medium">Business Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Show your professional profile to other networkers
                  </p>
                </div>
              </div>
              <Switch
                checked={businessProfile.business_mode_enabled}
                onCheckedChange={(checked) => 
                  setBusinessProfile(prev => ({ ...prev, business_mode_enabled: checked }))
                }
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Business Profile Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Professional Details
              {businessProfile.is_verified && (
                <Badge className="ml-2 bg-green-500">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Verified
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Company / Organization</Label>
                <Input
                  placeholder="e.g., Triviabees Inc."
                  value={businessProfile.company_name}
                  onChange={(e) => setBusinessProfile(prev => ({ 
                    ...prev, company_name: e.target.value 
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Job Title</Label>
                <Input
                  placeholder="e.g., Marketing Manager"
                  value={businessProfile.job_title}
                  onChange={(e) => setBusinessProfile(prev => ({ 
                    ...prev, job_title: e.target.value 
                  }))}
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Industry</Label>
                <Select
                  value={businessProfile.industry}
                  onValueChange={(value) => setBusinessProfile(prev => ({ 
                    ...prev, industry: value 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map(industry => (
                      <SelectItem key={industry} value={industry}>
                        {industry}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>LinkedIn URL</Label>
                <Input
                  placeholder="https://linkedin.com/in/..."
                  value={businessProfile.linkedin_url}
                  onChange={(e) => setBusinessProfile(prev => ({ 
                    ...prev, linkedin_url: e.target.value 
                  }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Professional Pitch Template</Label>
              <Textarea
                placeholder="A brief introduction about yourself and what you're looking for professionally..."
                value={businessProfile.pitch_template}
                onChange={(e) => setBusinessProfile(prev => ({ 
                  ...prev, pitch_template: e.target.value 
                }))}
                className="min-h-[100px]"
              />
              <p className="text-xs text-muted-foreground">
                This will be used as your default business introduction
              </p>
            </div>

            <Button 
              onClick={saveBusinessProfile}
              disabled={saving}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Business Profile
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Active Networkers */}
      {businessProfile.business_mode_enabled && networkingUsers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Active Professionals
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {networkingUsers.map((networker) => (
                <div 
                  key={networker.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={networker.profiles?.avatar_url || ""} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-400 to-indigo-500 text-white">
                      {(networker.profiles?.full_name || "P")[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold truncate">
                        {networker.profiles?.full_name || "Professional"}
                      </h4>
                      {networker.is_verified && (
                        <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {networker.job_title} {networker.company_name && `at ${networker.company_name}`}
                    </p>
                    <Badge variant="secondary" className="text-xs mt-1">
                      {networker.industry}
                    </Badge>
                  </div>
                  <Button size="sm" variant="outline" className="shrink-0">
                    <MessageSquare className="w-4 h-4 mr-1" />
                    Connect
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Benefits */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200/50 dark:border-blue-800/30">
          <CardContent className="p-4">
            <h4 className="font-semibold flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-blue-500" />
              Business Networking Benefits
            </h4>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <p className="text-muted-foreground">Verified professional badges for trusted connections</p>
              </div>
              <div className="flex items-start gap-2">
                <Link2 className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <p className="text-muted-foreground">Industry-specific matching for relevant connections</p>
              </div>
              <div className="flex items-start gap-2">
                <MessageSquare className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <p className="text-muted-foreground">Pitch-safe templates for professional introductions</p>
              </div>
              <div className="flex items-start gap-2">
                <Users className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <p className="text-muted-foreground">Connect with like-minded entrepreneurs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}