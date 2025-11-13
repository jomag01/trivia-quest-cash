import { useState } from "react";
import { PrivateChatList } from "./PrivateChatList";
import { PrivateChatView } from "./PrivateChatView";

interface PrivateChatsProps {
  onSelectConversation: (conversationId: string) => void;
  selectedConversationId: string | null;
}

export const PrivateChats = ({ onSelectConversation, selectedConversationId }: PrivateChatsProps) => {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string>("");

  const handleSelectConversation = (conversationId: string, userId: string, userName: string) => {
    setSelectedUserId(userId);
    setSelectedUserName(userName);
    onSelectConversation(conversationId);
  };

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <div className="lg:col-span-1">
        <PrivateChatList
          onSelectConversation={handleSelectConversation}
          selectedConversationId={selectedConversationId}
        />
      </div>
      <div className="lg:col-span-2">
        {selectedConversationId && selectedUserId ? (
          <PrivateChatView
            conversationId={selectedConversationId}
            otherUserId={selectedUserId}
            otherUserName={selectedUserName}
          />
        ) : (
          <div className="h-[600px] flex items-center justify-center border rounded-lg bg-muted/20">
            <p className="text-muted-foreground">Select a conversation to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
};
