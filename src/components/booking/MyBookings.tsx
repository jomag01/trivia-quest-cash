import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { Clock, Calendar, MapPin, CheckCircle, XCircle, Clock4 } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface Booking {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
  total_amount: number;
  notes: string | null;
  created_at: string;
  service: {
    id: string;
    title: string;
    image_url: string | null;
    category: string;
  };
  provider: {
    full_name: string | null;
    avatar_url: string | null;
  };
  customer: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

const MyBookings = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"customer" | "provider">("customer");

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user, view]);

  const fetchBookings = async () => {
    if (!user) return;
    
    setLoading(true);
    
    const column = view === "customer" ? "customer_id" : "provider_id";
    
    const { data, error } = await supabase
      .from("service_bookings")
      .select(`
        *,
        service:services!service_bookings_service_id_fkey (id, title, image_url, category),
        provider:profiles!service_bookings_provider_id_fkey (full_name, avatar_url),
        customer:profiles!service_bookings_customer_id_fkey (full_name, avatar_url)
      `)
      .eq(column, user.id)
      .order("booking_date", { ascending: false });

    if (!error && data) {
      setBookings(data as unknown as Booking[]);
    }
    setLoading(false);
  };

  const updateBookingStatus = async (bookingId: string, status: string) => {
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

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Please log in to view your bookings</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs value={view} onValueChange={(v) => setView(v as "customer" | "provider")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="customer">My Bookings</TabsTrigger>
          <TabsTrigger value="provider">Received Bookings</TabsTrigger>
        </TabsList>

        <TabsContent value={view} className="mt-4">
          {bookings.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📅</div>
              <h3 className="text-lg font-semibold mb-2">No Bookings Yet</h3>
              <p className="text-muted-foreground">
                {view === "customer" 
                  ? "Browse services and make your first booking"
                  : "You haven't received any bookings yet"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map(booking => (
                <Card key={booking.id}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        {booking.service?.image_url ? (
                          <img 
                            src={booking.service.image_url} 
                            alt={booking.service.title}
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">🔧</div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold line-clamp-1">{booking.service?.title}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Avatar className="h-5 w-5">
                                <AvatarImage 
                                  src={view === "customer" 
                                    ? booking.provider?.avatar_url || undefined
                                    : booking.customer?.avatar_url || undefined
                                  } 
                                />
                                <AvatarFallback>
                                  {view === "customer" 
                                    ? booking.provider?.full_name?.[0] || "P"
                                    : booking.customer?.full_name?.[0] || "C"
                                  }
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm text-muted-foreground">
                                {view === "customer" 
                                  ? booking.provider?.full_name || "Provider"
                                  : booking.customer?.full_name || "Customer"
                                }
                              </span>
                            </div>
                          </div>
                          {getStatusBadge(booking.status)}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(booking.booking_date), "MMM d, yyyy")}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {booking.start_time.slice(0, 5)}
                          </span>
                          <span className="font-semibold text-foreground">
                            ₱{booking.total_amount}
                          </span>
                        </div>

                        {booking.notes && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-1">
                            Note: {booking.notes}
                          </p>
                        )}

                        {/* Actions for provider */}
                        {view === "provider" && booking.status === "pending" && (
                          <div className="flex gap-2 mt-3">
                            <Button 
                              size="sm" 
                              onClick={() => updateBookingStatus(booking.id, "confirmed")}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Confirm
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => updateBookingStatus(booking.id, "cancelled")}
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Decline
                            </Button>
                          </div>
                        )}

                        {view === "provider" && booking.status === "confirmed" && (
                          <Button 
                            size="sm" 
                            className="mt-3"
                            onClick={() => updateBookingStatus(booking.id, "completed")}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Mark Complete
                          </Button>
                        )}

                        {/* Actions for customer */}
                        {view === "customer" && booking.status === "pending" && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="mt-3"
                            onClick={() => updateBookingStatus(booking.id, "cancelled")}
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
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

export default MyBookings;