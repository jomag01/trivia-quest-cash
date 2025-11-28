import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThumbsUp, MessageCircle, Smile, Reply } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  parent_comment_id: string | null;
  profiles?: {
    full_name: string | null;
  };
  reactions?: Array<{
    reaction_type: string;
    count: number;
    user_reacted: boolean;
  }>;
  replies?: Comment[];
}

interface Props {
  postId: string;
  showComments: boolean;
}

const REACTION_EMOJIS = {
  like: "👍",
  love: "❤️",
  laugh: "😂",
  wow: "😮",
};

export function PostCardComments({ postId, showComments }: Props) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");

  useEffect(() => {
    if (showComments) {
      loadComments();
    }
  }, [showComments, postId]);

  const loadComments = async () => {
    const { data: commentsData } = await supabase
      .from("post_comments")
      .select("id, content, created_at, user_id, parent_comment_id")
      .eq("post_id", postId)
      .is("parent_comment_id", null)
      .order("created_at", { ascending: false });

    if (commentsData) {
      const userIds = [...new Set(commentsData.map(c => c.user_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      // Load reactions and replies for each comment
      const enrichedComments = await Promise.all(
        commentsData.map(async (comment) => {
          const reactions = await loadCommentReactions(comment.id);
          const replies = await loadReplies(comment.id, profilesData || []);
          
          return {
            ...comment,
            profiles: profilesData?.find(p => p.id === comment.user_id),
            reactions,
            replies,
          };
        })
      );

      setComments(enrichedComments as any);
    }
  };

  const loadReplies = async (parentId: string, profilesData: any[]) => {
    const { data: repliesData } = await supabase
      .from("post_comments")
      .select("id, content, created_at, user_id, parent_comment_id")
      .eq("parent_comment_id", parentId)
      .order("created_at", { ascending: true });

    if (!repliesData) return [];

    return Promise.all(
      repliesData.map(async (reply) => {
        const reactions = await loadCommentReactions(reply.id);
        return {
          ...reply,
          profiles: profilesData?.find(p => p.id === reply.user_id),
          reactions,
        };
      })
    );
  };

  const loadCommentReactions = async (commentId: string) => {
    const { data } = await supabase
      .from("comment_reactions")
      .select("reaction_type, user_id")
      .eq("comment_id", commentId);

    if (!data) return [];

    const reactionCounts: { [key: string]: { count: number; user_reacted: boolean } } = {};
    
    data.forEach((r) => {
      if (!reactionCounts[r.reaction_type]) {
        reactionCounts[r.reaction_type] = { count: 0, user_reacted: false };
      }
      reactionCounts[r.reaction_type].count++;
      if (r.user_id === user?.id) {
        reactionCounts[r.reaction_type].user_reacted = true;
      }
    });

    return Object.entries(reactionCounts).map(([type, data]) => ({
      reaction_type: type,
      count: data.count,
      user_reacted: data.user_reacted,
    }));
  };

  const handleComment = async () => {
    if (!user || !newComment.trim()) return;

    const { error } = await supabase.from("post_comments").insert({
      post_id: postId,
      user_id: user.id,
      content: newComment,
    });

    if (error) {
      toast.error("Failed to post comment");
    } else {
      setNewComment("");
      loadComments();
    }
  };

  const handleReply = async (parentCommentId: string) => {
    if (!user || !replyContent.trim()) return;

    const { error } = await supabase.from("post_comments").insert({
      post_id: postId,
      user_id: user.id,
      content: replyContent,
      parent_comment_id: parentCommentId,
    });

    if (error) {
      toast.error("Failed to post reply");
    } else {
      setReplyContent("");
      setReplyTo(null);
      loadComments();
    }
  };

  const handleCommentReaction = async (commentId: string, reactionType: string) => {
    if (!user) {
      toast.error("Please login to react");
      return;
    }

    try {
      // Check if user already reacted with this type
      const { data: existing } = await supabase
        .from("comment_reactions")
        .select("id")
        .eq("comment_id", commentId)
        .eq("user_id", user.id)
        .eq("reaction_type", reactionType)
        .maybeSingle();

      if (existing) {
        // Remove reaction
        await supabase
          .from("comment_reactions")
          .delete()
          .eq("id", existing.id);
      } else {
        // Remove any other reactions from this user on this comment
        await supabase
          .from("comment_reactions")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", user.id);

        // Add new reaction
        await supabase.from("comment_reactions").insert({
          comment_id: commentId,
          user_id: user.id,
          reaction_type: reactionType,
        });
      }

      loadComments();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const renderComment = (comment: Comment, isReply: boolean = false) => (
    <div
      key={comment.id}
      className={`bg-muted p-3 rounded-lg ${isReply ? "ml-8 mt-2" : ""}`}
    >
      <div className="flex items-start gap-2 mb-2">
        <Avatar className="w-8 h-8">
          <AvatarFallback>
            {comment.profiles?.full_name?.charAt(0) || "A"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="font-semibold text-sm">
            {comment.profiles?.full_name || "Anonymous"}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>
      
      <p className="text-sm mb-2">{comment.content}</p>

      {/* Reactions */}
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2 gap-1">
              <Smile className="w-3 h-3" />
              React
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2">
            <div className="flex gap-1">
              {Object.entries(REACTION_EMOJIS).map(([type, emoji]) => (
                <Button
                  key={type}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCommentReaction(comment.id, type)}
                >
                  {emoji}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {!isReply && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 gap-1"
            onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
          >
            <Reply className="w-3 h-3" />
            Reply
          </Button>
        )}

        {/* Display reactions */}
        {comment.reactions && comment.reactions.length > 0 && (
          <div className="flex gap-2 ml-auto">
            {comment.reactions.map((reaction) => (
              <span
                key={reaction.reaction_type}
                className={`text-xs flex items-center gap-1 ${
                  reaction.user_reacted ? "text-primary font-semibold" : "text-muted-foreground"
                }`}
              >
                {REACTION_EMOJIS[reaction.reaction_type as keyof typeof REACTION_EMOJIS]}
                {reaction.count}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Reply input */}
      {replyTo === comment.id && (
        <div className="mt-3 flex gap-2">
          <Textarea
            placeholder="Write a reply..."
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            className="min-h-[60px]"
          />
          <Button onClick={() => handleReply(comment.id)} size="sm">
            Reply
          </Button>
        </div>
      )}

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-2 space-y-2">
          {comment.replies.map((reply) => renderComment(reply, true))}
        </div>
      )}
    </div>
  );

  if (!showComments) return null;

  return (
    <div className="w-full space-y-3 border-t pt-3">
      <div className="flex gap-2">
        <Textarea
          placeholder="Write a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="min-h-[60px]"
        />
        <Button onClick={handleComment}>Post</Button>
      </div>

      <div className="space-y-2">
        {comments.map((comment) => renderComment(comment))}
      </div>
    </div>
  );
}