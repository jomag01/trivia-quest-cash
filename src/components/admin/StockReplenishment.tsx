import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, AlertTriangle, RefreshCw, Check, X, Package, Clock } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface InventoryItem {
  id: string;
  product_id: string | null;
  food_item_id: string | null;
  sku: string | null;
  stock_quantity: number;
  min_stock_level: number;
  reorder_point: number | null;
  product_name?: string;
  food_item_name?: string;
}

interface ReplenishmentRequest {
  id: string;
  inventory_id: string;
  requested_quantity: number;
  approved_quantity: number | null;
  status: string;
  supplier_name: string | null;
  expected_date: string | null;
  received_date: string | null;
  notes: string | null;
  created_at: string;
  inventory?: InventoryItem;
}

export function StockReplenishment() {
  const [requests, setRequests] = useState<ReplenishmentRequest[]>([]);
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ReplenishmentRequest | null>(null);
  const [formData, setFormData] = useState({
    inventory_id: "",
    requested_quantity: 0,
    supplier_name: "",
    expected_date: "",
    notes: "",
  });
  const [approvalData, setApprovalData] = useState({
    approved_quantity: 0,
    notes: "",
  });

  useEffect(() => {
    fetchRequests();
    fetchLowStockItems();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("stock_replenishment")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load replenishment requests");
    } else {
      // Enrich with inventory data
      const enrichedData = await Promise.all(
        (data || []).map(async (req) => {
          const { data: inv } = await supabase
            .from("inventory")
            .select("*")
            .eq("id", req.inventory_id)
            .single();

          let product_name = "";
          let food_item_name = "";

          if (inv?.product_id) {
            const { data: product } = await supabase
              .from("products")
              .select("name")
              .eq("id", inv.product_id)
              .single();
            product_name = product?.name || "";
          }

          if (inv?.food_item_id) {
            const { data: foodItem } = await supabase
              .from("food_items")
              .select("name")
              .eq("id", inv.food_item_id)
              .single();
            food_item_name = foodItem?.name || "";
          }

          return {
            ...req,
            inventory: inv ? { ...inv, product_name, food_item_name } : undefined,
          };
        })
      );
      setRequests(enrichedData);
    }
    setLoading(false);
  };

  const fetchLowStockItems = async () => {
    const { data, error } = await supabase.from("inventory").select("*");

    if (error) {
      console.error("Failed to load inventory:", error);
      return;
    }

    const lowStock = (data || []).filter(
      (item) => item.stock_quantity <= (item.reorder_point || item.min_stock_level)
    );

    // Enrich with names
    const enrichedData = await Promise.all(
      lowStock.map(async (item) => {
        let product_name = "";
        let food_item_name = "";

        if (item.product_id) {
          const { data: product } = await supabase
            .from("products")
            .select("name")
            .eq("id", item.product_id)
            .single();
          product_name = product?.name || "";
        }

        if (item.food_item_id) {
          const { data: foodItem } = await supabase
            .from("food_items")
            .select("name")
            .eq("id", item.food_item_id)
            .single();
          food_item_name = foodItem?.name || "";
        }

        return { ...item, product_name, food_item_name };
      })
    );

    setLowStockItems(enrichedData);
  };

  const handleCreateRequest = async () => {
    if (!formData.inventory_id || formData.requested_quantity <= 0) {
      toast.error("Please select item and enter quantity");
      return;
    }

    const { error } = await supabase.from("stock_replenishment").insert({
      inventory_id: formData.inventory_id,
      requested_quantity: formData.requested_quantity,
      supplier_name: formData.supplier_name || null,
      expected_date: formData.expected_date || null,
      notes: formData.notes || null,
      status: "pending",
    });

    if (error) {
      toast.error("Failed to create request");
      console.error(error);
    } else {
      toast.success("Replenishment request created");
      setShowAddDialog(false);
      resetForm();
      fetchRequests();
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    const { error } = await supabase
      .from("stock_replenishment")
      .update({
        status: "approved",
        approved_quantity: approvalData.approved_quantity || selectedRequest.requested_quantity,
        notes: approvalData.notes || selectedRequest.notes,
      })
      .eq("id", selectedRequest.id);

    if (error) {
      toast.error("Failed to approve request");
    } else {
      toast.success("Request approved");
      setShowApproveDialog(false);
      fetchRequests();
    }
  };

  const handleMarkReceived = async (request: ReplenishmentRequest) => {
    // Update replenishment status
    const { error: repError } = await supabase
      .from("stock_replenishment")
      .update({
        status: "received",
        received_date: new Date().toISOString().split("T")[0],
      })
      .eq("id", request.id);

    if (repError) {
      toast.error("Failed to update request");
      return;
    }

    // Update inventory stock
    const quantity = request.approved_quantity || request.requested_quantity;
    const currentStock = request.inventory?.stock_quantity || 0;
    const newStock = currentStock + quantity;

    const { error: invError } = await supabase
      .from("inventory")
      .update({
        stock_quantity: newStock,
        last_restocked_at: new Date().toISOString(),
      })
      .eq("id", request.inventory_id);

    if (invError) {
      toast.error("Failed to update inventory");
      return;
    }

    // Record stock movement
    await supabase.from("stock_movements").insert({
      inventory_id: request.inventory_id,
      movement_type: "in",
      quantity,
      previous_quantity: currentStock,
      new_quantity: newStock,
      reference_type: "replenishment",
      reference_id: request.id,
      notes: `Replenishment received from ${request.supplier_name || "supplier"}`,
    });

    toast.success("Stock received and inventory updated");
    fetchRequests();
    fetchLowStockItems();
  };

  const handleCancel = async (id: string) => {
    const { error } = await supabase
      .from("stock_replenishment")
      .update({ status: "cancelled" })
      .eq("id", id);

    if (error) {
      toast.error("Failed to cancel request");
    } else {
      toast.success("Request cancelled");
      fetchRequests();
    }
  };

  const resetForm = () => {
    setFormData({
      inventory_id: "",
      requested_quantity: 0,
      supplier_name: "",
      expected_date: "",
      notes: "",
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; color: string }> = {
      pending: { variant: "secondary", color: "text-amber-600" },
      approved: { variant: "outline", color: "text-blue-600" },
      ordered: { variant: "outline", color: "text-purple-600" },
      received: { variant: "default", color: "text-green-600" },
      cancelled: { variant: "destructive", color: "" },
    };

    const config = variants[status] || variants.pending;
    return (
      <Badge variant={config.variant} className={config.color}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const approvedRequests = requests.filter((r) => r.status === "approved" || r.status === "ordered");

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <span className="text-sm text-muted-foreground">Low Stock Items</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-amber-500">{lowStockItems.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">Pending Requests</span>
            </div>
            <p className="text-2xl font-bold mt-1">{pendingRequests.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-purple-500" />
              <span className="text-sm text-muted-foreground">In Progress</span>
            </div>
            <p className="text-2xl font-bold mt-1">{approvedRequests.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-500" />
              <span className="text-sm text-muted-foreground">Received (Month)</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {requests.filter((r) => r.status === "received").length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <Card className="border-amber-500/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {lowStockItems.slice(0, 6).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div>
                    <p className="font-medium text-sm">
                      {item.product_name || item.food_item_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Stock: {item.stock_quantity} / Min: {item.min_stock_level}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        inventory_id: item.id,
                        requested_quantity: (item.reorder_point || item.min_stock_level) * 2 - item.stock_quantity,
                      });
                      setShowAddDialog(true);
                    }}
                  >
                    Reorder
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end">
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              New Request
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Replenishment Request</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Inventory Item</Label>
                <Select
                  value={formData.inventory_id}
                  onValueChange={(v) => setFormData({ ...formData, inventory_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select item" />
                  </SelectTrigger>
                  <SelectContent>
                    {lowStockItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.product_name || item.food_item_name} (Stock: {item.stock_quantity})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quantity to Order</Label>
                <Input
                  type="number"
                  value={formData.requested_quantity}
                  onChange={(e) =>
                    setFormData({ ...formData, requested_quantity: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div>
                <Label>Supplier Name</Label>
                <Input
                  value={formData.supplier_name}
                  onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                  placeholder="Optional"
                />
              </div>
              <div>
                <Label>Expected Date</Label>
                <Input
                  type="date"
                  value={formData.expected_date}
                  onChange={(e) => setFormData({ ...formData, expected_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes..."
                />
              </div>
              <Button onClick={handleCreateRequest} className="w-full">
                Create Request
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Replenishment Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Loading...</p>
          ) : requests.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No requests found</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Requested</TableHead>
                    <TableHead className="text-right">Approved</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expected</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-medium">
                        {req.inventory?.product_name || req.inventory?.food_item_name || "Unknown"}
                      </TableCell>
                      <TableCell className="text-right">{req.requested_quantity}</TableCell>
                      <TableCell className="text-right">{req.approved_quantity || "-"}</TableCell>
                      <TableCell>{req.supplier_name || "-"}</TableCell>
                      <TableCell>{getStatusBadge(req.status)}</TableCell>
                      <TableCell>
                        {req.expected_date
                          ? new Date(req.expected_date).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          {req.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedRequest(req);
                                  setApprovalData({
                                    approved_quantity: req.requested_quantity,
                                    notes: req.notes || "",
                                  });
                                  setShowApproveDialog(true);
                                }}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive"
                                onClick={() => handleCancel(req.id)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          {(req.status === "approved" || req.status === "ordered") && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkReceived(req)}
                            >
                              <Package className="w-4 h-4 mr-1" />
                              Received
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Requested: <strong>{selectedRequest?.requested_quantity}</strong> units
            </p>
            <div>
              <Label>Approved Quantity</Label>
              <Input
                type="number"
                value={approvalData.approved_quantity}
                onChange={(e) =>
                  setApprovalData({
                    ...approvalData,
                    approved_quantity: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={approvalData.notes}
                onChange={(e) => setApprovalData({ ...approvalData, notes: e.target.value })}
              />
            </div>
            <Button onClick={handleApprove} className="w-full">
              Approve Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
