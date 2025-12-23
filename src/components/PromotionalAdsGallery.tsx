import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Share2,
  Copy,
  Facebook,
  MessageCircle,
  Send,
  Image,
  Video,
  ExternalLink,
  Play,
} from "lucide-react";

const YoutubeIcon = () => (
  <svg className="w-12 h-12 text-red-500" viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

interface PromotionalAd {
  id: string;
  title: string;
  description: string | null;
  media_type: string;
  media_url: string;
  thumbnail_url: string | null;
  cta_text: string | null;
}

export default function PromotionalAdsGallery() {
  const { profile } = useAuth();
  const [ads, setAds] = useState<PromotionalAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAd, setSelectedAd] = useState<PromotionalAd | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  const referralLink = profile?.referral_code
    ? `${window.location.origin}/auth?ref=${profile.referral_code}`
    : "";

  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
    try {
      const { data, error } = await supabase
        .from("promotional_ads")
        .select("*")
        .eq("is_published", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      setAds(data || []);
    } catch (error: any) {
      console.error("Error fetching promotional ads:", error);
    } finally {
      setLoading(false);
    }
  };

  const openShareDialog = (ad: PromotionalAd) => {
    setSelectedAd(ad);
    setShareDialogOpen(true);
  };

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success("Referral link copied to clipboard!");
  };

  const getShareMessage = (ad: PromotionalAd) => {
    return `${ad.title}\n\n${ad.description || ""}\n\nJoin now: ${referralLink}`;
  };

  const shareToFacebook = (ad: PromotionalAd) => {
    const url = encodeURIComponent(referralLink);
    const quote = encodeURIComponent(getShareMessage(ad));
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${quote}`,
      "_blank",
      "width=600,height=400"
    );
  };

  const shareToTwitter = (ad: PromotionalAd) => {
    const text = encodeURIComponent(getShareMessage(ad));
    window.open(
      `https://twitter.com/intent/tweet?text=${text}`,
      "_blank",
      "width=600,height=400"
    );
  };

  const shareToWhatsApp = (ad: PromotionalAd) => {
    const text = encodeURIComponent(getShareMessage(ad));
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const shareToTelegram = (ad: PromotionalAd) => {
    const text = encodeURIComponent(getShareMessage(ad));
    const url = encodeURIComponent(referralLink);
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, "_blank");
  };

  const shareToMessenger = async (ad: PromotionalAd) => {
    const message = getShareMessage(ad);
    
    // Try Web Share API with file support first (works on mobile for Messenger)
    if (navigator.share && navigator.canShare) {
      try {
        // Fetch the image and convert to blob
        const response = await fetch(ad.media_url);
        const blob = await response.blob();
        const extension = ad.media_type === 'video' ? 'mp4' : 'jpg';
        const file = new File([blob], `promo.${extension}`, { type: blob.type });
        
        const shareData = {
          title: ad.title,
          text: message,
          url: referralLink,
          files: [file]
        };
        
        if (navigator.canShare(shareData)) {
          await navigator.share(shareData);
          toast.success("Shared successfully!");
          return;
        }
      } catch (error) {
        console.log("File share not supported, falling back to link share");
      }
    }
    
    // Fallback to Facebook Messenger dialog (link only)
    const url = encodeURIComponent(referralLink);
    window.open(
      `https://www.facebook.com/dialog/send?link=${url}&app_id=966242223397117&redirect_uri=${encodeURIComponent(window.location.href)}`,
      "_blank",
      "width=600,height=500"
    );
  };

  const shareNative = async (ad: PromotionalAd) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: ad.title,
          text: ad.description || "",
          url: referralLink,
        });
      } catch (error) {
        // User cancelled or error
      }
    } else {
      copyReferralLink();
    }
  };

  const downloadMedia = async (ad: PromotionalAd) => {
    // For YouTube embeds, open the video in a new tab
    if (ad.media_type === "youtube_embed") {
      const videoId = ad.media_url.split("/embed/")[1]?.split("?")[0];
      if (videoId) {
        window.open(`https://www.youtube.com/watch?v=${videoId}`, "_blank");
        toast.success("Opening YouTube video...");
      }
      return;
    }
    
    try {
      const response = await fetch(ad.media_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${ad.title.replace(/\s+/g, "-").toLowerCase()}.${
        ad.media_type === "image" ? "jpg" : "mp4"
      }`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("Media downloaded!");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download media");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="aspect-video w-full" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (ads.length === 0) {
    return (
      <Card className="p-8 text-center">
        <div className="text-muted-foreground">
          <Image className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No promotional content available yet.</p>
          <p className="text-sm mt-2">Check back later for shareable content!</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Promotional Content</h2>
          <p className="text-muted-foreground">
            Share these with your referral link to earn passive income
          </p>
        </div>
      </div>

      {/* Referral Link Display */}
      <Card className="p-4 bg-primary/5 border-primary/20">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium mb-1">Your Referral Link</p>
            <p className="text-xs text-muted-foreground break-all font-mono bg-background/50 p-2 rounded">
              {referralLink}
            </p>
          </div>
          <Button onClick={copyReferralLink} variant="outline" size="sm">
            <Copy className="w-4 h-4 mr-2" />
            Copy Link
          </Button>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ads.map((ad) => (
          <Card key={ad.id} className="overflow-hidden group">
            <div className="aspect-video bg-muted relative">
              {ad.media_type === "image" ? (
                <img
                  src={ad.media_url}
                  alt={ad.title}
                  className="w-full h-full object-cover"
                />
              ) : ad.media_type === "youtube_embed" ? (
                <div className="relative w-full h-full cursor-pointer" onClick={() => openShareDialog(ad)}>
                  <img
                    src={ad.thumbnail_url || `https://img.youtube.com/vi/${ad.media_url.split("/embed/")[1]?.split("?")[0]}/maxresdefault.jpg`}
                    alt={ad.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors">
                    <YoutubeIcon />
                  </div>
                </div>
              ) : (
                <div className="relative w-full h-full">
                  <video
                    src={ad.media_url}
                    poster={ad.thumbnail_url || undefined}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Play className="w-12 h-12 text-white" />
                  </div>
                </div>
              )}
              <div className="absolute top-2 left-2">
                <Badge variant="secondary" className="bg-background/80">
                  {ad.media_type === "image" ? (
                    <Image className="w-3 h-3 mr-1" />
                  ) : ad.media_type === "youtube_embed" ? (
                    <Video className="w-3 h-3 mr-1 text-red-500" />
                  ) : (
                    <Video className="w-3 h-3 mr-1" />
                  )}
                  {ad.media_type === "youtube_embed" ? "YouTube" : ad.media_type}
                </Badge>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <h3 className="font-semibold">{ad.title}</h3>
              {ad.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {ad.description}
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => openShareDialog(ad)}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
                <Button
                  variant="outline"
                  onClick={() => downloadMedia(ad)}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share "{selectedAd?.title}"</DialogTitle>
          </DialogHeader>
          {selectedAd && (
            <div className="space-y-4">
              {/* Preview */}
              <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                {selectedAd.media_type === "image" ? (
                  <img
                    src={selectedAd.media_url}
                    alt={selectedAd.title}
                    className="w-full h-full object-cover"
                  />
                ) : selectedAd.media_type === "youtube_embed" ? (
                  <iframe
                    src={`${selectedAd.media_url}?autoplay=0&rel=0`}
                    title={selectedAd.title}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    src={selectedAd.media_url}
                    poster={selectedAd.thumbnail_url || undefined}
                    className="w-full h-full object-cover"
                    controls
                  />
                )}
              </div>

              {/* Share Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-12"
                  onClick={() => shareToFacebook(selectedAd)}
                >
                  <Facebook className="w-5 h-5 mr-2 text-blue-600" />
                  Facebook
                </Button>
                <Button
                  variant="outline"
                  className="h-12"
                  onClick={() => shareToMessenger(selectedAd)}
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="#0084FF">
                    <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.19 5.44 3.14 7.17.16.14.26.35.27.57l.05 1.78c.02.62.66 1.02 1.22.77l1.98-.87c.17-.08.36-.1.55-.06.9.25 1.85.39 2.79.39 5.64 0 10-4.13 10-9.7C22 6.13 17.64 2 12 2zm1 13.36L10.73 13l-4.49 2.49 4.94-5.24 2.32 2.35 4.44-2.49-4.94 5.25z"/>
                  </svg>
                  Messenger
                </Button>
                <Button
                  variant="outline"
                  className="h-12"
                  onClick={() => shareToTwitter(selectedAd)}
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  X (Twitter)
                </Button>
                <Button
                  variant="outline"
                  className="h-12"
                  onClick={() => shareToWhatsApp(selectedAd)}
                >
                  <MessageCircle className="w-5 h-5 mr-2 text-green-600" />
                  WhatsApp
                </Button>
                <Button
                  variant="outline"
                  className="h-12"
                  onClick={() => shareToTelegram(selectedAd)}
                >
                  <Send className="w-5 h-5 mr-2 text-blue-500" />
                  Telegram
                </Button>
              </div>

              {/* Native Share / Copy */}
              <div className="space-y-2">
                <Button
                  className="w-full"
                  onClick={() => shareNative(selectedAd)}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  More Options
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={copyReferralLink}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Referral Link
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => downloadMedia(selectedAd)}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Download Media
                </Button>
              </div>

              {/* Referral Info */}
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-medium mb-1">Your Referral Link:</p>
                <p className="text-xs text-muted-foreground break-all font-mono">
                  {referralLink}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
