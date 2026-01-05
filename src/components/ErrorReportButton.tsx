import { useState, useRef } from "react";
import { Bug, Upload, X, Send, Loader2, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function ErrorReportButton() {
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [errorType, setErrorType] = useState("bug");
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (ev) => {
      setScreenshotPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to storage
    setUploading(true);
    try {
      const fileName = `error-reports/${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from("public-uploads")
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from("public-uploads")
        .getPublicUrl(fileName);

      setScreenshotUrl(publicUrl);
      toast.success("Screenshot uploaded");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Failed to upload screenshot");
      setScreenshotPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const removeScreenshot = () => {
    setScreenshotUrl(null);
    setScreenshotPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Please enter an error title");
      return;
    }
    if (!description.trim()) {
      toast.error("Please describe the error");
      return;
    }

    setSending(true);
    try {
      const reportData: any = {
        user_id: user?.id || null,
        user_email: profile?.email || null,
        error_type: errorType,
        error_title: title.trim(),
        error_description: description.trim(),
        screenshot_url: screenshotUrl,
        page_url: window.location.href,
        browser_info: navigator.userAgent,
        device_info: `${navigator.platform} - ${window.innerWidth}x${window.innerHeight}`,
      };

      const { error } = await supabase
        .from("error_reports")
        .insert(reportData);

      if (error) throw error;

      toast.success("Bug report submitted. Thank you for helping us improve!");
      setOpen(false);
      setTitle("");
      setDescription("");
      setErrorType("bug");
      setScreenshotUrl(null);
      setScreenshotPreview(null);
    } catch (error: any) {
      console.error("Error submitting report:", error);
      toast.error("Failed to submit report");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="fixed bottom-36 right-4 z-40 h-10 w-10 rounded-full bg-destructive/10 hover:bg-destructive/20 text-destructive shadow-lg"
        title="Report a bug"
      >
        <Bug className="w-5 h-5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bug className="w-5 h-5 text-destructive" />
              Report an Error
            </DialogTitle>
            <DialogDescription>
              Help us improve by reporting bugs or issues you encounter.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Error Type</Label>
              <Select value={errorType} onValueChange={setErrorType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bug">Bug / Error</SelectItem>
                  <SelectItem value="ui">UI / Display Issue</SelectItem>
                  <SelectItem value="feature">Feature Not Working</SelectItem>
                  <SelectItem value="performance">Slow / Performance</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="error-title">Error Title *</Label>
              <Input
                id="error-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief description of the issue"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="error-desc">What happened? *</Label>
              <Textarea
                id="error-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what you were doing and what went wrong..."
                rows={4}
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground">{description.length}/1000</p>
            </div>

            <div className="space-y-2">
              <Label>Screenshot (optional)</Label>
              {screenshotPreview ? (
                <div className="relative">
                  <img
                    src={screenshotPreview}
                    alt="Screenshot preview"
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6"
                    onClick={removeScreenshot}
                    disabled={uploading}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                  {uploading && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  )}
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-muted-foreground/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <Camera className="w-6 h-6 text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground">Click to upload screenshot</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              )}
            </div>

            {user && (
              <p className="text-xs text-muted-foreground">
                Submitting as: {profile?.email || user.email}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={sending || uploading}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
