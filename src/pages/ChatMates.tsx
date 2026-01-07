import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ChatMateDiscovery } from "@/components/chatmates/ChatMateDiscovery";
import { ChatMateProfile } from "@/components/chatmates/ChatMateProfile";
import { ChatMateConversations } from "@/components/chatmates/ChatMateConversations";
import { ChatMateRoom } from "@/components/chatmates/ChatMateRoom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, MessageCircle, Heart, Settings } from "lucide-react";
import { motion } from "framer-motion";

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
          <div className="flex items-center justify-between">
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
        </div>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="container mx-auto px-4 pt-4">
        <TabsList className="grid w-full grid-cols-4 bg-muted/50 p-1 rounded-xl mb-4">
          <TabsTrigger value="discover" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-500 data-[state=active]:to-purple-600 data-[state=active]:text-white">
            <Users className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Discover</span>
          </TabsTrigger>
          <TabsTrigger value="matches" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-500 data-[state=active]:to-purple-600 data-[state=active]:text-white">
            <Heart className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Matches</span>
          </TabsTrigger>
          <TabsTrigger value="chats" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-500 data-[state=active]:to-purple-600 data-[state=active]:text-white">
            <MessageCircle className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Chats</span>
          </TabsTrigger>
          <TabsTrigger value="profile" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-500 data-[state=active]:to-purple-600 data-[state=active]:text-white">
            <Settings className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="discover" className="mt-0">
          <ChatMateDiscovery onMatch={() => setActiveTab("matches")} />
        </TabsContent>

        <TabsContent value="matches" className="mt-0">
          <ChatMateConversations 
            showOnlyMatches={true}
            onOpenChat={handleOpenChat}
          />
        </TabsContent>

        <TabsContent value="chats" className="mt-0">
          <ChatMateConversations 
            showOnlyMatches={false}
            onOpenChat={handleOpenChat}
          />
        </TabsContent>

        <TabsContent value="chat" className="mt-0">
          {selectedRoomId && selectedMatchUserId && (
            <ChatMateRoom 
              roomId={selectedRoomId}
              matchUserId={selectedMatchUserId}
              onBack={handleBackToConversations}
            />
          )}
        </TabsContent>

        <TabsContent value="profile" className="mt-0">
          <ChatMateProfile />
        </TabsContent>
      </Tabs>
    </div>
  );
}
