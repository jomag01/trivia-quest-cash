import { useEffect, useState, memo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SliderAd {
  id: string;
  title: string;
  image_url: string | null;
  link_url: string | null;
  seller_id: string;
}

interface CompactSellerAdsSliderProps {
  placementKey?: string;
}

export const CompactSellerAdsSlider = memo(({ placementKey = 'shop_top' }: CompactSellerAdsSliderProps) => {
  const [ads, setAds] = useState<SliderAd[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [imageLoaded, setImageLoaded] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveAds();
  }, [placementKey]);

  useEffect(() => {
    if (!isAutoPlaying || ads.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % ads.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, ads.length]);

  const fetchActiveAds = async () => {
    try {
      // Get placement settings first
      const { data: placement } = await supabase
        .from('slider_ad_settings')
        .select('id, max_ads_shown')
        .eq('placement_key', placementKey)
        .eq('is_active', true)
        .maybeSingle();

      if (!placement) {
        setAds([]);
        setLoading(false);
        return;
      }

      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('seller_slider_ads')
        .select('id, title, image_url, link_url, seller_id')
        .eq('placement_id', placement.id)
        .eq('status', 'active')
        .lte('start_date', now)
        .gte('end_date', now)
        .order('created_at', { ascending: false })
        .limit(placement.max_ads_shown || 5);

      if (error) throw error;
      setAds(data || []);
    } catch (error) {
      console.error('Error fetching seller slider ads:', error);
    } finally {
      setLoading(false);
    }
  };

  const trackAdClick = async (ad: SliderAd) => {
    try {
      await supabase.from('slider_ad_impressions').insert({
        ad_id: ad.id,
        clicked: true
      });

      // Increment click count
      const { data: currentAd } = await supabase
        .from('seller_slider_ads')
        .select('clicks')
        .eq('id', ad.id)
        .single();

      if (currentAd) {
        await supabase
          .from('seller_slider_ads')
          .update({ clicks: (currentAd.clicks || 0) + 1 })
          .eq('id', ad.id);
      }
    } catch (error) {
      // Silent fail
    }
  };

  const handleAdClick = (ad: SliderAd) => {
    trackAdClick(ad);
    if (ad.link_url) {
      window.open(ad.link_url, '_blank');
    }
  };

  const nextSlide = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev + 1) % ads.length);
  };

  const prevSlide = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev - 1 + ads.length) % ads.length);
  };

  // Track impressions on view
  useEffect(() => {
    if (ads.length > 0 && ads[currentIndex]) {
      supabase.from('slider_ad_impressions').insert({
        ad_id: ads[currentIndex].id,
        clicked: false
      }).then(() => {});
    }
  }, [currentIndex, ads.length]);

  if (loading) {
    return (
      <div className="w-full rounded-lg bg-muted animate-pulse aspect-[2.5/1] max-h-28 sm:max-h-36" />
    );
  }

  if (ads.length === 0) {
    return (
      <div className="relative w-full overflow-hidden rounded-lg bg-gradient-to-br from-primary/5 to-secondary/10 border border-border/30 aspect-[2.5/1] max-h-28 sm:max-h-36 flex items-center justify-center">
        <div className="text-center p-2">
          <p className="text-[10px] text-muted-foreground">Seller Ads</p>
          <p className="text-[8px] text-muted-foreground/70">Coming Soon</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden rounded-lg bg-muted">
      {/* Compact height - matching promo slider */}
      <div className="relative aspect-[2.5/1] max-h-28 sm:max-h-36">
        {ads.map((ad, index) => (
          <div
            key={ad.id}
            className={cn(
              "absolute inset-0 transition-opacity duration-500",
              index === currentIndex ? "opacity-100 z-10" : "opacity-0 z-0"
            )}
          >
            <div
              onClick={() => handleAdClick(ad)}
              className="w-full h-full cursor-pointer"
            >
              {/* Placeholder */}
              {!imageLoaded.has(index) && (
                <div className="absolute inset-0 bg-gradient-to-r from-secondary/10 to-primary/10 animate-pulse" />
              )}
              {ad.image_url ? (
                <img
                  src={ad.image_url}
                  alt={ad.title}
                  loading={index === 0 ? "eager" : "lazy"}
                  decoding="async"
                  className={cn(
                    "w-full h-full object-cover transition-opacity duration-300",
                    imageLoaded.has(index) ? "opacity-100" : "opacity-0"
                  )}
                  onLoad={() => setImageLoaded(prev => new Set(prev).add(index))}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20" />
              )}
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              
              {/* Sponsored badge */}
              <div className="absolute top-1 left-1 bg-amber-500/90 text-white text-[8px] px-1 py-0.5 rounded font-medium">
                Ad
              </div>
              
              {/* Title overlay */}
              <div className="absolute bottom-2 left-2 right-2">
                <h3 className="text-white font-semibold text-[10px] sm:text-xs drop-shadow-lg line-clamp-1">
                  {ad.title}
                </h3>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation */}
      {ads.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-1 top-1/2 -translate-y-1/2 p-0.5 bg-black/30 hover:bg-black/50 text-white rounded-full transition-colors z-20"
            aria-label="Previous"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 bg-black/30 hover:bg-black/50 text-white rounded-full transition-colors z-20"
            aria-label="Next"
          >
            <ChevronRight className="w-3 h-3" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5 z-20">
            {ads.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentIndex(index);
                  setIsAutoPlaying(false);
                }}
                className={cn(
                  "w-1 h-1 rounded-full transition-all",
                  index === currentIndex
                    ? "bg-white w-2"
                    : "bg-white/50 hover:bg-white/75"
                )}
                aria-label={`Slide ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
});

CompactSellerAdsSlider.displayName = 'CompactSellerAdsSlider';

export default CompactSellerAdsSlider;
