import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Store, Package, AlertCircle, Plus, Edit2, Trash2, Images } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUploadCrop } from "@/components/ImageUploadCrop";
import { ProductImageGallery } from "@/components/ProductImageGallery";
export default function SellerDashboard() {
  const {
    user,
    profile
  } = useAuth();
  const [loading, setLoading] = useState(true);
  const [canBecomeSeller, setCanBecomeSeller] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    wholesale_price: "",
    stock_quantity: "",
    category_id: "",
    image_url: "",
    shipping_fee: "",
    weight_kg: "",
    dimensions_cm: "",
    free_shipping: false
  });
  const [diamondBasePrice, setDiamondBasePrice] = useState(10);
  useEffect(() => {
    if (user) {
      checkSellerEligibility();
      checkVerificationStatus();
      fetchCategories();
      fetchDiamondPrice();
    }
  }, [user]);
  const fetchDiamondPrice = async () => {
    try {
      const {
        data: priceData
      } = await supabase.from("treasure_admin_settings").select("setting_value").eq("setting_key", "diamond_base_price").maybeSingle();
      const {
        data: percentData
      } = await supabase.from("treasure_admin_settings").select("setting_value").eq("setting_key", "user_product_diamond_percent").maybeSingle();
      if (priceData) setDiamondBasePrice(parseFloat(priceData.setting_value));

      // Store the percentage for calculation
      const defaultPercent = percentData ? parseFloat(percentData.setting_value) : 10;
      sessionStorage.setItem("user_product_diamond_percent", defaultPercent.toString());
    } catch (error: any) {
      console.error("Error fetching diamond settings:", error);
    }
  };
  useEffect(() => {
    if (profile?.is_verified_seller) fetchMyProducts();
  }, [profile]);
  const checkSellerEligibility = async () => {
    try {
      const {
        data,
        error
      } = await supabase.rpc("can_become_seller", {
        p_user_id: user?.id
      });
      if (error) throw error;
      setCanBecomeSeller(data);
    } catch (error: any) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };
  const checkVerificationStatus = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("seller_verification_requests").select("status").eq("user_id", user?.id).order("created_at", {
        ascending: false
      }).limit(1).maybeSingle();
      if (error && error.code !== "PGRST116") throw error;
      setVerificationStatus(data?.status || null);
    } catch (error: any) {
      console.error("Error:", error);
    }
  };
  const fetchCategories = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("product_categories").select("*").eq("is_active", true).order("name");
      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error("Error:", error);
    }
  };
  const fetchMyProducts = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("products").select("*").eq("seller_id", user?.id).order("created_at", {
        ascending: false
      });
      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      toast.error("Failed to fetch products");
    }
  };
  const handleRequestVerification = async () => {
    setSubmitting(true);
    try {
      const {
        error
      } = await supabase.from("seller_verification_requests").insert([{
        user_id: user?.id
      }]);
      if (error) throw error;
      toast.success("Verification request submitted!");
      setVerificationStatus("pending");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };
  const handleSaveProduct = async () => {
    if (!productForm.name || !productForm.wholesale_price) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSubmitting(true);
    try {
      const productData = {
        name: productForm.name,
        description: productForm.description,
        wholesale_price: parseFloat(productForm.wholesale_price),
        base_price: parseFloat(productForm.wholesale_price),
        stock_quantity: parseInt(productForm.stock_quantity) || 0,
        category_id: productForm.category_id || null,
        image_url: productForm.image_url || null,
        seller_id: user?.id,
        approval_status: "pending",
        is_active: false,
        diamond_reward: 0, // Set by admin only
        referral_commission_diamonds: 0, // Set by admin only
        shipping_fee: productForm.free_shipping ? 0 : parseFloat(productForm.shipping_fee) || 0,
        weight_kg: productForm.weight_kg ? parseFloat(productForm.weight_kg) : null,
        dimensions_cm: productForm.dimensions_cm || null,
        free_shipping: productForm.free_shipping
      };
      if (editingProduct) {
        const {
          error
        } = await supabase.from("products").update(productData).eq("id", editingProduct.id);
        if (error) throw error;
        toast.success("Product updated!");
      } else {
        const {
          error
        } = await supabase.from("products").insert([productData]);
        if (error) throw error;
        toast.success("Product submitted for approval!");
      }
      setShowProductDialog(false);
      setEditingProduct(null);
      setProductForm({
        name: "",
        description: "",
        wholesale_price: "",
        stock_quantity: "",
        category_id: "",
        image_url: "",
        shipping_fee: "",
        weight_kg: "",
        dimensions_cm: "",
        free_shipping: false
      });
      fetchMyProducts();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };
  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!canBecomeSeller) {
    return <div className="container mx-auto p-6 max-w-2xl">
        <Alert><AlertCircle className="h-4 w-4" /><AlertDescription>You need at least 2 affiliate referrals to become a seller.</AlertDescription></Alert>
      </div>;
  }
  return <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2 mb-6 text-[#010101]"><Store className="h-6 md:h-8 w-6 md:w-8" />Seller Dashboard</h1>
      {!profile?.is_verified_seller && <Card className="mb-6">
          <CardHeader><CardTitle>Seller Verification</CardTitle></CardHeader>
          <CardContent>
            {verificationStatus === "pending" && <Alert><AlertCircle className="h-4 w-4" /><AlertDescription>Your verification request is pending.</AlertDescription></Alert>}
            {!verificationStatus && <Button onClick={handleRequestVerification} disabled={submitting}>{submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Request Verification</Button>}
          </CardContent>
        </Card>}
      {profile?.is_verified_seller && <Card>
          <CardHeader>
            <div className="flex items-center justify-between"><CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" />My Products</CardTitle>
              <Button onClick={() => {
            setEditingProduct(null);
            setProductForm({
              name: "",
              description: "",
              wholesale_price: "",
              stock_quantity: "",
              category_id: "",
              image_url: "",
              shipping_fee: "",
              weight_kg: "",
              dimensions_cm: "",
              free_shipping: false
            });
            setShowProductDialog(true);
          }}><Plus className="h-4 w-4 mr-2" />Add Product</Button>
            </div>
          </CardHeader>
          <CardContent>
            {products.map(p => <Card key={p.id} className="mb-4"><CardContent className="pt-6">
                <div className="flex gap-4">{p.image_url && <img src={p.image_url} alt={p.name} className="w-24 h-24 object-cover rounded" />}
                  <div className="flex-1"><h3 className="font-semibold">{p.name}</h3>
                    <div className="flex gap-2 my-2"><Badge variant={p.approval_status === "approved" ? "default" : p.approval_status === "rejected" ? "destructive" : "secondary"}>{p.approval_status}</Badge></div>
                    <p className="text-sm">Wholesale: ₱{p.wholesale_price} | Stock: {p.stock_quantity}</p>
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" variant="outline" onClick={() => {
                    setEditingProduct(p);
                    setProductForm({
                      name: p.name,
                      description: p.description,
                      wholesale_price: p.wholesale_price.toString(),
                      stock_quantity: p.stock_quantity?.toString() || "0",
                      category_id: p.category_id || "",
                      image_url: p.image_url || "",
                      shipping_fee: p.shipping_fee?.toString() || "0",
                      weight_kg: p.weight_kg?.toString() || "",
                      dimensions_cm: p.dimensions_cm || "",
                      free_shipping: p.free_shipping || false
                    });
                    setShowProductDialog(true);
                  }}><Edit2 className="h-4 w-4" /></Button>
                      <Button size="sm" variant="outline" onClick={async () => {
                    if (confirm("Delete?")) {
                      await supabase.from("products").delete().eq("id", p.id);
                      fetchMyProducts();
                    }
                  }}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </div>
              </CardContent></Card>)}
            {products.length === 0 && <p className="text-center py-8 text-muted-foreground">No products yet</p>}
          </CardContent>
        </Card>}
      <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingProduct ? "Edit" : "Add"} Product</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name *</Label><Input value={productForm.name} onChange={e => setProductForm({
              ...productForm,
              name: e.target.value
            })} /></div>
            <div><Label>Description</Label><Textarea value={productForm.description} onChange={e => setProductForm({
              ...productForm,
              description: e.target.value
            })} /></div>
            <div><Label>Category</Label><Select value={productForm.category_id} onValueChange={v => setProductForm({
              ...productForm,
              category_id: v
            })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Wholesale Price *</Label><Input type="number" step="0.01" value={productForm.wholesale_price} onChange={e => {
                setProductForm({
                  ...productForm,
                  wholesale_price: e.target.value
                });
              }} /></div>
              <div><Label>Stock</Label><Input type="number" value={productForm.stock_quantity} onChange={e => setProductForm({
                ...productForm,
                stock_quantity: e.target.value
              })} /></div>
            </div>
            <p className="text-xs text-muted-foreground">Note: Diamond rewards and referral commissions are set by the admin after approval.</p>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Weight (kg)</Label><Input type="number" step="0.01" value={productForm.weight_kg} onChange={e => setProductForm({
                ...productForm,
                weight_kg: e.target.value
              })} placeholder="For shipping calculation" /></div>
              <div><Label>Dimensions (cm)</Label><Input value={productForm.dimensions_cm} onChange={e => setProductForm({
                ...productForm,
                dimensions_cm: e.target.value
              })} placeholder="L x W x H" /></div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={productForm.free_shipping} onCheckedChange={checked => setProductForm({
                ...productForm,
                free_shipping: checked
              })} />
                <Label>Free Shipping</Label>
              </div>
              {!productForm.free_shipping && <div className="flex-1"><Label>Shipping Fee</Label><Input type="number" step="0.01" value={productForm.shipping_fee} onChange={e => setProductForm({
                ...productForm,
                shipping_fee: e.target.value
              })} /></div>}
            </div>
            <div><Label>Primary Image</Label><ImageUploadCrop currentImage={productForm.image_url} onImageUploaded={url => setProductForm({
              ...productForm,
              image_url: url
            })} /></div>
            {editingProduct && (
              <div className="border-t pt-4 mt-4">
                <ProductImageGallery 
                  productId={editingProduct.id}
                  onPrimaryImageChange={(url) => setProductForm({
                    ...productForm,
                    image_url: url
                  })}
                />
              </div>
            )}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowProductDialog(false)}>Cancel</Button><Button onClick={handleSaveProduct} disabled={submitting}>{submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>;
}