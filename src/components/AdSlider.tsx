import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Ad {
  id: string;
  title: string;
  image_url: string;
  link_url: string | null;
  display_order: number;
}

export const AdSlider = () => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    fetchAds();
  }, []);

  useEffect(() => {
    if (!isAutoPlaying || ads.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % ads.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, ads.length]);

  const fetchAds = async () => {
    const { data, error } = await supabase
      .from("ads")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

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
      console.error("Error tracking ad interaction:", error);
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
  }, [currentIndex, ads]);

  if (ads.length === 0) return null;

  return (
    <Card className="relative w-full overflow-hidden bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
      <div className="relative h-32 md:h-48">
        {ads.map((ad, index) => (
          <div
            key={ad.id}
            className={`absolute inset-0 transition-opacity duration-500 ${
              index === currentIndex ? "opacity-100" : "opacity-0"
            }`}
          >
            <div
              onClick={() => handleAdClick(ad)}
              className="w-full h-full cursor-pointer group"
            >
              <img
                src={ad.image_url}
                alt={ad.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <h3 className="text-white font-bold text-lg md:text-xl drop-shadow-lg">
                  {ad.title}
                </h3>
              </div>
            </div>
          </div>
        ))}
      </div>

      {ads.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white"
            onClick={prevSlide}
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white"
            onClick={nextSlide}
          >
            <ChevronRight className="w-6 h-6" />
          </Button>

          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
            {ads.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentIndex(index);
                  setIsAutoPlaying(false);
                }}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex
                    ? "bg-white w-4"
                    : "bg-white/50 hover:bg-white/75"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </Card>
  );
};
