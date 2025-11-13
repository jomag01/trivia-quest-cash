import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Search, Users, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { CreateGroupDialog } from "./CreateGroupDialog";

interface Group {
  id: string;
  name: string;
  description: string;
  avatar_url: string | null;
  is_private: boolean;
  created_by: string;
  member_count?: number;
  is_member?: boolean;
}

interface GroupsListProps {
  onSelectGroup: (groupId: string) => void;
  selectedGroupId: string | null;
}

export const GroupsList = ({ onSelectGroup, selectedGroupId }: GroupsListProps) => {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, [user]);

  const fetchGroups = async () => {
    try {
      const supabaseClient: any = supabase;
      const { data: groupsData, error } = await supabaseClient
        .from("groups")
        .select(`
          *,
          group_members!inner(count)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get user's memberships
      const { data: memberships } = await supabaseClient
        .from("group_members")
        .select("group_id")
        .eq("user_id", user?.id);

      const memberGroupIds = new Set(memberships?.map((m: any) => m.group_id) || []);

      const enhancedGroups = (groupsData || []).map((group: any) => ({
        ...group,
        member_count: group.group_members?.[0]?.count || 0,
        is_member: memberGroupIds.has(group.id)
      }));

      setGroups(enhancedGroups);
    } catch (error) {
      console.error("Error fetching groups:", error);
      toast.error("Failed to load groups");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    try {
      const supabaseClient: any = supabase;
      const { error } = await supabaseClient
        .from("group_members")
        .insert({
          group_id: groupId,
          user_id: user?.id,
          is_admin: false
        });

      if (error) throw error;
      toast.success("Joined group successfully!");
      fetchGroups();
    } catch (error: any) {
      console.error("Error joining group:", error);
      toast.error(error.message || "Failed to join group");
    }
  };

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Groups</h2>
          <Button
            size="sm"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Create
          </Button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <ScrollArea className="h-[500px]">
          {loading ? (
            <p className="text-center text-muted-foreground py-4">Loading...</p>
          ) : filteredGroups.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No groups found</p>
          ) : (
            <div className="space-y-2">
              {filteredGroups.map((group) => (
                <Card
                  key={group.id}
                  className={`p-3 cursor-pointer transition-colors hover:bg-accent ${
                    selectedGroupId === group.id ? "bg-accent border-primary" : ""
                  }`}
                  onClick={() => group.is_member && onSelectGroup(group.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {group.avatar_url ? (
                        <img src={group.avatar_url} alt={group.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <Users className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm truncate">{group.name}</h3>
                        {group.is_private && <Lock className="w-3 h-3 text-muted-foreground" />}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                        {group.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-xs">
                          {group.member_count} members
                        </Badge>
                        {!group.is_member && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleJoinGroup(group.id);
                            }}
                          >
                            Join
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </Card>

      <CreateGroupDialog 
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onGroupCreated={fetchGroups}
      />
    </>
  );
};
