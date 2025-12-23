import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { 
  Percent, 
  Users, 
  Edit, 
  Save, 
  Package,
  TrendingUp,
  Award,
  Share2,
  RefreshCw
} from "lucide-react";

interface StockLimit {
  id: string;
  step_number: number;
  step_name: string;
  max_products: number;
  max_stock_per_product: number;
  commission_percentage: number;
  can_promote_socials: boolean;
  created_at: string;
  updated_at: string;
}

export default function RetailerCommissionSettings() {
  const queryClient = useQueryClient();
  const [editDialog, setEditDialog] = useState(false);
  const [selectedLimit, setSelectedLimit] = useState<StockLimit | null>(null);
  const [formData, setFormData] = useState({
    step_name: "",
    max_products: "",
    max_stock_per_product: "",
    commission_percentage: "",
    can_promote_socials: true
  });

  // Fetch stock limits
  const { data: stockLimits = [], isLoading } = useQuery({
    queryKey: ["retailer-stock-limits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("retailer_stock_limits")
        .select("*")
        .order("step_number", { ascending: true });
      if (error) throw error;
      return data as StockLimit[];
    }
  });

  // Update stock limit
  const updateLimit = useMutation({
    mutationFn: async (limit: Partial<StockLimit> & { id: string }) => {
      const { error } = await supabase
        .from("retailer_stock_limits")
        .update({
          step_name: limit.step_name,
          max_products: limit.max_products,
          max_stock_per_product: limit.max_stock_per_product,
          commission_percentage: limit.commission_percentage,
          can_promote_socials: limit.can_promote_socials,
          updated_at: new Date().toISOString()
        })
        .eq("id", limit.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["retailer-stock-limits"] });
      toast.success("Settings updated!");
      setEditDialog(false);
    },
    onError: (error) => {
      toast.error("Failed to update: " + error.message);
    }
  });

  const openEditDialog = (limit: StockLimit) => {
    setSelectedLimit(limit);
    setFormData({
      step_name: limit.step_name,
      max_products: limit.max_products.toString(),
      max_stock_per_product: limit.max_stock_per_product.toString(),
      commission_percentage: limit.commission_percentage.toString(),
      can_promote_socials: limit.can_promote_socials
    });
    setEditDialog(true);
  };

  const handleSave = () => {
    if (!selectedLimit) return;
    updateLimit.mutate({
      id: selectedLimit.id,
      step_name: formData.step_name,
      max_products: parseInt(formData.max_products) || 5,
      max_stock_per_product: parseInt(formData.max_stock_per_product) || 10,
      commission_percentage: parseFloat(formData.commission_percentage) || 5,
      can_promote_socials: formData.can_promote_socials
    });
  };

  const getRankColor = (step: number) => {
    const colors: Record<number, string> = {
      1: "bg-amber-700",
      2: "bg-gray-400",
      3: "bg-yellow-500",
      4: "bg-cyan-400",
      5: "bg-purple-500",
      6: "bg-pink-500",
      7: "bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500"
    };
    return colors[step] || "bg-gray-500";
  };

  const getRankIcon = (step: number) => {
    if (step >= 6) return "👑";
    if (step >= 4) return "💎";
    if (step >= 2) return "⭐";
    return "🏅";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary" />
            Retailer Commission Settings
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Configure commission rates and stock limits for each stairstep rank
          </p>
        </div>
        <Button 
          variant="outline" 
          size="icon"
          onClick={() => queryClient.invalidateQueries({ queryKey: ["retailer-stock-limits"] })}
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Award className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stockLimits.length}</p>
                <p className="text-xs text-muted-foreground">Rank Levels</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Percent className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">
                  {stockLimits.length > 0 ? `${stockLimits[stockLimits.length - 1]?.commission_percentage}%` : "0%"}
                </p>
                <p className="text-xs text-muted-foreground">Max Commission</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">
                  {stockLimits.length > 0 ? stockLimits[stockLimits.length - 1]?.max_products : 0}
                </p>
                <p className="text-xs text-muted-foreground">Max Products (Top)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Share2 className="w-8 h-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">
                  {stockLimits.filter(l => l.can_promote_socials).length}
                </p>
                <p className="text-xs text-muted-foreground">Social Enabled</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Commission Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Commission by Rank</CardTitle>
          <CardDescription>Configure stock access and commission rates for each stairstep level</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : stockLimits.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No rank levels configured</p>
            </div>
          ) : (
            <>
              {/* Mobile View */}
              <div className="md:hidden space-y-3">
                {stockLimits.map((limit) => (
                  <Card key={limit.id} className="overflow-hidden">
                    <div className={`h-2 ${getRankColor(limit.step_number)}`} />
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{getRankIcon(limit.step_number)}</span>
                          <div>
                            <p className="font-semibold">{limit.step_name}</p>
                            <p className="text-xs text-muted-foreground">Level {limit.step_number}</p>
                          </div>
                        </div>
                        <Badge className="text-lg font-bold bg-green-500/20 text-green-600">
                          {limit.commission_percentage}%
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                        <div className="p-2 bg-muted/50 rounded">
                          <p className="text-muted-foreground text-xs">Max Products</p>
                          <p className="font-semibold">{limit.max_products}</p>
                        </div>
                        <div className="p-2 bg-muted/50 rounded">
                          <p className="text-muted-foreground text-xs">Stock/Product</p>
                          <p className="font-semibold">{limit.max_stock_per_product}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Share2 className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">Social Promo</span>
                          <Badge variant={limit.can_promote_socials ? "default" : "secondary"}>
                            {limit.can_promote_socials ? "Yes" : "No"}
                          </Badge>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => openEditDialog(limit)}>
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Desktop View */}
              <div className="hidden md:block rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-center">Commission %</TableHead>
                      <TableHead className="text-center">Max Products</TableHead>
                      <TableHead className="text-center">Stock/Product</TableHead>
                      <TableHead className="text-center">Social Promo</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockLimits.map((limit) => (
                      <TableRow key={limit.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${getRankColor(limit.step_number)}`} />
                            <span className="text-lg">{getRankIcon(limit.step_number)}</span>
                            <span className="font-medium">Level {limit.step_number}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">{limit.step_name}</TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-green-500/20 text-green-600 text-lg font-bold px-3">
                            {limit.commission_percentage}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-medium">{limit.max_products}</TableCell>
                        <TableCell className="text-center font-medium">{limit.max_stock_per_product}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={limit.can_promote_socials ? "default" : "secondary"}>
                            {limit.can_promote_socials ? "Enabled" : "Disabled"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => openEditDialog(limit)}>
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-gradient-to-br from-amber-500/5 to-amber-600/5 border-amber-500/20">
        <CardContent className="p-4">
          <h3 className="font-semibold flex items-center gap-2 mb-2">
            <Award className="w-5 h-5 text-amber-500" />
            How Retailer Commissions Work
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-amber-500 font-bold">1.</span>
              <span>Retailers earn commissions based on their stairstep rank when promoting supplier products</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 font-bold">2.</span>
              <span>Higher ranks get access to more products and higher stock limits</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 font-bold">3.</span>
              <span>Social media promotion can be enabled/disabled per rank level</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 font-bold">4.</span>
              <span>Commissions are calculated from the final product price set by admin</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-xl">{selectedLimit ? getRankIcon(selectedLimit.step_number) : ""}</span>
              Edit {selectedLimit?.step_name || "Rank"} Settings
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Rank Name</Label>
              <Input 
                value={formData.step_name}
                onChange={e => setFormData(prev => ({ ...prev, step_name: e.target.value }))}
                placeholder="e.g. Bronze, Silver, Gold..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Commission %</Label>
                <Input 
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={formData.commission_percentage}
                  onChange={e => setFormData(prev => ({ ...prev, commission_percentage: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Products</Label>
                <Input 
                  type="number"
                  min="1"
                  value={formData.max_products}
                  onChange={e => setFormData(prev => ({ ...prev, max_products: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Max Stock Per Product</Label>
              <Input 
                type="number"
                min="1"
                value={formData.max_stock_per_product}
                onChange={e => setFormData(prev => ({ ...prev, max_stock_per_product: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <Label className="font-medium">Social Media Promotion</Label>
                <p className="text-xs text-muted-foreground">Allow retailers to generate promo links</p>
              </div>
              <Switch 
                checked={formData.can_promote_socials}
                onCheckedChange={checked => setFormData(prev => ({ ...prev, can_promote_socials: checked }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={updateLimit.isPending}>
              <Save className="w-4 h-4 mr-2" />
              {updateLimit.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
