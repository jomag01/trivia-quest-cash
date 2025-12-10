import { useState, useEffect, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, Send, ChevronDown, ChevronUp, MoreHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  parent_comment_id?: string;
  profiles?: {
    full_name: string;
    avatar_url?: string;
  };
  replies?: Comment[];
  likes_count?: number;
}

interface CommentsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
}

export default function CommentsSheet({ open, onOpenChange, postId }: CommentsSheetProps) {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && postId) {
      fetchComments();
    }
  }, [open, postId]);

  const fetchComments = async () => {
    setLoading(true);
    
    const { data } = await supabase
      .from("post_comments")
      .select("*")
      .eq("post_id", postId)
      .is("parent_comment_id", null)
      .order("created_at", { ascending: false });

    if (data) {
      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Fetch replies for each comment
      const commentsWithReplies = await Promise.all(
        data.map(async (comment) => {
          const { data: replies } = await supabase
            .from("post_comments")
            .select("*")
            .eq("parent_comment_id", comment.id)
            .order("created_at", { ascending: true });

          const replyUserIds = replies?.map(r => r.user_id) || [];
          if (replyUserIds.length > 0) {
            const { data: replyProfiles } = await supabase
              .from("profiles")
              .select("id, full_name, avatar_url")
              .in("id", replyUserIds);
            
            replyProfiles?.forEach(p => profileMap.set(p.id, p));
          }

          return {
            ...comment,
            profiles: profileMap.get(comment.user_id),
            replies: replies?.map(r => ({
              ...r,
              profiles: profileMap.get(r.user_id)
            })) || []
          };
        })
      );

      setComments(commentsWithReplies);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from("post_comments").insert({
        post_id: postId,
        user_id: user.id,
        content: newComment.trim(),
        parent_comment_id: replyingTo
      });

      if (error) throw error;

      setNewComment("");
      setReplyingTo(null);
      fetchComments();
    } catch {
      toast.error("Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleReplies = (commentId: string) => {
    const newExpanded = new Set(expandedReplies);
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId);
    } else {
      newExpanded.add(commentId);
    }
    setExpandedReplies(newExpanded);
  };

  const startReply = (commentId: string) => {
    setReplyingTo(commentId);
    inputRef.current?.focus();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-0">
        <SheetHeader className="px-4 py-3 border-b">
          <div className="w-12 h-1 bg-muted rounded-full mx-auto mb-2" />
          <SheetTitle className="text-center">Comments</SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(85vh-140px)]">
          <div className="p-4 space-y-4">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded animate-pulse w-24" />
                      <div className="h-4 bg-muted rounded animate-pulse w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No comments yet</p>
                <p className="text-sm">Be the first to comment!</p>
              </div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="animate-fade-in">
                  {/* Main comment */}
                  <div className="flex gap-3">
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarImage src={comment.profiles?.avatar_url || ""} />
                      <AvatarFallback className="bg-secondary text-sm">
                        {comment.profiles?.full_name?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-semibold text-sm">
                            {comment.profiles?.full_name || "Anonymous"}
                          </span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-sm mt-1">{comment.content}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                          <Heart className="w-3.5 h-3.5" />
                          Like
                        </button>
                        <button 
                          onClick={() => startReply(comment.id)}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          Reply
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="ml-12 mt-3">
                      {!expandedReplies.has(comment.id) && (
                        <button
                          onClick={() => toggleReplies(comment.id)}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <ChevronDown className="w-4 h-4" />
                          View {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                        </button>
                      )}

                      {expandedReplies.has(comment.id) && (
                        <>
                          <button
                            onClick={() => toggleReplies(comment.id)}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3"
                          >
                            <ChevronUp className="w-4 h-4" />
                            Hide replies
                          </button>
                          <div className="space-y-3">
                            {comment.replies.map((reply) => (
                              <div key={reply.id} className="flex gap-2">
                                <Avatar className="h-8 w-8 flex-shrink-0">
                                  <AvatarImage src={reply.profiles?.avatar_url || ""} />
                                  <AvatarFallback className="bg-secondary text-xs">
                                    {reply.profiles?.full_name?.[0] || "U"}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <span className="font-semibold text-sm">
                                    {reply.profiles?.full_name || "Anonymous"}
                                  </span>
                                  <span className="text-xs text-muted-foreground ml-2">
                                    {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                                  </span>
                                  <p className="text-sm mt-0.5">{reply.content}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Comment input */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background safe-area-bottom">
          {replyingTo && (
            <div className="flex items-center justify-between mb-2 text-sm text-muted-foreground">
              <span>Replying to comment</span>
              <button onClick={() => setReplyingTo(null)} className="text-accent">Cancel</button>
            </div>
          )}
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarImage src={(profile as any)?.avatar_url || ""} />
              <AvatarFallback className="bg-secondary text-xs">
                {profile?.full_name?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
            <Input
              ref={inputRef}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={user ? "Add a comment..." : "Sign in to comment"}
              disabled={!user || submitting}
              className="flex-1 rounded-full bg-secondary border-0"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!user || !newComment.trim() || submitting}
              className="rounded-full h-9 w-9"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
