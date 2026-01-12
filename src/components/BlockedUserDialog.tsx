import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BlockedUserDialogProps {
  userId: string;
  blockReason?: string | null;
  onSignOut: () => void;
}

export const BlockedUserDialog = ({ userId, blockReason, onSignOut }: BlockedUserDialogProps) => {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmitRequest = async () => {
    if (!message.trim()) {
      toast.error("Please enter a message explaining your request");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await (supabase as any)
        .from("activation_requests")
        .insert({
          user_id: userId,
          request_message: message.trim(),
          status: "pending",
        });

      if (error) throw error;

      toast.success("Your reactivation request has been submitted");
      setSubmitted(true);
    } catch (error: any) {
      console.error("Error submitting activation request:", error);
      toast.error(error.message || "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-6 w-6" />
            <DialogTitle>Account Blocked</DialogTitle>
          </div>
          <DialogDescription className="text-left pt-2">
            Your account has been temporarily blocked by an administrator.
            {blockReason && (
              <div className="mt-2 p-3 bg-muted rounded-md">
                <p className="font-medium text-sm text-foreground">Reason:</p>
                <p className="text-sm">{blockReason}</p>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        {!submitted ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="request-message">Request Reactivation</Label>
              <Textarea
                id="request-message"
                placeholder="Please explain why your account should be reactivated..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="mt-1"
              />
            </div>
            <Button 
              onClick={handleSubmitRequest} 
              disabled={submitting || !message.trim()}
              className="w-full"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Request to Admin
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="text-center py-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Send className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-sm text-muted-foreground">
              Your request has been submitted. An administrator will review it and get back to you.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onSignOut} className="w-full">
            Sign Out
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
