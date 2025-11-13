import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Shield, UserMinus, Volume2, VolumeX } from "lucide-react";

interface Member {
  user_id: string;
  is_admin: boolean;
  joined_at: string;
  profiles: {
    id: string;
    full_name: string | null;
  };
  is_muted?: boolean;
}

interface GroupMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName: string;
  isAdmin: boolean;
  isCreator: boolean;
}

export const GroupMembersDialog = ({
  open,
  onOpenChange,
  groupId,
  groupName,
  isAdmin,
  isCreator,
}: GroupMembersDialogProps) => {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchMembers();
    }
  }, [open, groupId]);

  const fetchMembers = async () => {
    try {
      const supabaseClient: any = supabase;
      
      // Get members
      const { data: membersData, error: membersError } = await supabaseClient
        .from("group_members")
        .select("user_id, is_admin, joined_at")
        .eq("group_id", groupId);

      if (membersError) throw membersError;

      // Get profiles
      const userIds = membersData?.map((m: any) => m.user_id) || [];
      const { data: profilesData } = await supabaseClient
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      // Get muted users
      const { data: mutedData } = await supabaseClient
        .from("muted_group_users")
        .select("user_id")
        .eq("group_id", groupId)
        .or(`muted_until.is.null,muted_until.gt.${new Date().toISOString()}`);

      const mutedUserIds = new Set(mutedData?.map((m: any) => m.user_id) || []);
      const profilesMap = new Map(profilesData?.map((p: any) => [p.id, p]) || []);

      const membersWithProfiles = membersData?.map((member: any) => ({
        ...member,
        profiles: profilesMap.get(member.user_id),
        is_muted: mutedUserIds.has(member.user_id)
      })) || [];

      setMembers(membersWithProfiles);
    } catch (error) {
      console.error("Error fetching members:", error);
      toast.error("Failed to load members");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      const supabaseClient: any = supabase;
      const { error } = await supabaseClient
        .from("group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", userId);

      if (error) throw error;
      toast.success("Member removed");
      fetchMembers();
    } catch (error: any) {
      toast.error(error.message || "Failed to remove member");
    }
  };

  const handleMuteToggle = async (userId: string, isMuted: boolean) => {
    try {
      const supabaseClient: any = supabase;
      
      if (isMuted) {
        // Unmute
        const { error } = await supabaseClient
          .from("muted_group_users")
          .delete()
          .eq("group_id", groupId)
          .eq("user_id", userId);

        if (error) throw error;
        toast.success("Member unmuted");
      } else {
        // Mute
        const { error } = await supabaseClient
          .from("muted_group_users")
          .insert({
            group_id: groupId,
            user_id: userId,
            muted_by: user?.id
          });

        if (error) throw error;
        toast.success("Member muted");
      }
      
      fetchMembers();
    } catch (error: any) {
      toast.error(error.message || "Failed to update mute status");
    }
  };

  const handleToggleAdmin = async (userId: string, isCurrentlyAdmin: boolean) => {
    try {
      const supabaseClient: any = supabase;
      const { error } = await supabaseClient
        .from("group_members")
        .update({ is_admin: !isCurrentlyAdmin })
        .eq("group_id", groupId)
        .eq("user_id", userId);

      if (error) throw error;
      toast.success(isCurrentlyAdmin ? "Admin removed" : "Admin promoted");
      fetchMembers();
    } catch (error: any) {
      toast.error(error.message || "Failed to update admin status");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Group Members - {groupName}</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-[400px] pr-4">
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading members...</p>
          ) : members.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No members found</p>
          ) : (
            <div className="space-y-3">
              {members.map((member) => {
                const isCurrentUser = member.user_id === user?.id;
                const displayName = member.profiles?.full_name || `User ${member.user_id.slice(0, 8)}`;
                
                return (
                  <div
                    key={member.user_id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback>
                          {displayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {displayName}
                          {isCurrentUser && " (You)"}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {member.is_admin && (
                            <Badge variant="secondary" className="text-xs">
                              <Shield className="w-3 h-3 mr-1" />
                              Admin
                            </Badge>
                          )}
                          {member.is_muted && (
                            <Badge variant="destructive" className="text-xs">
                              <VolumeX className="w-3 h-3 mr-1" />
                              Muted
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {(isAdmin || isCreator) && !isCurrentUser && (
                      <div className="flex items-center gap-1">
                        {isCreator && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleAdmin(member.user_id, member.is_admin)}
                          >
                            <Shield className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleMuteToggle(member.user_id, member.is_muted || false)}
                        >
                          {member.is_muted ? (
                            <Volume2 className="w-4 h-4" />
                          ) : (
                            <VolumeX className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveMember(member.user_id)}
                        >
                          <UserMinus className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};