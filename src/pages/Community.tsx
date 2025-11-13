import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Users } from "lucide-react";
import { GroupsList } from "@/components/community/GroupsList";
import { GroupChat } from "@/components/community/GroupChat";
import { PrivateChats } from "@/components/community/PrivateChats";
import { CreateGroupDialog } from "@/components/community/CreateGroupDialog";

const Community = () => {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageSquare className="w-8 h-8 text-primary" />
            Community
          </h1>
        </div>

        <Tabs defaultValue="groups" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="groups" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Groups
            </TabsTrigger>
            <TabsTrigger value="private" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Private Chats
            </TabsTrigger>
          </TabsList>

          <TabsContent value="groups" className="space-y-4">
            <div className="grid lg:grid-cols-3 gap-4">
              <div className="lg:col-span-1">
                <GroupsList 
                  onSelectGroup={setSelectedGroupId}
                  selectedGroupId={selectedGroupId}
                />
              </div>
              <div className="lg:col-span-2">
                {selectedGroupId ? (
                  <GroupChat groupId={selectedGroupId} />
                ) : (
                  <div className="h-[600px] flex items-center justify-center border rounded-lg bg-muted/20">
                    <p className="text-muted-foreground">Select a group to start chatting</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="private" className="space-y-4">
            <PrivateChats 
              onSelectConversation={setSelectedConversationId}
              selectedConversationId={selectedConversationId}
            />
          </TabsContent>
        </Tabs>

        <CreateGroupDialog />
      </div>
    </div>
  );
};

export default Community;
