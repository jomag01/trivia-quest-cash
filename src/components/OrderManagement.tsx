import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Package, Eye, Edit, Truck, Trash2, CheckSquare, Settings2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const OrderManagement = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [viewDialog, setViewDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [bulkActionDialog, setBulkActionDialog] = useState(false);
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);
  const [bulkStatus, setBulkStatus] = useState("processing");
  const [editForm, setEditForm] = useState({
    status: "",
    tracking_number: "",
    notes: "",
    shipping_address: "",
    shipping_fee: 0,
  });

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderItems = async (orderId: string) => {
    try {
      const { data, error } = await supabase
        .from("order_items")
        .select("*, products(name), variant_id, variant_name")
        .eq("order_id", orderId);

      if (error) throw error;
      setOrderItems(data || []);
    } catch (error: any) {
      console.error("Error fetching order items:", error);
    }
  };

  const handleViewOrder = async (order: any) => {
    setSelectedOrder(order);
    await fetchOrderItems(order.id);
    setViewDialog(true);
  };

  const handleEditOrder = async (order: any) => {
    setSelectedOrder(order);
    setEditForm({
      status: order.status,
      tracking_number: order.tracking_number || "",
      notes: order.notes || "",
      shipping_address: order.shipping_address || "",
      shipping_fee: order.shipping_fee || 0,
    });
    await fetchOrderItems(order.id);
    setEditDialog(true);
  };

  const handleUpdateOrder = async () => {
    if (!selectedOrder) return;

    try {
      const { error } = await supabase
        .from("orders")
        .update({
          status: editForm.status,
          tracking_number: editForm.tracking_number,
          notes: editForm.notes,
          shipping_address: editForm.shipping_address,
          shipping_fee: editForm.shipping_fee,
        })
        .eq("id", selectedOrder.id);

      if (error) throw error;

      toast.success("Order updated successfully");
      setEditDialog(false);
      fetchOrders();
    } catch (error: any) {
      console.error("Error updating order:", error);
      toast.error("Failed to update order");
    }
  };

  // Bulk selection handlers
  const toggleSelectOrder = (orderId: string) => {
    setSelectedOrderIds(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedOrderIds.length === orders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(orders.map(o => o.id));
    }
  };

  const handleBulkStatusUpdate = async () => {
    if (selectedOrderIds.length === 0) return;

    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: bulkStatus })
        .in("id", selectedOrderIds);

      if (error) throw error;

      toast.success(`${selectedOrderIds.length} orders updated to ${bulkStatus}`);
      setBulkActionDialog(false);
      setSelectedOrderIds([]);
      fetchOrders();
    } catch (error: any) {
      console.error("Error bulk updating orders:", error);
      toast.error("Failed to update orders");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedOrderIds.length === 0) return;

    try {
      // First delete order items
      const { error: itemsError } = await supabase
        .from("order_items")
        .delete()
        .in("order_id", selectedOrderIds);

      if (itemsError) throw itemsError;

      // Then delete orders
      const { error } = await supabase
        .from("orders")
        .delete()
        .in("id", selectedOrderIds);

      if (error) throw error;

      toast.success(`${selectedOrderIds.length} orders deleted`);
      setBulkDeleteDialog(false);
      setSelectedOrderIds([]);
      fetchOrders();
    } catch (error: any) {
      console.error("Error bulk deleting orders:", error);
      toast.error("Failed to delete orders");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500";
      case "processing":
        return "bg-blue-500";
      case "shipped":
        return "bg-purple-500";
      case "delivered":
        return "bg-green-500";
      case "cancelled":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Package className="w-16 h-16 text-primary animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-card border-border">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-primary" />
            <div>
              <h2 className="text-2xl font-bold">Order Management</h2>
              <p className="text-sm text-muted-foreground">
                Manage customer orders and fulfillment
              </p>
            </div>
          </div>
          
          {/* Bulk Actions */}
          {selectedOrderIds.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="px-3 py-1">
                {selectedOrderIds.length} selected
              </Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setBulkActionDialog(true)}
              >
                <Settings2 className="w-4 h-4 mr-1" />
                Bulk Update Status
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setBulkDeleteDialog(true)}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete Selected
              </Button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={selectedOrderIds.length === orders.length && orders.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Referrer Code</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tracking</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id} className={selectedOrderIds.includes(order.id) ? "bg-muted/50" : ""}>
                  <TableCell>
                    <Checkbox
                      checked={selectedOrderIds.includes(order.id)}
                      onCheckedChange={() => toggleSelectOrder(order.id)}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {order.order_number}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-semibold">{order.customer_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {order.customer_email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(order.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="font-semibold">
                    ₱{order.total_amount.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {order.referrer_code ? (
                      <Badge variant="outline" className="font-mono text-xs bg-blue-50 text-blue-700 border-blue-200">
                        {order.referrer_code}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(order.status)}>
                      {order.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {order.tracking_number ? (
                      <span className="font-mono text-xs">
                        {order.tracking_number}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewOrder(order)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditOrder(order)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {orders.length === 0 && (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No orders yet</p>
            </div>
          )}
        </div>
      </Card>

      {/* View Order Dialog */}
      <Dialog open={viewDialog} onOpenChange={setViewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Order Number</Label>
                  <p className="font-mono font-semibold">
                    {selectedOrder.order_number}
                  </p>
                </div>
                <div>
                  <Label>Status</Label>
                  <Badge className={getStatusColor(selectedOrder.status)}>
                    {selectedOrder.status.toUpperCase()}
                  </Badge>
                </div>
              </div>

              <div>
                <Label>Customer Information</Label>
                <div className="text-sm space-y-1 mt-1">
                  <p>
                    <strong>Name:</strong> {selectedOrder.customer_name}
                  </p>
                  <p>
                    <strong>Email:</strong> {selectedOrder.customer_email}
                  </p>
                  {selectedOrder.customer_phone && (
                    <p>
                      <strong>Phone:</strong> {selectedOrder.customer_phone}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label>Shipping Address</Label>
                <p className="text-sm mt-1">{selectedOrder.shipping_address}</p>
              </div>

              {selectedOrder.tracking_number && (
                <div>
                  <Label>Tracking Number</Label>
                  <p className="font-mono text-sm mt-1">
                    {selectedOrder.tracking_number}
                  </p>
                </div>
              )}

              {selectedOrder.notes && (
                <div>
                  <Label>Notes</Label>
                  <p className="text-sm mt-1">{selectedOrder.notes}</p>
                </div>
              )}

              {selectedOrder.customer_notes && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <Label className="text-yellow-800">Customer Notes to Seller</Label>
                  <p className="text-sm mt-1 text-yellow-700">{selectedOrder.customer_notes}</p>
                </div>
              )}

              {selectedOrder.referrer_code && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <Label className="text-blue-800">Referrer Code (Commission Tracking)</Label>
                  <p className="font-mono text-sm mt-1 text-blue-700 font-semibold">{selectedOrder.referrer_code}</p>
                </div>
              )}

              <div>
                <Label>Order Items</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Variant</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.products?.name}</TableCell>
                        <TableCell>
                          {item.variant_name ? (
                            <Badge variant="outline" className="text-xs">{item.variant_name}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>₱{item.unit_price.toFixed(2)}</TableCell>
                        <TableCell>₱{item.subtotal.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>₱{(selectedOrder.total_amount - (selectedOrder.shipping_fee || 0)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Shipping Fee:</span>
                  <span>₱{(selectedOrder.shipping_fee || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-amber-600">
                  <span>Diamond Credits:</span>
                  <span className="font-semibold">💎 {selectedOrder.total_diamond_credits || 0} diamonds</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span className="text-primary">
                    ₱{selectedOrder.total_amount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Order Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Order</DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              <div>
                <Label>Order Number</Label>
                <p className="font-mono font-semibold">
                  {selectedOrder.order_number}
                </p>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(value) =>
                    setEditForm({ ...editForm, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="tracking">Tracking Number</Label>
                <div className="flex gap-2">
                  <Truck className="w-4 h-4 mt-3 text-muted-foreground" />
                  <Input
                    id="tracking"
                    value={editForm.tracking_number}
                    onChange={(e) =>
                      setEditForm({ ...editForm, tracking_number: e.target.value })
                    }
                    placeholder="Enter tracking number"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="shipping">Shipping Address</Label>
                <Textarea
                  id="shipping"
                  value={editForm.shipping_address}
                  onChange={(e) =>
                    setEditForm({ ...editForm, shipping_address: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="shippingFee">Shipping Fee (₱)</Label>
                <Input
                  id="shippingFee"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.shipping_fee}
                  onChange={(e) =>
                    setEditForm({ ...editForm, shipping_fee: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>

              <div>
                <Label htmlFor="notes">Admin Notes</Label>
                <Textarea
                  id="notes"
                  value={editForm.notes}
                  onChange={(e) =>
                    setEditForm({ ...editForm, notes: e.target.value })
                  }
                  rows={3}
                  placeholder="Internal notes about this order"
                />
              </div>

              <div>
                <Label>Order Items</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.products?.name}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>₱{item.unit_price.toFixed(2)}</TableCell>
                        <TableCell>₱{item.subtotal.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateOrder}>Update Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Status Update Dialog */}
      <Dialog open={bulkActionDialog} onOpenChange={setBulkActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Update Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Update status for {selectedOrderIds.length} selected orders
            </p>
            <div>
              <Label>New Status</Label>
              <Select value={bulkStatus} onValueChange={setBulkStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkActionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkStatusUpdate}>
              <CheckSquare className="w-4 h-4 mr-2" />
              Update {selectedOrderIds.length} Orders
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteDialog} onOpenChange={setBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedOrderIds.length} Orders?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected orders and their items. 
              This action cannot be undone. Use this for test orders only.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Orders
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
