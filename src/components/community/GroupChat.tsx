import { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Video, MoreVertical, Users, MessageSquare, Settings, Pin, Trash2, CheckCheck, Edit2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { FileUpload } from "./FileUpload";
import { VideoCallDialog } from "./VideoCallDialog";
import { MessageReactions } from "./MessageReactions";
import { MessageThread } from "./MessageThread";
import { GroupAdminPanel } from "./GroupAdminPanel";
import { GroupMembersDialog } from "./GroupMembersDialog";
import { EditMessageDialog } from "./EditMessageDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Message {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  pinned?: boolean;
  pinned_at?: string;
  pinned_by?: string;
  edited_at?: string;
  profiles?: {
    id: string;
    full_name: string | null;
  };
  read_count?: number;
}

interface GroupChatProps {
  groupId: string;
}

export const GroupChat = ({ groupId }: GroupChatProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState<string | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [createdBy, setCreatedBy] = useState<string>("");
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageContent, setEditingMessageContent] = useState("");
  const [typingUsers, setTypingUsers] = useState<Record<string, any>>({});
  const [threadMessageId, setThreadMessageId] = useState<string | null>(null);
  const [threadMessageContent, setThreadMessageContent] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (groupId) {
      fetchGroupInfo();
      fetchMessages();
      const unsubscribe = subscribeToMessages();
      subscribeToPresence();
      return unsubscribe;
    }
  }, [groupId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchGroupInfo = async () => {
    try {
      const supabaseClient: any = supabase;
      const { data, error } = await supabaseClient
        .from("groups")
        .select("name, description, is_private, created_by")
        .eq("id", groupId)
        .single();

      if (error) throw error;
      setGroupName(data.name);
      setGroupDescription(data.description);
      setIsPrivate(data.is_private);
      setCreatedBy(data.created_by);
      setIsCreator(data.created_by === user?.id);

      // Check if user is admin
      const { data: memberData } = await supabaseClient
        .from("group_members")
        .select("is_admin")
        .eq("group_id", groupId)
        .eq("user_id", user?.id)
        .single();

      setIsAdmin(memberData?.is_admin || false);
    } catch (error) {
      console.error("Error fetching group info:", error);
    }
  };

  const fetchMessages = async () => {
    try {
      const supabaseClient: any = supabase;
      
      // First get messages
      const { data: messagesData, error: messagesError } = await supabaseClient
        .from("group_messages")
        .select("*")
        .eq("group_id", groupId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true })
        .limit(100);

      if (messagesError) throw messagesError;

      // Then get profiles for all unique user IDs
      const userIds = [...new Set(messagesData?.map((m: any) => m.user_id) || [])];
      const { data: profilesData, error: profilesError } = await supabaseClient
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Combine the data
      const profilesMap = new Map(profilesData?.map((p: any) => [p.id, p]) || []);
      const messagesWithProfiles = messagesData?.map((msg: any) => ({
        ...msg,
        profiles: profilesMap.get(msg.user_id)
      })) || [];

      setMessages(messagesWithProfiles);
      
      // Mark messages as read
      if (user && messagesData.length > 0) {
        const unreadMessageIds = messagesData
          .filter((m: any) => m.user_id !== user.id)
          .map((m: any) => m.id);
        
        if (unreadMessageIds.length > 0) {
          await Promise.all(
            unreadMessageIds.map((msgId: string) =>
              supabaseClient
                .from("message_read_receipts")
                .upsert({ message_id: msgId, user_id: user.id })
                .then(() => {})
                .catch(() => {})
            )
          );
        }
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`group-messages-${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "group_messages",
          filter: `group_id=eq.${groupId}`
        },
        async (payload) => {
          // Fetch the full message with profile data
          const supabaseClient: any = supabase;
          const { data } = await supabaseClient
            .from("group_messages")
            .select(`
              *,
              profiles:user_id (
                id,
                full_name
              )
            `)
            .eq("id", payload.new.id)
            .single();

          if (data) {
            setMessages((prev) => [...prev, data]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const subscribeToPresence = async () => {
    const channel = supabase.channel(`group-presence-${groupId}`);

    await channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setTypingUsers(state);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user?.id,
            typing: false,
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const updateTypingStatus = async (typing: boolean) => {
    try {
      const channel = supabase.channel(`group-presence-${groupId}`);
      const channelState = channel.state;
      
      // Only track if channel is subscribed
      if (channelState === 'joined') {
        await channel.track({
          user_id: user?.id,
          typing,
        });
      }
    } catch (error) {
      console.error("Error updating typing status:", error);
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      // Check if user is muted
      const supabaseClient: any = supabase;
      const { data: mutedData } = await supabaseClient
        .from("muted_group_users")
        .select("*")
        .eq("group_id", groupId)
        .eq("user_id", user?.id)
        .or(`muted_until.is.null,muted_until.gt.${new Date().toISOString()}`)
        .maybeSingle();

      if (mutedData) {
        toast.error("You are muted in this group");
        return;
      }

      const { error } = await supabaseClient
        .from("group_messages")
        .insert({
          group_id: groupId,
          user_id: user?.id,
          content: newMessage.trim()
        });

      if (error) throw error;
      setNewMessage("");
      await updateTypingStatus(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast.error(error.message || "Failed to send message");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    // Update typing status
    updateTypingStatus(true);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to clear typing status after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      updateTypingStatus(false);
    }, 2000);
  };

  const getTypingUsers = () => {
    return Object.values(typingUsers)
      .flatMap((presences: any) => presences)
      .filter((presence: any) => presence.typing && presence.user_id !== user?.id);
  };

  const getUserDisplayName = (msg: Message) => {
    return msg.profiles?.full_name || `User ${msg.user_id.slice(0, 8)}`;
  };

  const handleFileUploaded = async (url: string, fileName: string, fileSize: number, fileType: string) => {
    const fileMessage = fileType.startsWith("image/")
      ? `📷 Image: ${fileName}`
      : `📎 File: ${fileName}`;

    try {
      const supabaseClient: any = supabase;
      const { error } = await supabaseClient
        .from("group_messages")
        .insert({
          group_id: groupId,
          user_id: user?.id,
          content: fileMessage
        });

      if (error) throw error;
    } catch (error: any) {
      console.error("Error sending file message:", error);
      toast.error("Failed to send file");
    }
  };

  const handlePinMessage = async (messageId: string, isPinned: boolean) => {
    try {
      const supabaseClient: any = supabase;
      const { error } = await supabaseClient
        .from("group_messages")
        .update({
          pinned: !isPinned,
          pinned_at: !isPinned ? new Date().toISOString() : null,
          pinned_by: !isPinned ? user?.id : null
        })
        .eq("id", messageId);

      if (error) throw error;
      toast.success(isPinned ? "Message unpinned" : "Message pinned");
      fetchMessages();
    } catch (error: any) {
      console.error("Error pinning message:", error);
      toast.error("Failed to pin message");
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const supabaseClient: any = supabase;
      const { error } = await supabaseClient
        .from("group_messages")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", messageId);

      if (error) throw error;
      toast.success("Message deleted");
      fetchMessages();
    } catch (error: any) {
      console.error("Error deleting message:", error);
      toast.error("Failed to delete message");
    }
  };

  const pinnedMessages = messages.filter(m => m.pinned);
  const regularMessages = messages.filter(m => !m.pinned);

  return (
    <>
    <Card className="flex flex-col h-[600px]">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h2 className="font-bold text-lg">{groupName}</h2>
          <p className="text-xs text-muted-foreground">Group Chat</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowVideoCall(true)}>
            <Video className="w-4 h-4 mr-1" />
            Call
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setShowMembersDialog(true)}>
              <Users className="w-4 h-4 mr-2" />
              View Members
            </DropdownMenuItem>
            {(isAdmin || isCreator) && (
              <DropdownMenuItem onClick={() => setShowAdminPanel(true)}>
                <Settings className="w-4 h-4 mr-2" />
                Group Settings
              </DropdownMenuItem>
            )}
            <DropdownMenuItem className="text-destructive">Leave Group</DropdownMenuItem>
          </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {loading ? (
          <p className="text-center text-muted-foreground">Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-muted-foreground">No messages yet. Start the conversation!</p>
        ) : (
          <div className="space-y-4">
            {/* Pinned Messages Section */}
            {pinnedMessages.length > 0 && (
              <div className="bg-muted/30 border rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Pin className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold">Pinned Messages</span>
                </div>
                {pinnedMessages.map((msg) => {
                  const isOwnMessage = msg.user_id === user?.id;
                  return (
                    <div
                      key={msg.id}
                      className="flex gap-3 mb-2 last:mb-0"
                    >
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="text-xs">
                          {getUserDisplayName(msg).charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold">
                            {isOwnMessage ? "You" : getUserDisplayName(msg)}
                          </span>
                        </div>
                        <div className="bg-muted px-3 py-2 rounded-lg">
                          <p className="text-sm">{msg.content}</p>
                        </div>
                      </div>
                      {(isAdmin || isCreator) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePinMessage(msg.id, true)}
                        >
                          <Pin className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Regular Messages */}
            {regularMessages.map((msg) => {
              const isOwnMessage = msg.user_id === user?.id;
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isOwnMessage ? "flex-row-reverse" : ""}`}
                >
                  <Avatar className="w-8 h-8">
                    <AvatarFallback>
                      {getUserDisplayName(msg).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`flex flex-col ${isOwnMessage ? "items-end" : ""}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold">
                        {isOwnMessage ? "You" : getUserDisplayName(msg)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="space-y-2">
                        <div
                          className={`px-4 py-2 rounded-lg max-w-md ${
                            isOwnMessage
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          <p className="text-sm">{msg.content}</p>
                          {msg.edited_at && (
                            <span className="text-xs opacity-70 italic">
                              (edited)
                            </span>
                          )}
                        </div>
                      
                      <div className="flex items-center gap-2">
                        <MessageReactions
                          messageId={msg.id}
                          messageType="group"
                          reactions={[]}
                          onReactionUpdate={() => fetchMessages()}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => {
                            setThreadMessageId(msg.id);
                            setThreadMessageContent(msg.content);
                          }}
                        >
                          <MessageSquare className="w-3 h-3 mr-1" />
                          Reply
                        </Button>
                        {(isAdmin || isCreator) && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => handlePinMessage(msg.id, msg.pinned || false)}
                            >
                              <Pin className="w-3 h-3 mr-1" />
                              {msg.pinned ? "Unpin" : "Pin"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-destructive"
                              onClick={() => handleDeleteMessage(msg.id)}
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Delete
                            </Button>
                          </>
                        )}
                        {isOwnMessage && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => {
                              setEditingMessageId(msg.id);
                              setEditingMessageContent(msg.content);
                            }}
                          >
                            <Edit2 className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                        )}
                        {msg.read_count !== undefined && msg.read_count > 0 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <CheckCheck className="w-3 h-3" />
                            <span>{msg.read_count}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {getTypingUsers().length > 0 && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm italic px-4">
                <span className="animate-pulse">Someone is typing...</span>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t">
        <div className="flex items-center gap-2">
          <FileUpload onFileUploaded={handleFileUploaded} />
          <Input
            value={newMessage}
            onChange={handleInputChange}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!newMessage.trim()}>
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </form>
    </Card>

    <VideoCallDialog
      open={showVideoCall}
      onOpenChange={setShowVideoCall}
      groupId={groupId}
      groupName={groupName}
    />

    <MessageThread
      messageId={threadMessageId || ""}
      messageContent={threadMessageContent}
      messageType="group"
      groupId={groupId}
      open={!!threadMessageId}
      onOpenChange={(open) => !open && setThreadMessageId(null)}
    />

    <GroupAdminPanel
      open={showAdminPanel}
      onOpenChange={setShowAdminPanel}
      groupId={groupId}
      groupName={groupName}
      groupDescription={groupDescription}
      isPrivate={isPrivate}
      isCreator={isCreator}
      createdBy={createdBy}
      onGroupUpdated={fetchGroupInfo}
    />

    <GroupMembersDialog
      open={showMembersDialog}
      onOpenChange={setShowMembersDialog}
      groupId={groupId}
      groupName={groupName}
      isAdmin={isAdmin}
      isCreator={isCreator}
    />

    <EditMessageDialog
      open={!!editingMessageId}
      onOpenChange={(open) => !open && setEditingMessageId(null)}
      messageId={editingMessageId || ""}
      currentContent={editingMessageContent}
      onSuccess={fetchMessages}
    />
    </>
  );
};
