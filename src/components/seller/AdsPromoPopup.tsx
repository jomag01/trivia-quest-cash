import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { 
  Megaphone, Sparkles, TrendingUp, Users, Image, Zap, 
  Facebook, Instagram, Twitter, Youtube, ArrowRight, X
} from 'lucide-react';

interface AdsPromoPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AdsPromoPopup: React.FC<AdsPromoPopupProps> = ({ open, onOpenChange }) => {
  const navigate = useNavigate();

  const handleGoToAdsMaker = () => {
    onOpenChange(false);
    navigate('/ai-hub');
    // Set a small delay to ensure navigation happens first
    setTimeout(() => {
      localStorage.setItem('ai_hub_target_tab', 'ads-maker');
      window.dispatchEvent(new Event('storage'));
    }, 100);
  };

  const benefits = [
    { icon: Sparkles, text: 'AI-Powered Ad Creation', color: 'text-purple-500' },
    { icon: TrendingUp, text: 'Boost Your Sales', color: 'text-green-500' },
    { icon: Users, text: 'Reach More Customers', color: 'text-blue-500' },
    { icon: Image, text: 'Professional Ad Images', color: 'text-pink-500' },
  ];

  const platforms = [
    { icon: Facebook, name: 'Facebook', color: 'bg-blue-600' },
    { icon: Instagram, name: 'Instagram', color: 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500' },
    { icon: Twitter, name: 'Twitter', color: 'bg-black' },
    { icon: Youtube, name: 'YouTube', color: 'bg-red-600' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden border-0">
        {/* Gradient Header */}
        <div className="relative bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 p-6 text-white">
          <div className="absolute inset-0 bg-black/10" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm">
                <Megaphone className="h-8 w-8" />
              </div>
              <div>
                <Badge className="bg-yellow-400 text-yellow-900 mb-1">NEW FEATURE</Badge>
                <DialogTitle className="text-2xl font-bold text-white">
                  TriviaBees AI Ads Maker
                </DialogTitle>
              </div>
            </div>
            <DialogDescription className="text-white/90 text-base">
              Create stunning social media ads for your products in seconds!
            </DialogDescription>
          </div>
          
          {/* Floating Icons Animation */}
          <div className="absolute top-4 right-4 opacity-30">
            <Sparkles className="h-12 w-12 animate-pulse" />
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Benefits */}
          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Why Use AI Ads Maker?
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <div 
                    key={index}
                    className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <Icon className={`h-5 w-5 ${benefit.color}`} />
                    <span className="text-sm font-medium">{benefit.text}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Platform Support */}
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-3">
              Create ads for all major platforms:
            </h3>
            <div className="flex gap-2 flex-wrap">
              {platforms.map((platform, index) => {
                const Icon = platform.icon;
                return (
                  <div 
                    key={index}
                    className={`flex items-center gap-2 px-3 py-2 rounded-full ${platform.color} text-white text-sm`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{platform.name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* How it Works */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4">
            <h3 className="font-semibold mb-2">How It Works:</h3>
            <ol className="text-sm space-y-1 text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-500 text-white text-xs flex items-center justify-center">1</span>
                Drop your website link
              </li>
              <li className="flex items-center gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-pink-500 text-white text-xs flex items-center justify-center">2</span>
                AI analyzes your brand instantly
              </li>
              <li className="flex items-center gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center">3</span>
                Get unlimited unique ad ideas daily!
              </li>
            </ol>
          </div>

          {/* CTA Buttons */}
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Maybe Later
            </Button>
            <Button 
              onClick={handleGoToAdsMaker}
              className="flex-1 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 hover:from-purple-700 hover:via-pink-700 hover:to-orange-600 text-white"
            >
              Try Now
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdsPromoPopup;
