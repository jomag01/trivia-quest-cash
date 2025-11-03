import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ShoppingCart, Plus, Minus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface Product {
  id: string;
  name: string;
  description: string;
  base_price: number;
  commission_percentage: number;
  category_id: string | null;
  categories: { name: string } | null;
}

interface ProductImage {
  id: string;
  image_url: string;
  is_primary: boolean;
}

interface ProductVariant {
  id: string;
  variant_type: string;
  variant_value: string;
  price_adjustment: number;
  stock_quantity: number;
}

interface CartItem {
  product: Product;
  variant: ProductVariant | null;
  quantity: number;
  images: ProductImage[];
}

export default function Store() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [productVariants, setProductVariants] = useState<ProductVariant[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isCheckoutDialogOpen, setIsCheckoutDialogOpen] = useState(false);
  const [shippingAddress, setShippingAddress] = useState("");
  const [orderNotes, setOrderNotes] = useState("");

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchCategories();
    fetchProducts();
  }, [user, navigate]);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("display_order");

    if (!error && data) {
      setCategories(data);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select(`
        *,
        categories (name)
      `)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load products");
      console.error(error);
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  const fetchProductDetails = async (productId: string) => {
    const [imagesResult, variantsResult] = await Promise.all([
      supabase
        .from("product_images")
        .select("*")
        .eq("product_id", productId)
        .order("display_order"),
      supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", productId)
        .order("variant_type")
    ]);

    setProductImages(imagesResult.data || []);
    setProductVariants(variantsResult.data || []);
  };

  const openProductDialog = async (product: Product) => {
    setSelectedProduct(product);
    setQuantity(1);
    setSelectedVariant(null);
    await fetchProductDetails(product.id);
    setIsProductDialogOpen(true);
  };

  const addToCart = () => {
    if (!selectedProduct) return;

    const existingItemIndex = cart.findIndex(
      item => item.product.id === selectedProduct.id && 
      item.variant?.id === selectedVariant?.id
    );

    if (existingItemIndex >= 0) {
      const newCart = [...cart];
      newCart[existingItemIndex].quantity += quantity;
      setCart(newCart);
    } else {
      setCart([...cart, {
        product: selectedProduct,
        variant: selectedVariant,
        quantity,
        images: productImages
      }]);
    }

    toast.success("Added to cart");
    setIsProductDialogOpen(false);
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
    toast.success("Removed from cart");
  };

  const updateCartQuantity = (index: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    const newCart = [...cart];
    newCart[index].quantity = newQuantity;
    setCart(newCart);
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => {
      const price = item.product.base_price + (item.variant?.price_adjustment || 0);
      return total + (price * item.quantity);
    }, 0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    if (!shippingAddress.trim()) {
      toast.error("Please enter shipping address");
      return;
    }

    try {
      const totalAmount = calculateTotal();

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user!.id,
          total_amount: totalAmount,
          status: "pending",
          shipping_address: shippingAddress,
          notes: orderNotes
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cart.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        variant_id: item.variant?.id || null,
        quantity: item.quantity,
        unit_price: item.product.base_price + (item.variant?.price_adjustment || 0),
        total_price: (item.product.base_price + (item.variant?.price_adjustment || 0)) * item.quantity,
        commission_percentage: item.product.commission_percentage
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Call edge function to distribute commissions
      const { error: commissionError } = await supabase.functions.invoke("distribute-commissions", {
        body: { orderId: order.id }
      });

      if (commissionError) {
        console.error("Commission distribution failed:", commissionError);
      }

      toast.success("Order placed successfully!");
      setCart([]);
      setIsCheckoutDialogOpen(false);
      setShippingAddress("");
      setOrderNotes("");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to place order");
      console.error(error);
    }
  };

  const filteredProducts = selectedCategory === "all"
    ? products
    : products.filter(p => p.category_id === selectedCategory);

  const primaryImage = (productId: string) => {
    return productImages.find(img => img.is_primary)?.image_url || 
           productImages[0]?.image_url || 
           "https://via.placeholder.com/300";
  };

  if (loading) {
    return <div className="p-8">Loading products...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Store</h1>
        <Button onClick={() => setIsCheckoutDialogOpen(true)} className="relative">
          <ShoppingCart className="w-4 h-4 mr-2" />
          Cart ({cart.length})
        </Button>
      </div>

      <div className="flex gap-4">
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map(product => {
          const primaryImg = productImages.find(img => img.is_primary)?.image_url || 
                            "https://via.placeholder.com/300";
          
          return (
            <Card key={product.id} className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => openProductDialog(product)}>
              <CardHeader className="p-0">
                <img 
                  src={primaryImg} 
                  alt={product.name}
                  className="w-full h-48 object-cover rounded-t-lg"
                />
              </CardHeader>
              <CardContent className="p-4">
                <CardTitle className="text-lg mb-2">{product.name}</CardTitle>
                {product.categories && (
                  <Badge variant="secondary" className="mb-2">
                    {product.categories.name}
                  </Badge>
                )}
                <CardDescription className="line-clamp-2">
                  {product.description}
                </CardDescription>
              </CardContent>
              <CardFooter className="p-4 pt-0 flex justify-between items-center">
                <span className="text-2xl font-bold">₱{product.base_price.toFixed(2)}</span>
                <Badge>{product.commission_percentage}% commission</Badge>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Product Detail Dialog */}
      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedProduct?.name}</DialogTitle>
            <DialogDescription>
              {selectedProduct?.description}
            </DialogDescription>
          </DialogHeader>
          
          {selectedProduct && (
            <div className="space-y-4">
              {productImages.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {productImages.map(img => (
                    <img 
                      key={img.id}
                      src={img.image_url}
                      alt="Product"
                      className="w-full h-48 object-cover rounded"
                    />
                  ))}
                </div>
              )}

              <div>
                <p className="text-2xl font-bold">
                  ₱{(selectedProduct.base_price + (selectedVariant?.price_adjustment || 0)).toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Commission: {selectedProduct.commission_percentage}%
                </p>
              </div>

              {productVariants.length > 0 && (
                <div>
                  <Label>Select Variant</Label>
                  <Select 
                    value={selectedVariant?.id} 
                    onValueChange={(id) => setSelectedVariant(productVariants.find(v => v.id === id) || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose variant" />
                    </SelectTrigger>
                    <SelectContent>
                      {productVariants.map(variant => (
                        <SelectItem key={variant.id} value={variant.id}>
                          {variant.variant_type}: {variant.variant_value} 
                          {variant.price_adjustment !== 0 && ` (+₱${variant.price_adjustment})`}
                          {variant.stock_quantity > 0 ? ` (${variant.stock_quantity} in stock)` : " (Out of stock)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label>Quantity</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Input 
                    type="number" 
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 text-center"
                  />
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <Button onClick={addToCart} className="w-full">
                Add to Cart
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Checkout Dialog */}
      <Dialog open={isCheckoutDialogOpen} onOpenChange={setIsCheckoutDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Checkout</DialogTitle>
            <DialogDescription>
              Review your order and complete purchase
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Order Items</h3>
              {cart.map((item, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b">
                  <div className="flex-1">
                    <p className="font-medium">{item.product.name}</p>
                    {item.variant && (
                      <p className="text-sm text-muted-foreground">
                        {item.variant.variant_type}: {item.variant.variant_value}
                      </p>
                    )}
                    <p className="text-sm">
                      ₱{(item.product.base_price + (item.variant?.price_adjustment || 0)).toFixed(2)} × {item.quantity}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => updateCartQuantity(index, item.quantity - 1)}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => updateCartQuantity(index, item.quantity + 1)}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => removeFromCart(index)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <Label htmlFor="shipping">Shipping Address *</Label>
              <Textarea
                id="shipping"
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                placeholder="Enter your complete shipping address"
                rows={3}
                required
              />
            </div>

            <div>
              <Label htmlFor="notes">Order Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Any special instructions?"
                rows={2}
              />
            </div>

            <div className="pt-4 border-t">
              <div className="flex justify-between text-xl font-bold">
                <span>Total:</span>
                <span>₱{calculateTotal().toFixed(2)}</span>
              </div>
            </div>

            <Button onClick={handleCheckout} className="w-full" size="lg">
              Place Order
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
