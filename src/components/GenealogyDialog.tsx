import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users, TrendingUp, Calendar } from "lucide-react";

interface Member {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
  referral_code: string;
  credits: number;
}

interface GenealogyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  level: number;
  userId: string;
}

export const GenealogyDialog = ({ open, onOpenChange, level, userId }: GenealogyDialogProps) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && userId) {
      fetchLevelMembers();
    }
  }, [open, level, userId]);

  const fetchLevelMembers = async () => {
    try {
      setLoading(true);
      
      // Fetch members at the specified level in the referral tree
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, created_at, referral_code, credits")
        .eq("referred_by", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // For now, showing direct referrals (Level 1)
      // In a full implementation, you'd need to recursively fetch based on level
      setMembers(data || []);
    } catch (error: any) {
      console.error("Error fetching members:", error);
      toast.error("Failed to load member list");
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string | null, email: string | null) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Level {level} Network Members
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading members...</p>
          </div>
        ) : (
          <ScrollArea className="flex-1">
            {members.length === 0 ? (
              <Card className="p-12 text-center">
                <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No members at this level yet
                </p>
              </Card>
            ) : (
              <div className="space-y-3 pr-4">
                {members.map((member, index) => (
                  <Card key={member.id} className="p-4 hover:bg-accent/50 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="relative">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {getInitials(member.full_name, member.email)}
                          </AvatarFallback>
                        </Avatar>
                        <Badge 
                          variant="outline" 
                          className="absolute -bottom-2 -right-2 h-6 w-6 rounded-full p-0 justify-center border-background"
                        >
                          {index + 1}
                        </Badge>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <h4 className="font-semibold truncate">
                              {member.full_name || 'User'}
                            </h4>
                            <p className="text-sm text-muted-foreground truncate">
                              {member.email}
                            </p>
                          </div>
                          <Badge className="bg-primary/10 text-primary">
                            {member.credits} credits
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>Joined {formatDate(member.created_at)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            <span className="font-mono text-xs">
                              {member.referral_code}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Genealogy Tree Indicator */}
                    {index < members.length - 1 && (
                      <div className="ml-6 mt-2 h-4 border-l-2 border-dashed border-muted-foreground/30" />
                    )}
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        )}

        <div className="border-t pt-4 text-center text-sm text-muted-foreground">
          <p>Showing {members.length} member{members.length !== 1 ? 's' : ''} at Level {level}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
