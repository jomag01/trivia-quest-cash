import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Cookie, ArrowLeft, Globe, FileText, ShoppingCart, BookOpen, Calendar } from "lucide-react";

interface CookiePlacement {
  id: string;
  placement_name: string;
  placement_key: string;
  description: string | null;
  is_active: boolean;
  cookie_name: string;
  cookie_duration_days: number;
  tracking_pages: string[];
  capture_on: string[];
  priority: number;
}

interface CookiePlacementSettingsProps {
  onBack: () => void;
}

const placementIcons: Record<string, any> = {
  global_referral: Globe,
  affiliate_link: Cookie,
  product_referral: ShoppingCart,
  checkout_attribution: ShoppingCart,
  blog_referral: BookOpen,
  service_referral: Calendar,
};

const captureOptions = [
  { value: 'page_load', label: 'Page Load' },
  { value: 'scroll_50', label: '50% Scroll' },
  { value: 'scroll_100', label: 'Full Scroll' },
  { value: 'click', label: 'Click Event' },
  { value: 'purchase', label: 'Purchase' },
];

export default function CookiePlacementSettings({ onBack }: CookiePlacementSettingsProps) {
  const queryClient = useQueryClient();
  const [editDialog, setEditDialog] = useState(false);
  const [editingPlacement, setEditingPlacement] = useState<CookiePlacement | null>(null);
  const [formData, setFormData] = useState({
    placement_name: "",
    placement_key: "",
    description: "",
    cookie_name: "",
    cookie_duration_days: 90,
    tracking_pages: "",
    capture_on: [] as string[],
    priority: 0,
    is_active: true,
  });

  const { data: placements, isLoading } = useQuery({
    queryKey: ["cookie-placements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cookie_placement_settings")
        .select("*")
        .order("priority", { ascending: false });
      if (error) throw error;
      return data as CookiePlacement[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        placement_name: data.placement_name,
        placement_key: data.placement_key,
        description: data.description || null,
        cookie_name: data.cookie_name,
        cookie_duration_days: data.cookie_duration_days,
        tracking_pages: data.tracking_pages.split(',').map(s => s.trim()).filter(Boolean),
        capture_on: data.capture_on,
        priority: data.priority,
        is_active: data.is_active,
      };

      if (editingPlacement) {
        const { error } = await supabase
          .from("cookie_placement_settings")
          .update(payload)
          .eq("id", editingPlacement.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("cookie_placement_settings")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingPlacement ? "Placement updated" : "Placement created");
      queryClient.invalidateQueries({ queryKey: ["cookie-placements"] });
      setEditDialog(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save placement");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("cookie_placement_settings")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Placement deleted");
      queryClient.invalidateQueries({ queryKey: ["cookie-placements"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete placement");
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("cookie_placement_settings")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cookie-placements"] });
    },
  });

  const resetForm = () => {
    setEditingPlacement(null);
    setFormData({
      placement_name: "",
      placement_key: "",
      description: "",
      cookie_name: "",
      cookie_duration_days: 90,
      tracking_pages: "",
      capture_on: [],
      priority: 0,
      is_active: true,
    });
  };

  const openEditDialog = (placement?: CookiePlacement) => {
    if (placement) {
      setEditingPlacement(placement);
      setFormData({
        placement_name: placement.placement_name,
        placement_key: placement.placement_key,
        description: placement.description || "",
        cookie_name: placement.cookie_name,
        cookie_duration_days: placement.cookie_duration_days,
        tracking_pages: placement.tracking_pages.join(', '),
        capture_on: placement.capture_on,
        priority: placement.priority,
        is_active: placement.is_active,
      });
    } else {
      resetForm();
    }
    setEditDialog(true);
  };

  const toggleCaptureOn = (value: string) => {
    setFormData(prev => ({
      ...prev,
      capture_on: prev.capture_on.includes(value)
        ? prev.capture_on.filter(v => v !== value)
        : [...prev.capture_on, value],
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h2 className="text-lg font-semibold">Cookie Placement Settings</h2>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Cookie className="h-4 w-4" />
                Tracking Cookie Placements
              </CardTitle>
              <CardDescription className="text-xs">
                Configure where and how referral cookies are captured across your site
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => openEditDialog()}>
              <Plus className="h-4 w-4 mr-1" />
              Add Placement
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : placements?.length === 0 ? (
            <p className="text-sm text-muted-foreground">No placements configured</p>
          ) : (
            placements?.map((placement) => {
              const Icon = placementIcons[placement.placement_key] || Cookie;
              return (
                <div
                  key={placement.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${placement.is_active ? 'bg-primary/10' : 'bg-muted'}`}>
                      <Icon className={`h-4 w-4 ${placement.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{placement.placement_name}</span>
                        <Badge variant={placement.is_active ? "default" : "secondary"} className="text-xs">
                          {placement.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          P{placement.priority}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Cookie: {placement.cookie_name} • {placement.cookie_duration_days} days
                      </p>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {placement.capture_on.map(trigger => (
                          <Badge key={trigger} variant="outline" className="text-xs py-0">
                            {trigger}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={placement.is_active}
                      onCheckedChange={(checked) => 
                        toggleActiveMutation.mutate({ id: placement.id, is_active: checked })
                      }
                    />
                    <Button size="icon" variant="ghost" onClick={() => openEditDialog(placement)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => {
                        if (confirm("Delete this placement?")) {
                          deleteMutation.mutate(placement.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingPlacement ? "Edit Placement" : "Add Cookie Placement"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Placement Name</Label>
                <Input
                  value={formData.placement_name}
                  onChange={(e) => setFormData({ ...formData, placement_name: e.target.value })}
                  placeholder="Global Referral"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Placement Key</Label>
                <Input
                  value={formData.placement_key}
                  onChange={(e) => setFormData({ ...formData, placement_key: e.target.value })}
                  placeholder="global_referral"
                  className="h-8 text-sm"
                  disabled={!!editingPlacement}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What this placement tracks..."
                className="min-h-[60px] text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Cookie Name</Label>
                <Input
                  value={formData.cookie_name}
                  onChange={(e) => setFormData({ ...formData, cookie_name: e.target.value })}
                  placeholder="aff_referrer"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Duration (days)</Label>
                <Input
                  type="number"
                  value={formData.cookie_duration_days}
                  onChange={(e) => setFormData({ ...formData, cookie_duration_days: parseInt(e.target.value) || 90 })}
                  min={1}
                  max={365}
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Tracking Pages (comma separated, use * for wildcard)</Label>
              <Input
                value={formData.tracking_pages}
                onChange={(e) => setFormData({ ...formData, tracking_pages: e.target.value })}
                placeholder="/*, /shop*, /product*"
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Capture On</Label>
              <div className="flex flex-wrap gap-2">
                {captureOptions.map(opt => (
                  <Badge
                    key={opt.value}
                    variant={formData.capture_on.includes(opt.value) ? "default" : "outline"}
                    className="cursor-pointer text-xs"
                    onClick={() => toggleCaptureOn(opt.value)}
                  >
                    {opt.label}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Priority (higher = first)</Label>
                <Input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                  className="h-8 text-sm"
                />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label className="text-xs">Active</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditDialog(false)}>
              Cancel
            </Button>
            <Button 
              size="sm" 
              onClick={() => saveMutation.mutate(formData)}
              disabled={!formData.placement_name || !formData.placement_key || !formData.cookie_name}
            >
              {editingPlacement ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}