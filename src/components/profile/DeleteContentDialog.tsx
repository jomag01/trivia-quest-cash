import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";

interface DeleteContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentType: "post" | "product";
  contentId: string;
  contentTitle?: string;
  onDeleted: () => void;
}

export function DeleteContentDialog({ 
  open, 
  onOpenChange, 
  contentType, 
  contentId, 
  contentTitle,
  onDeleted 
}: DeleteContentDialogProps) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      if (contentType === "post") {
        const { error } = await supabase
          .from("posts")
          .delete()
          .eq("id", contentId);
        
        if (error) throw error;
        toast.success("Post deleted successfully");
      } else if (contentType === "product") {
        const { error } = await supabase
          .from("products")
          .delete()
          .eq("id", contentId);
        
        if (error) throw error;
        toast.success("Product deleted successfully");
      }
      
      onDeleted();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error deleting content:", error);
      toast.error(error.message || "Failed to delete content");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Delete {contentType === "post" ? "Post" : "Product"}
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this {contentType}? 
            {contentTitle && <span className="font-medium block mt-1">"{contentTitle}"</span>}
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex gap-3 pt-4">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            className="flex-1" 
            onClick={handleDelete} 
            disabled={deleting}
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
