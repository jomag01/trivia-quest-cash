import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Share2, Facebook, Twitter, MessageCircle, Send, Copy, Check, Linkedin
} from 'lucide-react';
import { toast } from 'sonner';
import { shareToSocialMedia, generateShareUrlSync } from '@/lib/shareUtils';
import { useAuth } from '@/contexts/AuthContext';

interface SocialShareMenuProps {
  title: string;
  description?: string;
  path: string;
  params?: Record<string, string>;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'icon';
  showLabel?: boolean;
  className?: string;
}

const SocialShareMenu = ({
  title,
  description,
  path,
  params,
  variant = 'outline',
  size = 'sm',
  showLabel = true,
  className = ''
}: SocialShareMenuProps) => {
  const [copied, setCopied] = useState(false);
  const { user } = useAuth();

  const shareUrl = generateShareUrlSync(path, user?.id, params);
  const shareText = description || title;

  const handleFacebook = () => {
    shareToSocialMedia.facebook(shareUrl, shareText);
  };

  const handleTwitter = () => {
    shareToSocialMedia.twitter(shareUrl, shareText);
  };

  const handleWhatsApp = () => {
    shareToSocialMedia.whatsapp(shareUrl, shareText);
  };

  const handleTelegram = () => {
    shareToSocialMedia.telegram(shareUrl, shareText);
  };

  const handleMessenger = () => {
    shareToSocialMedia.messenger(shareUrl);
  };

  const handleLinkedIn = () => {
    shareToSocialMedia.linkedin(shareUrl, title);
  };

  const handleCopy = async () => {
    const success = await shareToSocialMedia.copyToClipboard(`${shareText}\n${shareUrl}`);
    if (success) {
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('Failed to copy link');
    }
  };

  const handleNativeShare = async () => {
    const success = await shareToSocialMedia.native(shareUrl, title, shareText);
    if (success) {
      toast.success('Shared successfully!');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={variant} 
          size={size} 
          className={`gap-2 ${className}`}
          onClick={(e) => {
            // Try native share first on mobile
            if (navigator.share) {
              e.preventDefault();
              handleNativeShare();
            }
          }}
        >
          <Share2 className="h-4 w-4" />
          {showLabel && <span className="hidden sm:inline">Share</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleFacebook} className="gap-3 cursor-pointer">
          <div className="p-1.5 rounded-full bg-blue-600">
            <Facebook className="h-3.5 w-3.5 text-white" />
          </div>
          Facebook
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleTwitter} className="gap-3 cursor-pointer">
          <div className="p-1.5 rounded-full bg-sky-500">
            <Twitter className="h-3.5 w-3.5 text-white" />
          </div>
          Twitter / X
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleWhatsApp} className="gap-3 cursor-pointer">
          <div className="p-1.5 rounded-full bg-green-500">
            <MessageCircle className="h-3.5 w-3.5 text-white" />
          </div>
          WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleTelegram} className="gap-3 cursor-pointer">
          <div className="p-1.5 rounded-full bg-blue-500">
            <Send className="h-3.5 w-3.5 text-white" />
          </div>
          Telegram
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleMessenger} className="gap-3 cursor-pointer">
          <div className="p-1.5 rounded-full bg-gradient-to-br from-blue-500 to-purple-500">
            <MessageCircle className="h-3.5 w-3.5 text-white" />
          </div>
          Messenger
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleLinkedIn} className="gap-3 cursor-pointer">
          <div className="p-1.5 rounded-full bg-blue-700">
            <Linkedin className="h-3.5 w-3.5 text-white" />
          </div>
          LinkedIn
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopy} className="gap-3 cursor-pointer">
          <div className="p-1.5 rounded-full bg-gray-500">
            {copied ? <Check className="h-3.5 w-3.5 text-white" /> : <Copy className="h-3.5 w-3.5 text-white" />}
          </div>
          Copy Link
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default SocialShareMenu;
