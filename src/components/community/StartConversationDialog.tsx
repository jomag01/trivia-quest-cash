import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Plus, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface User {
  id: string;
  full_name: string | null;
}

interface StartConversationDialogProps {
  onConversationStarted: () => void;
}

export const StartConversationDialog = ({ onConversationStarted }: StartConversationDialogProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const supabaseClient: any = supabase;
      const { data, error } = await supabaseClient
        .from("profiles")
        .select("id, full_name")
        .neq("id", user?.id)
        .limit(50);

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const startConversation = async (otherUserId: string) => {
    try {
      const supabaseClient: any = supabase;
      
      // Ensure user1_id < user2_id for the unique constraint
      const user1Id = user!.id < otherUserId ? user!.id : otherUserId;
      const user2Id = user!.id < otherUserId ? otherUserId : user!.id;

      // Check if conversation already exists
      const { data: existing } = await supabaseClient
        .from("private_conversations")
        .select("id")
        .eq("user1_id", user1Id)
        .eq("user2_id", user2Id)
        .single();

      if (existing) {
        toast.info("Conversation already exists");
        setOpen(false);
        onConversationStarted();
        return;
      }

      // Create new conversation
      const { error } = await supabaseClient
        .from("private_conversations")
        .insert({
          user1_id: user1Id,
          user2_id: user2Id
        });

      if (error) throw error;

      toast.success("Conversation started!");
      setOpen(false);
      onConversationStarted();
    } catch (error: any) {
      console.error("Error starting conversation:", error);
      toast.error(error.message || "Failed to start conversation");
    }
  };

  const filteredUsers = users.filter(u =>
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          <Plus className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Start New Conversation</DialogTitle>
        </DialogHeader>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <ScrollArea className="h-[400px]">
          {loading ? (
            <p className="text-center text-muted-foreground py-4">Loading...</p>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No users found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-accent cursor-pointer"
                  onClick={() => startConversation(u.id)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {(u.full_name || "U").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{u.full_name || "User"}</span>
                  </div>
                  <Button size="sm" variant="ghost">
                    <MessageSquare className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
