import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, CalendarCheck, Edit2, CheckCircle, XCircle, Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

interface Service {
  id: string;
  title: string;
  description: string | null;
  price: number;
  duration_minutes: number | null;
  category: string | null;
  image_url: string | null;
  is_active: boolean | null;
  approval_status: string | null;
  diamond_reward: number | null;
  referral_commission_diamonds: number | null;
  provider_id: string;
  created_at: string;
  profiles?: {
    id: string;
    full_name: string | null;
    email: string | null;
  };
}

interface CommissionSettings {
  service_markup_percentage: number;
  service_unilevel_commission: number;
  service_stairstep_commission: number;
  service_leadership_commission: number;
}

export default function ServiceCommissionManagement() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [processing, setProcessing] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  
  // Service edit fields
  const [markup, setMarkup] = useState("");
  const [diamondReward, setDiamondReward] = useState("");
  const [referralCommission, setReferralCommission] = useState("");
  
  // Global commission settings
  const [commissionSettings, setCommissionSettings] = useState<CommissionSettings>({
    service_markup_percentage: 20,
    service_unilevel_commission: 5,
    service_stairstep_commission: 10,
    service_leadership_commission: 2,
  });
  const [diamondBasePrice, setDiamondBasePrice] = useState(10);

  useEffect(() => {
    fetchServices();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("treasure_admin_settings")
        .select("setting_key, setting_value")
        .in("setting_key", [
          "diamond_base_price",
          "service_markup_percentage",
          "service_unilevel_commission",
          "service_stairstep_commission",
          "service_leadership_commission",
        ]);

      if (error) throw error;

      if (data) {
        const settings: any = { ...commissionSettings };
        data.forEach((item) => {
          if (item.setting_key === "diamond_base_price") {
            setDiamondBasePrice(parseFloat(item.setting_value));
          } else {
            settings[item.setting_key] = parseFloat(item.setting_value);
          }
        });
        setCommissionSettings(settings);
      }
    } catch (error: any) {
      console.error("Error fetching settings:", error);
    }
  };

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from("services")
        .select(`
          *,
          profiles!services_provider_id_fkey (
            id,
            full_name,
            email
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setServices(data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditService = (service: Service) => {
    setSelectedService(service);
    setMarkup("0"); // Services don't have markup column yet, use 0
    setDiamondReward(service.diamond_reward?.toString() || "0");
    setReferralCommission(service.referral_commission_diamonds?.toString() || "0");
  };

  const handleApproveService = async (service: Service, approved: boolean) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("services")
        .update({
          approval_status: approved ? "approved" : "rejected",
          is_active: approved,
        })
        .eq("id", service.id);

      if (error) throw error;

      toast.success(`Service ${approved ? "approved" : "rejected"} successfully!`);
      fetchServices();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleSaveService = async () => {
    if (!selectedService) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from("services")
        .update({
          diamond_reward: parseInt(diamondReward) || 0,
          referral_commission_diamonds: parseInt(referralCommission) || 0,
        })
        .eq("id", selectedService.id);

      if (error) throw error;

      toast.success("Service updated successfully!");
      setSelectedService(null);
      fetchServices();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleSaveGlobalSettings = async () => {
    setProcessing(true);
    try {
      const settingsToUpdate = [
        { setting_key: "service_markup_percentage", setting_value: commissionSettings.service_markup_percentage.toString(), description: "Default markup percentage for services" },
        { setting_key: "service_unilevel_commission", setting_value: commissionSettings.service_unilevel_commission.toString(), description: "Unilevel (7-level) commission percentage for service bookings" },
        { setting_key: "service_stairstep_commission", setting_value: commissionSettings.service_stairstep_commission.toString(), description: "Stair-step plan commission percentage for service bookings" },
        { setting_key: "service_leadership_commission", setting_value: commissionSettings.service_leadership_commission.toString(), description: "Leadership bonus percentage for service bookings" },
      ];

      for (const setting of settingsToUpdate) {
        const { error } = await supabase
          .from("treasure_admin_settings")
          .upsert(setting, { onConflict: "setting_key" });

        if (error) throw error;
      }

      toast.success("Commission settings saved successfully!");
      setShowSettingsDialog(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setProcessing(false);
    }
  };

  const calculateCommissionBreakdown = (price: number) => {
    const unilevel = price * (commissionSettings.service_unilevel_commission / 100);
    const stairstep = price * (commissionSettings.service_stairstep_commission / 100);
    const leadership = price * (commissionSettings.service_leadership_commission / 100);
    const totalCommission = unilevel + stairstep + leadership;
    const adminProfit = price - totalCommission;

    return { unilevel, stairstep, leadership, totalCommission, adminProfit };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Global Commission Settings Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Service Commission Settings
                </CardTitle>
                <CardDescription>
                  Configure how commissions are distributed for service bookings
                </CardDescription>
              </div>
              <Button onClick={() => setShowSettingsDialog(true)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Settings
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Unilevel (7-Level)</p>
                <p className="text-2xl font-bold">{commissionSettings.service_unilevel_commission}%</p>
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Stair-Step Plan</p>
                <p className="text-2xl font-bold">{commissionSettings.service_stairstep_commission}%</p>
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Leadership Bonus</p>
                <p className="text-2xl font-bold">{commissionSettings.service_leadership_commission}%</p>
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Total Commission Pool</p>
                <p className="text-2xl font-bold text-primary">
                  {commissionSettings.service_unilevel_commission + commissionSettings.service_stairstep_commission + commissionSettings.service_leadership_commission}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Services List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5" />
              User Services (Booking)
            </CardTitle>
            <CardDescription>
              Manage and approve service listings from providers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {services.map((service) => {
                const breakdown = calculateCommissionBreakdown(service.price);
                return (
                  <Card key={service.id}>
                    <CardContent className="pt-6">
                      <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="font-medium">{service.title}</span>
                            <Badge variant={service.approval_status === "approved" ? "default" : service.approval_status === "rejected" ? "destructive" : "secondary"}>
                              {service.approval_status || "Pending"}
                            </Badge>
                            {service.category && (
                              <Badge variant="outline">{service.category}</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                            {service.description}
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                            <p>
                              <span className="text-muted-foreground">Provider:</span>{" "}
                              {service.profiles?.full_name || service.profiles?.email || "Unknown"}
                            </p>
                            <p>
                              <span className="text-muted-foreground">Price:</span>{" "}
                              <span className="font-medium text-primary">₱{service.price.toFixed(2)}</span>
                            </p>
                            <p>
                              <span className="text-muted-foreground">Duration:</span>{" "}
                              {service.duration_minutes || 60} mins
                            </p>
                            <p>
                              <span className="text-muted-foreground">Diamond Reward:</span>{" "}
                              {service.diamond_reward || 0} 💎
                            </p>
                            <p>
                              <span className="text-muted-foreground">Referral Commission:</span>{" "}
                              {service.referral_commission_diamonds || 0} 💎
                            </p>
                          </div>
                          
                          {/* Commission Breakdown */}
                          <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                            <p className="text-xs font-medium mb-2">Commission Breakdown (per booking):</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                              <div>
                                <span className="text-muted-foreground">Unilevel:</span>{" "}
                                <span className="font-medium">₱{breakdown.unilevel.toFixed(2)}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Stair-Step:</span>{" "}
                                <span className="font-medium">₱{breakdown.stairstep.toFixed(2)}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Leadership:</span>{" "}
                                <span className="font-medium">₱{breakdown.leadership.toFixed(2)}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Platform:</span>{" "}
                                <span className="font-medium text-primary">₱{breakdown.adminProfit.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {service.approval_status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleApproveService(service, true)}
                                disabled={processing}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleApproveService(service, false)}
                                disabled={processing}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditService(service)}
                          >
                            <Edit2 className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {services.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No services yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Service Dialog */}
      <Dialog open={!!selectedService} onOpenChange={() => setSelectedService(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Service Commission</DialogTitle>
            <DialogDescription>
              Configure diamond rewards for {selectedService?.title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="diamondReward">Diamond Reward (buyer receives)</Label>
              <Input
                id="diamondReward"
                type="number"
                min="0"
                value={diamondReward}
                onChange={(e) => setDiamondReward(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Diamonds credited to buyer after booking completion
              </p>
            </div>

            <div>
              <Label htmlFor="referralCommission">Referral Commission (diamonds)</Label>
              <Input
                id="referralCommission"
                type="number"
                min="0"
                value={referralCommission}
                onChange={(e) => setReferralCommission(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Diamonds paid to referrer when someone books through their link
              </p>
            </div>

            {selectedService && (
              <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service Price:</span>
                  <span className="font-medium">₱{selectedService.price.toFixed(2)}</span>
                </div>
                <Separator />
                <p className="font-medium text-xs">Commission Distribution:</p>
                {(() => {
                  const breakdown = calculateCommissionBreakdown(selectedService.price);
                  return (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">→ Unilevel ({commissionSettings.service_unilevel_commission}%):</span>
                        <span>₱{breakdown.unilevel.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">→ Stair-Step ({commissionSettings.service_stairstep_commission}%):</span>
                        <span>₱{breakdown.stairstep.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">→ Leadership ({commissionSettings.service_leadership_commission}%):</span>
                        <span>₱{breakdown.leadership.toFixed(2)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-medium">
                        <span className="text-muted-foreground">Platform Revenue:</span>
                        <span className="text-primary">₱{breakdown.adminProfit.toFixed(2)}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedService(null)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveService} disabled={processing}>
              {processing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Global Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Service Commission Settings</DialogTitle>
            <DialogDescription>
              Configure commission distribution percentages for all service bookings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="unilevel">Unilevel Commission (7-Level Network) %</Label>
              <Input
                id="unilevel"
                type="number"
                min="0"
                max="100"
                value={commissionSettings.service_unilevel_commission}
                onChange={(e) => setCommissionSettings({
                  ...commissionSettings,
                  service_unilevel_commission: parseFloat(e.target.value) || 0
                })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Distributed across 7 levels of upline referrers
              </p>
            </div>

            <div>
              <Label htmlFor="stairstep">Stair-Step Plan Commission %</Label>
              <Input
                id="stairstep"
                type="number"
                min="0"
                max="100"
                value={commissionSettings.service_stairstep_commission}
                onChange={(e) => setCommissionSettings({
                  ...commissionSettings,
                  service_stairstep_commission: parseFloat(e.target.value) || 0
                })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Based on affiliate's current stair-step level (2%, 5%, 8%, etc.)
              </p>
            </div>

            <div>
              <Label htmlFor="leadership">Leadership Bonus %</Label>
              <Input
                id="leadership"
                type="number"
                min="0"
                max="100"
                value={commissionSettings.service_leadership_commission}
                onChange={(e) => setCommissionSettings({
                  ...commissionSettings,
                  service_leadership_commission: parseFloat(e.target.value) || 0
                })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Override bonus for leaders with 21% tier downlines
              </p>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Commission Pool:</span>
                <span className="font-bold text-primary">
                  {commissionSettings.service_unilevel_commission + 
                   commissionSettings.service_stairstep_commission + 
                   commissionSettings.service_leadership_commission}%
                </span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">Platform Revenue:</span>
                <span className="font-bold">
                  {100 - (commissionSettings.service_unilevel_commission + 
                   commissionSettings.service_stairstep_commission + 
                   commissionSettings.service_leadership_commission)}%
                </span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Note: Total commission pool should not exceed 100%. The remaining percentage 
              goes to platform revenue.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSettingsDialog(false)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveGlobalSettings} disabled={processing}>
              {processing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : "Save Settings"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
