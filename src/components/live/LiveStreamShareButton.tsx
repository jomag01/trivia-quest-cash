import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Share2, Copy, Check, Link } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface LiveStreamShareButtonProps {
  streamId: string;
  streamTitle: string;
  streamerName?: string;
  variant?: "ghost" | "default" | "outline";
  size?: "sm" | "default" | "icon";
  className?: string;
}

export function LiveStreamShareButton({ 
  streamId, 
  streamTitle, 
  streamerName,
  variant = "ghost",
  size = "icon",
  className = ""
}: LiveStreamShareButtonProps) {
  const { user } = useAuth();
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  const getShareUrl = () => {
    const baseUrl = `${window.location.origin}/feed?live=${streamId}`;
    return user ? `${baseUrl}&ref=${user.id}` : baseUrl;
  };

  const handleShare = async () => {
    const shareUrl = getShareUrl();
    const shareText = `🔴 LIVE: ${streamTitle}${streamerName ? ` by ${streamerName}` : ""}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `🔴 LIVE: ${streamTitle}`,
          text: shareText,
          url: shareUrl,
        });
        toast.success("Shared successfully!");
      } catch (error: any) {
        if (error.name !== "AbortError") {
          setShowShareDialog(true);
        }
      }
    } else {
      setShowShareDialog(true);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleShare}
      >
        <Share2 className="w-5 h-5 md:w-7 md:h-7" />
      </Button>

      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5" />
              Share Live Stream
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Share this live stream with friends{user ? " and earn commission when they purchase products!" : "!"}
              </p>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    readOnly
                    value={getShareUrl()}
                    className="pl-9 pr-20 text-sm bg-muted"
                  />
                </div>
                <Button
                  onClick={handleCopyLink}
                  variant="outline"
                  className="flex-shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-2 text-green-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            {user && (
              <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                💎 Your referral code is included. You'll earn diamonds when viewers purchase products through this link!
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
