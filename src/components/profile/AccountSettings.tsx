import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Loader2, 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  MapPin, 
  Globe, 
  Edit, 
  AlertTriangle,
  CheckCircle2,
  Clock,
  X
} from "lucide-react";
import { format, parseISO } from "date-fns";

interface EmailChangeRequest {
  id: string;
  old_email: string;
  new_email: string;
  status: string;
  reason: string | null;
  created_at: string;
  expires_at: string;
}

export function AccountSettings() {
  const { user, profile, refreshProfile } = useAuth();
  
  // Profile form state
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [birthday, setBirthday] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [saving, setSaving] = useState(false);

  // Email change state
  const [showEmailChangeDialog, setShowEmailChangeDialog] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailChangeReason, setEmailChangeReason] = useState("");
  const [emailChanging, setEmailChanging] = useState(false);
  const [pendingEmailRequest, setPendingEmailRequest] = useState<EmailChangeRequest | null>(null);
  const [loadingEmailRequest, setLoadingEmailRequest] = useState(true);

  // Load profile data
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setUsername((profile as any).username || "");
      setBio((profile as any).bio || "");
      setLocation((profile as any).location || "");
      setWebsite((profile as any).website || "");
      setBirthday((profile as any).birthday || "");
      setPhoneNumber((profile as any).phone_number || "");
    }
  }, [profile]);

  // Fetch pending email change request
  useEffect(() => {
    if (user) {
      fetchPendingEmailRequest();
    }
  }, [user]);

  const fetchPendingEmailRequest = async () => {
    if (!user) return;
    
    setLoadingEmailRequest(true);
    try {
      const { data, error } = await supabase
        .from("email_change_requests")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .maybeSingle();

      if (error) throw error;
      setPendingEmailRequest(data as EmailChangeRequest | null);
    } catch (error: any) {
      console.error("Error fetching email change request:", error);
    } finally {
      setLoadingEmailRequest(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user || !profile) return;

    if (!username.trim()) {
      toast.error("Username is required");
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      toast.error("Username can only contain letters, numbers, and underscores");
      return;
    }

    // Validate phone number format if provided
    if (phoneNumber && !/^\+?[0-9\s\-()]+$/.test(phoneNumber)) {
      toast.error("Please enter a valid phone number");
      return;
    }

    setSaving(true);
    try {
      // Check if username is taken by another user
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username.toLowerCase())
        .neq("id", profile.id)
        .maybeSingle();

      if (existingUser) {
        toast.error("Username is already taken");
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          username: username.toLowerCase().trim(),
          bio: bio.trim(),
          location: location.trim(),
          website: website.trim(),
          birthday: birthday || null,
          phone_number: phoneNumber.trim() || null,
        })
        .eq("id", profile.id);

      if (error) throw error;

      toast.success("Profile updated successfully!");
      refreshProfile();
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error(error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleRequestEmailChange = async () => {
    if (!user || !profile?.email) return;

    if (!newEmail.trim()) {
      toast.error("Please enter a new email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (newEmail.toLowerCase() === profile.email.toLowerCase()) {
      toast.error("New email must be different from current email");
      return;
    }

    if (!emailChangeReason.trim()) {
      toast.error("Please provide a reason for the email change");
      return;
    }

    setEmailChanging(true);
    try {
      // Generate a verification token
      const verificationToken = crypto.randomUUID();

      // Create email change request
      const { error: insertError } = await supabase
        .from("email_change_requests")
        .insert({
          user_id: user.id,
          old_email: profile.email,
          new_email: newEmail.toLowerCase().trim(),
          verification_token: verificationToken,
          reason: emailChangeReason.trim(),
        });

      if (insertError) throw insertError;

      // Use Supabase auth to send verification email to new address
      const { error: authError } = await supabase.auth.updateUser({
        email: newEmail.toLowerCase().trim(),
      });

      if (authError) {
        // If auth update fails, we still have the request logged
        console.error("Auth email update error:", authError);
        toast.info("Email change request created. Please verify your new email address.");
      } else {
        toast.success("Verification email sent to your new address. Please check your inbox.");
      }

      setShowEmailChangeDialog(false);
      setNewEmail("");
      setEmailChangeReason("");
      fetchPendingEmailRequest();
    } catch (error: any) {
      console.error("Error requesting email change:", error);
      toast.error(error.message || "Failed to request email change");
    } finally {
      setEmailChanging(false);
    }
  };

  const handleCancelEmailRequest = async () => {
    if (!pendingEmailRequest) return;

    try {
      const { error } = await supabase
        .from("email_change_requests")
        .update({ status: "cancelled" })
        .eq("id", pendingEmailRequest.id);

      if (error) throw error;

      toast.success("Email change request cancelled");
      setPendingEmailRequest(null);
    } catch (error: any) {
      console.error("Error cancelling email request:", error);
      toast.error("Failed to cancel request");
    }
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Profile Information
          </CardTitle>
          <CardDescription>
            Update your personal information and public profile
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                  placeholder="username"
                  className="pl-8"
                  maxLength={30}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="birthday" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Birthday
              </Label>
              <Input
                id="birthday"
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Phone Number
              </Label>
              <Input
                id="phoneNumber"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1 234 567 8900"
                maxLength={20}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Location
              </Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, Country"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website" className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Website
              </Label>
              <Input
                id="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yourwebsite.com"
                maxLength={200}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself"
              rows={3}
              maxLength={160}
            />
            <p className="text-xs text-muted-foreground">{bio.length}/160</p>
          </div>

          <Button onClick={handleSaveProfile} disabled={saving} className="w-full sm:w-auto">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Save Profile Changes
          </Button>
        </CardContent>
      </Card>

      {/* Email Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email Address
          </CardTitle>
          <CardDescription>
            Manage your registered email address
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="space-y-1">
              <p className="font-medium">{profile.email}</p>
              <p className="text-sm text-muted-foreground">Current registered email</p>
            </div>
            <Badge variant="outline" className="gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Verified
            </Badge>
          </div>

          {/* Pending Email Change Request */}
          {loadingEmailRequest ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Checking for pending requests...</span>
            </div>
          ) : pendingEmailRequest ? (
            <Alert className="border-amber-500/50 bg-amber-500/10">
              <Clock className="h-4 w-4 text-amber-500" />
              <AlertDescription className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-amber-600">Pending Email Change</span>
                  <Badge variant="outline" className="border-amber-500 text-amber-600">
                    Awaiting Verification
                  </Badge>
                </div>
                <p className="text-sm">
                  New email: <span className="font-medium">{pendingEmailRequest.new_email}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Requested: {format(parseISO(pendingEmailRequest.created_at), "PPp")}
                </p>
                <p className="text-xs text-muted-foreground">
                  Expires: {format(parseISO(pendingEmailRequest.expires_at), "PPp")}
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={handleCancelEmailRequest}
                >
                  <X className="w-4 h-4 mr-1" />
                  Cancel Request
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              <Alert className="border-muted">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Changing your email requires verification. All your data, transactions, and history 
                  will be transferred to your new email address.
                </AlertDescription>
              </Alert>
              <Button 
                variant="outline" 
                onClick={() => setShowEmailChangeDialog(true)}
                className="gap-2"
              >
                <Edit className="w-4 h-4" />
                Change Email Address
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Change Dialog */}
      <Dialog open={showEmailChangeDialog} onOpenChange={setShowEmailChangeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Change Email Address
            </DialogTitle>
            <DialogDescription>
              Enter your new email address and the reason for the change. 
              A verification link will be sent to your new email.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Current email</p>
              <p className="font-medium">{profile.email}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newEmail">New Email Address</Label>
              <Input
                id="newEmail"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="newemail@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emailChangeReason">Reason for Change</Label>
              <Textarea
                id="emailChangeReason"
                value={emailChangeReason}
                onChange={(e) => setEmailChangeReason(e.target.value)}
                placeholder="Please explain why you need to change your email address..."
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">{emailChangeReason.length}/500</p>
            </div>

            <Alert className="border-amber-500/50 bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-xs text-amber-600">
                After verification, your registered email will be updated and all account data 
                (transactions, orders, commissions, etc.) will be associated with the new email.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowEmailChangeDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRequestEmailChange} disabled={emailChanging}>
              {emailChanging ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Request Email Change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
