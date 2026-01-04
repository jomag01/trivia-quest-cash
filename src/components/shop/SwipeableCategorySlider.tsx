import { memo, useRef, useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  icon?: string;
}

interface SwipeableCategorySliderProps {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (id: string) => void;
}

// Category icons mapping - Lazada/Amazon style
const categoryIcons: Record<string, string> = {
  'electronics': '📱',
  'fashion': '👕',
  'food': '🍔',
  'games': '🎮',
  'home': '🏠',
  'beauty': '💄',
  'sports': '⚽',
  'toys': '🧸',
  'books': '📚',
  'automotive': '🚗',
  'health': '💊',
  'pets': '🐕',
};

const getIcon = (name: string, icon?: string): string => {
  if (icon) return icon;
  const key = name.toLowerCase();
  for (const [k, v] of Object.entries(categoryIcons)) {
    if (key.includes(k)) return v;
  }
  return '🛍️';
};

const SwipeableCategorySlider = memo(({ 
  categories, 
  selectedCategory, 
  onSelectCategory 
}: SwipeableCategorySliderProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(true);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowLeftFade(el.scrollLeft > 10);
    setShowRightFade(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      handleScroll();
      el.addEventListener('scroll', handleScroll, { passive: true });
      return () => el.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  // Scroll selected category into view
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const selectedEl = el.querySelector(`[data-category="${selectedCategory}"]`);
    if (selectedEl) {
      selectedEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [selectedCategory]);

  return (
    <div className="relative">
      {/* Left fade */}
      {showLeftFade && (
        <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      )}
      
      {/* Right fade */}
      {showRightFade && (
        <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
      )}

      <div 
        ref={scrollRef}
        className="flex gap-1.5 overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory touch-pan-x py-1.5 -mx-1 px-1"
        style={{ 
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
        {/* All Category */}
        <button
          data-category="all"
          onClick={() => onSelectCategory("all")}
          className={cn(
            "shrink-0 snap-start flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-lg transition-all duration-200 min-w-[52px]",
            selectedCategory === "all"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted/60 text-foreground hover:bg-muted"
          )}
        >
          <span className="text-base leading-none">🔥</span>
          <span className="text-[9px] font-medium whitespace-nowrap">All</span>
        </button>

        {categories.map((cat) => (
          <button
            key={cat.id}
            data-category={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className={cn(
              "shrink-0 snap-start flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-lg transition-all duration-200 min-w-[52px]",
              selectedCategory === cat.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/60 text-foreground hover:bg-muted"
            )}
          >
            <span className="text-base leading-none">{getIcon(cat.name, cat.icon)}</span>
            <span className="text-[9px] font-medium whitespace-nowrap max-w-[48px] truncate">
              {cat.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
});

SwipeableCategorySlider.displayName = 'SwipeableCategorySlider';

export default SwipeableCategorySlider;
