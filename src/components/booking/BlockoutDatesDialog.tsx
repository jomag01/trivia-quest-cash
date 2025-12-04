import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format, isBefore, startOfDay } from "date-fns";
import { X, CalendarOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface Service {
  id: string;
  title: string;
}

interface BlockoutDate {
  id: string;
  blockout_date: string;
  reason: string | null;
}

interface BlockoutDatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: Service | null;
}

const BlockoutDatesDialog = ({ open, onOpenChange, service }: BlockoutDatesDialogProps) => {
  const { user } = useAuth();
  const [blockoutDates, setBlockoutDates] = useState<BlockoutDate[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && open) {
      fetchBlockoutDates();
    }
  }, [user, open, service]);

  const fetchBlockoutDates = async () => {
    if (!user) return;
    
    let query = supabase
      .from("service_blockout_dates")
      .select("*")
      .eq("provider_id", user.id)
      .order("blockout_date");

    if (service) {
      query = query.or(`service_id.eq.${service.id},service_id.is.null`);
    }

    const { data } = await query;
    if (data) setBlockoutDates(data);
  };

  const addBlockoutDate = async () => {
    if (!user || !selectedDate) return;

    const dateStr = format(selectedDate, "yyyy-MM-dd");
    
    // Check if date already exists
    if (blockoutDates.some(d => d.blockout_date === dateStr)) {
      toast.error("This date is already blocked");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("service_blockout_dates").insert({
      provider_id: user.id,
      service_id: service?.id || null,
      blockout_date: dateStr,
      reason: reason || null
    });

    setLoading(false);

    if (error) {
      toast.error("Failed to add blockout date");
    } else {
      toast.success("Blockout date added");
      setSelectedDate(undefined);
      setReason("");
      fetchBlockoutDates();
    }
  };

  const removeBlockoutDate = async (id: string) => {
    const { error } = await supabase
      .from("service_blockout_dates")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to remove date");
    } else {
      setBlockoutDates(blockoutDates.filter(d => d.id !== id));
      toast.success("Date removed");
    }
  };

  const isDateDisabled = (date: Date) => {
    return isBefore(date, startOfDay(new Date()));
  };

  const isDateBlocked = (date: Date) => {
    return blockoutDates.some(d => d.blockout_date === format(date, "yyyy-MM-dd"));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarOff className="h-5 w-5" />
            Manage Blockout Dates
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {service && (
            <p className="text-sm text-muted-foreground">
              For: <strong>{service.title}</strong>
            </p>
          )}

          {/* Calendar */}
          <div>
            <Label className="mb-2 block">Select dates you're unavailable</Label>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={isDateDisabled}
              modifiers={{
                blocked: (date) => isDateBlocked(date)
              }}
              modifiersStyles={{
                blocked: { backgroundColor: "hsl(var(--destructive))", color: "white", opacity: 0.7 }
              }}
              className={cn("rounded-md border pointer-events-auto")}
            />
          </div>

          {/* Add blockout */}
          {selectedDate && !isDateBlocked(selectedDate) && (
            <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
              <p className="font-medium">
                Block: {format(selectedDate, "EEEE, MMMM d, yyyy")}
              </p>
              <div>
                <Label htmlFor="reason">Reason (optional)</Label>
                <Input
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., Holiday, Personal day"
                />
              </div>
              <Button onClick={addBlockoutDate} disabled={loading} className="w-full">
                {loading ? "Adding..." : "Add Blockout Date"}
              </Button>
            </div>
          )}

          {/* Existing blockout dates */}
          <div>
            <Label className="mb-2 block">Blocked Dates ({blockoutDates.length})</Label>
            {blockoutDates.length === 0 ? (
              <p className="text-sm text-muted-foreground">No blocked dates</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {blockoutDates.map(date => (
                  <div 
                    key={date.id} 
                    className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        {format(new Date(date.blockout_date), "MMM d, yyyy")}
                      </p>
                      {date.reason && (
                        <p className="text-xs text-muted-foreground">{date.reason}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => removeBlockoutDate(date.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BlockoutDatesDialog;
