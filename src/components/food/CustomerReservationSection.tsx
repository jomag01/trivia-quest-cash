import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format, addDays, addHours, parse, isAfter, isBefore, parseISO } from "date-fns";
import { Calendar, Clock, Users, CalendarPlus, Table2, AlertCircle, Hourglass } from "lucide-react";

interface CustomerReservationSectionProps {
  vendorId: string;
  vendorName: string;
  totalTables?: number;
}

interface ReservationSlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  max_capacity: number;
  slot_duration_minutes: number;
  is_active: boolean;
}

interface VendorSettings {
  default_table_duration_hours: number;
  hourly_extension_fee: number;
  allow_waitlist: boolean;
  waitlist_buffer_minutes: number;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const CustomerReservationSection = ({ 
  vendorId, 
  vendorName,
  totalTables = 0 
}: CustomerReservationSectionProps) => {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    time: "",
    party_size: "2",
    table_number: "",
    customer_name: profile?.full_name || "",
    customer_phone: "",
    customer_email: profile?.email || "",
    special_requests: "",
    booked_hours: "1",
    is_waitlist: false,
  });

  // Fetch vendor settings for table duration and fees
  const { data: vendorSettings } = useQuery({
    queryKey: ["vendor-settings", vendorId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("food_vendors")
        .select("default_table_duration_hours, hourly_extension_fee, allow_waitlist, waitlist_buffer_minutes")
        .eq("id", vendorId)
        .maybeSingle();
      if (error) throw error;
      return (data || {
        default_table_duration_hours: 1,
        hourly_extension_fee: 0,
        allow_waitlist: true,
        waitlist_buffer_minutes: 60,
      }) as VendorSettings;
    },
  });

  // Fetch available slots for this vendor
  const { data: slots, isLoading: loadingSlots, error: slotsError } = useQuery({
    queryKey: ["vendor-public-slots", vendorId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("reservation_slots")
        .select("*")
        .eq("vendor_id", vendorId)
        .eq("is_active", true)
        .order("day_of_week")
        .order("start_time");
      if (error) {
        console.error("Error fetching slots:", error);
        throw error;
      }
      return data as ReservationSlot[];
    },
  });

  // Fetch ALL tables for this vendor (including unavailable and occupied)
  const { data: tables, error: tablesError } = useQuery({
    queryKey: ["vendor-tables", vendorId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("restaurant_tables")
        .select("*, current_reservation_id, occupied_since, expected_vacant_at")
        .eq("vendor_id", vendorId)
        .order("table_number");
      if (error) {
        console.error("Error fetching tables:", error);
        throw error;
      }
      return data || [];
    },
  });

  // Fetch existing reservations for the selected date with extended info
  const { data: existingReservations } = useQuery({
    queryKey: ["date-reservations", vendorId, formData.date],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("restaurant_reservations")
        .select("reservation_time, party_size, status, table_number, booked_hours, expected_end_time")
        .eq("vendor_id", vendorId)
        .eq("reservation_date", formData.date)
        .not("status", "in", "(cancelled,no_show,completed)");
      if (error) throw error;
      return data || [];
    },
    enabled: !!formData.date,
  });

  // Check if a table is currently occupied (status = arrived and not completed)
  const isTableCurrentlyOccupied = (table: any) => {
    return table.current_reservation_id && table.occupied_since && !table.expected_vacant_at;
  };

  // Calculate when an occupied table will be free (based on expected_vacant_at or default duration)
  const getTableExpectedFreeTime = (table: any): Date | null => {
    if (!table.occupied_since) return null;
    if (table.expected_vacant_at) {
      return new Date(table.expected_vacant_at);
    }
    // Default: add vendor's default duration
    const defaultHours = vendorSettings?.default_table_duration_hours || 1;
    return addHours(new Date(table.occupied_since), defaultHours);
  };

  // Check if a table is booked for the selected time (considering duration)
  const isTableBookedForTime = (tableNumber: number, time: string) => {
    if (!existingReservations || !time) return false;
    
    const requestedTime = parse(time, "HH:mm", new Date());
    const requestedHours = parseInt(formData.booked_hours) || 1;
    const requestedEndTime = addHours(requestedTime, requestedHours);
    
    return existingReservations.some((r: any) => {
      if (r.table_number !== tableNumber) return false;
      if (r.status === "completed") return false;
      
      const resTime = parse(r.reservation_time, "HH:mm", new Date());
      const resHours = r.booked_hours || 1;
      const resEndTime = addHours(resTime, resHours);
      
      // Check if time ranges overlap
      return isBefore(requestedTime, resEndTime) && isAfter(requestedEndTime, resTime);
    });
  };

  // Get tables with full availability status
  const tablesWithAvailability = useMemo(() => {
    if (!tables || !formData.time) return tables?.map((t: any) => ({ ...t, isBookedForTime: false, isOccupied: false, expectedFreeTime: null })) || [];
    
    return tables.map((table: any) => {
      const isOccupied = isTableCurrentlyOccupied(table);
      const expectedFreeTime = getTableExpectedFreeTime(table);
      const isBookedForTime = isTableBookedForTime(table.table_number, formData.time);
      
      return {
        ...table,
        isBookedForTime,
        isOccupied,
        expectedFreeTime,
      };
    });
  }, [tables, formData.time, formData.booked_hours, existingReservations, vendorSettings]);

  // Check if all tables are occupied/booked
  const allTablesUnavailable = useMemo(() => {
    if (!tablesWithAvailability || tablesWithAvailability.length === 0) return true;
    return tablesWithAvailability.every((t: any) => !t.is_available || t.isBookedForTime || t.isOccupied);
  }, [tablesWithAvailability]);

  // Calculate extension fee
  const extensionFee = useMemo(() => {
    const hours = parseInt(formData.booked_hours) || 1;
    const defaultHours = vendorSettings?.default_table_duration_hours || 1;
    const extraHours = Math.max(0, hours - defaultHours);
    return extraHours * (vendorSettings?.hourly_extension_fee || 0);
  }, [formData.booked_hours, vendorSettings]);

  // Create reservation mutation
  const createReservationMutation = useMutation({
    mutationFn: async () => {
      const bookedHours = parseInt(formData.booked_hours) || 1;
      const reservationTime = parse(formData.time, "HH:mm", new Date());
      const expectedEndTime = format(addHours(reservationTime, bookedHours), "HH:mm");
      
      const { error } = await (supabase as any).from("restaurant_reservations").insert({
        vendor_id: vendorId,
        customer_id: user?.id || null,
        customer_name: formData.customer_name,
        customer_phone: formData.customer_phone,
        customer_email: formData.customer_email || null,
        reservation_date: formData.date,
        reservation_time: formData.time,
        party_size: parseInt(formData.party_size),
        table_number: formData.table_number ? parseInt(formData.table_number) : null,
        special_requests: formData.is_waitlist 
          ? `[WAITLIST] ${formData.special_requests || ''}` 
          : formData.special_requests || null,
        status: formData.is_waitlist ? "pending" : "pending",
        booked_hours: bookedHours,
        extension_fee_total: extensionFee,
        expected_end_time: expectedEndTime,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["date-reservations"] });
      const message = formData.is_waitlist 
        ? "Added to waitlist! You'll be notified when a table is available."
        : "Reservation submitted! Waiting for confirmation.";
      toast.success(message);
      setDialogOpen(false);
      setFormData({
        ...formData,
        time: "",
        table_number: "",
        special_requests: "",
        booked_hours: "1",
        is_waitlist: false,
      });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to submit reservation");
    },
  });

  // Get available times for selected date
  const getAvailableTimes = () => {
    if (!formData.date || !slots) return [];
    
    const selectedDate = new Date(formData.date);
    const dayOfWeek = selectedDate.getDay();
    const daySlots = slots.filter((s) => s.day_of_week === dayOfWeek);
    
    const times: string[] = [];
    daySlots.forEach((slot) => {
      const [startHour, startMin] = slot.start_time.split(":").map(Number);
      const [endHour, endMin] = slot.end_time.split(":").map(Number);
      
      let currentHour = startHour;
      let currentMin = startMin;
      
      while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
        const timeStr = `${currentHour.toString().padStart(2, "0")}:${currentMin.toString().padStart(2, "0")}`;
        
        // Check if this time is already booked
        const bookedCount = existingReservations?.filter(
          (r: any) => r.reservation_time === timeStr
        ).length || 0;
        
        // Only add if under capacity
        if (bookedCount < slot.max_capacity) {
          times.push(timeStr);
        }
        
        // Increment by slot duration
        currentMin += slot.slot_duration_minutes;
        while (currentMin >= 60) {
          currentMin -= 60;
          currentHour++;
        }
      }
    });
    
    return times;
  };

  const availableTimes = getAvailableTimes();
  const hasSlots = slots && slots.length > 0;

  if (loadingSlots) {
    return (
      <Card className="mt-4 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading reservation options...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error state if queries failed
  if (slotsError || tablesError) {
    return (
      <Card className="mt-4 border-destructive/20">
        <CardContent className="p-4">
          <div className="text-center text-muted-foreground">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">Unable to load reservations</p>
            <p className="text-xs mt-1">Please try again later.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hasSlots) {
    return (
      <Card className="mt-4 border-muted">
        <CardContent className="p-4">
          <div className="text-center text-muted-foreground">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">No Reservations Available</p>
            <p className="text-xs mt-1">This restaurant hasn't set up reservation slots yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-4 border-primary/20">
      <CardHeader className="py-3 px-4 bg-gradient-to-r from-primary/10 to-primary/5">
        <CardTitle className="text-sm flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          Table Reservation
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {/* Available Info */}
        <div className="flex flex-wrap gap-2">
          {tables && tables.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              <Table2 className="w-3 h-3 mr-1" />
              {tables.filter((t: any) => t.is_available).length} / {tables.length} tables available
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">
            <Clock className="w-3 h-3 mr-1" />
            {slots?.length || 0} time slots
          </Badge>
        </div>

        {/* Available Days */}
        <div className="text-xs text-muted-foreground">
          <p className="font-medium mb-1">Available Days:</p>
          <div className="flex flex-wrap gap-1">
            {[...new Set(slots?.map((s) => s.day_of_week))].sort().map((day) => (
              <Badge key={day} variant="outline" className="text-[10px]">
                {DAY_NAMES[day].slice(0, 3)}
              </Badge>
            ))}
          </div>
        </div>

        {/* Reserve Button */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full" size="sm">
              <CalendarPlus className="w-4 h-4 mr-2" />
              Reserve a Table
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Reserve at {vendorName}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {/* Date Selection */}
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={formData.date}
                  min={format(new Date(), "yyyy-MM-dd")}
                  max={format(addDays(new Date(), 30), "yyyy-MM-dd")}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value, time: "" })}
                />
              </div>

              {/* Time Selection */}
              <div>
                <Label>Time</Label>
                <Select
                  value={formData.time}
                  onValueChange={(v) => setFormData({ ...formData, time: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a time" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTimes.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No available slots for this date
                      </SelectItem>
                    ) : (
                      availableTimes.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Party Size and Duration */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Party Size</Label>
                  <Select
                    value={formData.party_size}
                    onValueChange={(v) => setFormData({ ...formData, party_size: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15, 20].map((size) => (
                        <SelectItem key={size} value={size.toString()}>
                          {size} {size === 1 ? "guest" : "guests"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Duration (hours)</Label>
                  <Select
                    value={formData.booked_hours}
                    onValueChange={(v) => setFormData({ ...formData, booked_hours: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((hours) => (
                        <SelectItem key={hours} value={hours.toString()}>
                          {hours} {hours === 1 ? "hour" : "hours"}
                          {hours > (vendorSettings?.default_table_duration_hours || 1) && vendorSettings?.hourly_extension_fee > 0 && (
                            <span className="text-muted-foreground ml-1">
                              (+₱{((hours - (vendorSettings?.default_table_duration_hours || 1)) * vendorSettings.hourly_extension_fee).toFixed(0)})
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Extension Fee Notice */}
              {extensionFee > 0 && (
                <div className="p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Extension fee: ₱{extensionFee.toFixed(2)} for {parseInt(formData.booked_hours) - (vendorSettings?.default_table_duration_hours || 1)} extra hour(s)
                  </p>
                </div>
              )}

              {/* All Tables Occupied Warning */}
              {allTablesUnavailable && formData.time && vendorSettings?.allow_waitlist && (
                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Hourglass className="w-4 h-4 text-orange-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-orange-700 dark:text-orange-300">All tables are occupied</p>
                      <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5">
                        You can join the waitlist. Estimated wait: ~{vendorSettings.waitlist_buffer_minutes} minutes
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2 border-orange-300 text-orange-700 hover:bg-orange-100"
                        onClick={() => setFormData({ ...formData, is_waitlist: true, table_number: "" })}
                      >
                        <Hourglass className="w-3 h-3 mr-1" />
                        Join Waitlist
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Waitlist confirmation */}
              {formData.is_waitlist && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    You're joining the waitlist (no specific table assigned)
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-1 text-xs"
                    onClick={() => setFormData({ ...formData, is_waitlist: false })}
                  >
                    Cancel waitlist
                  </Button>
                </div>
              )}

              {/* Table Selection - Visual Grid */}
              {tables && tables.length > 0 && !formData.is_waitlist && (
                <div>
                  <Label className="mb-2 block">Select Table</Label>
                  <div className="grid grid-cols-4 gap-2 p-3 bg-muted/30 rounded-lg border">
                    {tablesWithAvailability.map((table: any) => {
                      const isBooked = table.isBookedForTime;
                      const isOccupied = table.isOccupied;
                      const isUnavailable = !table.is_available;
                      const isSelected = formData.table_number === table.table_number.toString();
                      const isDisabled = isBooked || isOccupied || isUnavailable || !formData.time;
                      
                      return (
                        <button
                          key={table.id}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => setFormData({ ...formData, table_number: table.table_number.toString() })}
                          className={`
                            relative p-2 rounded-lg border-2 text-center transition-all
                            ${isSelected 
                              ? 'border-primary bg-primary/10 ring-2 ring-primary/30' 
                              : 'border-border hover:border-primary/50'}
                            ${isDisabled 
                              ? 'opacity-50 cursor-not-allowed bg-muted' 
                              : 'cursor-pointer hover:bg-accent'}
                            ${isBooked || isOccupied ? 'bg-destructive/10 border-destructive/30' : ''}
                          `}
                        >
                          <div className="flex flex-col items-center gap-0.5">
                            <Table2 className={`w-4 h-4 ${isBooked || isOccupied ? 'text-destructive' : isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                            <span className="text-xs font-medium">T{table.table_number}</span>
                            <span className="text-[10px] text-muted-foreground">{table.seats}p</span>
                          </div>
                          {isOccupied && (
                            <Badge variant="destructive" className="absolute -top-1 -right-1 text-[8px] px-1 py-0">
                              In Use
                            </Badge>
                          )}
                          {isBooked && !isOccupied && (
                            <Badge variant="destructive" className="absolute -top-1 -right-1 text-[8px] px-1 py-0">
                              Taken
                            </Badge>
                          )}
                          {isUnavailable && !isBooked && !isOccupied && (
                            <Badge variant="secondary" className="absolute -top-1 -right-1 text-[8px] px-1 py-0">
                              N/A
                            </Badge>
                          )}
                          {isOccupied && table.expectedFreeTime && (
                            <p className="text-[8px] text-muted-foreground mt-0.5">
                              ~{format(table.expectedFreeTime, "HH:mm")}
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {!formData.time && (
                    <p className="text-xs text-muted-foreground mt-1">Select a time to see table availability</p>
                  )}
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded border-2 border-primary bg-primary/10" />
                      <span>Selected</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded border-2 border-border" />
                      <span>Available</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-destructive/10 border-2 border-destructive/30" />
                      <span>Occupied</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Your Name *</Label>
                  <Input
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <Label>Phone *</Label>
                  <Input
                    value={formData.customer_phone}
                    onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                    placeholder="Phone number"
                  />
                </div>
              </div>

              <div>
                <Label>Email (optional)</Label>
                <Input
                  type="email"
                  value={formData.customer_email}
                  onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                  placeholder="Email address"
                />
              </div>

              {/* Special Requests */}
              <div>
                <Label>Special Requests (optional)</Label>
                <Textarea
                  value={formData.special_requests}
                  onChange={(e) => setFormData({ ...formData, special_requests: e.target.value })}
                  placeholder="Any dietary requirements, seating preferences..."
                  rows={2}
                />
              </div>

              <Button
                onClick={() => createReservationMutation.mutate()}
                disabled={
                  !formData.time ||
                  !formData.customer_name ||
                  !formData.customer_phone ||
                  (!formData.table_number && !formData.is_waitlist) ||
                  createReservationMutation.isPending
                }
                className="w-full"
              >
                {createReservationMutation.isPending 
                  ? "Submitting..." 
                  : formData.is_waitlist 
                    ? "Join Waitlist" 
                    : `Reserve Table${extensionFee > 0 ? ` (₱${extensionFee.toFixed(0)} fee)` : ''}`}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};