import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Video, Users, Compass, ShoppingBag, Gamepad2 } from "lucide-react";

interface FeedTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function FeedTabs({ activeTab, onTabChange }: FeedTabsProps) {
  return (
    <div className="sticky top-14 z-50 bg-background/95 backdrop-blur-lg border-b border-border shadow-sm">
      <Tabs value={activeTab} onValueChange={onTabChange}>
        <TabsList className="w-full h-12 justify-start gap-0 rounded-none bg-transparent p-0 overflow-x-auto scrollbar-hide">
          <TabsTrigger
            value="for-you"
            className="flex-1 min-w-[80px] h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent font-semibold"
          >
            For You
          </TabsTrigger>
          <TabsTrigger
            value="following"
            className="flex-1 min-w-[80px] h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent font-semibold"
          >
            <Users className="w-4 h-4 mr-1.5 hidden sm:block" />
            Following
          </TabsTrigger>
          <TabsTrigger
            value="live"
            className="flex-1 min-w-[80px] h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent font-semibold"
          >
            <Video className="w-4 h-4 mr-1.5 text-destructive" />
            Live
          </TabsTrigger>
          <TabsTrigger
            value="discover"
            className="flex-1 min-w-[80px] h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent font-semibold"
          >
            <Compass className="w-4 h-4 mr-1.5 hidden sm:block" />
            Explore
          </TabsTrigger>
          <TabsTrigger
            value="shop"
            className="flex-1 min-w-[80px] h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent font-semibold"
          >
            <ShoppingBag className="w-4 h-4 mr-1.5 hidden sm:block" />
            Shop
          </TabsTrigger>
          <TabsTrigger
            value="games"
            className="flex-1 min-w-[80px] h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent font-semibold"
          >
            <Gamepad2 className="w-4 h-4 mr-1.5 hidden sm:block" />
            Games
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
