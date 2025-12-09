import { useState, useEffect, useRef } from "react";
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
import { Printer, Search, Package, Barcode, QrCode, Check } from "lucide-react";

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  shipping_address: string;
  status: string;
  total_amount: number;
  created_at: string;
}

interface PackingLabel {
  id: string;
  order_id: string;
  label_type: string;
  barcode: string;
  qr_code_data: string | null;
  printed_at: string | null;
  status: string;
  created_at: string;
  order?: Order;
}

export function ProductLabels() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [labels, setLabels] = useState<PackingLabel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [labelType, setLabelType] = useState("shipping");
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchOrders();
    fetchLabels();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .in("status", ["pending", "processing", "ready_to_ship"])
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load orders");
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  };

  const fetchLabels = async () => {
    const { data, error } = await supabase
      .from("packing_labels")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Failed to load labels:", error);
    } else {
      setLabels(data || []);
    }
  };

  const generateBarcode = () => {
    const prefix = "PKG";
    const timestamp = Date.now().toString().slice(-10);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
    return `${prefix}${timestamp}${random}`;
  };

  const generateQRData = (order: Order) => {
    return JSON.stringify({
      orderId: order.id,
      orderNumber: order.order_number,
      customer: order.customer_name,
      address: order.shipping_address,
      timestamp: new Date().toISOString(),
    });
  };

  const createLabel = async (order: Order) => {
    const barcode = generateBarcode();
    const qrData = generateQRData(order);

    const { error } = await supabase.from("packing_labels").insert({
      order_id: order.id,
      label_type: labelType,
      barcode,
      qr_code_data: qrData,
      status: "pending",
    });

    if (error) {
      toast.error("Failed to create label");
      console.error(error);
    } else {
      toast.success("Label created successfully");
      fetchLabels();
    }
  };

  const markAsPrinted = async (labelId: string) => {
    const { error } = await supabase
      .from("packing_labels")
      .update({
        status: "printed",
        printed_at: new Date().toISOString(),
      })
      .eq("id", labelId);

    if (error) {
      toast.error("Failed to update label status");
    } else {
      toast.success("Label marked as printed");
      fetchLabels();
    }
  };

  const handlePrint = (order: Order) => {
    setSelectedOrder(order);
    setShowPrintPreview(true);
  };

  const printLabel = () => {
    if (printRef.current) {
      const printContents = printRef.current.innerHTML;
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Print Label - ${selectedOrder?.order_number}</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .label { border: 2px solid #000; padding: 20px; max-width: 400px; margin: 0 auto; }
                .header { text-align: center; border-bottom: 1px solid #000; padding-bottom: 10px; margin-bottom: 10px; }
                .barcode { text-align: center; font-family: 'Libre Barcode 39', monospace; font-size: 48px; letter-spacing: 2px; margin: 20px 0; }
                .barcode-text { text-align: center; font-family: monospace; font-size: 14px; margin-bottom: 20px; }
                .info { margin: 10px 0; }
                .info-label { font-weight: bold; font-size: 12px; color: #666; }
                .info-value { font-size: 14px; margin-bottom: 8px; }
                .address { background: #f5f5f5; padding: 10px; margin-top: 10px; }
                @media print { body { -webkit-print-color-adjust: exact; } }
              </style>
            </head>
            <body onload="window.print();window.close()">
              ${printContents}
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    }
  };

  const filteredOrders = orders.filter(
    (order) =>
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getOrderLabel = (orderId: string) => {
    return labels.find((l) => l.order_id === orderId);
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">Pending Orders</span>
            </div>
            <p className="text-2xl font-bold mt-1">{orders.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Barcode className="w-5 h-5 text-amber-500" />
              <span className="text-sm text-muted-foreground">Labels Created</span>
            </div>
            <p className="text-2xl font-bold mt-1">{labels.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Printer className="w-5 h-5 text-green-500" />
              <span className="text-sm text-muted-foreground">Printed</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {labels.filter((l) => l.status === "printed").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">Pending Print</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {labels.filter((l) => l.status === "pending").length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by order number or customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={labelType} onValueChange={setLabelType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Label type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="shipping">Shipping Label</SelectItem>
            <SelectItem value="product">Product Label</SelectItem>
            <SelectItem value="package">Package Label</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Orders Ready for Packing</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Loading...</p>
          ) : filteredOrders.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No orders found</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Label Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => {
                    const label = getOrderLabel(order.id);
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono font-medium">
                          {order.order_number}
                        </TableCell>
                        <TableCell>{order.customer_name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{order.status}</Badge>
                        </TableCell>
                        <TableCell>₱{order.total_amount.toFixed(2)}</TableCell>
                        <TableCell>
                          {label ? (
                            <Badge variant={label.status === "printed" ? "default" : "outline"}>
                              {label.status === "printed" ? (
                                <><Check className="w-3 h-3 mr-1" /> Printed</>
                              ) : (
                                "Created"
                              )}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">No Label</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            {!label && (
                              <Button size="sm" variant="outline" onClick={() => createLabel(order)}>
                                <Barcode className="w-4 h-4 mr-1" />
                                Create
                              </Button>
                            )}
                            <Button size="sm" onClick={() => handlePrint(order)}>
                              <Printer className="w-4 h-4 mr-1" />
                              Print
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Labels */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Labels</CardTitle>
        </CardHeader>
        <CardContent>
          {labels.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No labels created yet</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Barcode</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Printed</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {labels.slice(0, 10).map((label) => (
                    <TableRow key={label.id}>
                      <TableCell className="font-mono text-sm">{label.barcode}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{label.label_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={label.status === "printed" ? "default" : "secondary"}>
                          {label.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(label.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {label.printed_at
                          ? new Date(label.printed_at).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          {label.status !== "printed" && (
                            <Button size="sm" variant="ghost" onClick={() => markAsPrinted(label.id)}>
                              <Check className="w-4 h-4 mr-1" />
                              Mark Printed
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

      {/* Print Preview Dialog */}
      <Dialog open={showPrintPreview} onOpenChange={setShowPrintPreview}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Print Label Preview</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {selectedOrder && (
              <>
                <div ref={printRef}>
                  <div className="label border-2 border-foreground p-4 rounded-lg">
                    <div className="header text-center border-b pb-3 mb-3">
                      <h2 className="text-lg font-bold">SHIPPING LABEL</h2>
                      <p className="text-sm text-muted-foreground">Order #{selectedOrder.order_number}</p>
                    </div>
                    
                    <div className="barcode text-center my-4">
                      <div className="font-mono text-4xl tracking-widest">
                        ||| {selectedOrder.order_number} |||
                      </div>
                      <p className="font-mono text-sm mt-2">{selectedOrder.order_number}</p>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground font-semibold">SHIP TO:</p>
                        <p className="font-medium">{selectedOrder.customer_name}</p>
                      </div>
                      <div className="bg-muted p-3 rounded">
                        <p className="text-sm">{selectedOrder.shipping_address}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">EMAIL</p>
                          <p>{selectedOrder.customer_email}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">DATE</p>
                          <p>{new Date(selectedOrder.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-4">
                  <Button onClick={printLabel} className="flex-1">
                    <Printer className="w-4 h-4 mr-2" />
                    Print Label
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      createLabel(selectedOrder);
                      setShowPrintPreview(false);
                    }}
                  >
                    Save Label
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
