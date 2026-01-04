import { memo } from "react";
import { cn } from "@/lib/utils";
import { Flame, Brain, Star, TrendingUp, Sparkles } from "lucide-react";

type QuickTabType = 'all' | 'deals' | 'ai_picks' | 'top_rated' | 'trending';

interface QuickTabsProps {
  activeTab: QuickTabType;
  onTabChange: (tab: QuickTabType) => void;
}

const tabs = [
  { id: 'all' as const, label: 'All', icon: Sparkles },
  { id: 'deals' as const, label: 'Deals', icon: Flame },
  { id: 'ai_picks' as const, label: 'AI Picks', icon: Brain },
  { id: 'top_rated' as const, label: 'Top Rated', icon: Star },
  { id: 'trending' as const, label: 'Trending', icon: TrendingUp },
];

const QuickTabs = memo(({ activeTab, onTabChange }: QuickTabsProps) => {
  return (
    <div className="flex gap-1 overflow-x-auto scrollbar-hide py-1 -mx-1 px-1">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium transition-all duration-200",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="w-3 h-3" />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
});

QuickTabs.displayName = 'QuickTabs';

export default QuickTabs;
export type { QuickTabType };
