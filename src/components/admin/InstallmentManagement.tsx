import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Building2, Package, CreditCard, Loader2, UserPlus, Wallet } from "lucide-react";

interface Provider {
  id: string;
  name: string;
  logo_url: string | null;
  description: string | null;
  interest_rate_percent: number;
  min_amount: number;
  max_amount: number | null;
  available_terms: number[];
  is_active: boolean;
}

interface ProductInstallment {
  id: string;
  product_id: string;
  provider_id: string;
  is_enabled: boolean;
}

const InstallmentManagement = () => {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [productInstallments, setProductInstallments] = useState<ProductInstallment[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [userOffers, setUserOffers] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedProviderId, setSelectedProviderId] = useState("");
  const [searchProducts, setSearchProducts] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);

  // User offer assignment state
  const [offerDialogOpen, setOfferDialogOpen] = useState(false);
  const [offerUserId, setOfferUserId] = useState("");
  const [offerProductId, setOfferProductId] = useState("");
  const [offerProviderId, setOfferProviderId] = useState("");
  const [searchUsers, setSearchUsers] = useState("");
  const [searchOfferProducts, setSearchOfferProducts] = useState("");

  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);

  const [form, setForm] = useState({
    name: "",
    logo_url: "",
    description: "",
    interest_rate_percent: 0,
    min_amount: 0,
    max_amount: "",
    available_terms: "3,6,12",
    is_active: true,
  });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [provRes, prodRes, settingsRes, appRes, offersRes, profilesRes, pmRes] = await Promise.all([
      supabase.from("installment_providers").select("*").order("created_at", { ascending: false }),
      supabase.from("products").select("id, name, base_price, image_url").order("name"),
      supabase.from("product_installment_settings").select("*"),
      supabase.from("installment_applications").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("user_installment_offers").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name, email, avatar_url").limit(500),
      supabase.from("installment_payment_methods").select("*").order("display_order"),
    ]);
    if (provRes.data) setProviders(provRes.data as Provider[]);
    if (prodRes.data) setProducts(prodRes.data);
    if (settingsRes.data) setProductInstallments(settingsRes.data as ProductInstallment[]);
    if (appRes.data) setApplications(appRes.data);
    if (offersRes.data) setUserOffers(offersRes.data);
    if (profilesRes.data) setProfiles(profilesRes.data);
    if (pmRes.data) setPaymentMethods(pmRes.data);
    setLoading(false);
  };

  const handleSaveProvider = async () => {
    const terms = form.available_terms.split(",").map(t => parseInt(t.trim())).filter(Boolean);
    const payload = {
      name: form.name,
      logo_url: form.logo_url || null,
      description: form.description || null,
      interest_rate_percent: form.interest_rate_percent,
      min_amount: form.min_amount,
      max_amount: form.max_amount ? parseFloat(form.max_amount) : null,
      available_terms: terms,
      is_active: form.is_active,
    };

    let error;
    if (editingProvider) {
      ({ error } = await supabase.from("installment_providers").update(payload).eq("id", editingProvider.id));
    } else {
      ({ error } = await supabase.from("installment_providers").insert(payload));
    }

    if (error) {
      toast.error("Failed to save provider: " + error.message);
      return;
    }
    toast.success(editingProvider ? "Provider updated" : "Provider added");
    setDialogOpen(false);
    resetForm();
    fetchAll();
  };

  const handleDeleteProvider = async (id: string) => {
    const { error } = await supabase.from("installment_providers").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success("Provider deleted");
    fetchAll();
  };

  const handleAssignProduct = async () => {
    if (!selectedProductId || !selectedProviderId) {
      toast.error("Please select both a product and a provider");
      return;
    }
    
    setAssignLoading(true);
    try {
      const { data: existing, error: fetchError } = await supabase
        .from("product_installment_settings")
        .select("id")
        .eq("product_id", selectedProductId)
        .eq("provider_id", selectedProviderId)
        .maybeSingle();

      if (fetchError) {
        console.error("Fetch existing error:", fetchError);
        toast.error("Failed to check existing: " + fetchError.message);
        setAssignLoading(false);
        return;
      }

      let error;
      if (existing) {
        ({ error } = await supabase
          .from("product_installment_settings")
          .update({ is_enabled: true })
          .eq("id", existing.id));
      } else {
        ({ error } = await supabase
          .from("product_installment_settings")
          .insert({
            product_id: selectedProductId,
            provider_id: selectedProviderId,
            is_enabled: true,
          }));
      }

      if (error) {
        console.error("Installment assign error:", JSON.stringify(error));
        toast.error("Failed to assign: " + error.message);
        setAssignLoading(false);
        return;
      }
      toast.success("Product assigned to installment");
      setAssignDialogOpen(false);
      setSelectedProductId("");
      setSelectedProviderId("");
      fetchAll();
    } catch (err: any) {
      console.error("Installment assign exception:", err);
      toast.error("Error: " + err.message);
    } finally {
      setAssignLoading(false);
    }
  };

  const handleRemoveAssignment = async (id: string) => {
    await supabase.from("product_installment_settings").delete().eq("id", id);
    toast.success("Removed");
    fetchAll();
  };

  const handleApplicationStatus = async (id: string, status: string) => {
    await supabase.from("installment_applications").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    toast.success(`Application ${status}`);
    fetchAll();
  };

  const handleAssignUserOffer = async () => {
    if (!offerUserId || !offerProductId || !offerProviderId) return;
    
    try {
      const { data: existing } = await supabase
        .from("user_installment_offers")
        .select("id")
        .eq("user_id", offerUserId)
        .eq("product_id", offerProductId)
        .eq("provider_id", offerProviderId)
        .maybeSingle();

      if (existing) {
        toast.error("This offer is already assigned to this user");
        return;
      }

      const { error } = await supabase.from("user_installment_offers").insert({
        user_id: offerUserId,
        product_id: offerProductId,
        provider_id: offerProviderId,
        status: "active",
      });

      if (error) {
        toast.error("Failed to assign offer: " + error.message);
        return;
      }
      toast.success("Installment offer assigned to user");
      setOfferDialogOpen(false);
      setOfferUserId("");
      setOfferProductId("");
      setOfferProviderId("");
      fetchAll();
    } catch (err: any) {
      toast.error("Error: " + err.message);
    }
  };

  const handleRemoveUserOffer = async (id: string) => {
    await supabase.from("user_installment_offers").delete().eq("id", id);
    toast.success("Offer removed");
    fetchAll();
  };

  const resetForm = () => {
    setEditingProvider(null);
    setForm({ name: "", logo_url: "", description: "", interest_rate_percent: 0, min_amount: 0, max_amount: "", available_terms: "3,6,12", is_active: true });
  };

  const handleTogglePaymentMethod = async (id: string, currentEnabled: boolean) => {
    const { error } = await supabase
      .from("installment_payment_methods")
      .update({ is_enabled: !currentEnabled, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast.error("Failed to update: " + error.message);
      return;
    }
    setPaymentMethods(prev => prev.map(m => m.id === id ? { ...m, is_enabled: !currentEnabled } : m));
    toast.success(`Payment method ${!currentEnabled ? "enabled" : "disabled"}`);
  };

  const openEdit = (p: Provider) => {
    setEditingProvider(p);
    setForm({
      name: p.name,
      logo_url: p.logo_url || "",
      description: p.description || "",
      interest_rate_percent: p.interest_rate_percent,
      min_amount: p.min_amount,
      max_amount: p.max_amount?.toString() || "",
      available_terms: p.available_terms?.join(",") || "3,6,12",
      is_active: p.is_active,
    });
    setDialogOpen(true);
  };

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(searchProducts.toLowerCase())
  );

  const filteredOfferProducts = products.filter(p =>
    p.name?.toLowerCase().includes(searchOfferProducts.toLowerCase())
  );

  const filteredUsers = profiles.filter(p =>
    (p.full_name?.toLowerCase().includes(searchUsers.toLowerCase()) || 
     p.email?.toLowerCase().includes(searchUsers.toLowerCase()))
  );

  const getProductName = (pid: string) => products.find(p => p.id === pid)?.name || pid.slice(0, 8);
  const getProviderName = (pid: string) => providers.find(p => p.id === pid)?.name || pid.slice(0, 8);
  const getUserName = (uid: string) => profiles.find(p => p.id === uid)?.full_name || uid.slice(0, 8);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Installment Management</h2>
          <p className="text-muted-foreground text-sm">Manage financing providers and product installment eligibility</p>
        </div>
      </div>

      <Tabs defaultValue="providers">
        <TabsList className="flex-wrap">
          <TabsTrigger value="providers"><Building2 className="w-4 h-4 mr-1" /> Providers</TabsTrigger>
          <TabsTrigger value="products"><Package className="w-4 h-4 mr-1" /> Product Assignments</TabsTrigger>
          <TabsTrigger value="payment-methods"><Wallet className="w-4 h-4 mr-1" /> Payment Methods</TabsTrigger>
          <TabsTrigger value="user-offers"><UserPlus className="w-4 h-4 mr-1" /> User Offers</TabsTrigger>
          <TabsTrigger value="applications"><CreditCard className="w-4 h-4 mr-1" /> Applications</TabsTrigger>
        </TabsList>

        {/* PROVIDERS TAB */}
        <TabsContent value="providers" className="space-y-3">
          <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-1" /> Add Provider</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingProvider ? "Edit" : "Add"} Financing Provider</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Company Name *</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <Label>Logo URL</Label>
                  <Input value={form.logo_url} onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))} placeholder="https://..." />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Interest Rate %</Label>
                    <Input type="number" value={form.interest_rate_percent} onChange={e => setForm(f => ({ ...f, interest_rate_percent: parseFloat(e.target.value) || 0 }))} />
                  </div>
                  <div>
                    <Label>Min Amount (₱)</Label>
                    <Input type="number" value={form.min_amount} onChange={e => setForm(f => ({ ...f, min_amount: parseFloat(e.target.value) || 0 }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Max Amount (₱)</Label>
                    <Input type="number" value={form.max_amount} onChange={e => setForm(f => ({ ...f, max_amount: e.target.value }))} placeholder="No limit" />
                  </div>
                  <div>
                    <Label>Terms (months)</Label>
                    <Input value={form.available_terms} onChange={e => setForm(f => ({ ...f, available_terms: e.target.value }))} placeholder="3,6,12" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
                  <Label>Active</Label>
                </div>
                <Button className="w-full" onClick={handleSaveProvider} disabled={!form.name}>Save Provider</Button>
              </div>
            </DialogContent>
          </Dialog>

          <div className="grid gap-3">
            {providers.map(p => (
              <Card key={p.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {p.logo_url ? (
                    <img src={p.logo_url} alt={p.name} className="w-10 h-10 rounded object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center"><Building2 className="w-5 h-5 text-muted-foreground" /></div>
                  )}
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {p.name}
                      <Badge variant={p.is_active ? "default" : "secondary"}>{p.is_active ? "Active" : "Inactive"}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {p.interest_rate_percent}% interest · Min ₱{p.min_amount?.toLocaleString()} · Terms: {p.available_terms?.join(", ")} months
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDeleteProvider(p.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </Card>
            ))}
            {providers.length === 0 && <p className="text-center text-muted-foreground py-8">No providers added yet</p>}
          </div>
        </TabsContent>

        {/* PRODUCT ASSIGNMENTS TAB */}
        <TabsContent value="products" className="space-y-3">
          <Dialog open={assignDialogOpen} onOpenChange={(open) => {
            setAssignDialogOpen(open);
            if (open) {
              setSelectedProductId("");
              setSelectedProviderId("");
              setSearchProducts("");
              // Auto-select if only one active provider
              const activeProviders = providers.filter(p => p.is_active);
              if (activeProviders.length === 1) {
                setSelectedProviderId(activeProviders[0].id);
              }
            }
          }}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-1" /> Assign Product</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Enable Installment for Product</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Search Product</Label>
                  <Input value={searchProducts} onChange={e => setSearchProducts(e.target.value)} placeholder="Search..." />
                  <div className="max-h-40 overflow-y-auto border rounded mt-1">
                    {filteredProducts.slice(0, 20).map(p => (
                      <button key={p.id} onClick={() => setSelectedProductId(p.id)}
                        className={`w-full text-left text-sm px-3 py-2 hover:bg-muted ${selectedProductId === p.id ? "bg-primary/10 font-medium" : ""}`}>
                        {p.name} · ₱{p.base_price?.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Provider</Label>
                  <div className="space-y-1 mt-1">
                    {providers.filter(p => p.is_active).map(p => (
                      <button key={p.id} onClick={() => setSelectedProviderId(p.id)}
                        className={`w-full text-left text-sm px-3 py-2 rounded border hover:bg-muted ${selectedProviderId === p.id ? "bg-primary/10 border-primary font-medium" : ""}`}>
                        {p.name} · {p.interest_rate_percent}%
                      </button>
                    ))}
                  </div>
                </div>
                <Button className="w-full" onClick={handleAssignProduct} disabled={!selectedProductId || !selectedProviderId || assignLoading}>
                  {assignLoading ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Enabling...</> : "Enable Installment"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <div className="grid gap-2">
            {productInstallments.map(pi => (
              <Card key={pi.id} className="p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{getProductName(pi.product_id)}</p>
                  <p className="text-xs text-muted-foreground">via {getProviderName(pi.provider_id)}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => handleRemoveAssignment(pi.id)}>
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </Button>
              </Card>
            ))}
            {productInstallments.length === 0 && <p className="text-center text-muted-foreground py-8">No products assigned to installment yet</p>}
          </div>
        </TabsContent>

        {/* USER OFFERS TAB */}
        <TabsContent value="user-offers" className="space-y-3">
          <Dialog open={offerDialogOpen} onOpenChange={setOfferDialogOpen}>
            <DialogTrigger asChild>
              <Button><UserPlus className="w-4 h-4 mr-1" /> Assign Offer to User</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Assign Installment Offer to User</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Search User</Label>
                  <Input value={searchUsers} onChange={e => setSearchUsers(e.target.value)} placeholder="Search by name or email..." />
                  <div className="max-h-32 overflow-y-auto border rounded mt-1">
                    {filteredUsers.slice(0, 20).map(u => (
                      <button key={u.id} onClick={() => setOfferUserId(u.id)}
                        className={`w-full text-left text-sm px-3 py-2 hover:bg-muted ${offerUserId === u.id ? "bg-primary/10 font-medium" : ""}`}>
                        {u.full_name || "No Name"} · {u.email}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Search Product</Label>
                  <Input value={searchOfferProducts} onChange={e => setSearchOfferProducts(e.target.value)} placeholder="Search product..." />
                  <div className="max-h-32 overflow-y-auto border rounded mt-1">
                    {filteredOfferProducts.slice(0, 20).map(p => (
                      <button key={p.id} onClick={() => setOfferProductId(p.id)}
                        className={`w-full text-left text-sm px-3 py-2 hover:bg-muted ${offerProductId === p.id ? "bg-primary/10 font-medium" : ""}`}>
                        {p.name} · ₱{p.base_price?.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Provider</Label>
                  <div className="space-y-1 mt-1">
                    {providers.filter(p => p.is_active).map(p => (
                      <button key={p.id} onClick={() => setOfferProviderId(p.id)}
                        className={`w-full text-left text-sm px-3 py-2 rounded border hover:bg-muted ${offerProviderId === p.id ? "bg-primary/10 border-primary" : ""}`}>
                        {p.name} · {p.interest_rate_percent}%
                      </button>
                    ))}
                  </div>
                </div>
                <Button className="w-full" onClick={handleAssignUserOffer} disabled={!offerUserId || !offerProductId || !offerProviderId}>
                  Assign Offer
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <div className="grid gap-2">
            {userOffers.map((offer: any) => (
              <Card key={offer.id} className="p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{getUserName(offer.user_id)}</p>
                  <p className="text-xs text-muted-foreground">
                    {getProductName(offer.product_id)} · via {getProviderName(offer.provider_id)}
                  </p>
                  <Badge variant={offer.status === "active" ? "default" : "secondary"} className="mt-1">{offer.status}</Badge>
                </div>
                <Button size="sm" variant="ghost" onClick={() => handleRemoveUserOffer(offer.id)}>
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </Button>
              </Card>
            ))}
            {userOffers.length === 0 && <p className="text-center text-muted-foreground py-8">No user offers assigned yet</p>}
          </div>
        </TabsContent>

        {/* APPLICATIONS TAB */}
        <TabsContent value="applications" className="space-y-3">
          {applications.map((app: any) => (
            <Card key={app.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{getUserName(app.user_id)} — {getProductName(app.product_id)}</p>
                  <p className="text-xs text-muted-foreground">
                    {app.term_months} months · ₱{app.monthly_payment?.toLocaleString()}/mo · Total ₱{app.total_amount?.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">via {getProviderName(app.provider_id)}</p>
                  {app.downpayment_amount > 0 && (
                    <p className="text-xs text-primary">Downpayment: ₱{app.downpayment_amount?.toLocaleString()} {app.downpayment_paid ? "✓ Paid" : "· Pending"}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={app.status === "approved" ? "default" : app.status === "rejected" ? "destructive" : "secondary"}>
                    {app.status}
                  </Badge>
                  {app.status === "pending" && (
                    <div className="flex gap-1">
                      <Button size="sm" onClick={() => handleApplicationStatus(app.id, "approved")}>Approve</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleApplicationStatus(app.id, "rejected")}>Reject</Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
          {applications.length === 0 && <p className="text-center text-muted-foreground py-8">No installment applications yet</p>}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InstallmentManagement;
