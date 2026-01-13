import { useState } from "react";
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
import { format, addDays } from "date-fns";
import { Calendar, Clock, Users, CalendarPlus, Table2 } from "lucide-react";

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

  // Fetch ALL tables for this vendor (including unavailable)
  const { data: tables, error: tablesError } = useQuery({
    queryKey: ["vendor-tables", vendorId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("restaurant_tables")
        .select("*")
        .eq("vendor_id", vendorId)
        .order("table_number");
      if (error) {
        console.error("Error fetching tables:", error);
        throw error;
      }
      return data || [];
    },
  });

  // Fetch existing reservations for the selected date with table info
  const { data: existingReservations } = useQuery({
    queryKey: ["date-reservations", vendorId, formData.date],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("restaurant_reservations")
        .select("reservation_time, party_size, status, table_number")
        .eq("vendor_id", vendorId)
        .eq("reservation_date", formData.date)
        .not("status", "in", "(cancelled,no_show)");
      if (error) throw error;
      return data || [];
    },
    enabled: !!formData.date,
  });

  // Check if a table is booked for the selected time
  const isTableBookedForTime = (tableNumber: number, time: string) => {
    if (!existingReservations || !time) return false;
    return existingReservations.some(
      (r: any) => r.table_number === tableNumber && r.reservation_time === time
    );
  };

  // Get available tables for the selected time
  const getAvailableTablesForTime = () => {
    if (!tables || !formData.time) return tables || [];
    return tables.map((table: any) => ({
      ...table,
      isBookedForTime: isTableBookedForTime(table.table_number, formData.time),
    }));
  };

  const tablesWithAvailability = getAvailableTablesForTime();

  // Create reservation mutation
  // Create reservation mutation
  const createReservationMutation = useMutation({
    mutationFn: async () => {
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
        special_requests: formData.special_requests || null,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["date-reservations"] });
      toast.success("Reservation submitted! Waiting for confirmation.");
      setDialogOpen(false);
      setFormData({
        ...formData,
        time: "",
        table_number: "",
        special_requests: "",
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

              {/* Party Size */}
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

                {/* Table Selection - Visual Grid */}
                {tables && tables.length > 0 && (
                  <div className="col-span-2">
                    <Label className="mb-2 block">Select Table</Label>
                    <div className="grid grid-cols-4 gap-2 p-3 bg-muted/30 rounded-lg border">
                      {tablesWithAvailability.map((table: any) => {
                        const isBooked = table.isBookedForTime;
                        const isUnavailable = !table.is_available;
                        const isSelected = formData.table_number === table.table_number.toString();
                        const isDisabled = isBooked || isUnavailable || !formData.time;
                        
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
                              ${isBooked ? 'bg-destructive/10 border-destructive/30' : ''}
                            `}
                          >
                            <div className="flex flex-col items-center gap-0.5">
                              <Table2 className={`w-4 h-4 ${isBooked ? 'text-destructive' : isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                              <span className="text-xs font-medium">T{table.table_number}</span>
                              <span className="text-[10px] text-muted-foreground">{table.seats}p</span>
                            </div>
                            {isBooked && (
                              <Badge variant="destructive" className="absolute -top-1 -right-1 text-[8px] px-1 py-0">
                                Taken
                              </Badge>
                            )}
                            {isUnavailable && !isBooked && (
                              <Badge variant="secondary" className="absolute -top-1 -right-1 text-[8px] px-1 py-0">
                                N/A
                              </Badge>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {!formData.time && (
                      <p className="text-xs text-muted-foreground mt-1">Select a time to see table availability</p>
                    )}
                    <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
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
                        <span>Taken</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

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
                  createReservationMutation.isPending
                }
                className="w-full"
              >
                {createReservationMutation.isPending ? "Submitting..." : "Submit Reservation"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};