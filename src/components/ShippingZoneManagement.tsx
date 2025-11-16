import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

interface ShippingZone {
  id: string;
  name: string;
  regions: string[];
  base_rate: number;
  per_kg_rate: number;
  free_shipping_threshold: number | null;
  is_active: boolean;
}

export const ShippingZoneManagement = () => {
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<ShippingZone | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    regions: "",
    base_rate: "",
    per_kg_rate: "",
    free_shipping_threshold: "",
    is_active: true
  });

  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("shipping_zones")
      .select("*")
      .order("name");

    if (error) {
      toast.error("Failed to load shipping zones");
      console.error(error);
    } else {
      setZones(data || []);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      regions: "",
      base_rate: "",
      per_kg_rate: "",
      free_shipping_threshold: "",
      is_active: true
    });
    setEditingZone(null);
  };

  const openEditDialog = (zone: ShippingZone) => {
    setEditingZone(zone);
    setFormData({
      name: zone.name,
      regions: zone.regions.join(", "),
      base_rate: zone.base_rate.toString(),
      per_kg_rate: zone.per_kg_rate.toString(),
      free_shipping_threshold: zone.free_shipping_threshold?.toString() || "",
      is_active: zone.is_active
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const zoneData = {
      name: formData.name,
      regions: formData.regions.split(",").map(r => r.trim()).filter(r => r),
      base_rate: parseFloat(formData.base_rate),
      per_kg_rate: parseFloat(formData.per_kg_rate),
      free_shipping_threshold: formData.free_shipping_threshold ? parseFloat(formData.free_shipping_threshold) : null,
      is_active: formData.is_active
    };

    if (editingZone) {
      const { error } = await supabase
        .from("shipping_zones")
        .update(zoneData)
        .eq("id", editingZone.id);

      if (error) {
        toast.error("Failed to update zone");
        console.error(error);
        return;
      }
      toast.success("Shipping zone updated");
    } else {
      const { error } = await supabase
        .from("shipping_zones")
        .insert([zoneData]);

      if (error) {
        toast.error("Failed to create zone");
        console.error(error);
        return;
      }
      toast.success("Shipping zone created");
    }

    resetForm();
    fetchZones();
    setIsDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this shipping zone?")) return;

    const { error } = await supabase
      .from("shipping_zones")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete zone");
      console.error(error);
      return;
    }

    toast.success("Shipping zone deleted");
    fetchZones();
  };

  if (loading) return <div>Loading shipping zones...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <MapPin className="w-6 h-6" />
            Shipping Zones
          </h2>
          <p className="text-sm text-muted-foreground">Manage shipping rates by region</p>
        </div>
        <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Zone
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Zone Name</TableHead>
              <TableHead>Base Rate</TableHead>
              <TableHead>Per KG</TableHead>
              <TableHead>Free Shipping At</TableHead>
              <TableHead>Regions</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {zones.map((zone) => (
              <TableRow key={zone.id}>
                <TableCell className="font-medium">{zone.name}</TableCell>
                <TableCell>₱{zone.base_rate.toFixed(2)}</TableCell>
                <TableCell>₱{zone.per_kg_rate.toFixed(2)}/kg</TableCell>
                <TableCell>
                  {zone.free_shipping_threshold 
                    ? `₱${zone.free_shipping_threshold.toFixed(2)}`
                    : "N/A"}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1 max-w-xs">
                    {zone.regions.slice(0, 3).map((region, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {region}
                      </Badge>
                    ))}
                    {zone.regions.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{zone.regions.length - 3} more
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={zone.is_active ? "default" : "secondary"}>
                    {zone.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEditDialog(zone)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(zone.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingZone ? "Edit" : "Add"} Shipping Zone</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Zone Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Metro Manila"
                required
              />
            </div>

            <div>
              <Label htmlFor="regions">Regions (comma-separated) *</Label>
              <Textarea
                id="regions"
                value={formData.regions}
                onChange={(e) => setFormData({ ...formData, regions: e.target.value })}
                placeholder="Manila, Quezon City, Makati, Taguig"
                rows={4}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter city or province names separated by commas
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="base_rate">Base Rate (₱) *</Label>
                <Input
                  id="base_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.base_rate}
                  onChange={(e) => setFormData({ ...formData, base_rate: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">Fixed shipping fee</p>
              </div>

              <div>
                <Label htmlFor="per_kg_rate">Per KG Rate (₱) *</Label>
                <Input
                  id="per_kg_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.per_kg_rate}
                  onChange={(e) => setFormData({ ...formData, per_kg_rate: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">Cost per kilogram</p>
              </div>
            </div>

            <div>
              <Label htmlFor="threshold">Free Shipping Threshold (₱)</Label>
              <Input
                id="threshold"
                type="number"
                step="0.01"
                min="0"
                value={formData.free_shipping_threshold}
                onChange={(e) => setFormData({ ...formData, free_shipping_threshold: e.target.value })}
                placeholder="Optional"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Orders above this amount get free shipping
              </p>
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <Label htmlFor="is_active">Active</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingZone ? "Update" : "Create"} Zone
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
