import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Plus, Edit, Trash2, Calendar, Clock, Eye, Link2, Copy, ExternalLink, QrCode, Share2 } from "lucide-react";
import { toast } from "sonner";
import EditServiceDialog from "./EditServiceDialog";
import BlockoutDatesDialog from "./BlockoutDatesDialog";
import ServiceBookingsDialog from "./ServiceBookingsDialog";
import CreateServiceDialog from "./CreateServiceDialog";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  service_type?: string;
  diamond_reward: number;
  created_at: string;
}

const DashboardBookingServices = () => {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editService, setEditService] = useState<Service | null>(null);
  const [deleteService, setDeleteService] = useState<Service | null>(null);
  const [blockoutService, setBlockoutService] = useState<Service | null>(null);
  const [bookingsService, setBookingsService] = useState<Service | null>(null);
  const [showCreateService, setShowCreateService] = useState(false);
  const [shareService, setShareService] = useState<Service | null>(null);
  const [activeTab, setActiveTab] = useState("all");

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

  const getShareableLink = (serviceId: string) => {
    return `${window.location.origin}/book/${serviceId}`;
  };

  const copyShareableLink = (service: Service) => {
    navigator.clipboard.writeText(getShareableLink(service.id));
    toast.success("Booking link copied to clipboard!");
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

  const getServiceTypeBadge = (type: string | undefined) => {
    switch (type) {
      case "travel_tour":
        return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">✈️ Travel</Badge>;
      default:
        return <Badge variant="outline">Standard</Badge>;
    }
  };

  const filteredServices = services.filter(service => {
    if (activeTab === "all") return true;
    if (activeTab === "travel") return service.service_type === "travel_tour";
    if (activeTab === "standard") return !service.service_type || service.service_type !== "travel_tour";
    return true;
  });

  if (!user) {
    return (
      <Card className="p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Please log in to manage your booking services</p>
        </div>
      </Card>
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
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                My Booking Services
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Create and manage your booking services with shareable links
              </p>
            </div>
            <Button onClick={() => setShowCreateService(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Service
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="all">All ({services.length})</TabsTrigger>
              <TabsTrigger value="travel">Travel & Tours</TabsTrigger>
              <TabsTrigger value="standard">Standard</TabsTrigger>
            </TabsList>
          </Tabs>

          {filteredServices.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <div className="text-5xl mb-4">🗓️</div>
              <h3 className="text-lg font-semibold mb-2">No Services Yet</h3>
              <p className="text-muted-foreground mb-4">
                Start offering booking services like travel tours, appointments, and more
              </p>
              <Button onClick={() => setShowCreateService(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Service
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredServices.map(service => (
                <Card key={service.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        {service.image_url ? (
                          <img src={service.image_url} alt={service.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">
                            {service.service_type === "travel_tour" ? "✈️" : "🔧"}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold line-clamp-1">{service.title}</h3>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {getStatusBadge(service.approval_status)}
                              {getServiceTypeBadge(service.service_type)}
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
                          <span className="font-semibold text-foreground">₱{service.price.toLocaleString()}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {service.duration_minutes} min
                          </span>
                          {service.diamond_reward > 0 && (
                            <span>💎 {service.diamond_reward}</span>
                          )}
                        </div>

                        {/* Shareable Link Section */}
                        {service.approval_status === "approved" && (
                          <div className="mt-3 p-2 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-2">
                              <Link2 className="h-3 w-3 text-primary flex-shrink-0" />
                              <Input 
                                value={getShareableLink(service.id)} 
                                readOnly 
                                className="h-7 text-xs bg-background"
                              />
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-7 px-2"
                                onClick={() => copyShareableLink(service)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-7 px-2"
                                onClick={() => setShareService(service)}
                              >
                                <Share2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )}

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
            </div>
          )}
        </CardContent>
      </Card>

      <CreateServiceDialog 
        open={showCreateService} 
        onOpenChange={(open) => {
          setShowCreateService(open);
          if (!open) fetchMyServices();
        }} 
      />

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

      {/* Share Dialog */}
      <Dialog open={!!shareService} onOpenChange={(open) => !open && setShareService(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-primary" />
              Share Booking Link
            </DialogTitle>
          </DialogHeader>
          {shareService && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-sm text-muted-foreground mb-2">Share this link with your customers</p>
                <p className="font-medium break-all">{getShareableLink(shareService.id)}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => copyShareableLink(shareService)}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Link
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => window.open(getShareableLink(shareService.id), '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Preview
                </Button>
              </div>

              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground text-center">
                  When customers click this link, they'll be directed to a focused booking page for this service.
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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

export default DashboardBookingServices;
