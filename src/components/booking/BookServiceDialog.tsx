import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format, addMinutes, parse, isBefore, isAfter, startOfDay } from "date-fns";
import { Clock, Calendar as CalendarIcon, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

interface Service {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  duration_minutes: number;
  image_url: string | null;
  diamond_reward: number;
  provider_id: string;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface BookServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: Service | null;
}

const TIME_SLOTS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30", "18:00", "18:30", "19:00", "19:30"
];

const BookServiceDialog = ({ open, onOpenChange, service }: BookServiceDialogProps) => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [blockoutDates, setBlockoutDates] = useState<Date[]>([]);
  const [existingBookings, setExistingBookings] = useState<string[]>([]);

  useEffect(() => {
    if (service && open) {
      fetchBlockoutDates();
      setSelectedDate(undefined);
      setSelectedTime("");
      setNotes("");
    }
  }, [service, open]);

  useEffect(() => {
    if (selectedDate && service) {
      fetchExistingBookings();
    }
  }, [selectedDate, service]);

  const fetchBlockoutDates = async () => {
    if (!service) return;
    
    const { data } = await supabase
      .from("service_blockout_dates")
      .select("blockout_date")
      .eq("provider_id", service.provider_id);
    
    if (data) {
      setBlockoutDates(data.map(d => new Date(d.blockout_date)));
    }
  };

  const fetchExistingBookings = async () => {
    if (!selectedDate || !service) return;

    const { data } = await supabase
      .from("service_bookings")
      .select("start_time")
      .eq("service_id", service.id)
      .eq("booking_date", format(selectedDate, "yyyy-MM-dd"))
      .in("status", ["pending", "confirmed"]);

    if (data) {
      setExistingBookings(data.map(b => b.start_time));
    }
  };

  const isDateDisabled = (date: Date) => {
    const today = startOfDay(new Date());
    if (isBefore(date, today)) return true;
    return blockoutDates.some(d => 
      format(d, "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
    );
  };

  const isTimeSlotAvailable = (time: string) => {
    return !existingBookings.includes(time + ":00");
  };

  const handleBook = async () => {
    if (!user) {
      toast.error("Please log in to book a service");
      return;
    }

    if (!service || !selectedDate || !selectedTime) {
      toast.error("Please select a date and time");
      return;
    }

    if (service.provider_id === user.id) {
      toast.error("You cannot book your own service");
      return;
    }

    setLoading(true);

    // Check for referrer from URL or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const referrerId = urlParams.get('ref') || localStorage.getItem('booking_referrer');

    const endTime = format(
      addMinutes(parse(selectedTime, "HH:mm", new Date()), service.duration_minutes),
      "HH:mm"
    );

    const { error } = await supabase.from("service_bookings").insert({
      service_id: service.id,
      customer_id: user.id,
      provider_id: service.provider_id,
      booking_date: format(selectedDate, "yyyy-MM-dd"),
      start_time: selectedTime + ":00",
      end_time: endTime + ":00",
      total_amount: service.price,
      notes: notes || null,
      referrer_id: referrerId || null,
      status: "pending"
    });

    setLoading(false);

    if (error) {
      toast.error("Failed to create booking");
      console.error(error);
    } else {
      toast.success("Booking request submitted!");
      onOpenChange(false);
    }
  };

  if (!service) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book Service</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Service Info */}
          <div className="flex gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
              {service.image_url ? (
                <img src={service.image_url} alt={service.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">🔧</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold line-clamp-1">{service.title}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={service.profiles?.avatar_url || undefined} />
                  <AvatarFallback>{service.profiles?.full_name?.[0] || "P"}</AvatarFallback>
                </Avatar>
                <span>{service.profiles?.full_name || "Provider"}</span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="font-bold text-primary">₱{service.price}</span>
                <Badge variant="secondary" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {service.duration_minutes} min
                </Badge>
              </div>
            </div>
          </div>

          {service.diamond_reward > 0 && (
            <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg text-sm">
              <span>💎</span>
              <span>Earn <strong>{service.diamond_reward} diamonds</strong> when booking is completed!</span>
            </div>
          )}

          {/* Date Selection */}
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <CalendarIcon className="h-4 w-4" />
              Select Date
            </Label>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={isDateDisabled}
              className={cn("rounded-md border pointer-events-auto")}
            />
          </div>

          {/* Time Selection */}
          {selectedDate && (
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4" />
                Select Time
              </Label>
              <div className="grid grid-cols-4 gap-2">
                {TIME_SLOTS.map(time => {
                  const available = isTimeSlotAvailable(time);
                  return (
                    <Button
                      key={time}
                      variant={selectedTime === time ? "default" : "outline"}
                      size="sm"
                      disabled={!available}
                      onClick={() => setSelectedTime(time)}
                      className="text-xs"
                    >
                      {time}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <Label>Notes (Optional)</Label>
            <Textarea
              placeholder="Any special requests or notes for the provider..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Summary */}
          {selectedDate && selectedTime && (
            <div className="p-3 bg-muted/50 rounded-lg space-y-1 text-sm">
              <p><strong>Date:</strong> {format(selectedDate, "EEEE, MMMM d, yyyy")}</p>
              <p><strong>Time:</strong> {selectedTime}</p>
              <p><strong>Total:</strong> ₱{service.price}</p>
            </div>
          )}

          <Button 
            onClick={handleBook} 
            disabled={loading || !selectedDate || !selectedTime}
            className="w-full"
          >
            {loading ? "Booking..." : "Confirm Booking"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookServiceDialog;