import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, ChevronRight, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

interface SellerAd {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  video_url: string | null;
  link_url: string | null;
  user_id: string;
}

export const SellerAdsSlider = () => {
  const [ads, setAds] = useState<SellerAd[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveAds();
  }, []);

  const fetchActiveAds = async () => {
    try {
      const { data, error } = await supabase
        .from('user_ads')
        .select('id, title, description, image_url, video_url, link_url, user_id')
        .eq('status', 'active')
        .eq('is_active', true)
        .lte('start_date', new Date().toISOString())
        .or(`end_date.is.null,end_date.gte.${new Date().toISOString()}`)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setAds(data || []);
    } catch (error) {
      console.error('Error fetching seller ads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdClick = async (ad: SellerAd) => {
    try {
      // Track impression with click
      await supabase.from('ad_impressions').insert({
        ad_id: ad.id,
        clicked: true
      });
    } catch (error) {
      console.error('Error tracking ad click:', error);
    }

    if (ad.link_url) {
      window.open(ad.link_url, '_blank');
    }
  };

  if (loading || ads.length === 0) return null;

  return (
    <div className="py-3">
      <div className="flex items-center gap-2 mb-2 px-1">
        <Megaphone className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Featured Seller Ads</h3>
      </div>
      
      <Carousel
        opts={{
          align: 'start',
          loop: ads.length > 2,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-2">
          {ads.map((ad) => (
            <CarouselItem key={ad.id} className="pl-2 basis-1/2 md:basis-1/3 lg:basis-1/4">
              <Card 
                className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow border-border/50"
                onClick={() => handleAdClick(ad)}
              >
                {/* Image container with product-like aspect ratio */}
                <div className="aspect-square overflow-hidden bg-muted relative">
                  {ad.video_url ? (
                    <video
                      src={ad.video_url}
                      className="w-full h-full object-cover"
                      muted
                      loop
                      autoPlay
                      playsInline
                    />
                  ) : ad.image_url ? (
                    <img
                      src={ad.image_url}
                      alt={ad.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Megaphone className="w-12 h-12 text-muted-foreground/30" />
                    </div>
                  )}
                  
                  {/* Ad badge */}
                  <div className="absolute top-1 left-1 bg-primary/90 text-primary-foreground text-[9px] px-1.5 py-0.5 rounded font-medium">
                    Sponsored
                  </div>
                </div>

                {/* Ad info */}
                <div className="p-2">
                  <h4 className="text-xs font-medium line-clamp-1 text-foreground">{ad.title}</h4>
                  {ad.description && (
                    <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{ad.description}</p>
                  )}
                </div>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        
        {ads.length > 2 && (
          <>
            <CarouselPrevious className="left-0 h-7 w-7 -translate-x-1/2" />
            <CarouselNext className="right-0 h-7 w-7 translate-x-1/2" />
          </>
        )}
      </Carousel>
    </div>
  );
};

export default SellerAdsSlider;
