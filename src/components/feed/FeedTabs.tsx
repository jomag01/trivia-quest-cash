import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface FeedTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function FeedTabs({ activeTab, onTabChange }: FeedTabsProps) {
  return (
    <div className="sticky top-14 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
      <Tabs value={activeTab} onValueChange={onTabChange}>
        <TabsList className="w-full h-12 justify-center gap-0 rounded-none bg-transparent p-0">
          <TabsTrigger
            value="for-you"
            className="flex-1 max-w-[160px] h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-semibold"
          >
            For You
          </TabsTrigger>
          <TabsTrigger
            value="following"
            className="flex-1 max-w-[160px] h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-semibold"
          >
            Following
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
