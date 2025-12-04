import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Calendar, Clock, Eye } from "lucide-react";
import { toast } from "sonner";
import EditServiceDialog from "./EditServiceDialog";
import BlockoutDatesDialog from "./BlockoutDatesDialog";
import ServiceBookingsDialog from "./ServiceBookingsDialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Service {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  duration_minutes: number;
  image_url: string | null;
  is_active: boolean;
  approval_status: string;
  diamond_reward: number;
  created_at: string;
}

interface MyServicesProps {
  onCreateNew: () => void;
}

const MyServices = ({ onCreateNew }: MyServicesProps) => {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editService, setEditService] = useState<Service | null>(null);
  const [deleteService, setDeleteService] = useState<Service | null>(null);
  const [blockoutService, setBlockoutService] = useState<Service | null>(null);
  const [bookingsService, setBookingsService] = useState<Service | null>(null);

  useEffect(() => {
    if (user) {
      fetchMyServices();
    }
  }, [user]);

  const fetchMyServices = async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("provider_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setServices(data);
    }
    setLoading(false);
  };

  const toggleServiceActive = async (service: Service) => {
    const { error } = await supabase
      .from("services")
      .update({ is_active: !service.is_active })
      .eq("id", service.id);

    if (error) {
      toast.error("Failed to update service");
    } else {
      setServices(services.map(s => 
        s.id === service.id ? { ...s, is_active: !s.is_active } : s
      ));
      toast.success(service.is_active ? "Service deactivated" : "Service activated");
    }
  };

  const handleDelete = async () => {
    if (!deleteService) return;

    const { error } = await supabase
      .from("services")
      .delete()
      .eq("id", deleteService.id);

    if (error) {
      toast.error("Failed to delete service");
    } else {
      setServices(services.filter(s => s.id !== deleteService.id));
      toast.success("Service deleted");
    }
    setDeleteService(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Please log in to manage your services</p>
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

  if (services.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🛠️</div>
        <h3 className="text-lg font-semibold mb-2">No Services Yet</h3>
        <p className="text-muted-foreground mb-4">Start offering your services and earn from bookings</p>
        <Button onClick={onCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          Create Your First Service
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">My Services ({services.length})</h2>
        <Button onClick={onCreateNew} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Service
        </Button>
      </div>

      {services.map(service => (
        <Card key={service.id}>
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                {service.image_url ? (
                  <img src={service.image_url} alt={service.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">🔧</div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold line-clamp-1">{service.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusBadge(service.approval_status)}
                      <Badge variant="outline">{service.category}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Active</span>
                    <Switch
                      checked={service.is_active}
                      onCheckedChange={() => toggleServiceActive(service)}
                      disabled={service.approval_status !== "approved"}
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">₱{service.price}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {service.duration_minutes} min
                  </span>
                  {service.diamond_reward > 0 && (
                    <span>💎 {service.diamond_reward}</span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  <Button variant="outline" size="sm" onClick={() => setBookingsService(service)}>
                    <Eye className="h-3 w-3 mr-1" />
                    Bookings
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setBlockoutService(service)}>
                    <Calendar className="h-3 w-3 mr-1" />
                    Blockout
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setEditService(service)}>
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDeleteService(service)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <EditServiceDialog
        open={!!editService}
        onOpenChange={(open) => !open && setEditService(null)}
        service={editService}
        onUpdated={fetchMyServices}
      />

      <BlockoutDatesDialog
        open={!!blockoutService}
        onOpenChange={(open) => !open && setBlockoutService(null)}
        service={blockoutService}
      />

      <ServiceBookingsDialog
        open={!!bookingsService}
        onOpenChange={(open) => !open && setBookingsService(null)}
        service={bookingsService}
      />

      <AlertDialog open={!!deleteService} onOpenChange={(open) => !open && setDeleteService(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteService?.title}" and all associated bookings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MyServices;