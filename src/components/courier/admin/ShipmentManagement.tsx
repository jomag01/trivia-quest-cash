import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Search, Filter, Package, MapPin, User, Calendar, Eye } from "lucide-react";

const ShipmentManagement = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedShipment, setSelectedShipment] = useState<any>(null);

  const { data: shipments, isLoading } = useQuery({
    queryKey: ["admin-shipments", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("courier_shipments")
        .select(`
          *,
          origin_hub:courier_hubs!courier_shipments_origin_hub_id_fkey(hub_name, hub_code),
          destination_hub:courier_hubs!courier_shipments_destination_hub_id_fkey(hub_name, hub_code)
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as any);
      }

      const { data } = await query;
      return data || [];
    },
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      created: "bg-gray-100 text-gray-800",
      pickup_scheduled: "bg-blue-100 text-blue-800",
      picked_up: "bg-indigo-100 text-indigo-800",
      at_origin_hub: "bg-purple-100 text-purple-800",
      in_transit: "bg-cyan-100 text-cyan-800",
      at_destination_hub: "bg-teal-100 text-teal-800",
      out_for_delivery: "bg-orange-100 text-orange-800",
      delivered: "bg-green-100 text-green-800",
      failed_delivery: "bg-red-100 text-red-800",
      returned_to_sender: "bg-pink-100 text-pink-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const filteredShipments = (shipments || []).filter(
    (s: any) =>
      s.tracking_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.sender_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.recipient_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by tracking #, sender, or recipient..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="created">Created</SelectItem>
            <SelectItem value="pickup_scheduled">Pickup Scheduled</SelectItem>
            <SelectItem value="picked_up">Picked Up</SelectItem>
            <SelectItem value="in_transit">In Transit</SelectItem>
            <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="failed_delivery">Failed Delivery</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filteredShipments.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No shipments found</p>
            </CardContent>
          </Card>
        ) : (
          filteredShipments.map((shipment: any) => (
            <Card key={shipment.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium">{shipment.tracking_number}</span>
                        <Badge className={getStatusColor(shipment.status)}>
                          {shipment.status?.replace(/_/g, " ")}
                        </Badge>
                        {shipment.is_cod && (
                          <Badge variant="outline" className="text-yellow-700 border-yellow-300">
                            COD ₱{shipment.cod_amount?.toLocaleString()}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{shipment.sender_name}</span>
                          <span>→</span>
                          <span>{shipment.recipient_name}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span>{shipment.sender_city}</span>
                          <span>→</span>
                          <span>{shipment.recipient_city}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(shipment.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedShipment(shipment)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Shipment Details</DialogTitle>
                        </DialogHeader>
                        {selectedShipment && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-muted-foreground">Tracking #</p>
                                <p className="font-mono font-medium">{selectedShipment.tracking_number}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Status</p>
                                <Badge className={getStatusColor(selectedShipment.status)}>
                                  {selectedShipment.status?.replace(/_/g, " ")}
                                </Badge>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <h4 className="font-medium">Sender</h4>
                                <p className="text-sm">{selectedShipment.sender_name}</p>
                                <p className="text-sm text-muted-foreground">{selectedShipment.sender_phone}</p>
                                <p className="text-sm text-muted-foreground">
                                  {selectedShipment.sender_address}, {selectedShipment.sender_city}
                                </p>
                              </div>
                              <div className="space-y-2">
                                <h4 className="font-medium">Recipient</h4>
                                <p className="text-sm">{selectedShipment.recipient_name}</p>
                                <p className="text-sm text-muted-foreground">{selectedShipment.recipient_phone}</p>
                                <p className="text-sm text-muted-foreground">
                                  {selectedShipment.recipient_address}, {selectedShipment.recipient_city}
                                </p>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <p className="text-sm text-muted-foreground">Weight</p>
                                <p className="font-medium">{selectedShipment.actual_weight_kg} kg</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Shipping Fee</p>
                                <p className="font-medium">₱{selectedShipment.shipping_fee?.toLocaleString()}</p>
                              </div>
                              {selectedShipment.is_cod && (
                                <div>
                                  <p className="text-sm text-muted-foreground">COD Amount</p>
                                  <p className="font-medium">₱{selectedShipment.cod_amount?.toLocaleString()}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default ShipmentManagement;
