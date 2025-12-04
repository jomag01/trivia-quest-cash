import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Calendar, Clock, CheckCircle, XCircle, Clock4 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Service {
  id: string;
  title: string;
}

interface Booking {
  id: string;
  booking_date: string;
  start_time: string;
  status: string;
  total_amount: number;
  notes: string | null;
  customer: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface ServiceBookingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: Service | null;
}

const ServiceBookingsDialog = ({ open, onOpenChange, service }: ServiceBookingsDialogProps) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (service && open) {
      fetchBookings();
    }
  }, [service, open]);

  const fetchBookings = async () => {
    if (!service) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("service_bookings")
      .select(`
        *,
        customer:profiles!service_bookings_customer_id_fkey (full_name, avatar_url)
      `)
      .eq("service_id", service.id)
      .order("booking_date", { ascending: false });

    if (!error && data) {
      setBookings(data as unknown as Booking[]);
    }
    setLoading(false);
  };

  const updateStatus = async (bookingId: string, status: string) => {
    const { error } = await supabase
      .from("service_bookings")
      .update({ status })
      .eq("id", bookingId);

    if (error) {
      toast.error("Failed to update booking");
    } else {
      toast.success(`Booking ${status}`);
      fetchBookings();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Confirmed</Badge>;
      case "completed":
        return <Badge className="bg-blue-500"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case "cancelled":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="secondary"><Clock4 className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  if (!service) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bookings for {service.title}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No bookings yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map(booking => (
              <div key={booking.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={booking.customer?.avatar_url || undefined} />
                      <AvatarFallback>
                        {booking.customer?.full_name?.[0] || "C"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{booking.customer?.full_name || "Customer"}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(booking.booking_date), "MMM d, yyyy")}
                        <Clock className="h-3 w-3 ml-1" />
                        {booking.start_time.slice(0, 5)}
                      </div>
                    </div>
                  </div>
                  {getStatusBadge(booking.status)}
                </div>

                {booking.notes && (
                  <p className="text-sm text-muted-foreground mb-2">
                    Note: {booking.notes}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <span className="font-semibold">₱{booking.total_amount}</span>
                  
                  <div className="flex gap-2">
                    {booking.status === "pending" && (
                      <>
                        <Button 
                          size="sm"
                          onClick={() => updateStatus(booking.id, "confirmed")}
                        >
                          Confirm
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => updateStatus(booking.id, "cancelled")}
                        >
                          Decline
                        </Button>
                      </>
                    )}
                    {booking.status === "confirmed" && (
                      <Button 
                        size="sm"
                        onClick={() => updateStatus(booking.id, "completed")}
                      >
                        Complete
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ServiceBookingsDialog;