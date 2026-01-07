import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ChatMateDiscovery } from "@/components/chatmates/ChatMateDiscovery";
import { ChatMateProfile } from "@/components/chatmates/ChatMateProfile";
import { ChatMateConversations } from "@/components/chatmates/ChatMateConversations";
import { ChatMateRoom } from "@/components/chatmates/ChatMateRoom";
import { ChatMateGameMatching } from "@/components/chatmates/ChatMateGameMatching";
import { ChatMateBusinessNetworking } from "@/components/chatmates/ChatMateBusinessNetworking";
import { ChatMatePremiumVisibility } from "@/components/chatmates/ChatMatePremiumVisibility";
import { ChatMateAICoach } from "@/components/chatmates/ChatMateAICoach";
import { ChatMateTermsSafety } from "@/components/chatmates/ChatMateTermsSafety";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, MessageCircle, Heart, Settings, Gamepad2, Briefcase, Crown, Bot, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export default function ChatMates() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("discover");
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedMatchUserId, setSelectedMatchUserId] = useState<string | null>(null);

  const handleOpenChat = (roomId: string, userId: string) => {
    setSelectedRoomId(roomId);
    setSelectedMatchUserId(userId);
    setActiveTab("chat");
  };

  const handleBackToConversations = () => {
    setSelectedRoomId(null);
    setSelectedMatchUserId(null);
    setActiveTab("chats");
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-background to-purple-50 dark:from-rose-950/20 dark:via-background dark:to-purple-950/20 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-rose-400 to-purple-500 flex items-center justify-center">
            <Heart className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold">Find Your Chat Mates</h2>
          <p className="text-muted-foreground max-w-sm">
            Connect with like-minded people based on your interests. Sign in to start discovering!
          </p>
          <a href="/auth" className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-rose-500 to-purple-600 text-white font-medium rounded-full hover:opacity-90 transition-opacity">
            Sign In to Get Started
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-background to-purple-50 dark:from-rose-950/20 dark:via-background dark:to-purple-950/20 pb-20">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b"
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-400 to-purple-500 flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-rose-500 to-purple-600 bg-clip-text text-transparent">
                Chat Mates
              </h1>
              <p className="text-xs text-muted-foreground">Interest-based connections</p>
            </div>
          </div>
        </div>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="container mx-auto px-4 pt-4">
        <ScrollArea className="w-full whitespace-nowrap">
          <TabsList className="inline-flex w-max bg-muted/50 p-1 rounded-xl mb-4">
            <TabsTrigger value="discover" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-500 data-[state=active]:to-purple-600 data-[state=active]:text-white">
              <Users className="w-4 h-4 mr-1" />
              <span className="text-xs">Discover</span>
            </TabsTrigger>
            <TabsTrigger value="matches" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-500 data-[state=active]:to-purple-600 data-[state=active]:text-white">
              <Heart className="w-4 h-4 mr-1" />
              <span className="text-xs">Matches</span>
            </TabsTrigger>
            <TabsTrigger value="chats" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-500 data-[state=active]:to-purple-600 data-[state=active]:text-white">
              <MessageCircle className="w-4 h-4 mr-1" />
              <span className="text-xs">Chats</span>
            </TabsTrigger>
            <TabsTrigger value="games" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white">
              <Gamepad2 className="w-4 h-4 mr-1" />
              <span className="text-xs">Games</span>
            </TabsTrigger>
            <TabsTrigger value="business" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white">
              <Briefcase className="w-4 h-4 mr-1" />
              <span className="text-xs">Business</span>
            </TabsTrigger>
            <TabsTrigger value="premium" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-orange-600 data-[state=active]:text-white">
              <Crown className="w-4 h-4 mr-1" />
              <span className="text-xs">Premium</span>
            </TabsTrigger>
            <TabsTrigger value="coach" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-purple-600 data-[state=active]:text-white">
              <Bot className="w-4 h-4 mr-1" />
              <span className="text-xs">AI Coach</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-500 data-[state=active]:to-purple-600 data-[state=active]:text-white">
              <Settings className="w-4 h-4 mr-1" />
              <span className="text-xs">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="safety" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white">
              <Shield className="w-4 h-4 mr-1" />
              <span className="text-xs">Safety</span>
            </TabsTrigger>
          </TabsList>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <TabsContent value="discover" className="mt-0">
          <ChatMateDiscovery onMatch={() => setActiveTab("matches")} />
        </TabsContent>
        <TabsContent value="matches" className="mt-0">
          <ChatMateConversations showOnlyMatches={true} onOpenChat={handleOpenChat} />
        </TabsContent>
        <TabsContent value="chats" className="mt-0">
          <ChatMateConversations showOnlyMatches={false} onOpenChat={handleOpenChat} />
        </TabsContent>
        <TabsContent value="chat" className="mt-0">
          {selectedRoomId && selectedMatchUserId && (
            <ChatMateRoom roomId={selectedRoomId} matchUserId={selectedMatchUserId} onBack={handleBackToConversations} />
          )}
        </TabsContent>
        <TabsContent value="games" className="mt-0">
          <ChatMateGameMatching />
        </TabsContent>
        <TabsContent value="business" className="mt-0">
          <ChatMateBusinessNetworking />
        </TabsContent>
        <TabsContent value="premium" className="mt-0">
          <ChatMatePremiumVisibility />
        </TabsContent>
        <TabsContent value="coach" className="mt-0">
          <ChatMateAICoach />
        </TabsContent>
        <TabsContent value="profile" className="mt-0">
          <ChatMateProfile />
        </TabsContent>
        <TabsContent value="safety" className="mt-0">
          <ChatMateTermsSafety />
        </TabsContent>
      </Tabs>
    </div>
  );
}
