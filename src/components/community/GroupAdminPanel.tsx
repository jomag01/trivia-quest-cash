import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserMinus, Shield, ShieldOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Member {
  id: string;
  user_id: string;
  is_admin: boolean;
  profiles?: {
    full_name: string | null;
  };
}

interface GroupAdminPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName: string;
  groupDescription: string | null;
  isPrivate: boolean;
  isCreator: boolean;
  createdBy: string;
  onGroupUpdated: () => void;
}

export const GroupAdminPanel = ({
  open,
  onOpenChange,
  groupId,
  groupName: initialName,
  groupDescription: initialDescription,
  isPrivate: initialPrivate,
  isCreator,
  createdBy,
  onGroupUpdated,
}: GroupAdminPanelProps) => {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription || "");
  const [isPrivate, setIsPrivate] = useState(initialPrivate);
  const [loading, setLoading] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [selectedNewOwner, setSelectedNewOwner] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchMembers();
    }
  }, [open, groupId]);

  const fetchMembers = async () => {
    try {
      const supabaseClient: any = supabase;
      const { data, error } = await supabaseClient
        .from("group_members")
        .select(`
          *,
          profiles:user_id (
            full_name
          )
        `)
        .eq("group_id", groupId)
        .order("is_admin", { ascending: false });

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error("Error fetching members:", error);
      toast.error("Failed to load members");
    }
  };

  const handleUpdateGroup = async () => {
    if (!name.trim()) {
      toast.error("Group name is required");
      return;
    }

    setLoading(true);
    try {
      const supabaseClient: any = supabase;
      const { error } = await supabaseClient
        .from("groups")
        .update({
          name: name.trim(),
          description: description.trim() || null,
          is_private: isPrivate,
        })
        .eq("id", groupId);

      if (error) throw error;
      toast.success("Group updated successfully");
      onGroupUpdated();
    } catch (error: any) {
      console.error("Error updating group:", error);
      toast.error("Failed to update group");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAdmin = async (memberId: string, currentIsAdmin: boolean) => {
    if (!isCreator) {
      toast.error("Only the group creator can change admin status");
      return;
    }

    try {
      const supabaseClient: any = supabase;
      const { error } = await supabaseClient
        .from("group_members")
        .update({ is_admin: !currentIsAdmin })
        .eq("id", memberId);

      if (error) throw error;
      toast.success(currentIsAdmin ? "Admin removed" : "Admin added");
      fetchMembers();
    } catch (error: any) {
      console.error("Error toggling admin:", error);
      toast.error("Failed to update admin status");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const supabaseClient: any = supabase;
      const { error } = await supabaseClient
        .from("group_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;
      toast.success("Member removed");
      fetchMembers();
      setMemberToRemove(null);
    } catch (error: any) {
      console.error("Error removing member:", error);
      toast.error("Failed to remove member");
    }
  };

  const getMemberName = (member: Member) => {
    return member.profiles?.full_name || `User ${member.user_id.slice(0, 8)}`;
  };

  const handleDeleteGroup = async () => {
    if (!isCreator) {
      toast.error("Only the group creator can delete the group");
      return;
    }

    setLoading(true);
    try {
      const supabaseClient: any = supabase;
      const { error } = await supabaseClient
        .from("groups")
        .delete()
        .eq("id", groupId);

      if (error) throw error;
      toast.success("Group deleted successfully");
      setShowDeleteConfirm(false);
      onOpenChange(false);
      onGroupUpdated();
    } catch (error: any) {
      console.error("Error deleting group:", error);
      toast.error("Failed to delete group");
    } finally {
      setLoading(false);
    }
  };

  const handleTransferOwnership = async () => {
    if (!isCreator || !selectedNewOwner) {
      toast.error("Cannot transfer ownership");
      return;
    }

    setLoading(true);
    try {
      const supabaseClient: any = supabase;
      
      // Update the group's created_by to the new owner
      const { error: groupError } = await supabaseClient
        .from("groups")
        .update({ created_by: selectedNewOwner })
        .eq("id", groupId);

      if (groupError) throw groupError;

      // Ensure new owner is an admin
      const { error: adminError } = await supabaseClient
        .from("group_members")
        .update({ is_admin: true })
        .eq("group_id", groupId)
        .eq("user_id", selectedNewOwner);

      if (adminError) throw adminError;

      toast.success("Ownership transferred successfully");
      setShowTransferDialog(false);
      setSelectedNewOwner(null);
      onOpenChange(false);
      onGroupUpdated();
    } catch (error: any) {
      console.error("Error transferring ownership:", error);
      toast.error("Failed to transfer ownership");
    } finally {
      setLoading(false);
    }
  };

  const adminMembers = members.filter(m => m.is_admin && m.user_id !== createdBy);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Group Settings</DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
            <div className="space-y-6">
              {/* Group Settings */}
              <div className="space-y-4">
                <h3 className="font-semibold">Group Information</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="name">Group Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter group name"
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter group description"
                    maxLength={500}
                    rows={3}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Private Group</Label>
                    <p className="text-xs text-muted-foreground">
                      Only invited members can join
                    </p>
                  </div>
                  <Switch
                    checked={isPrivate}
                    onCheckedChange={setIsPrivate}
                  />
                </div>

                <Button onClick={handleUpdateGroup} disabled={loading}>
                  Save Changes
                </Button>
              </div>

              {/* Members List */}
              <div className="space-y-4">
                <h3 className="font-semibold">Members ({members.length})</h3>
                
                <div className="space-y-2">
                  {members.map((member) => {
                    const isCurrentUser = member.user_id === user?.id;
                    
                    return (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback>
                              {getMemberName(member).charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {getMemberName(member)}
                              {isCurrentUser && " (You)"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {member.is_admin ? "Admin" : "Member"}
                            </p>
                          </div>
                        </div>

                        {!isCurrentUser && (
                          <div className="flex items-center gap-2">
                            {isCreator && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleAdmin(member.id, member.is_admin)}
                              >
                                {member.is_admin ? (
                                  <>
                                    <ShieldOff className="w-4 h-4 mr-1" />
                                    Remove Admin
                                  </>
                                ) : (
                                  <>
                                    <Shield className="w-4 h-4 mr-1" />
                                    Make Admin
                                  </>
                                )}
                              </Button>
                            )}
                            {(isCreator || member.is_admin) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setMemberToRemove(member.id)}
                              >
                                <UserMinus className="w-4 h-4 mr-1" />
                                Remove
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Transfer Ownership & Delete Group - Only for Creator */}
              {isCreator && (
                <div className="space-y-4 pt-6 border-t">
                  {adminMembers.length > 0 && (
                    <div className="mb-6">
                      <h3 className="font-semibold mb-2">Transfer Ownership</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Transfer group ownership to another admin before leaving.
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => setShowTransferDialog(true)}
                        disabled={loading}
                      >
                        Transfer Ownership
                      </Button>
                    </div>
                  )}
                  
                  <div>
                    <h3 className="font-semibold text-destructive mb-2">Danger Zone</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Deleting this group will remove all members and messages. This action cannot be undone.
                    </p>
                    <Button
                      variant="destructive"
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={loading}
                    >
                      Delete Group
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this member from the group? They can rejoin if the group is public.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => memberToRemove && handleRemoveMember(memberToRemove)}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this group? This will permanently remove:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>All group members</li>
                <li>All messages and conversations</li>
                <li>All group data</li>
              </ul>
              <p className="mt-2 font-semibold text-destructive">This action cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteGroup}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Transfer Ownership</AlertDialogTitle>
            <AlertDialogDescription>
              Select an admin to transfer group ownership to. You will lose creator privileges.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-2">
                {adminMembers.map((member) => (
                  <div
                    key={member.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedNewOwner === member.user_id
                        ? "border-primary bg-primary/10"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => setSelectedNewOwner(member.user_id)}
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarFallback>
                        {getMemberName(member).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{getMemberName(member)}</p>
                      <p className="text-xs text-muted-foreground">Admin</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedNewOwner(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTransferOwnership}
              disabled={!selectedNewOwner || loading}
            >
              Transfer Ownership
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
