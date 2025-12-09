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
import { Plus, Package, AlertTriangle, Search, History, Edit, Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface InventoryItem {
  id: string;
  product_id: string | null;
  food_item_id: string | null;
  sku: string | null;
  barcode: string | null;
  stock_quantity: number;
  min_stock_level: number;
  max_stock_level: number | null;
  reorder_point: number | null;
  location: string | null;
  notes: string | null;
  last_restocked_at: string | null;
  created_at: string;
  product_name?: string;
  food_item_name?: string;
}

interface StockMovement {
  id: string;
  inventory_id: string;
  movement_type: string;
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
  reference_type: string | null;
  notes: string | null;
  created_at: string;
}

export function InventoryManagement() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [foodItems, setFoodItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showMovementDialog, setShowMovementDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [selectedInventory, setSelectedInventory] = useState<InventoryItem | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [formData, setFormData] = useState({
    product_id: "",
    food_item_id: "",
    sku: "",
    barcode: "",
    stock_quantity: 0,
    min_stock_level: 5,
    max_stock_level: 1000,
    reorder_point: 10,
    location: "",
    notes: "",
  });
  const [movementData, setMovementData] = useState({
    movement_type: "in",
    quantity: 0,
    notes: "",
  });

  useEffect(() => {
    fetchInventory();
    fetchProducts();
    fetchFoodItems();
  }, []);

  const fetchInventory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("inventory")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load inventory");
      console.error(error);
    } else {
      // Fetch product/food names for each item
      const enrichedData = await Promise.all(
        (data || []).map(async (item) => {
          let product_name = "";
          let food_item_name = "";
          
          if (item.product_id) {
            const { data: product } = await supabase
              .from("products")
              .select("name")
              .eq("id", item.product_id)
              .single();
            product_name = product?.name || "Unknown Product";
          }
          
          if (item.food_item_id) {
            const { data: foodItem } = await supabase
              .from("food_items")
              .select("name")
              .eq("id", item.food_item_id)
              .single();
            food_item_name = foodItem?.name || "Unknown Food Item";
          }
          
          return { ...item, product_name, food_item_name };
        })
      );
      setInventory(enrichedData);
    }
    setLoading(false);
  };

  const fetchProducts = async () => {
    const { data } = await supabase.from("products").select("id, name").eq("is_active", true);
    setProducts(data || []);
  };

  const fetchFoodItems = async () => {
    const { data } = await supabase.from("food_items").select("id, name").eq("is_available", true);
    setFoodItems(data || []);
  };

  const generateSKU = () => {
    const prefix = "SKU";
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  };

  const generateBarcode = () => {
    return Math.floor(Math.random() * 9000000000000 + 1000000000000).toString();
  };

  const handleAddInventory = async () => {
    if (!formData.product_id && !formData.food_item_id) {
      toast.error("Please select a product or food item");
      return;
    }

    const insertData: any = {
      stock_quantity: formData.stock_quantity,
      min_stock_level: formData.min_stock_level,
      max_stock_level: formData.max_stock_level,
      reorder_point: formData.reorder_point,
      location: formData.location || null,
      notes: formData.notes || null,
      sku: formData.sku || generateSKU(),
      barcode: formData.barcode || generateBarcode(),
    };

    if (formData.product_id) {
      insertData.product_id = formData.product_id;
    } else if (formData.food_item_id) {
      insertData.food_item_id = formData.food_item_id;
    }

    const { error } = await supabase.from("inventory").insert(insertData);

    if (error) {
      toast.error("Failed to add inventory item");
      console.error(error);
    } else {
      toast.success("Inventory item added");
      setShowAddDialog(false);
      resetForm();
      fetchInventory();
    }
  };

  const handleStockMovement = async () => {
    if (!selectedInventory || movementData.quantity <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    const newQuantity =
      movementData.movement_type === "in"
        ? selectedInventory.stock_quantity + movementData.quantity
        : movementData.movement_type === "out"
        ? selectedInventory.stock_quantity - movementData.quantity
        : movementData.quantity;

    if (newQuantity < 0) {
      toast.error("Stock cannot go below 0");
      return;
    }

    // Record movement
    const { error: movementError } = await supabase.from("stock_movements").insert({
      inventory_id: selectedInventory.id,
      movement_type: movementData.movement_type,
      quantity: movementData.quantity,
      previous_quantity: selectedInventory.stock_quantity,
      new_quantity: newQuantity,
      reference_type: "manual",
      notes: movementData.notes || null,
    });

    if (movementError) {
      toast.error("Failed to record stock movement");
      return;
    }

    // Update inventory
    const { error: updateError } = await supabase
      .from("inventory")
      .update({
        stock_quantity: newQuantity,
        last_restocked_at: movementData.movement_type === "in" ? new Date().toISOString() : undefined,
      })
      .eq("id", selectedInventory.id);

    if (updateError) {
      toast.error("Failed to update stock");
    } else {
      toast.success("Stock updated successfully");
      setShowMovementDialog(false);
      setMovementData({ movement_type: "in", quantity: 0, notes: "" });
      fetchInventory();
    }
  };

  const fetchMovementHistory = async (inventoryId: string) => {
    const { data, error } = await supabase
      .from("stock_movements")
      .select("*")
      .eq("inventory_id", inventoryId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      toast.error("Failed to load movement history");
    } else {
      setMovements(data || []);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this inventory item?")) return;

    const { error } = await supabase.from("inventory").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete inventory item");
    } else {
      toast.success("Inventory item deleted");
      fetchInventory();
    }
  };

  const resetForm = () => {
    setFormData({
      product_id: "",
      food_item_id: "",
      sku: "",
      barcode: "",
      stock_quantity: 0,
      min_stock_level: 5,
      max_stock_level: 1000,
      reorder_point: 10,
      location: "",
      notes: "",
    });
  };

  const getStockStatus = (item: InventoryItem) => {
    if (item.stock_quantity <= 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    }
    if (item.stock_quantity <= item.min_stock_level) {
      return <Badge variant="secondary" className="bg-amber-500/20 text-amber-600">Low Stock</Badge>;
    }
    if (item.reorder_point && item.stock_quantity <= item.reorder_point) {
      return <Badge variant="outline" className="border-amber-500 text-amber-600">Reorder</Badge>;
    }
    return <Badge variant="default" className="bg-green-500/20 text-green-600">In Stock</Badge>;
  };

  const filteredInventory = inventory.filter(
    (item) =>
      (item.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.food_item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.barcode?.includes(searchTerm))
  );

  const lowStockItems = inventory.filter(
    (item) => item.stock_quantity <= item.min_stock_level
  );

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">Total Items</span>
            </div>
            <p className="text-2xl font-bold mt-1">{inventory.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <span className="text-sm text-muted-foreground">Low Stock</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-amber-500">{lowStockItems.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-green-500" />
              <span className="text-sm text-muted-foreground">Total Stock</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {inventory.reduce((sum, item) => sum + item.stock_quantity, 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-destructive" />
              <span className="text-sm text-muted-foreground">Out of Stock</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-destructive">
              {inventory.filter((item) => item.stock_quantity <= 0).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Add */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, SKU, or barcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Inventory
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Inventory Item</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Product (or Food Item)</Label>
                <Select
                  value={formData.product_id}
                  onValueChange={(v) => setFormData({ ...formData, product_id: v, food_item_id: "" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Or Food Item</Label>
                <Select
                  value={formData.food_item_id}
                  onValueChange={(v) => setFormData({ ...formData, food_item_id: v, product_id: "" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select food item" />
                  </SelectTrigger>
                  <SelectContent>
                    {foodItems.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>SKU</Label>
                  <div className="flex gap-2">
                    <Input
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      placeholder="Auto-generate"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => setFormData({ ...formData, sku: generateSKU() })}>
                      Gen
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>Barcode</Label>
                  <div className="flex gap-2">
                    <Input
                      value={formData.barcode}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                      placeholder="Auto-generate"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => setFormData({ ...formData, barcode: generateBarcode() })}>
                      Gen
                    </Button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Initial Stock</Label>
                  <Input
                    type="number"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Min Stock Level</Label>
                  <Input
                    type="number"
                    value={formData.min_stock_level}
                    onChange={(e) => setFormData({ ...formData, min_stock_level: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Max Stock Level</Label>
                  <Input
                    type="number"
                    value={formData.max_stock_level}
                    onChange={(e) => setFormData({ ...formData, max_stock_level: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Reorder Point</Label>
                  <Input
                    type="number"
                    value={formData.reorder_point}
                    onChange={(e) => setFormData({ ...formData, reorder_point: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div>
                <Label>Location</Label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Warehouse A, Shelf B2..."
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
              <Button onClick={handleAddInventory} className="w-full">
                Add Inventory Item
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Items</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Loading...</p>
          ) : filteredInventory.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No inventory items found</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product/Item</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Barcode</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInventory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.product_name || item.food_item_name}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                      <TableCell className="font-mono text-sm">{item.barcode}</TableCell>
                      <TableCell className="text-right">{item.stock_quantity}</TableCell>
                      <TableCell>{getStockStatus(item)}</TableCell>
                      <TableCell>{item.location || "-"}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedInventory(item);
                              setShowMovementDialog(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedInventory(item);
                              fetchMovementHistory(item.id);
                              setShowHistoryDialog(true);
                            }}
                          >
                            <History className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
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

      {/* Stock Movement Dialog */}
      <Dialog open={showMovementDialog} onOpenChange={setShowMovementDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stock Movement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Current Stock: <strong>{selectedInventory?.stock_quantity}</strong>
            </p>
            <div>
              <Label>Movement Type</Label>
              <Select
                value={movementData.movement_type}
                onValueChange={(v) => setMovementData({ ...movementData, movement_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">Stock In (Add)</SelectItem>
                  <SelectItem value="out">Stock Out (Remove)</SelectItem>
                  <SelectItem value="adjustment">Adjustment (Set To)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantity</Label>
              <Input
                type="number"
                value={movementData.quantity}
                onChange={(e) => setMovementData({ ...movementData, quantity: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={movementData.notes}
                onChange={(e) => setMovementData({ ...movementData, notes: e.target.value })}
                placeholder="Reason for movement..."
              />
            </div>
            <Button onClick={handleStockMovement} className="w-full">
              Apply Movement
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Movement History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Stock Movement History</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {movements.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No movement history</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Before</TableHead>
                    <TableHead className="text-right">After</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>{new Date(m.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant={m.movement_type === "in" ? "default" : m.movement_type === "out" ? "destructive" : "secondary"}>
                          {m.movement_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{m.quantity}</TableCell>
                      <TableCell className="text-right">{m.previous_quantity}</TableCell>
                      <TableCell className="text-right">{m.new_quantity}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{m.notes || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
