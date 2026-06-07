import { useState, useEffect, useMemo } from "react";
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
import { format, addMinutes, parse, isBefore, startOfDay, differenceInDays, differenceInCalendarMonths, addDays } from "date-fns";
import { Clock, Calendar as CalendarIcon, DollarSign, Users, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Service {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  price_type?: string | null;
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
  const [checkOutDate, setCheckOutDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [blockoutDates, setBlockoutDates] = useState<Date[]>([]);
  const [existingBookings, setExistingBookings] = useState<string[]>([]);
  const [paxNames, setPaxNames] = useState<string[]>([""]);

  const isTour = !!service?.category && /tour|travel|trip|tourism/i.test(service.category);

  const isDurationBased = service?.price_type && ['per_day', 'per_night', 'per_month'].includes(service.price_type);

  useEffect(() => {
    if (service && open) {
      fetchBlockoutDates();
      setSelectedDate(undefined);
      setCheckOutDate(undefined);
      setSelectedTime("");
      setNotes("");
      setPaxNames([""]);
    }
  }, [service, open]);

  useEffect(() => {
    if (selectedDate && service && !isDurationBased) {
      fetchExistingBookings();
    }
  }, [selectedDate, service]);

  // Auto-set minimum checkout date
  useEffect(() => {
    if (selectedDate && isDurationBased && !checkOutDate) {
      setCheckOutDate(addDays(selectedDate, 1));
    }
  }, [selectedDate, isDurationBased]);

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

  const isCheckOutDisabled = (date: Date) => {
    if (!selectedDate) return true;
    if (isBefore(date, addDays(selectedDate, 1))) return true;
    return blockoutDates.some(d =>
      format(d, "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
    );
  };

  const isTimeSlotAvailable = (time: string) => {
    return !existingBookings.includes(time + ":00");
  };

  const durationInfo = useMemo(() => {
    if (!isDurationBased || !selectedDate || !checkOutDate || !service) return null;

    const days = differenceInDays(checkOutDate, selectedDate);
    const months = differenceInCalendarMonths(checkOutDate, selectedDate);

    if (service.price_type === 'per_month') {
      const effectiveMonths = Math.max(months, 1);
      return {
        quantity: effectiveMonths,
        unit: effectiveMonths === 1 ? 'month' : 'months',
        total: service.price * effectiveMonths,
      };
    }

    // per_day or per_night
    const effectiveDays = Math.max(days, 1);
    return {
      quantity: effectiveDays,
      unit: service.price_type === 'per_night'
        ? (effectiveDays === 1 ? 'night' : 'nights')
        : (effectiveDays === 1 ? 'day' : 'days'),
      total: service.price * effectiveDays,
    };
  }, [isDurationBased, selectedDate, checkOutDate, service]);

  const totalAmount = isDurationBased ? (durationInfo?.total ?? service?.price ?? 0) : (service?.price ?? 0);

  const formatPriceLabel = () => {
    if (!service) return '';
    const p = `₱${service.price.toLocaleString()}`;
    if (service.price_type === 'per_night') return `${p} / night`;
    if (service.price_type === 'per_day') return `${p} / day`;
    if (service.price_type === 'per_month') return `${p} / month`;
    return p;
  };

  const cleanedPax = paxNames.map(n => n.trim()).filter(Boolean);
  const paxValid = !isTour || cleanedPax.length > 0;

  const canBook = (isDurationBased
    ? !!selectedDate && !!checkOutDate
    : !!selectedDate && !!selectedTime) && paxValid;

  const handleBook = async () => {
    if (!user) { toast.error("Please log in to book a service"); return; }
    if (!service) return;
    if (!canBook) { toast.error("Please complete all fields"); return; }
    if (service.provider_id === user.id) { toast.error("You cannot book your own service"); return; }

    setLoading(true);

    const urlParams = new URLSearchParams(window.location.search);
    const referrerId = urlParams.get('ref') || localStorage.getItem('booking_referrer');

    let bookingData: any = {
      service_id: service.id,
      customer_id: user.id,
      provider_id: service.provider_id,
      booking_date: format(selectedDate!, "yyyy-MM-dd"),
      total_amount: totalAmount,
      notes: notes || null,
      referrer_id: referrerId || null,
      pax_names: cleanedPax,
      status: "pending"
    };

    if (isDurationBased) {
      bookingData.start_time = "14:00:00"; // Default check-in
      bookingData.end_time = "12:00:00";   // Default check-out
    } else {
      const endTime = format(
        addMinutes(parse(selectedTime, "HH:mm", new Date()), service.duration_minutes),
        "HH:mm"
      );
      bookingData.start_time = selectedTime + ":00";
      bookingData.end_time = endTime + ":00";
    }

    const { error } = await supabase.from("service_bookings").insert(bookingData);
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
                <span className="font-bold text-primary">{formatPriceLabel()}</span>
                {!isDurationBased && (
                  <Badge variant="secondary" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {service.duration_minutes} min
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {service.diamond_reward > 0 && (
            <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg text-sm">
              <span>💎</span>
              <span>Earn <strong>{service.diamond_reward} diamonds</strong> when booking is completed!</span>
            </div>
          )}

          {/* Duration-based: Check-in & Check-out */}
          {isDurationBased ? (
            <div className="space-y-4">
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <CalendarIcon className="h-4 w-4" />
                  Check-in Date
                </Label>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => {
                    setSelectedDate(d);
                    setCheckOutDate(undefined);
                  }}
                  disabled={isDateDisabled}
                  className={cn("rounded-md border pointer-events-auto")}
                />
              </div>

              {selectedDate && (
                <div>
                  <Label className="flex items-center gap-2 mb-2">
                    <CalendarIcon className="h-4 w-4" />
                    Check-out Date
                  </Label>
                  <Calendar
                    mode="single"
                    selected={checkOutDate}
                    onSelect={setCheckOutDate}
                    disabled={isCheckOutDisabled}
                    className={cn("rounded-md border pointer-events-auto")}
                  />
                </div>
              )}

              {durationInfo && (
                <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>₱{service.price.toLocaleString()} × {durationInfo.quantity} {durationInfo.unit}</span>
                    <span className="font-semibold">₱{durationInfo.total.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Fixed price: Date + Time */}
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
            </>
          )}

          {/* Pax Names (Tours only) */}
          {isTour && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Passenger Names
              </Label>
              <p className="text-xs text-muted-foreground">
                List the full name of every person joining the trip. Used to verify guests on the day of the tour.
              </p>
              <div className="space-y-2">
                {paxNames.map((name, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      value={name}
                      placeholder={`Pax ${idx + 1} full name`}
                      onChange={(e) => {
                        const next = [...paxNames];
                        next[idx] = e.target.value;
                        setPaxNames(next);
                      }}
                    />
                    {paxNames.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setPaxNames(paxNames.filter((_, i) => i !== idx))}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPaxNames([...paxNames, ""])}
              >
                <Plus className="h-4 w-4 mr-1" /> Add passenger
              </Button>
              <p className="text-xs text-muted-foreground">
                Total passengers: <strong>{cleanedPax.length}</strong>
              </p>
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
          {canBook && (
            <div className="p-3 bg-muted/50 rounded-lg space-y-1 text-sm">
              <p><strong>{isDurationBased ? 'Check-in:' : 'Date:'}</strong> {format(selectedDate!, "EEEE, MMMM d, yyyy")}</p>
              {isDurationBased && checkOutDate && (
                <p><strong>Check-out:</strong> {format(checkOutDate, "EEEE, MMMM d, yyyy")}</p>
              )}
              {!isDurationBased && selectedTime && (
                <p><strong>Time:</strong> {selectedTime}</p>
              )}
              <p><strong>Total:</strong> ₱{totalAmount.toLocaleString()}</p>
            </div>
          )}

          <Button
            onClick={handleBook}
            disabled={loading || !canBook}
            className="w-full"
          >
            {loading ? "Booking..." : `Confirm Booking · ₱${totalAmount.toLocaleString()}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookServiceDialog;