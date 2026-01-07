import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, Send, MoreVertical, Flag, 
  Sparkles, Shield, AlertTriangle
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Message {
  id: string;
  sender_id: string;
  message: string;
  message_type: string;
  is_ai_generated: boolean;
  created_at: string;
}

interface ChatMateRoomProps {
  roomId: string;
  matchUserId: string;
  onBack: () => void;
}

export function ChatMateRoom({ roomId, matchUserId, onBack }: ChatMateRoomProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [matchProfile, setMatchProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMatchProfile();
    fetchMessages();
    
    // Subscribe to new messages
    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chatmate_messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMatchProfile = async () => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, trust_score")
        .eq("id", matchUserId)
        .single();
      
      setMatchProfile(data);
    } catch (error) {
      console.error("Error fetching match profile:", error);
    }
  };

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("chatmate_messages")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending || !user) return;

    setSending(true);
    const messageText = newMessage.trim();
    setNewMessage("");

    try {
      const { error } = await supabase
        .from("chatmate_messages")
        .insert({
          room_id: roomId,
          sender_id: user.id,
          message: messageText,
          message_type: "text"
        });

      if (error) throw error;

      // Update room's last_message_at
      await supabase
        .from("chatmate_rooms")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", roomId);
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
      setNewMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  const handleReport = async () => {
    if (!reportReason.trim() || !user) return;

    try {
      await supabase
        .from("chatmate_reports")
        .insert({
          reported_user_id: matchUserId,
          reporter_user_id: user.id,
          room_id: roomId,
          reason: reportReason.trim(),
          severity: 2
        });

      toast.success("Report submitted. Our team will review it.");
      setShowReportDialog(false);
      setReportReason("");
    } catch (error) {
      console.error("Error submitting report:", error);
      toast.error("Failed to submit report");
    }
  };

  const generateIcebreaker = async () => {
    if (sending) return;
    
    setSending(true);
    try {
      // Simple icebreakers - in production, use AI
      const icebreakers = [
        "Hey! I noticed we have similar interests. What got you into that?",
        "Hi there! 👋 What's been the highlight of your week?",
        "Hello! I'd love to hear about what you're passionate about!",
        "Hey! What's the most interesting thing you've learned recently?",
        "Hi! I'm curious - what made you want to connect on here?"
      ];

      const randomIcebreaker = icebreakers[Math.floor(Math.random() * icebreakers.length)];

      const { error } = await supabase
        .from("chatmate_messages")
        .insert({
          room_id: roomId,
          sender_id: user?.id,
          message: randomIcebreaker,
          message_type: "text",
          is_ai_generated: true
        });

      if (error) throw error;
      toast.success("AI icebreaker sent!");
    } catch (error) {
      console.error("Error generating icebreaker:", error);
      toast.error("Failed to generate icebreaker");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[75vh] max-w-2xl mx-auto bg-background rounded-xl border shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-gradient-to-r from-rose-50 to-purple-50 dark:from-rose-950/20 dark:to-purple-950/20">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <Avatar className="w-10 h-10 border-2 border-white dark:border-muted">
          <AvatarImage src={matchProfile?.avatar_url || ""} />
          <AvatarFallback className="bg-gradient-to-br from-rose-400 to-purple-500 text-white">
            {(matchProfile?.full_name || "?")[0]}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <h3 className="font-semibold">{matchProfile?.full_name || "Chat Mate"}</h3>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Shield className="w-3 h-3" />
            Trust Score: {matchProfile?.trust_score || 100}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setShowReportDialog(true)}>
              <Flag className="w-4 h-4 mr-2" />
              Report User
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-12 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-rose-100 to-purple-100 dark:from-rose-900/30 dark:to-purple-900/30 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-rose-500" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Start the conversation!</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Say hello or use the AI icebreaker to get things started.
              </p>
            </div>
            <Button
              onClick={generateIcebreaker}
              disabled={sending}
              variant="outline"
              className="gap-2"
            >
              <Sparkles className="w-4 h-4" />
              AI Icebreaker
            </Button>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isOwn = msg.sender_id === user?.id;
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                    isOwn
                      ? "bg-gradient-to-r from-rose-500 to-purple-600 text-white rounded-br-md"
                      : "bg-muted rounded-bl-md"
                  }`}
                >
                  {msg.is_ai_generated && (
                    <div className={`flex items-center gap-1 text-xs mb-1 ${isOwn ? "text-white/70" : "text-muted-foreground"}`}>
                      <Sparkles className="w-3 h-3" />
                      AI Suggested
                    </div>
                  )}
                  <p className="text-sm">{msg.message}</p>
                  <p className={`text-[10px] mt-1 ${isOwn ? "text-white/60" : "text-muted-foreground"}`}>
                    {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-background">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={generateIcebreaker}
            disabled={sending}
            className="shrink-0"
          >
            <Sparkles className="w-5 h-5 text-rose-500" />
          </Button>
          
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            disabled={sending}
            className="flex-1"
          />
          
          <Button
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending}
            size="icon"
            className="shrink-0 bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-600 hover:to-purple-700"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Report User
            </DialogTitle>
            <DialogDescription>
              Please describe why you're reporting this user. Our moderation team will review your report.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Reason for report</Label>
              <Textarea
                placeholder="Describe the issue..."
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleReport}
              disabled={!reportReason.trim()}
              variant="destructive"
            >
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
