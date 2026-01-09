import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { format } from "date-fns";
import {
  Calendar,
  Clock,
  Users,
  Phone,
  CheckCircle2,
  XCircle,
  UserCheck,
  Plus,
  Settings,
} from "lucide-react";

interface ReservationManagementProps {
  vendorId: string;
}

interface Reservation {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  reservation_date: string;
  reservation_time: string;
  party_size: number;
  table_number: string | null;
  special_requests: string | null;
  status: string;
  created_at: string;
  arrived_at: string | null;
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

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  arrived: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  completed: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  no_show: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

export const ReservationManagement = ({ vendorId }: ReservationManagementProps) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("reservations");
  const [slotDialogOpen, setSlotDialogOpen] = useState(false);
  const [newSlot, setNewSlot] = useState({
    day_of_week: 1,
    start_time: "11:00",
    end_time: "14:00",
    max_capacity: 20,
    slot_duration_minutes: 60,
  });

  // Fetch reservations
  const { data: reservations, isLoading: loadingReservations } = useQuery({
    queryKey: ["vendor-reservations", vendorId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("restaurant_reservations")
        .select("*")
        .eq("vendor_id", vendorId)
        .order("reservation_date", { ascending: true })
        .order("reservation_time", { ascending: true });
      if (error) throw error;
      return data as Reservation[];
    },
  });

  // Fetch slots
  const { data: slots, isLoading: loadingSlots } = useQuery({
    queryKey: ["vendor-reservation-slots", vendorId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("reservation_slots")
        .select("*")
        .eq("vendor_id", vendorId)
        .order("day_of_week")
        .order("start_time");
      if (error) throw error;
      return data as ReservationSlot[];
    },
  });

  // Update reservation status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, arrivedAt }: { id: string; status: string; arrivedAt?: string }) => {
      const updates: any = { status };
      if (status === "arrived") {
        updates.arrived_at = arrivedAt || new Date().toISOString();
      } else if (status === "completed") {
        updates.completed_at = new Date().toISOString();
      } else if (status === "confirmed") {
        updates.confirmed_at = new Date().toISOString();
      }

      const { error } = await (supabase as any)
        .from("restaurant_reservations")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-reservations"] });
      toast.success("Reservation updated!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update reservation");
    },
  });

  // Create slot
  const createSlotMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("reservation_slots").insert({
        vendor_id: vendorId,
        ...newSlot,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-reservation-slots"] });
      toast.success("Slot created!");
      setSlotDialogOpen(false);
      setNewSlot({
        day_of_week: 1,
        start_time: "11:00",
        end_time: "14:00",
        max_capacity: 20,
        slot_duration_minutes: 60,
      });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create slot");
    },
  });

  // Delete slot
  const deleteSlotMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("reservation_slots").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-reservation-slots"] });
      toast.success("Slot deleted!");
    },
  });

  const todayReservations = reservations?.filter(
    (r) => r.reservation_date === format(new Date(), "yyyy-MM-dd") && !["cancelled", "completed", "no_show"].includes(r.status)
  );

  const upcomingReservations = reservations?.filter(
    (r) => r.reservation_date >= format(new Date(), "yyyy-MM-dd") && !["cancelled", "completed", "no_show"].includes(r.status)
  );

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="reservations" className="text-xs">
            <Calendar className="w-3 h-3 mr-1" />
            Reservations
          </TabsTrigger>
          <TabsTrigger value="slots" className="text-xs">
            <Settings className="w-3 h-3 mr-1" />
            Time Slots
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reservations" className="mt-4 space-y-4">
          {/* Today's Summary */}
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Today's Reservations</p>
                  <p className="text-2xl font-bold">{todayReservations?.length || 0}</p>
                </div>
                <Calendar className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          {/* Reservation List */}
          {loadingReservations ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-20 bg-muted rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : upcomingReservations?.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No upcoming reservations</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingReservations?.map((reservation) => (
                <Card key={reservation.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold">{reservation.customer_name}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="w-3 h-3" />
                          {reservation.customer_phone}
                        </div>
                      </div>
                      <Badge className={STATUS_COLORS[reservation.status]}>
                        {reservation.status}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-sm mb-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {format(new Date(reservation.reservation_date), "MMM dd, yyyy")}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        {reservation.reservation_time}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        {reservation.party_size} guests
                      </div>
                    </div>

                    {reservation.table_number && (
                      <p className="text-sm mb-2">Table: {reservation.table_number}</p>
                    )}

                    {reservation.special_requests && (
                      <p className="text-sm text-muted-foreground mb-3">
                        Note: {reservation.special_requests}
                      </p>
                    )}

                    <div className="flex gap-2 flex-wrap">
                      {reservation.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            onClick={() =>
                              updateStatusMutation.mutate({ id: reservation.id, status: "confirmed" })
                            }
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Confirm
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              updateStatusMutation.mutate({ id: reservation.id, status: "cancelled" })
                            }
                          >
                            <XCircle className="w-3 h-3 mr-1" />
                            Cancel
                          </Button>
                        </>
                      )}

                      {reservation.status === "confirmed" && (
                        <>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() =>
                              updateStatusMutation.mutate({ id: reservation.id, status: "arrived" })
                            }
                          >
                            <UserCheck className="w-3 h-3 mr-1" />
                            Mark Arrived
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              updateStatusMutation.mutate({ id: reservation.id, status: "no_show" })
                            }
                          >
                            No Show
                          </Button>
                        </>
                      )}

                      {reservation.status === "arrived" && (
                        <Button
                          size="sm"
                          onClick={() =>
                            updateStatusMutation.mutate({ id: reservation.id, status: "completed" })
                          }
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Complete
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="slots" className="mt-4 space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-semibold">Reservation Time Slots</h4>
            <Dialog open={slotDialogOpen} onOpenChange={setSlotDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Slot
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Reservation Slot</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Day of Week</Label>
                    <Select
                      value={newSlot.day_of_week.toString()}
                      onValueChange={(v) => setNewSlot({ ...newSlot, day_of_week: parseInt(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAY_NAMES.map((day, i) => (
                          <SelectItem key={i} value={i.toString()}>
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Start Time</Label>
                      <Input
                        type="time"
                        value={newSlot.start_time}
                        onChange={(e) => setNewSlot({ ...newSlot, start_time: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>End Time</Label>
                      <Input
                        type="time"
                        value={newSlot.end_time}
                        onChange={(e) => setNewSlot({ ...newSlot, end_time: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Max Capacity</Label>
                      <Input
                        type="number"
                        value={newSlot.max_capacity}
                        onChange={(e) =>
                          setNewSlot({ ...newSlot, max_capacity: parseInt(e.target.value) || 20 })
                        }
                      />
                    </div>
                    <div>
                      <Label>Slot Duration (min)</Label>
                      <Input
                        type="number"
                        value={newSlot.slot_duration_minutes}
                        onChange={(e) =>
                          setNewSlot({ ...newSlot, slot_duration_minutes: parseInt(e.target.value) || 60 })
                        }
                      />
                    </div>
                  </div>

                  <Button
                    onClick={() => createSlotMutation.mutate()}
                    disabled={createSlotMutation.isPending}
                    className="w-full"
                  >
                    {createSlotMutation.isPending ? "Creating..." : "Create Slot"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {loadingSlots ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-12 bg-muted rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : slots?.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No slots configured</p>
              <p className="text-sm text-muted-foreground">
                Add time slots to allow customers to make reservations
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {slots?.map((slot) => (
                <Card key={slot.id}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{DAY_NAMES[slot.day_of_week]}</p>
                      <p className="text-sm text-muted-foreground">
                        {slot.start_time} - {slot.end_time} • {slot.max_capacity} max • {slot.slot_duration_minutes}min slots
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => deleteSlotMutation.mutate(slot.id)}
                    >
                      Delete
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
