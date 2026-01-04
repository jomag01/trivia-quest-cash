import { useEffect, useState, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Ad {
  id: string;
  title: string;
  image_url: string;
  link_url: string | null;
  display_order: number;
}

export const AdSlider = memo(() => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [imageLoaded, setImageLoaded] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchAds();
  }, []);

  useEffect(() => {
    if (!isAutoPlaying || ads.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % ads.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, ads.length]);

  const fetchAds = async () => {
    const { data, error } = await supabase
      .from("ads")
      .select("id, title, image_url, link_url, display_order")
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .limit(5);

    if (!error && data) {
      setAds(data);
    }
  };

  const trackAdInteraction = async (adId: string, type: 'view' | 'click') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("user_interactions").insert({
        user_id: user?.id || null,
        interaction_type: type,
        target_type: 'ad',
        target_id: adId,
        metadata: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      // Silent fail for tracking
    }
  };

  const handleAdClick = (ad: Ad) => {
    trackAdInteraction(ad.id, 'click');
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

  useEffect(() => {
    if (ads.length > 0 && ads[currentIndex]) {
      trackAdInteraction(ads[currentIndex].id, 'view');
    }
  }, [currentIndex, ads.length]);

  if (ads.length === 0) return null;

  return (
    <div className="relative w-full overflow-hidden rounded-lg bg-muted">
      {/* Compact height - Amazon/Lazada style */}
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
              {/* Placeholder until image loads */}
              {!imageLoaded.has(index) && (
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-secondary/10 animate-pulse" />
              )}
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
              {/* Subtle gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              {/* Title overlay */}
              <div className="absolute bottom-2 left-3 right-3">
                <h3 className="text-white font-semibold text-xs sm:text-sm drop-shadow-lg line-clamp-1">
                  {ad.title}
                </h3>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation - Only show if multiple ads */}
      {ads.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-1 top-1/2 -translate-y-1/2 p-1 bg-black/30 hover:bg-black/50 text-white rounded-full transition-colors z-20"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-1 top-1/2 -translate-y-1/2 p-1 bg-black/30 hover:bg-black/50 text-white rounded-full transition-colors z-20"
            aria-label="Next slide"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Dots indicator */}
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1 z-20">
            {ads.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentIndex(index);
                  setIsAutoPlaying(false);
                }}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all",
                  index === currentIndex
                    ? "bg-white w-3"
                    : "bg-white/50 hover:bg-white/75"
                )}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
});

AdSlider.displayName = 'AdSlider';
