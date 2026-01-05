import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Send, Loader2, Lock, MessageCircle } from "lucide-react";
import { format } from "date-fns";

interface AuctionChatDialogProps {
  escrow: {
    id: string;
    auction_id: string;
    buyer_id: string;
    seller_id: string;
    status: string;
  } | null;
  auctionTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Message {
  id: string;
  message: string;
  sender_id: string;
  created_at: string;
  is_read: boolean;
  sender?: {
    full_name: string;
    avatar_url: string;
  };
}

const AuctionChatDialog = ({ escrow, auctionTitle, open, onOpenChange }: AuctionChatDialogProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Chat is only enabled after payment is confirmed
  const isChatEnabled = escrow && ["paid", "shipped", "delivered", "released"].includes(escrow.status);

  useEffect(() => {
    if (open && escrow && isChatEnabled) {
      fetchMessages();
      
      // Subscribe to new messages
      const channel = supabase
        .channel(`auction-chat-${escrow.auction_id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "auction_messages",
            filter: `auction_id=eq.${escrow.auction_id}`,
          },
          (payload) => {
            fetchMessages();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [open, escrow, isChatEnabled]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async () => {
    if (!escrow) return;
    setLoading(true);
    
    const { data, error } = await supabase
      .from("auction_messages")
      .select(`
        id, message, sender_id, created_at, is_read,
        sender:profiles!auction_messages_sender_id_fkey(full_name, avatar_url)
      `)
      .eq("auction_id", escrow.auction_id)
      .order("created_at", { ascending: true });

    if (data) {
      setMessages(data as any);
      // Mark messages as read
      if (user) {
        await supabase
          .from("auction_messages")
          .update({ is_read: true })
          .eq("auction_id", escrow.auction_id)
          .eq("receiver_id", user.id)
          .eq("is_read", false);
      }
    }
    setLoading(false);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !escrow || !user) return;

    setSending(true);
    const receiverId = user.id === escrow.seller_id ? escrow.buyer_id : escrow.seller_id;

    const { error } = await supabase
      .from("auction_messages")
      .insert({
        auction_id: escrow.auction_id,
        sender_id: user.id,
        receiver_id: receiverId,
        message: newMessage.trim(),
      });

    if (error) {
      toast.error("Failed to send message");
    } else {
      setNewMessage("");
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!escrow) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-amber-500" />
            <span className="truncate">{auctionTitle}</span>
          </DialogTitle>
        </DialogHeader>

        {!isChatEnabled ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <Lock className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">Chat Locked</h3>
            <p className="text-sm text-muted-foreground">
              Chat will be available once the payment is confirmed. This helps protect both buyer and seller during the transaction process.
            </p>
            <p className="text-xs text-muted-foreground mt-4">
              Current status: <span className="font-medium capitalize">{escrow.status.replace("_", " ")}</span>
            </p>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 p-4 max-h-[400px]" ref={scrollRef as any}>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No messages yet</p>
                  <p className="text-xs">Start the conversation!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => {
                    const isOwn = msg.sender_id === user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}
                      >
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarImage src={msg.sender?.avatar_url} />
                          <AvatarFallback>
                            {msg.sender?.full_name?.[0] || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                            isOwn
                              ? "bg-amber-500 text-white rounded-br-md"
                              : "bg-muted rounded-bl-md"
                          }`}
                        >
                          <p className="text-sm break-words">{msg.message}</p>
                          <p
                            className={`text-xs mt-1 ${
                              isOwn ? "text-amber-100" : "text-muted-foreground"
                            }`}
                          >
                            {format(new Date(msg.created_at), "h:mm a")}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={sending}
                  className="flex-1"
                />
                <Button
                  onClick={handleSend}
                  disabled={!newMessage.trim() || sending}
                  className="bg-amber-500 hover:bg-amber-600"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AuctionChatDialog;