import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShoppingCart, Package, Search, Filter, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { ProductDetailDialog } from "@/components/ProductDetailDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Shop = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [checkoutDialog, setCheckoutDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [shippingAddress, setShippingAddress] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [shippingFee, setShippingFee] = useState(50); // Default shipping fee
  const [inCart, setInCart] = useState<Set<string>>(new Set());
  const [inWishlist, setInWishlist] = useState<Set<string>>(new Set());
  const [detailDialog, setDetailDialog] = useState(false);
  const [detailProduct, setDetailProduct] = useState<any>(null);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    if (user) {
      fetchCartStatus();
      fetchWishlistStatus();
    }
  }, [user]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_categories(name)")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Fetch primary images for products without image_url
      const productsWithImages = await Promise.all(
        (data || []).map(async (product) => {
          if (!product.image_url) {
            const { data: images } = await supabase
              .from("product_images")
              .select("image_url")
              .eq("product_id", product.id)
              .eq("is_primary", true)
              .single();
            
            if (images?.image_url) {
              // Convert base64 to storage URL if needed
              if (!images.image_url.startsWith('http')) {
                product.image_url = images.image_url;
              } else {
                product.image_url = images.image_url;
              }
            }
          }
          return product;
        })
      );
      
      setProducts(productsWithImages);
    } catch (error: any) {
      console.error("Error fetching products:", error);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("product_categories")
        .select("*")
        .eq("is_active", true);

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchCartStatus = async () => {
    try {
      const { data, error } = await supabase
        .from("cart")
        .select("product_id")
        .eq("user_id", user?.id);

      if (error) throw error;
      setInCart(new Set(data?.map((item) => item.product_id) || []));
    } catch (error: any) {
      console.error("Error fetching cart status:", error);
    }
  };

  const fetchWishlistStatus = async () => {
    try {
      const { data, error } = await supabase
        .from("wishlist")
        .select("product_id")
        .eq("user_id", user?.id);

      if (error) throw error;
      setInWishlist(new Set(data?.map((item) => item.product_id) || []));
    } catch (error: any) {
      console.error("Error fetching wishlist status:", error);
    }
  };

  const addToCart = async (productId: string) => {
    if (!user) {
      toast.error("Please login to add items to cart");
      navigate("/auth");
      return;
    }

    try {
      const { data: existing } = await supabase
        .from("cart")
        .select("id, quantity")
        .eq("user_id", user.id)
        .eq("product_id", productId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("cart")
          .update({ quantity: existing.quantity + 1 })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("cart").insert({
          user_id: user.id,
          product_id: productId,
          quantity: 1,
        });

        if (error) throw error;
      }

      fetchCartStatus();
      toast.success("Added to cart");
    } catch (error: any) {
      console.error("Error adding to cart:", error);
      toast.error("Failed to add to cart");
    }
  };

  const toggleWishlist = async (productId: string) => {
    if (!user) {
      toast.error("Please login to add items to wishlist");
      navigate("/auth");
      return;
    }

    try {
      if (inWishlist.has(productId)) {
        const { error } = await supabase
          .from("wishlist")
          .delete()
          .eq("user_id", user.id)
          .eq("product_id", productId);

        if (error) throw error;
        toast.success("Removed from wishlist");
      } else {
        const { error } = await supabase.from("wishlist").insert({
          user_id: user.id,
          product_id: productId,
        });

        if (error) throw error;
        toast.success("Added to wishlist");
      }

      fetchWishlistStatus();
    } catch (error: any) {
      console.error("Error toggling wishlist:", error);
      toast.error("Failed to update wishlist");
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesCategory =
      selectedCategory === "all" || product.category_id === selectedCategory;
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleBuyNow = (product: any) => {
    setSelectedProduct(product);
    setQuantity(1);
    setCheckoutDialog(true);
  };

  const handleCheckout = async () => {
    if (!selectedProduct) return;

    if (!shippingAddress || !customerName || !customerEmail) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const price = selectedProduct.promo_active && selectedProduct.promo_price
        ? selectedProduct.promo_price
        : selectedProduct.base_price;
      const subtotal = price * quantity;
      const totalAmount = subtotal + shippingFee;

      // Generate order number
      const { data: orderNumberData, error: orderNumError } = await supabase
        .rpc("generate_order_number");

      if (orderNumError) throw orderNumError;

      // Create order (user_id will be null for guests)
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user?.id || null,
          order_number: orderNumberData,
          total_amount: totalAmount,
          shipping_fee: shippingFee,
          shipping_address: shippingAddress,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          status: "pending",
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order item
      const { error: itemError } = await supabase.from("order_items").insert({
        order_id: order.id,
        product_id: selectedProduct.id,
        quantity: quantity,
        unit_price: price,
        subtotal: subtotal,
      });

      if (itemError) throw itemError;

      toast.success("Order placed successfully! Order #" + orderNumberData);
      setCheckoutDialog(false);
      setSelectedProduct(null);
      setShippingAddress("");
      setCustomerName("");
      setCustomerEmail("");
      setCustomerPhone("");
    } catch (error: any) {
      console.error("Error creating order:", error);
      toast.error("Failed to place order");
    }
  };

  const getEffectivePrice = (product: any) => {
    if (!product) return 0;
    if (product.promo_active && product.promo_price) {
      return product.promo_price;
    }
    return product.base_price;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Package className="w-16 h-16 text-primary animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-4 md:py-8 px-3 md:px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 md:mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-gradient-gold">Shop</h1>
          <p className="text-sm md:text-base text-muted-foreground">Browse our products</p>
        </div>

        {/* Filters */}
        <div className="mb-6 md:mb-8 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 text-sm md:text-base"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="text-sm md:text-base">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {filteredProducts.map((product) => (
            <Card
              key={product.id}
              className="p-4 md:p-6 gradient-accent border-primary/20 shadow-card hover:shadow-gold transition-smooth flex flex-col cursor-pointer"
              onClick={() => {
                setDetailProduct(product);
                setDetailDialog(true);
              }}
            >
              {/* Product Image */}
              <div className="mb-4 aspect-square rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform hover:scale-105"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        parent.innerHTML = '<div class="text-muted-foreground text-sm">No image</div>';
                      }
                    }}
                  />
                ) : (
                  <div className="text-muted-foreground text-sm">No image</div>
                )}
              </div>
              
              <div className="mb-4 flex-1">
                {product.promo_active && product.promo_price && (
                  <Badge className="mb-2 bg-red-500">
                    {product.discount_percentage}% OFF
                  </Badge>
                )}
                <h3 className="text-lg md:text-xl font-bold mb-2 line-clamp-2">{product.name}</h3>
                <p className="text-xs md:text-sm text-muted-foreground mb-4 line-clamp-3">
                  {product.description}
                </p>
                {product.product_categories && (
                  <Badge variant="outline" className="mb-2 text-xs">
                    {product.product_categories.name}
                  </Badge>
                )}
              </div>

              <div className="mb-4">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-xl md:text-2xl font-bold text-primary">
                    ₱{getEffectivePrice(product).toFixed(2)}
                  </span>
                  {product.promo_active && product.promo_price && (
                    <span className="text-xs md:text-sm text-muted-foreground line-through">
                      ₱{product.base_price.toFixed(2)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Stock: {product.stock_quantity || 0}
                </p>
              </div>

              <div className="space-y-2">
                <Button
                  className="w-full text-sm md:text-base"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBuyNow(product);
                  }}
                  disabled={!product.stock_quantity || product.stock_quantity === 0}
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  {product.stock_quantity > 0 ? "Buy Now" : "Out of Stock"}
                </Button>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs md:text-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCart(product.id);
                    }}
                    disabled={!product.stock_quantity || product.stock_quantity === 0 || inCart.has(product.id)}
                  >
                    <ShoppingCart className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                    {inCart.has(product.id) ? "In Cart" : "Add to Cart"}
                  </Button>
                  
                  <Button
                    variant={inWishlist.has(product.id) ? "default" : "outline"}
                    size="sm"
                    className="text-xs md:text-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleWishlist(product.id);
                    }}
                  >
                    <Heart className={`w-3 h-3 md:w-4 md:h-4 mr-1 ${inWishlist.has(product.id) ? "fill-current" : ""}`} />
                    {inWishlist.has(product.id) ? "Saved" : "Wishlist"}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No products found</p>
          </div>
        )}
      </div>

      {/* Checkout Dialog */}
      <Dialog open={checkoutDialog} onOpenChange={setCheckoutDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Complete Your Order</DialogTitle>
            <p className="text-sm text-muted-foreground">Fill in your shipping details to complete the purchase</p>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Product</Label>
              <p className="font-semibold">{selectedProduct?.name}</p>
              <p className="text-sm text-muted-foreground">
                ₱{getEffectivePrice(selectedProduct).toFixed(2)} each
              </p>
            </div>

            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                max={selectedProduct?.stock_quantity || 1}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              />
            </div>

            <div>
              <Label htmlFor="customerName">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="customerEmail">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="customerEmail"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="customerPhone">Phone Number</Label>
              <Input
                id="customerPhone"
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="shippingAddress">
                Shipping Address <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="shippingAddress"
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                rows={3}
                required
              />
            </div>

            <div className="pt-4 border-t space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>₱{(getEffectivePrice(selectedProduct) * quantity).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Shipping Fee:</span>
                <span>₱{shippingFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span className="text-primary">
                  ₱{(getEffectivePrice(selectedProduct) * quantity + shippingFee).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCheckout}>Place Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Detail Dialog */}
      <ProductDetailDialog
        product={detailProduct}
        open={detailDialog}
        onOpenChange={setDetailDialog}
        onBuyNow={() => {
          if (detailProduct) {
            setDetailDialog(false);
            handleBuyNow(detailProduct);
          }
        }}
        onAddToCart={() => {
          if (detailProduct) {
            addToCart(detailProduct.id);
          }
        }}
        onToggleWishlist={() => {
          if (detailProduct) {
            toggleWishlist(detailProduct.id);
          }
        }}
        inCart={detailProduct ? inCart.has(detailProduct.id) : false}
        inWishlist={detailProduct ? inWishlist.has(detailProduct.id) : false}
      />
    </div>
  );
};

export default Shop;
