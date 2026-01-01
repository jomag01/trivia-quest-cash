import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShoppingCart, Package, Search, Heart, Store, CalendarCheck, ChevronDown, ChevronUp, UtensilsCrossed, Building, Truck, Star, Gavel, Users } from "lucide-react";
import SupplierApplication from "@/components/shop/SupplierApplication";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { emitCartUpdated } from "@/lib/cartEvents";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ProductDetailDialog } from "@/components/ProductDetailDialog";
import ShippingCalculator from "@/components/ShippingCalculator";
import { ProductShareButton } from "@/components/ProductShareButton";
import { AdSlider } from "@/components/AdSlider";
import { useInteractionTracking } from "@/hooks/useInteractionTracking";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SellerDashboard from "./SellerDashboard";
import ShopAccountOverview from "@/components/ShopAccountOverview";
import CategorySlider from "@/components/CategorySlider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import LiveStreamSlider from "@/components/live/LiveStreamSlider";
import LiveStreamViewer from "@/components/live/LiveStreamViewer";
import FloatingLiveStream from "@/components/live/FloatingLiveStream";
import { CartView } from "@/components/CartView";
import { WishlistView } from "@/components/WishlistView";
import AIProductRecommendations from "@/components/shop/AIProductRecommendations";
import ServicesList from "@/components/booking/ServicesList";
import AIHealthConsultant from "@/components/shop/AIHealthConsultant";
import MarketplaceListings from "@/components/marketplace/MarketplaceListings";
import AuctionProducts from "@/components/shop/AuctionProducts";
import SellerAdsSlider from "@/components/shop/SellerAdsSlider";

const Shop = () => {
  const {
    user
  } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    trackInteraction
  } = useInteractionTracking();
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
  const [shippingFee, setShippingFee] = useState(50);
  const [inCart, setInCart] = useState<Set<string>>(new Set());
  const [inWishlist, setInWishlist] = useState<Set<string>>(new Set());
  const [detailDialog, setDetailDialog] = useState(false);
  const [detailProduct, setDetailProduct] = useState<any>(null);
  const [selectedStream, setSelectedStream] = useState<any>(null);
  const [minimizedStream, setMinimizedStream] = useState<any>(null);
  const [showBookings, setShowBookings] = useState(false);
  
  const handleMinimizeStream = (stream: any) => {
    setMinimizedStream(stream);
    setSelectedStream(null);
  };

  const handleExpandStream = () => {
    setSelectedStream(minimizedStream);
    setMinimizedStream(null);
  };

  const handleCloseMinimized = () => {
    setMinimizedStream(null);
  };
  useEffect(() => {
    fetchProducts();
    fetchCategories();
    if (user) {
      fetchCartStatus();
      fetchWishlistStatus();
    }
    const ref = searchParams.get('ref');
    const productId = searchParams.get('product');
    if (ref && productId) {
      localStorage.setItem('product_referrer', JSON.stringify({
        ref,
        productId
      }));
    }
  }, [user, searchParams]);
  const fetchProducts = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("products").select("*, product_categories(name)").eq("is_active", true).order("created_at", {
        ascending: false
      });
      if (error) throw error;
      
      const productIds = (data || []).map(p => p.id);
      
      // Fetch real sales from delivered orders
      const { data: salesData } = await supabase
        .from("order_items")
        .select("product_id, quantity, orders!inner(status)")
        .in("product_id", productIds)
        .eq("orders.status", "delivered");
      
      // Fetch real reviews/ratings
      const { data: reviewsData } = await supabase
        .from("product_reviews")
        .select("product_id, product_rating")
        .in("product_id", productIds);
      
      // Aggregate sales per product
      const salesMap: Record<string, number> = {};
      salesData?.forEach(item => {
        salesMap[item.product_id] = (salesMap[item.product_id] || 0) + item.quantity;
      });
      
      // Aggregate ratings per product
      const ratingsMap: Record<string, { sum: number; count: number }> = {};
      reviewsData?.forEach(review => {
        if (!ratingsMap[review.product_id]) {
          ratingsMap[review.product_id] = { sum: 0, count: 0 };
        }
        ratingsMap[review.product_id].sum += review.product_rating;
        ratingsMap[review.product_id].count += 1;
      });
      
      const productsWithImages = await Promise.all((data || []).map(async product => {
        const {
          data: images
        } = await supabase.from("product_images").select("image_url, image_type").eq("product_id", product.id).in("image_type", ["static", "hover"]);
        const staticImage = images?.find(img => img.image_type === "static")?.image_url || product.image_url;
        const hoverImage = images?.find(img => img.image_type === "hover")?.image_url;
        
        // Combine boosted + real sales
        const realSales = salesMap[product.id] || 0;
        const boostedSales = Number(product.boosted_sales_count) || 0;
        const totalSales = boostedSales + realSales;
        
        // Combine boosted + real ratings
        const ratingData = ratingsMap[product.id];
        const realAvgRating = ratingData ? ratingData.sum / ratingData.count : 0;
        const realReviewCount = ratingData?.count || 0;
        const boostedRating = Number(product.boosted_rating) || 0;
        
        const displayRating = realReviewCount > 0 
          ? (boostedRating > 0 ? (boostedRating + realAvgRating) / 2 : realAvgRating)
          : (boostedRating > 0 ? boostedRating : 0);
        
        return {
          ...product,
          image_url: staticImage,
          hover_image_url: hoverImage,
          combined_sales: totalSales,
          combined_rating: displayRating,
          review_count: realReviewCount,
          real_sales: realSales
        };
      }));
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
      const {
        data,
        error
      } = await supabase.from("product_categories").select("*").eq("is_active", true);
      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error("Error fetching categories:", error);
    }
  };
  const fetchCartStatus = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("cart").select("product_id").eq("user_id", user?.id);
      if (error) throw error;
      setInCart(new Set(data?.map(item => item.product_id) || []));
    } catch (error: any) {
      console.error("Error fetching cart status:", error);
    }
  };
  const fetchWishlistStatus = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("wishlist").select("product_id").eq("user_id", user?.id);
      if (error) throw error;
      setInWishlist(new Set(data?.map(item => item.product_id) || []));
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
      const {
        data: existing
      } = await supabase.from("cart").select("id, quantity").eq("user_id", user.id).eq("product_id", productId).maybeSingle();
      if (existing) {
        const {
          error
        } = await supabase.from("cart").update({
          quantity: existing.quantity + 1
        }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const {
          error
        } = await supabase.from("cart").insert({
          user_id: user.id,
          product_id: productId,
          quantity: 1
        });
        if (error) throw error;
      }
      await fetchCartStatus();
      emitCartUpdated();
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
        const {
          error
        } = await supabase.from("wishlist").delete().eq("user_id", user.id).eq("product_id", productId);
        if (error) throw error;
        toast.success("Removed from wishlist");
      } else {
        const {
          error
        } = await supabase.from("wishlist").insert({
          user_id: user.id,
          product_id: productId
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
  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === "all" || product.category_id === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || product.description?.toLowerCase().includes(searchQuery.toLowerCase());
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
      const price = selectedProduct.promo_active && selectedProduct.promo_price ? selectedProduct.promo_price : selectedProduct.base_price;
      const subtotal = price * quantity;
      const totalAmount = subtotal + shippingFee;
      const referralData = localStorage.getItem('product_referrer');
      let referrerId: string | null = null;
      if (referralData) {
        const {
          ref,
          productId
        } = JSON.parse(referralData);
        if (productId === selectedProduct.id) {
          referrerId = ref;
        }
      }
      const {
        data: orderNumberData,
        error: orderNumError
      } = await supabase.rpc("generate_order_number");
      if (orderNumError) throw orderNumError;
      const {
        data: order,
        error: orderError
      } = await supabase.from("orders").insert({
        user_id: user?.id || null,
        order_number: orderNumberData,
        total_amount: totalAmount,
        shipping_fee: shippingFee,
        shipping_address: shippingAddress,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        status: "pending",
        product_referrer_id: referrerId
      }).select().single();
      if (orderError) throw orderError;
      const diamondCredits = (selectedProduct.diamond_reward || 0) * quantity;
      const {
        error: itemError
      } = await supabase.from("order_items").insert({
        order_id: order.id,
        product_id: selectedProduct.id,
        quantity: quantity,
        unit_price: price,
        subtotal: subtotal
      });
      if (itemError) throw itemError;
      const {
        error: updateError
      } = await supabase.from("orders").update({
        total_diamond_credits: diamondCredits
      }).eq("id", order.id);
      if (updateError) throw updateError;
      if (referrerId && selectedProduct.referral_commission_diamonds > 0) {
        const {
          error: referralError
        } = await supabase.from("product_referrals").insert({
          product_id: selectedProduct.id,
          referrer_id: referrerId,
          referred_user_id: user?.id || null,
          order_id: order.id,
          commission_diamonds: selectedProduct.referral_commission_diamonds,
          purchased_at: new Date().toISOString()
        });
        if (referralError) {
          console.error("Error creating referral record:", referralError);
        }
        if (user?.id && referrerId) {
          const {
            data: profile
          } = await supabase.from("profiles").select("referred_by").eq("id", user.id).single();
          if (profile && !profile.referred_by) {
            await supabase.from("profiles").update({
              referred_by: referrerId
            }).eq("id", user.id);
            await supabase.from("referrals").insert({
              referrer_id: referrerId,
              referred_id: user.id
            });
          }
        }
        localStorage.removeItem('product_referrer');
      }
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
    return <div className="min-h-screen flex items-center justify-center bg-white">
        <Package className="w-16 h-16 text-black animate-pulse" />
      </div>;
  }
  // Determine active tab from URL params
  const tabParam = searchParams.get('tab');
  const activeTab = tabParam === 'cart' ? 'cart' : tabParam === 'wishlist' ? 'wishlist' : tabParam === 'seller' ? 'seller' : tabParam === 'food' ? 'food' : tabParam === 'marketplace' ? 'marketplace' : tabParam === 'supplier' ? 'supplier' : tabParam === 'auction' ? 'auction' : 'shop';

  const handleTabChange = (value: string) => {
    if (value === 'food') {
      navigate('/food');
      return;
    }
    navigate(`/shop?tab=${value}`);
  };

  return <div className="min-h-screen bg-background pb-20">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        {/* Top Header with Search and Cart */}
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border shadow-sm px-3 py-2">
          <div className="flex items-center gap-2 max-w-7xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
              <Input 
                placeholder="Search products..." 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
                className="pl-9 h-10 text-sm bg-muted/50 border-primary/30 focus:border-primary focus:ring-primary/20" 
              />
              {/* Search Results Dropdown */}
              {searchQuery.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg max-h-80 overflow-y-auto z-50">
                  {filteredProducts.length > 0 ? (
                    filteredProducts.slice(0, 8).map(product => (
                      <div 
                        key={product.id}
                        className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer border-b border-border/50 last:border-b-0 transition-colors"
                        onClick={() => {
                          trackInteraction('view', 'product', product.id, { name: product.name, source: 'search' });
                          setDetailProduct(product);
                          setDetailDialog(true);
                          setSearchQuery("");
                        }}
                      >
                        {product.image_url ? (
                          <img 
                            src={product.image_url} 
                            alt={product.name} 
                            className="w-12 h-12 object-cover rounded-md"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center">
                            <Package className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{product.name}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-primary">
                              ₱{getEffectivePrice(product).toFixed(2)}
                            </span>
                            {product.promo_active && product.promo_price && (
                              <span className="text-xs text-muted-foreground line-through">
                                ₱{product.base_price.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                        {product.promo_active && (
                          <Badge className="text-[10px] bg-destructive text-destructive-foreground">Sale</Badge>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-muted-foreground">
                      <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No products found for "{searchQuery}"</p>
                    </div>
                  )}
                  {filteredProducts.length > 8 && (
                    <div className="p-2 text-center border-t border-border">
                      <p className="text-xs text-muted-foreground">
                        Showing 8 of {filteredProducts.length} results
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => navigate("/dashboard?tab=cart")}>
              <ShoppingCart className="w-5 h-5 text-foreground" />
            </Button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-3">
          {/* Account Overview - Compact */}
          <ShopAccountOverview />

          {/* Navigation Tabs */}
          <TabsList className="w-full grid grid-cols-7 mb-3 mt-2">
            <TabsTrigger value="shop" className="text-xs gap-1">
              <Package className="w-3.5 h-3.5" />
              Shop
            </TabsTrigger>
            <TabsTrigger value="marketplace" className="text-xs gap-1">
              <Building className="w-3.5 h-3.5" />
              Market
            </TabsTrigger>
            <TabsTrigger value="auction" className="text-xs gap-1">
              <Gavel className="w-3.5 h-3.5" />
              Auction
            </TabsTrigger>
            <TabsTrigger value="food" className="text-xs gap-1">
              <UtensilsCrossed className="w-3.5 h-3.5" />
              Food
            </TabsTrigger>
            <TabsTrigger value="seller" className="text-xs gap-1">
              <Store className="w-3.5 h-3.5" />
              Seller
            </TabsTrigger>
            <TabsTrigger value="supplier" className="text-xs gap-1">
              <Truck className="w-3.5 h-3.5" />
              Supplier
            </TabsTrigger>
            <TabsTrigger value="cart" className="text-xs gap-1" onClick={() => navigate('/shop?tab=cart')}>
              <ShoppingCart className="w-3.5 h-3.5" />
              Cart
            </TabsTrigger>
          </TabsList>

          <TabsContent value="shop" className="space-y-3 mt-0">
            {/* Booking Services Panel */}
            <Card className="overflow-hidden border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
              <button 
                onClick={() => setShowBookings(!showBookings)}
                className="w-full p-3 flex items-center justify-between hover:bg-primary/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/20">
                    <CalendarCheck className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-sm">Book Services</h3>
                    <p className="text-xs text-muted-foreground">Browse and book approved services</p>
                  </div>
                </div>
                {showBookings ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
              {showBookings && (
                <div className="p-4 border-t border-primary/10">
                  <ServicesList />
                </div>
              )}
            </Card>

            {/* Promotion Slider */}
            <div className="-mx-3">
              <AdSlider />
            </div>

            {/* Live Streams Slider */}
            <LiveStreamSlider onSelectStream={setSelectedStream} />
            
            {/* Category Slider */}
            <CategorySlider categories={categories} selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />

            {/* Seller Ads Slider */}
            <SellerAdsSlider />

            {/* Income Disclaimer */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
              <p className="text-[10px] text-amber-700 dark:text-amber-300 leading-relaxed">
                <span className="font-semibold">SEC Disclaimer:</span> This is a sales-based referral rewards program. Earnings are not guaranteed and depend on individual effort, team performance, and compliance with company rules.
              </p>
            </div>

            {/* AI Product Recommendations */}
            <AIProductRecommendations 
              currentProductId={detailProduct?.id}
              onProductClick={(product) => {
                trackInteraction('view', 'product', product.id, { name: product.name, source: 'ai_recommendation' });
                setDetailProduct(product);
                setDetailDialog(true);
              }}
            />

            {/* Auction Products */}
            <AuctionProducts />

            {/* Products Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {filteredProducts.map(product => <Card key={product.id} className="overflow-hidden border-gray-100 hover:shadow-md transition-all duration-300 flex flex-col cursor-pointer group bg-white" onClick={() => {
              trackInteraction('view', 'product', product.id, {
                name: product.name
              });
              setDetailProduct(product);
              setDetailDialog(true);
            }}>
                  {/* Product Image */}
                  <div className="aspect-square overflow-hidden bg-gray-50 relative">
                    {product.image_url ? <>
                        <img src={product.image_url} alt={product.name} className={`w-full h-full object-cover transition-all duration-300 ${product.hover_image_url ? 'group-hover:opacity-0' : 'group-hover:scale-105'}`} loading="lazy" />
                        {product.hover_image_url && <img src={product.hover_image_url} alt={`${product.name} hover`} className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-300" loading="lazy" />}
                      </> : <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <Package className="w-8 h-8" />
                      </div>}
                    {product.promo_active && product.promo_price && <Badge className="absolute top-1 right-1 text-[9px] px-1.5 py-0.5 bg-red-500 text-white">
                        Sale
                      </Badge>}
                    {product.diamond_reward > 0 && <Badge className="absolute top-1 left-1 text-[9px] px-1.5 py-0.5 bg-black text-white">
                        💎 {product.diamond_reward}
                      </Badge>}
                  </div>
                  
                  <div className="p-2 flex-1 flex flex-col">
                    <h3 className="text-xs font-medium mb-1 line-clamp-2 leading-tight text-black">{product.name}</h3>

                    {/* Combined sales & ratings display (boosted + real) */}
                    {(product.combined_sales > 0 || product.combined_rating > 0) && (
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                        {product.combined_sales > 0 && (
                          <span className="flex items-center gap-1">
                            <span aria-hidden>📊</span>
                            <span className="font-medium">{product.combined_sales.toLocaleString()} sold</span>
                          </span>
                        )}
                        {product.combined_rating > 0 && (
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3 fill-primary text-primary" />
                            <span className="font-medium">
                              {product.combined_rating.toFixed(1)}
                              {product.review_count > 0 && ` (${product.review_count})`}
                            </span>
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-1 mb-1.5">
                      <span className="text-sm font-bold text-red-500">
                        ₱{getEffectivePrice(product).toFixed(2)}
                      </span>
                      {product.promo_active && product.promo_price && <span className="text-[10px] text-gray-400 line-through">
                          ₱{product.base_price.toFixed(2)}
                        </span>}
                    </div>

                    <div className="mt-auto space-y-1">
                      <Button className="w-full h-7 text-[10px] bg-red-500 hover:bg-red-600 text-white" onClick={e => {
                    e.stopPropagation();
                    trackInteraction('click', 'button', `buy_${product.id}`);
                    handleBuyNow(product);
                  }} disabled={!product.stock_quantity || product.stock_quantity === 0}>
                        <ShoppingCart className="w-3 h-3 mr-1" />
                        {product.stock_quantity > 0 ? "Buy Now" : "Out"}
                      </Button>
                      
                      <div className="grid grid-cols-3 gap-1">
                        <Button variant="outline" size="sm" className="h-6 text-[9px] border-red-500 text-red-500 hover:bg-red-50 px-1" onClick={e => {
                      e.stopPropagation();
                      trackInteraction('click', 'button', `cart_${product.id}`);
                      addToCart(product.id);
                    }} disabled={!product.stock_quantity || product.stock_quantity === 0}>
                          {inCart.has(product.id) ? "✓" : "Cart"}
                        </Button>
                        <Button variant="outline" size="sm" className="h-6 text-[9px] px-1" onClick={e => {
                      e.stopPropagation();
                      toggleWishlist(product.id);
                    }}>
                          <Heart className={`w-2.5 h-2.5 ${inWishlist.has(product.id) ? "fill-red-500 text-red-500" : ""}`} />
                        </Button>
                        <ProductShareButton productId={product.id} productName={product.name} size="sm" className="h-6 text-[9px] px-1" />
                      </div>
                    </div>
                  </div>
                </Card>)}
            </div>

            {filteredProducts.length === 0 && <div className="text-center py-12">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No products found</p>
              </div>}

            {/* Checkout Dialog */}
            <Dialog open={checkoutDialog} onOpenChange={setCheckoutDialog}>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Complete Your Order</DialogTitle>
                  <p className="text-sm text-gray-500">Fill in your shipping details</p>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <Label>Product</Label>
                    <p className="font-semibold text-sm">{selectedProduct?.name}</p>
                    <p className="text-xs text-gray-500">
                      ₱{getEffectivePrice(selectedProduct).toFixed(2)} each
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input id="quantity" type="number" min="1" max={selectedProduct?.stock_quantity || 1} value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 1)} className="h-9" />
                  </div>

                  <div>
                    <Label htmlFor="customerName">
                      Full Name <span className="text-red-500">*</span>
                    </Label>
                    <Input id="customerName" value={customerName} onChange={e => setCustomerName(e.target.value)} className="h-9" required />
                  </div>

                  <div>
                    <Label htmlFor="customerEmail">
                      Email <span className="text-red-500">*</span>
                    </Label>
                    <Input id="customerEmail" type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} className="h-9" required />
                  </div>

                  <div>
                    <Label htmlFor="customerPhone">Phone Number</Label>
                    <Input id="customerPhone" type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="h-9" />
                  </div>

                  <div>
                    <Label htmlFor="shippingAddress">
                      Shipping Address <span className="text-red-500">*</span>
                    </Label>
                    <Textarea id="shippingAddress" value={shippingAddress} onChange={e => setShippingAddress(e.target.value)} rows={2} required />
                  </div>

                  <ShippingCalculator productWeight={selectedProduct?.weight_kg || 1} subtotal={getEffectivePrice(selectedProduct) * quantity} onShippingCalculated={setShippingFee} />

                  <div className="pt-3 border-t space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>₱{(getEffectivePrice(selectedProduct) * quantity).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold border-t pt-2">
                      <span>Total:</span>
                      <span className="text-red-500">
                        ₱{(getEffectivePrice(selectedProduct) * quantity + shippingFee).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setCheckoutDialog(false)} size="sm">
                    Cancel
                  </Button>
                  <Button onClick={handleCheckout} size="sm" className="bg-red-500 hover:bg-red-600">
                    Place Order
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Product Detail Dialog */}
            <ProductDetailDialog product={detailProduct} open={detailDialog} onOpenChange={setDetailDialog} onBuyNow={() => {
            if (detailProduct) {
              setDetailDialog(false);
              handleBuyNow(detailProduct);
            }
          }} onAddToCart={() => {
            if (detailProduct) {
              addToCart(detailProduct.id);
            }
          }} onToggleWishlist={() => {
            if (detailProduct) {
              toggleWishlist(detailProduct.id);
            }
          }} inCart={detailProduct ? inCart.has(detailProduct.id) : false} inWishlist={detailProduct ? inWishlist.has(detailProduct.id) : false} />
          </TabsContent>

          <TabsContent value="marketplace" className="space-y-3 mt-0">
            <MarketplaceListings />
          </TabsContent>

          <TabsContent value="auction" className="space-y-3 mt-0">
            <div className="py-4">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <Gavel className="w-6 h-6 text-primary" />
                  Live Auctions
                </h1>
                <Button onClick={() => navigate("/auction")} className="gap-2">
                  <Gavel className="w-4 h-4" />
                  Go to Auction Hub
                </Button>
              </div>
              <AuctionProducts />
            </div>
          </TabsContent>

          <TabsContent value="seller">
            <SellerDashboard />
          </TabsContent>

          <TabsContent value="supplier">
            <SupplierApplication />
          </TabsContent>

          <TabsContent value="cart">
            <CartView />
          </TabsContent>

          <TabsContent value="wishlist">
            <WishlistView />
          </TabsContent>
        </div>
      </Tabs>

      {/* Live Stream Viewer */}
      {selectedStream && (
        <LiveStreamViewer
          stream={selectedStream}
          onClose={() => setSelectedStream(null)}
          onMinimize={handleMinimizeStream}
        />
      )}

      {/* Floating Live Stream (when minimized) */}
      {minimizedStream && (
        <FloatingLiveStream
          stream={minimizedStream}
          onExpand={handleExpandStream}
          onClose={handleCloseMinimized}
        />
      )}

      {/* Product Assistant */}
      <AIHealthConsultant onAddToCart={addToCart} onCartUpdated={fetchCartStatus} />
    </div>;
};
export default Shop;