import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Package, ShoppingBag, Star, AlertCircle, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

export default function SellerDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [canBeSeller, setCanBeSeller] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [showProductForm, setShowProductForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    wholesale_price: "",
    stock_quantity: "",
    weight_kg: "",
    dimensions_cm: "",
    category_id: "",
  });
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      checkSellerEligibility();
      fetchVerificationStatus();
      fetchProducts();
      fetchCategories();
    }
  }, [user]);

  const checkSellerEligibility = async () => {
    try {
      const { data, error } = await supabase.rpc("can_become_seller", {
        p_user_id: user?.id,
      });

      if (error) throw error;
      setCanBeSeller(data);
    } catch (error: any) {
      console.error("Error checking seller eligibility:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVerificationStatus = async () => {
    try {
      const { data, error } = await supabase
        .from("seller_verification_requests")
        .select("status")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setVerificationStatus(data?.status || null);
    } catch (error: any) {
      console.error("Error fetching verification status:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_categories(name)")
        .eq("seller_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error("Error fetching products:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("product_categories")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error("Error fetching categories:", error);
    }
  };

  const requestVerification = async () => {
    try {
      const { error } = await supabase
        .from("seller_verification_requests")
        .insert({
          user_id: user?.id,
          status: "pending",
        });

      if (error) throw error;
      toast.success("Verification request submitted!");
      setVerificationStatus("pending");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profile?.is_verified_seller) {
      toast.error("You must be a verified seller to create products");
      return;
    }

    try {
      const { error } = await supabase.from("products").insert({
        name: formData.name,
        description: formData.description,
        wholesale_price: parseFloat(formData.wholesale_price),
        base_price: parseFloat(formData.wholesale_price), // Will be updated by admin markup
        stock_quantity: parseInt(formData.stock_quantity),
        weight_kg: parseFloat(formData.weight_kg) || null,
        dimensions_cm: formData.dimensions_cm || null,
        category_id: formData.category_id || null,
        seller_id: user?.id,
        is_active: false, // Pending admin approval
        commission_percentage: 0, // Set by admin
        admin_markup_percentage: 0, // Set by admin
      });

      if (error) throw error;

      toast.success("Product submitted for review!");
      setFormData({
        name: "",
        description: "",
        wholesale_price: "",
        stock_quantity: "",
        weight_kg: "",
        dimensions_cm: "",
        category_id: "",
      });
      setShowProductForm(false);
      fetchProducts();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!canBeSeller) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-yellow-500" />
              Seller Requirements
            </CardTitle>
            <CardDescription>
              You need at least 10 affiliate referrals to become a seller
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Keep building your network! Once you have 10 referrals, you'll be able to apply for seller verification.
            </p>
            <Button onClick={() => navigate("/dashboard")} variant="outline">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Seller Dashboard</h1>
        <p className="text-muted-foreground">Manage your products and sales</p>
      </div>

      {/* Verification Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {profile?.is_verified_seller ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                Verified Seller
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                Verification Status
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {profile?.is_verified_seller ? (
            <div className="flex items-center gap-4">
              <Badge variant="default" className="bg-green-500">Verified</Badge>
              {profile?.seller_rating > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{profile.seller_rating.toFixed(1)}</span>
                  <span className="text-muted-foreground">({profile.total_reviews} reviews)</span>
                </div>
              )}
            </div>
          ) : verificationStatus === "pending" ? (
            <Badge variant="secondary">Verification Pending</Badge>
          ) : verificationStatus === "rejected" ? (
            <div>
              <Badge variant="destructive" className="mb-2">Verification Rejected</Badge>
              <p className="text-sm text-muted-foreground">
                Please contact admin for more information.
              </p>
            </div>
          ) : (
            <Button onClick={requestVerification}>
              Request Seller Verification
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Products Section */}
      {profile?.is_verified_seller && (
        <>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Package className="h-6 w-6" />
              My Products
            </h2>
            <Button onClick={() => setShowProductForm(!showProductForm)}>
              {showProductForm ? "Cancel" : "Add Product"}
            </Button>
          </div>

          {showProductForm && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Create New Product</CardTitle>
                <CardDescription>
                  Submit a wholesale product for admin review and markup
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitProduct} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Product Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="wholesale_price">Wholesale Price ({profile?.currency_symbol})</Label>
                      <Input
                        id="wholesale_price"
                        type="number"
                        step="0.01"
                        value={formData.wholesale_price}
                        onChange={(e) => setFormData({ ...formData, wholesale_price: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="stock_quantity">Stock Quantity</Label>
                      <Input
                        id="stock_quantity"
                        type="number"
                        value={formData.stock_quantity}
                        onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="weight_kg">Weight (kg)</Label>
                      <Input
                        id="weight_kg"
                        type="number"
                        step="0.01"
                        value={formData.weight_kg}
                        onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="dimensions_cm">Dimensions (cm)</Label>
                      <Input
                        id="dimensions_cm"
                        placeholder="L x W x H"
                        value={formData.dimensions_cm}
                        onChange={(e) => setFormData({ ...formData, dimensions_cm: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="category_id">Category</Label>
                    <select
                      id="category_id"
                      className="w-full rounded-md border border-input bg-background px-3 py-2"
                      value={formData.category_id}
                      onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    >
                      <option value="">Select category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Button type="submit" className="w-full">
                    Submit Product for Review
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Products List */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <Card key={product.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                  <div className="flex gap-2">
                    <Badge variant={product.is_active ? "default" : "secondary"}>
                      {product.is_active ? "Active" : "Pending"}
                    </Badge>
                    {product.admin_markup_percentage > 0 && (
                      <Badge variant="outline">
                        {product.admin_markup_percentage}% markup
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {product.description}
                  </p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Wholesale:</span>
                      <span className="font-medium">
                        {profile?.currency_symbol}{product.wholesale_price}
                      </span>
                    </div>
                    {product.final_price && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Retail:</span>
                        <span className="font-medium text-primary">
                          {profile?.currency_symbol}{product.final_price}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Stock:</span>
                      <span>{product.stock_quantity}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {products.length === 0 && !showProductForm && (
            <Card>
              <CardContent className="py-12 text-center">
                <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No products yet. Create your first product!</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
