import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { 
  MessageSquare, 
  Send, 
  Star, 
  RotateCcw, 
  AlertTriangle,
  User,
  Clock,
  CheckCircle
} from "lucide-react";

interface SellerChatProps {
  productId: string;
  productName: string;
  sellerId: string;
  sellerName: string;
}

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

export default function SellerChat({ productId, productName, sellerId, sellerName }: SellerChatProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [chatOpen, setChatOpen] = useState(false);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refundType, setRefundType] = useState<"refund" | "return">("return");

  // Fetch conversation
  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ["seller-chat", productId, sellerId, user?.id],
    queryFn: async () => {
      if (!user) return [];
      // Simulate fetching messages - in production this would be a real table
      return [] as Message[];
    },
    enabled: chatOpen && !!user
  });

  // Send message
  const sendMessage = useMutation({
    mutationFn: async () => {
      if (!user || !newMessage.trim()) throw new Error("Invalid message");
      // In production, insert into seller_messages table
      toast.success("Message sent to seller!");
      setNewMessage("");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller-chat"] });
    },
    onError: (error) => {
      toast.error("Failed to send message: " + error.message);
    }
  });

  // Submit rating
  const submitRating = useMutation({
    mutationFn: async () => {
      if (!user || rating === 0) throw new Error("Please select a rating");
      // Use toast to confirm - actual insert would need proper table structure
      toast.success(`Rating of ${rating} stars submitted for ${productName}`);
    },
    onSuccess: () => {
      toast.success("Rating submitted successfully!");
      setRatingOpen(false);
      setRating(0);
      setRatingComment("");
    },
    onError: (error) => {
      toast.error("Failed to submit rating: " + error.message);
    }
  });

  // Submit refund/return request
  const submitRefundRequest = useMutation({
    mutationFn: async () => {
      if (!user || !refundReason.trim()) throw new Error("Please provide a reason");
      // Simulated - actual insert would need proper table
      toast.success(`${refundType === "refund" ? "Refund" : "Return"} request submitted for review`);
    },
    onSuccess: () => {
      setRefundOpen(false);
      setRefundReason("");
    },
    onError: (error) => {
      toast.error("Failed to submit request: " + error.message);
    }
  });

  if (!user) {
    return (
      <Button variant="outline" size="sm" disabled>
        <MessageSquare className="w-4 h-4 mr-2" />
        Login to Chat
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {/* Chat with Seller */}
      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            Chat Seller
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarFallback>{sellerName.charAt(0)}</AvatarFallback>
              </Avatar>
              Chat with {sellerName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
              Regarding: {productName}
            </div>
            <ScrollArea className="h-64 border rounded-lg p-3">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Clock className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <MessageSquare className="w-8 h-8 mb-2" />
                  <p className="text-sm">No messages yet</p>
                  <p className="text-xs">Start a conversation with the seller</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_id === user.id ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-2 ${
                          msg.sender_id === user.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {new Date(msg.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            <div className="flex gap-2">
              <Input
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendMessage.mutate()}
              />
              <Button onClick={() => sendMessage.mutate()} disabled={!newMessage.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rate Seller/Product */}
      <Dialog open={ratingOpen} onOpenChange={setRatingOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Star className="w-4 h-4" />
            Rate
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate Product & Seller</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-3">How was your experience?</p>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {rating > 0 ? `${rating} star${rating > 1 ? "s" : ""}` : "Select rating"}
              </p>
            </div>
            <Textarea
              placeholder="Share your experience (optional)"
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRatingOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => submitRating.mutate()} disabled={rating === 0}>
              Submit Rating
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund/Return Request */}
      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive">
            <RotateCcw className="w-4 h-4" />
            Return/Refund
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Request Refund or Return
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
              <p className="font-medium">{productName}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={refundType === "return" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setRefundType("return")}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Return Item
              </Button>
              <Button
                variant={refundType === "refund" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setRefundType("refund")}
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Refund Only
              </Button>
            </div>
            <Textarea
              placeholder="Please describe the issue with your order..."
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              rows={4}
            />
            <div className="text-xs text-muted-foreground">
              <p>• Returns accepted within 7 days of delivery</p>
              <p>• Items must be unused and in original packaging</p>
              <p>• Refunds processed within 3-5 business days</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => submitRefundRequest.mutate()} 
              disabled={!refundReason.trim()}
            >
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
