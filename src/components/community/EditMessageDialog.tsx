import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { History } from "lucide-react";

interface EditHistory {
  id: string;
  previous_content: string;
  edited_at: string;
  edited_by: string;
}

interface EditMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messageId: string;
  currentContent: string;
  onSuccess: () => void;
}

export const EditMessageDialog = ({
  open,
  onOpenChange,
  messageId,
  currentContent,
  onSuccess,
}: EditMessageDialogProps) => {
  const [content, setContent] = useState(currentContent);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [editHistory, setEditHistory] = useState<EditHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadEditHistory = async () => {
    setLoadingHistory(true);
    try {
      const supabaseClient: any = supabase;
      const { data, error } = await supabaseClient
        .from("message_edit_history")
        .select("*")
        .eq("message_id", messageId)
        .order("edited_at", { ascending: false });

      if (error) throw error;
      setEditHistory(data || []);
      setShowHistory(true);
    } catch (error: any) {
      console.error("Error loading edit history:", error);
      toast.error("Failed to load edit history");
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSave = async () => {
    if (!content.trim() || content === currentContent) {
      return;
    }

    setLoading(true);
    try {
      const supabaseClient: any = supabase;
      
      // Save current content to history
      const { error: historyError } = await supabaseClient
        .from("message_edit_history")
        .insert({
          message_id: messageId,
          previous_content: currentContent,
          edited_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (historyError) throw historyError;

      // Update message
      const { error: updateError } = await supabaseClient
        .from("group_messages")
        .update({
          content: content.trim(),
          edited_at: new Date().toISOString()
        })
        .eq("id", messageId);

      if (updateError) throw updateError;

      toast.success("Message updated");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating message:", error);
      toast.error("Failed to update message");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Message</DialogTitle>
        </DialogHeader>

        {!showHistory ? (
          <>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Edit your message..."
              className="min-h-[100px]"
            />

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadEditHistory}
                disabled={loadingHistory}
              >
                <History className="w-4 h-4 mr-1" />
                View History
              </Button>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading || !content.trim() || content === currentContent}
              >
                Save Changes
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Edit History</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHistory(false)}
                >
                  Back to Edit
                </Button>
              </div>

              <ScrollArea className="h-[300px]">
                {editHistory.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No edit history yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {editHistory.map((edit) => (
                      <div
                        key={edit.id}
                        className="p-3 rounded-lg border bg-muted/30"
                      >
                        <div className="text-xs text-muted-foreground mb-2">
                          Edited {formatDistanceToNow(new Date(edit.edited_at), { addSuffix: true })}
                        </div>
                        <p className="text-sm">{edit.previous_content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};