import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, MessageSquare, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface SearchResult {
  id: string;
  content: string;
  created_at: string;
  type: "group" | "private";
  group_name?: string;
  group_id?: string;
  conversation_id?: string;
  sender_name?: string;
  sender_id?: string;
}

interface MessageSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResultClick?: (result: SearchResult) => void;
}

export const MessageSearch = ({ open, onOpenChange, onResultClick }: MessageSearchProps) => {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const supabaseClient: any = supabase;
      
      // Search group messages
      const { data: groupMessages, error: groupError } = await supabaseClient
        .from("group_messages")
        .select(`
          id,
          content,
          created_at,
          user_id,
          group_id,
          groups:group_id (
            name
          ),
          profiles:user_id (
            full_name
          )
        `)
        .ilike("content", `%${searchQuery}%`)
        .is("deleted_at", null)
        .limit(20);

      if (groupError) throw groupError;

      // Search private messages
      const { data: privateMessages, error: privateError } = await supabaseClient
        .from("private_messages")
        .select(`
          id,
          content,
          created_at,
          sender_id,
          conversation_id,
          private_conversations:conversation_id (
            user1_id,
            user2_id
          )
        `)
        .ilike("content", `%${searchQuery}%`)
        .is("deleted_at", null)
        .limit(20);

      if (privateError) throw privateError;

      // Format results
      const formattedGroupMessages: SearchResult[] = (groupMessages || []).map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        created_at: msg.created_at,
        type: "group" as const,
        group_name: msg.groups?.name,
        group_id: msg.group_id,
        sender_name: msg.profiles?.full_name || `User ${msg.user_id.slice(0, 8)}`,
        sender_id: msg.user_id,
      }));

      const formattedPrivateMessages: SearchResult[] = (privateMessages || []).map((msg: any) => {
        const otherUserId = msg.sender_id === user?.id 
          ? (msg.private_conversations?.user1_id === user?.id 
              ? msg.private_conversations?.user2_id 
              : msg.private_conversations?.user1_id)
          : msg.sender_id;

        return {
          id: msg.id,
          content: msg.content,
          created_at: msg.created_at,
          type: "private" as const,
          conversation_id: msg.conversation_id,
          sender_name: msg.sender_id === user?.id ? "You" : `User ${msg.sender_id.slice(0, 8)}`,
          sender_id: msg.sender_id,
        };
      });

      const allResults = [...formattedGroupMessages, ...formattedPrivateMessages]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setResults(allResults);
    } catch (error: any) {
      console.error("Error searching messages:", error);
      toast.error("Failed to search messages");
    } finally {
      setLoading(false);
    }
  };

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const parts = text.split(new RegExp(`(${query})`, "gi"));
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-primary/20 font-semibold">{part}</mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Search Messages</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search messages..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                handleSearch(e.target.value);
              }}
              className="pl-10"
              autoFocus
            />
          </div>

          <ScrollArea className="h-[500px]">
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Searching...</p>
            ) : results.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {query.trim().length < 2 
                  ? "Type at least 2 characters to search" 
                  : "No messages found"}
              </p>
            ) : (
              <div className="space-y-2">
                {results.map((result) => (
                  <div
                    key={`${result.type}-${result.id}`}
                    className="p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => {
                      onResultClick?.(result);
                      onOpenChange(false);
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback>
                          {result.sender_name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{result.sender_name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {result.type === "group" ? (
                              <>
                                <Users className="w-3 h-3 mr-1" />
                                {result.group_name}
                              </>
                            ) : (
                              <>
                                <MessageSquare className="w-3 h-3 mr-1" />
                                Private
                              </>
                            )}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(result.created_at), { addSuffix: true })}
                          </span>
                        </div>

                        <p className="text-sm line-clamp-2">
                          {highlightText(result.content, query)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
