import { Card } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

interface PrivateChatsProps {
  onSelectConversation: (conversationId: string) => void;
  selectedConversationId: string | null;
}

export const PrivateChats = ({ onSelectConversation, selectedConversationId }: PrivateChatsProps) => {
  return (
    <Card className="p-8 text-center h-[600px] flex items-center justify-center">
      <div>
        <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Private Chats Coming Soon</h3>
        <p className="text-muted-foreground">
          1-on-1 messaging will be available in the next update
        </p>
      </div>
    </Card>
  );
};
