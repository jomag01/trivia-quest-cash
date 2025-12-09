import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { 
  Check, X, Eye, Pencil, Clock, Diamond, DollarSign, 
  Users, AlertCircle, Search 
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface Service {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  price: number;
  vendor_price: number | null;
  admin_price_override: number | null;
  admin_diamond_override: number | null;
  admin_referral_diamond_override: number | null;
  diamond_reward: number;
  referral_commission_diamonds: number;
  duration_minutes: number | null;
  image_url: string | null;
  is_active: boolean;
  approval_status: string;
  admin_notes: string | null;
  provider_id: string;
  created_at: string;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
  };
}

const BookingServiceManagement = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editFormData, setEditFormData] = useState({
    admin_price_override: "",
    admin_diamond_override: "",
    admin_referral_diamond_override: "",
    admin_notes: ""
  });

  useEffect(() => {
    fetchServices();
  }, [statusFilter]);

  const fetchServices = async () => {
    setLoading(true);
    let query = supabase
      .from("services")
      .select(`
        *,
        profiles!services_provider_id_fkey (full_name, avatar_url, email)
      `)
      .order("created_at", { ascending: false });

    if (statusFilter !== "all") {
      query = query.eq("approval_status", statusFilter);
    }

    const { data, error } = await query;
    
    if (error) {
      toast.error("Failed to load services");
    } else {
      setServices(data as Service[] || []);
    }
    setLoading(false);
  };

  const updateStatus = async (serviceId: string, status: string) => {
    const { error } = await supabase
      .from("services")
      .update({ approval_status: status })
      .eq("id", serviceId);

    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success(`Service ${status}`);
      fetchServices();
    }
  };

  const toggleActive = async (service: Service) => {
    const { error } = await supabase
      .from("services")
      .update({ is_active: !service.is_active })
      .eq("id", service.id);

    if (error) {
      toast.error("Failed to update service");
    } else {
      fetchServices();
    }
  };

  const handleEditService = (service: Service) => {
    setEditingService(service);
    setEditFormData({
      admin_price_override: service.admin_price_override?.toString() || "",
      admin_diamond_override: service.admin_diamond_override?.toString() || "",
      admin_referral_diamond_override: service.admin_referral_diamond_override?.toString() || "",
      admin_notes: service.admin_notes || ""
    });
    setShowEditDialog(true);
  };

  const handleSaveOverrides = async () => {
    if (!editingService) return;

    const updateData: any = {
      admin_notes: editFormData.admin_notes || null
    };

    // Parse and set override values
    if (editFormData.admin_price_override) {
      updateData.admin_price_override = parseFloat(editFormData.admin_price_override);
      // Also set the actual price to the override
      updateData.price = parseFloat(editFormData.admin_price_override);
    }
    
    if (editFormData.admin_diamond_override) {
      updateData.admin_diamond_override = parseInt(editFormData.admin_diamond_override);
      updateData.diamond_reward = parseInt(editFormData.admin_diamond_override);
    }
    
    if (editFormData.admin_referral_diamond_override) {
      updateData.admin_referral_diamond_override = parseInt(editFormData.admin_referral_diamond_override);
      updateData.referral_commission_diamonds = parseInt(editFormData.admin_referral_diamond_override);
    }

    const { error } = await supabase
      .from("services")
      .update(updateData)
      .eq("id", editingService.id);

    if (error) {
      toast.error("Failed to save overrides");
    } else {
      toast.success("Service pricing updated");
      setShowEditDialog(false);
      fetchServices();
    }
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

  const filteredServices = services.filter(service =>
    service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getFinalPrice = (service: Service) => {
    return service.admin_price_override || service.price;
  };

  const getFinalDiamondReward = (service: Service) => {
    return service.admin_diamond_override ?? service.diamond_reward;
  };

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
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <h2 className="text-xl font-semibold">Booking Services Management</h2>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full sm:w-64"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredServices.map(service => (
          <Card key={service.id}>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Image */}
                <div className="w-full sm:w-24 h-24 rounded-lg overflow-hidden bg-muted shrink-0">
                  {service.image_url ? (
                    <img 
                      src={service.image_url} 
                      alt={service.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">
                      📋
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="font-semibold line-clamp-1">{service.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {service.category || "Uncategorized"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {getStatusBadge(service.approval_status)}
                      {service.approval_status === "approved" && (
                        <Switch
                          checked={service.is_active}
                          onCheckedChange={() => toggleActive(service)}
                        />
                      )}
                    </div>
                  </div>

                  {/* Provider */}
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={service.profiles?.avatar_url || undefined} />
                      <AvatarFallback>
                        {service.profiles?.full_name?.[0] || "P"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">
                      {service.profiles?.full_name || "Unknown Provider"}
                    </span>
                  </div>

                  {/* Pricing Info */}
                  <div className="flex flex-wrap gap-3 text-sm mb-3">
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>
                        ₱{getFinalPrice(service).toFixed(2)}
                        {service.admin_price_override && (
                          <span className="text-xs text-muted-foreground ml-1">
                            (vendor: ₱{service.vendor_price || service.price})
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Diamond className="h-4 w-4 text-blue-500" />
                      <span>{getFinalDiamondReward(service)} buyer reward</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{service.referral_commission_diamonds} affiliate</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{service.duration_minutes || 60} mins</span>
                    </div>
                  </div>

                  {/* Admin Notes */}
                  {service.admin_notes && (
                    <div className="bg-muted/50 p-2 rounded text-xs mb-3">
                      <strong>Admin Notes:</strong> {service.admin_notes}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    {service.approval_status === "pending" && (
                      <>
                        <Button 
                          size="sm" 
                          onClick={() => updateStatus(service.id, "approved")}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => updateStatus(service.id, "rejected")}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleEditService(service)}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit Pricing
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredServices.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No services found</p>
          </Card>
        )}
      </div>

      {/* Edit Pricing Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Service Pricing & Commissions</DialogTitle>
          </DialogHeader>
          
          {editingService && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-3 rounded-lg">
                <h4 className="font-medium">{editingService.title}</h4>
                <p className="text-sm text-muted-foreground">
                  Vendor Price: ₱{editingService.vendor_price || editingService.price}
                </p>
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    Override values will replace vendor settings. Leave empty to use vendor's original values.
                  </p>
                </div>
              </div>

              <div>
                <Label>Admin Price Override (₱)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editFormData.admin_price_override}
                  onChange={(e) => setEditFormData({ 
                    ...editFormData, 
                    admin_price_override: e.target.value 
                  })}
                  placeholder={`Vendor price: ₱${editingService.vendor_price || editingService.price}`}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Set final price including admin markup
                </p>
              </div>

              <div>
                <Label>Buyer Diamond Reward Override</Label>
                <Input
                  type="number"
                  min="0"
                  value={editFormData.admin_diamond_override}
                  onChange={(e) => setEditFormData({ 
                    ...editFormData, 
                    admin_diamond_override: e.target.value 
                  })}
                  placeholder={`Current: ${editingService.diamond_reward}`}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Diamonds credited to buyer upon booking
                </p>
              </div>

              <div>
                <Label>Affiliate Referral Diamond Override</Label>
                <Input
                  type="number"
                  min="0"
                  value={editFormData.admin_referral_diamond_override}
                  onChange={(e) => setEditFormData({ 
                    ...editFormData, 
                    admin_referral_diamond_override: e.target.value 
                  })}
                  placeholder={`Current: ${editingService.referral_commission_diamonds}`}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Diamonds for affiliates who refer bookings
                </p>
              </div>

              <div>
                <Label>Admin Notes</Label>
                <Textarea
                  value={editFormData.admin_notes}
                  onChange={(e) => setEditFormData({ 
                    ...editFormData, 
                    admin_notes: e.target.value 
                  })}
                  placeholder="Internal notes about pricing adjustments..."
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveOverrides}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BookingServiceManagement;
