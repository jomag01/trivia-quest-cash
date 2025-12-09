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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Truck, Users, Edit, Trash2, Check, X, Car, Bike } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface Vehicle {
  id: string;
  vehicle_name: string;
  vehicle_type: string;
  plate_number: string | null;
  capacity_kg: number | null;
  capacity_volume_cbm: number | null;
  status: string;
  current_driver_id: string | null;
  notes: string | null;
  created_at: string;
}

interface Personnel {
  id: string;
  user_id: string | null;
  full_name: string;
  phone: string | null;
  email: string | null;
  license_number: string | null;
  status: string;
  assigned_vehicle_id: string | null;
  hire_date: string | null;
  notes: string | null;
  created_at: string;
  assigned_vehicle?: Vehicle;
}

export function DeliveryManagement() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("vehicles");
  const [showVehicleDialog, setShowVehicleDialog] = useState(false);
  const [showPersonnelDialog, setShowPersonnelDialog] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [editingPersonnel, setEditingPersonnel] = useState<Personnel | null>(null);

  const [vehicleForm, setVehicleForm] = useState({
    vehicle_name: "",
    vehicle_type: "van",
    plate_number: "",
    capacity_kg: 0,
    capacity_volume_cbm: 0,
    status: "available",
    notes: "",
  });

  const [personnelForm, setPersonnelForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    license_number: "",
    status: "available",
    assigned_vehicle_id: "",
    hire_date: "",
    notes: "",
  });

  useEffect(() => {
    fetchVehicles();
    fetchPersonnel();
  }, []);

  const fetchVehicles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("delivery_vehicles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load vehicles");
    } else {
      setVehicles(data || []);
    }
    setLoading(false);
  };

  const fetchPersonnel = async () => {
    const { data, error } = await supabase
      .from("delivery_personnel")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load personnel");
    } else {
      // Enrich with vehicle data
      const enrichedData = await Promise.all(
        (data || []).map(async (p) => {
          if (p.assigned_vehicle_id) {
            const { data: vehicle } = await supabase
              .from("delivery_vehicles")
              .select("*")
              .eq("id", p.assigned_vehicle_id)
              .single();
            return { ...p, assigned_vehicle: vehicle };
          }
          return p;
        })
      );
      setPersonnel(enrichedData);
    }
  };

  const handleSaveVehicle = async () => {
    if (!vehicleForm.vehicle_name) {
      toast.error("Please enter vehicle name");
      return;
    }

    const vehicleData = {
      vehicle_name: vehicleForm.vehicle_name,
      vehicle_type: vehicleForm.vehicle_type,
      plate_number: vehicleForm.plate_number || null,
      capacity_kg: vehicleForm.capacity_kg || null,
      capacity_volume_cbm: vehicleForm.capacity_volume_cbm || null,
      status: vehicleForm.status,
      notes: vehicleForm.notes || null,
    };

    if (editingVehicle) {
      const { error } = await supabase
        .from("delivery_vehicles")
        .update(vehicleData)
        .eq("id", editingVehicle.id);

      if (error) {
        toast.error("Failed to update vehicle");
      } else {
        toast.success("Vehicle updated");
        resetVehicleForm();
        fetchVehicles();
      }
    } else {
      const { error } = await supabase.from("delivery_vehicles").insert(vehicleData);

      if (error) {
        toast.error("Failed to add vehicle");
      } else {
        toast.success("Vehicle added");
        resetVehicleForm();
        fetchVehicles();
      }
    }
  };

  const handleSavePersonnel = async () => {
    if (!personnelForm.full_name) {
      toast.error("Please enter full name");
      return;
    }

    const personnelData = {
      full_name: personnelForm.full_name,
      phone: personnelForm.phone || null,
      email: personnelForm.email || null,
      license_number: personnelForm.license_number || null,
      status: personnelForm.status,
      assigned_vehicle_id: personnelForm.assigned_vehicle_id || null,
      hire_date: personnelForm.hire_date || null,
      notes: personnelForm.notes || null,
    };

    if (editingPersonnel) {
      const { error } = await supabase
        .from("delivery_personnel")
        .update(personnelData)
        .eq("id", editingPersonnel.id);

      if (error) {
        toast.error("Failed to update personnel");
      } else {
        toast.success("Personnel updated");
        resetPersonnelForm();
        fetchPersonnel();
      }
    } else {
      const { error } = await supabase.from("delivery_personnel").insert(personnelData);

      if (error) {
        toast.error("Failed to add personnel");
      } else {
        toast.success("Personnel added");
        resetPersonnelForm();
        fetchPersonnel();
      }
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    if (!confirm("Are you sure you want to delete this vehicle?")) return;

    const { error } = await supabase.from("delivery_vehicles").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete vehicle");
    } else {
      toast.success("Vehicle deleted");
      fetchVehicles();
    }
  };

  const handleDeletePersonnel = async (id: string) => {
    if (!confirm("Are you sure you want to delete this personnel?")) return;

    const { error } = await supabase.from("delivery_personnel").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete personnel");
    } else {
      toast.success("Personnel deleted");
      fetchPersonnel();
    }
  };

  const resetVehicleForm = () => {
    setVehicleForm({
      vehicle_name: "",
      vehicle_type: "van",
      plate_number: "",
      capacity_kg: 0,
      capacity_volume_cbm: 0,
      status: "available",
      notes: "",
    });
    setEditingVehicle(null);
    setShowVehicleDialog(false);
  };

  const resetPersonnelForm = () => {
    setPersonnelForm({
      full_name: "",
      phone: "",
      email: "",
      license_number: "",
      status: "available",
      assigned_vehicle_id: "",
      hire_date: "",
      notes: "",
    });
    setEditingPersonnel(null);
    setShowPersonnelDialog(false);
  };

  const getVehicleIcon = (type: string) => {
    switch (type) {
      case "truck":
        return <Truck className="w-4 h-4" />;
      case "motorcycle":
        return <Bike className="w-4 h-4" />;
      default:
        return <Car className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      available: "default",
      in_use: "secondary",
      on_delivery: "secondary",
      maintenance: "outline",
      off_duty: "outline",
      retired: "destructive",
      suspended: "destructive",
    };

    return (
      <Badge variant={variants[status] || "secondary"}>
        {status.replace("_", " ").charAt(0).toUpperCase() + status.replace("_", " ").slice(1)}
      </Badge>
    );
  };

  const availableVehicles = vehicles.filter((v) => v.status === "available");
  const availablePersonnel = personnel.filter((p) => p.status === "available");

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">Total Vehicles</span>
            </div>
            <p className="text-2xl font-bold mt-1">{vehicles.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-500" />
              <span className="text-sm text-muted-foreground">Available</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-green-600">{availableVehicles.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">Total Personnel</span>
            </div>
            <p className="text-2xl font-bold mt-1">{personnel.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-green-500" />
              <span className="text-sm text-muted-foreground">Active Drivers</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-green-600">{availablePersonnel.length}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="vehicles" className="gap-2">
              <Truck className="w-4 h-4" />
              Vehicles
            </TabsTrigger>
            <TabsTrigger value="personnel" className="gap-2">
              <Users className="w-4 h-4" />
              Personnel
            </TabsTrigger>
          </TabsList>

          {activeTab === "vehicles" && (
            <Dialog open={showVehicleDialog} onOpenChange={setShowVehicleDialog}>
              <DialogTrigger asChild>
                <Button
                  className="gap-2"
                  onClick={() => {
                    resetVehicleForm();
                    setShowVehicleDialog(true);
                  }}
                >
                  <Plus className="w-4 h-4" />
                  Add Vehicle
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingVehicle ? "Edit Vehicle" : "Add Vehicle"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>Vehicle Name</Label>
                    <Input
                      value={vehicleForm.vehicle_name}
                      onChange={(e) =>
                        setVehicleForm({ ...vehicleForm, vehicle_name: e.target.value })
                      }
                      placeholder="e.g., Delivery Van 01"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Type</Label>
                      <Select
                        value={vehicleForm.vehicle_type}
                        onValueChange={(v) => setVehicleForm({ ...vehicleForm, vehicle_type: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="truck">Truck</SelectItem>
                          <SelectItem value="van">Van</SelectItem>
                          <SelectItem value="motorcycle">Motorcycle</SelectItem>
                          <SelectItem value="bicycle">Bicycle</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Plate Number</Label>
                      <Input
                        value={vehicleForm.plate_number}
                        onChange={(e) =>
                          setVehicleForm({ ...vehicleForm, plate_number: e.target.value })
                        }
                        placeholder="ABC 1234"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Capacity (kg)</Label>
                      <Input
                        type="number"
                        value={vehicleForm.capacity_kg}
                        onChange={(e) =>
                          setVehicleForm({
                            ...vehicleForm,
                            capacity_kg: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>Volume (cbm)</Label>
                      <Input
                        type="number"
                        value={vehicleForm.capacity_volume_cbm}
                        onChange={(e) =>
                          setVehicleForm({
                            ...vehicleForm,
                            capacity_volume_cbm: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select
                      value={vehicleForm.status}
                      onValueChange={(v) => setVehicleForm({ ...vehicleForm, status: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="in_use">In Use</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="retired">Retired</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Textarea
                      value={vehicleForm.notes}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, notes: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleSaveVehicle} className="w-full">
                    {editingVehicle ? "Update Vehicle" : "Add Vehicle"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {activeTab === "personnel" && (
            <Dialog open={showPersonnelDialog} onOpenChange={setShowPersonnelDialog}>
              <DialogTrigger asChild>
                <Button
                  className="gap-2"
                  onClick={() => {
                    resetPersonnelForm();
                    setShowPersonnelDialog(true);
                  }}
                >
                  <Plus className="w-4 h-4" />
                  Add Personnel
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingPersonnel ? "Edit Personnel" : "Add Personnel"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>Full Name</Label>
                    <Input
                      value={personnelForm.full_name}
                      onChange={(e) =>
                        setPersonnelForm({ ...personnelForm, full_name: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Phone</Label>
                      <Input
                        value={personnelForm.phone}
                        onChange={(e) =>
                          setPersonnelForm({ ...personnelForm, phone: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={personnelForm.email}
                        onChange={(e) =>
                          setPersonnelForm({ ...personnelForm, email: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>License Number</Label>
                      <Input
                        value={personnelForm.license_number}
                        onChange={(e) =>
                          setPersonnelForm({ ...personnelForm, license_number: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label>Hire Date</Label>
                      <Input
                        type="date"
                        value={personnelForm.hire_date}
                        onChange={(e) =>
                          setPersonnelForm({ ...personnelForm, hire_date: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Status</Label>
                      <Select
                        value={personnelForm.status}
                        onValueChange={(v) => setPersonnelForm({ ...personnelForm, status: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="available">Available</SelectItem>
                          <SelectItem value="on_delivery">On Delivery</SelectItem>
                          <SelectItem value="off_duty">Off Duty</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Assigned Vehicle</Label>
                      <Select
                        value={personnelForm.assigned_vehicle_id}
                        onValueChange={(v) =>
                          setPersonnelForm({ ...personnelForm, assigned_vehicle_id: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {vehicles.map((v) => (
                            <SelectItem key={v.id} value={v.id}>
                              {v.vehicle_name} ({v.plate_number || "No plate"})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Textarea
                      value={personnelForm.notes}
                      onChange={(e) =>
                        setPersonnelForm({ ...personnelForm, notes: e.target.value })
                      }
                    />
                  </div>
                  <Button onClick={handleSavePersonnel} className="w-full">
                    {editingPersonnel ? "Update Personnel" : "Add Personnel"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <TabsContent value="vehicles" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Delivery Vehicles</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center py-8 text-muted-foreground">Loading...</p>
              ) : vehicles.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No vehicles found</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vehicle</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Plate</TableHead>
                        <TableHead>Capacity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vehicles.map((v) => (
                        <TableRow key={v.id}>
                          <TableCell className="font-medium">{v.vehicle_name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getVehicleIcon(v.vehicle_type)}
                              {v.vehicle_type}
                            </div>
                          </TableCell>
                          <TableCell>{v.plate_number || "-"}</TableCell>
                          <TableCell>
                            {v.capacity_kg ? `${v.capacity_kg}kg` : "-"}
                          </TableCell>
                          <TableCell>{getStatusBadge(v.status)}</TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingVehicle(v);
                                  setVehicleForm({
                                    vehicle_name: v.vehicle_name,
                                    vehicle_type: v.vehicle_type,
                                    plate_number: v.plate_number || "",
                                    capacity_kg: v.capacity_kg || 0,
                                    capacity_volume_cbm: v.capacity_volume_cbm || 0,
                                    status: v.status,
                                    notes: v.notes || "",
                                  });
                                  setShowVehicleDialog(true);
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive"
                                onClick={() => handleDeleteVehicle(v.id)}
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
        </TabsContent>

        <TabsContent value="personnel" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Delivery Personnel</CardTitle>
            </CardHeader>
            <CardContent>
              {personnel.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No personnel found</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>License</TableHead>
                        <TableHead>Assigned Vehicle</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {personnel.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.full_name}</TableCell>
                          <TableCell>{p.phone || "-"}</TableCell>
                          <TableCell>{p.license_number || "-"}</TableCell>
                          <TableCell>
                            {p.assigned_vehicle?.vehicle_name || "-"}
                          </TableCell>
                          <TableCell>{getStatusBadge(p.status)}</TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingPersonnel(p);
                                  setPersonnelForm({
                                    full_name: p.full_name,
                                    phone: p.phone || "",
                                    email: p.email || "",
                                    license_number: p.license_number || "",
                                    status: p.status,
                                    assigned_vehicle_id: p.assigned_vehicle_id || "",
                                    hire_date: p.hire_date || "",
                                    notes: p.notes || "",
                                  });
                                  setShowPersonnelDialog(true);
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive"
                                onClick={() => handleDeletePersonnel(p.id)}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
