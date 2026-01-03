import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface FeedTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function FeedTabs({ activeTab, onTabChange }: FeedTabsProps) {
  return (
    <div className="sticky top-14 z-40 bg-black/80 backdrop-blur-md border-b border-zinc-800/50">
      <Tabs value={activeTab} onValueChange={onTabChange}>
        <TabsList className="w-full h-12 justify-center gap-0 rounded-none bg-transparent p-0">
          <TabsTrigger
            value="for-you"
            className="flex-1 max-w-[160px] h-12 rounded-none border-b-2 border-transparent text-zinc-500 data-[state=active]:border-amber-500 data-[state=active]:text-white data-[state=active]:bg-transparent font-semibold transition-colors"
          >
            For You
          </TabsTrigger>
          <TabsTrigger
            value="following"
            className="flex-1 max-w-[160px] h-12 rounded-none border-b-2 border-transparent text-zinc-500 data-[state=active]:border-amber-500 data-[state=active]:text-white data-[state=active]:bg-transparent font-semibold transition-colors"
          >
            Following
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
