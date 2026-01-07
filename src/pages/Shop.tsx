import { useEffect, useState, useCallback, lazy, Suspense, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShoppingCart, Package, Search, Store, CalendarCheck, ChevronDown, ChevronUp, UtensilsCrossed, Building, Truck, Gavel } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { emitCartUpdated } from "@/lib/cartEvents";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ProductDetailDialog } from "@/components/ProductDetailDialog";
import ShippingCalculator from "@/components/ShippingCalculator";
import { useInteractionTracking } from "@/hooks/useInteractionTracking";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useShopData } from "@/hooks/useShopData";
import { ShopLayoutSkeleton, ProductGridSkeleton, CategorySliderSkeleton, AdSliderSkeleton, QuickTabsSkeleton } from "@/components/shop/ShopSkeletons";
import { ImageSearchButton } from "@/components/shop/ImageSearchButton";
import { useMetaTags } from "@/hooks/useMetaTags";
import SwipeableCategorySlider from "@/components/shop/SwipeableCategorySlider";
import InfiniteProductGrid from "@/components/shop/InfiniteProductGrid";
import QuickTabs, { type QuickTabType } from "@/components/shop/QuickTabs";

// Lazy load heavy components - not needed on initial render
const SupplierApplication = lazy(() => import("@/components/shop/SupplierApplication"));
const AdSlider = lazy(() => import("@/components/AdSlider").then(m => ({ default: m.AdSlider })));
const LiveStreamSlider = lazy(() => import("@/components/live/LiveStreamSlider"));
const LiveStreamViewer = lazy(() => import("@/components/live/LiveStreamViewer"));
const FloatingLiveStream = lazy(() => import("@/components/live/FloatingLiveStream"));
const CartView = lazy(() => import("@/components/CartView").then(m => ({ default: m.CartView })));
const WishlistView = lazy(() => import("@/components/WishlistView").then(m => ({ default: m.WishlistView })));
const AIProductRecommendations = lazy(() => import("@/components/shop/AIProductRecommendations"));
const ServicesList = lazy(() => import("@/components/booking/ServicesList"));
const AIHealthConsultant = lazy(() => import("@/components/shop/AIHealthConsultant"));
const MarketplaceListings = lazy(() => import("@/components/marketplace/MarketplaceListings"));
const AuctionProducts = lazy(() => import("@/components/shop/AuctionProducts"));
const SellerAdsSlider = lazy(() => import("@/components/shop/SellerAdsSlider"));
const CompactSellerAdsSlider = lazy(() => import("@/components/shop/CompactSellerAdsSlider"));
const SellerDashboard = lazy(() => import("./SellerDashboard"));
const ShopAccountOverview = lazy(() => import("@/components/ShopAccountOverview"));
// AdminProductRecommendationPopup removed per user request

const Shop = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { trackInteraction } = useInteractionTracking();
  
  // Use optimized shop data hook with caching and deferred loading
  const { 
    products, 
    categories, 
    loading, 
    enhancementsLoaded,
    inCart, 
    inWishlist, 
    refreshCart, 
    refreshWishlist 
  } = useShopData();

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [quickTab, setQuickTab] = useState<QuickTabType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [checkoutDialog, setCheckoutDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [shippingAddress, setShippingAddress] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [shippingFee, setShippingFee] = useState(50);
  const [detailDialog, setDetailDialog] = useState(false);
  const [detailProduct, setDetailProduct] = useState<any>(null);
  const [selectedStream, setSelectedStream] = useState<any>(null);
  const [minimizedStream, setMinimizedStream] = useState<any>(null);
  const [showBookings, setShowBookings] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Dynamic meta tags for shop
  const productIdFromUrl = searchParams.get('product');
  useMetaTags({
    title: detailProduct ? detailProduct.name : 'Shop - Triviabees Marketplace',
    description: detailProduct 
      ? `${detailProduct.description?.substring(0, 150) || detailProduct.name} - Shop now on Triviabees!`
      : 'Discover amazing products, services, and auctions on Triviabees marketplace. Shop and earn rewards!',
    image: detailProduct?.image_url,
    url: productIdFromUrl 
      ? `${window.location.origin}/shop?product=${productIdFromUrl}`
      : `${window.location.origin}/shop`,
  });
  
  const handleMinimizeStream = useCallback((stream: any) => {
    setMinimizedStream(stream);
    setSelectedStream(null);
  }, []);

  const handleExpandStream = useCallback(() => {
    setSelectedStream(minimizedStream);
    setMinimizedStream(null);
  }, [minimizedStream]);

  const handleCloseMinimized = useCallback(() => {
    setMinimizedStream(null);
  }, []);

  // Handle referral tracking
  useEffect(() => {
    const ref = searchParams.get('ref');
    const productId = searchParams.get('product');
    if (ref && productId) {
      localStorage.setItem('product_referrer', JSON.stringify({ ref, productId }));
    }
  }, [searchParams]);

  const addToCart = useCallback(async (productId: string) => {
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
        const { error } = await supabase
          .from("cart")
          .insert({ user_id: user.id, product_id: productId, quantity: 1 });
        if (error) throw error;
      }
      
      await refreshCart();
      emitCartUpdated();
      toast.success("Added to cart");
    } catch (error: any) {
      console.error("Error adding to cart:", error);
      toast.error("Failed to add to cart");
    }
  }, [user, navigate, refreshCart]);

  const toggleWishlist = useCallback(async (productId: string) => {
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
        const { error } = await supabase
          .from("wishlist")
          .insert({ user_id: user.id, product_id: productId });
        if (error) throw error;
        toast.success("Added to wishlist");
      }
      refreshWishlist();
    } catch (error: any) {
      console.error("Error toggling wishlist:", error);
      toast.error("Failed to update wishlist");
    }
  }, [user, navigate, inWishlist, refreshWishlist]);

  // Filter and sort products - memoized for performance
  const filteredProducts = useMemo(() => {
    let result = products.filter(product => {
      const matchesCategory = selectedCategory === "all" || product.category_id === selectedCategory;
      const matchesSearch = !searchQuery || 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        product.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });

    // Apply quick tab filters
    switch (quickTab) {
      case 'deals':
        result = result.filter(p => p.promo_active && p.promo_price);
        break;
      case 'ai_picks':
        // Tag high-rated or trending products as AI picks
        result = result.filter(p => (p.combined_rating && p.combined_rating >= 4) || (p.combined_sales && p.combined_sales >= 10));
        result = result.map(p => ({ ...p, ai_pick: true }));
        break;
      case 'top_rated':
        result = result.filter(p => p.combined_rating && p.combined_rating >= 4);
        result.sort((a, b) => (b.combined_rating || 0) - (a.combined_rating || 0));
        break;
      case 'trending':
        result = result.filter(p => p.combined_sales && p.combined_sales > 0);
        result.sort((a, b) => (b.combined_sales || 0) - (a.combined_sales || 0));
        result = result.map(p => ({ ...p, trending: true }));
        break;
    }

    return result;
  }, [products, selectedCategory, searchQuery, quickTab]);

  const handleBuyNow = useCallback((product: any, variant?: any) => {
    setSelectedProduct(product);
    setSelectedVariant(variant || null);
    setQuantity(1);
    setCustomerNotes("");
    setCheckoutDialog(true);
  }, []);

  const getEffectivePrice = useCallback((product: any) => {
    if (!product) return 0;
    return product.promo_active && product.promo_price ? product.promo_price : product.base_price;
  }, []);

  const handleProductClick = useCallback((product: any) => {
    trackInteraction('view', 'product', product.id, { name: product.name, source: 'grid' });
    setDetailProduct(product);
    setDetailDialog(true);
    setSearchQuery("");
    setIsSearchFocused(false);
  }, [trackInteraction]);

  const handleCheckout = useCallback(async () => {
    if (!selectedProduct) return;
    if (!user?.id) {
      toast.error("Please login to place an order");
      return;
    }

    const effectiveCustomerEmail = (profile?.email || user.email || customerEmail).trim();

    if (!shippingAddress || !customerName || !effectiveCustomerEmail) {
      toast.error("Please fill in all required fields");
      return;
    }
    try {
      // Calculate price with variant adjustment if applicable
      let basePrice = selectedProduct.promo_active && selectedProduct.promo_price ? selectedProduct.promo_price : selectedProduct.base_price;
      const variantAdjustment = selectedVariant?.price_adjustment || 0;
      const price = basePrice + variantAdjustment;
      const subtotal = price * quantity;
      const totalAmount = subtotal + shippingFee;

      // Get referrer info from multiple sources
      const referralData = localStorage.getItem('product_referrer');
      let referrerId: string | null = null;
      let referrerCode: string | null = null;

      // 1. Check product-specific referrer from localStorage
      if (referralData) {
        try {
          const { ref, productId } = JSON.parse(referralData);
          if (productId === selectedProduct.id) {
            referrerCode = ref;
          }
        } catch (e) {
          console.error("Error parsing product referrer:", e);
        }
      }

      // 2. Check URL params
      const urlParams = new URLSearchParams(window.location.search);
      if (!referrerCode) {
        referrerCode = urlParams.get('ref') || urlParams.get('aff') || null;
      }

      // 3. Check cookies (aff_referral_referrer and aff_affiliate_referrer)
      if (!referrerCode) {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
          cookie = cookie.trim();
          if (cookie.startsWith('aff_referral_referrer=')) {
            referrerCode = decodeURIComponent(cookie.substring('aff_referral_referrer='.length));
            break;
          }
          if (cookie.startsWith('aff_affiliate_referrer=')) {
            referrerCode = decodeURIComponent(cookie.substring('aff_affiliate_referrer='.length));
            break;
          }
        }
      }

      // 4. Check localStorage fallback
      if (!referrerCode) {
        referrerCode = localStorage.getItem('aff_referral_referrer') ||
          localStorage.getItem('aff_affiliate_referrer') || null;
      }

      // Look up referrer ID from referral code
      if (referrerCode) {
        const { data: referrerProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('referral_code', referrerCode)
          .maybeSingle();
        if (referrerProfile) {
          referrerId = referrerProfile.id;
        }
      }

      // 5. DATABASE FALLBACK: If no cookie/URL referrer found, use buyer's referred_by from profile
      // This ensures commissions are ALWAYS attributed even if cookies fail
      if (!referrerId && user?.id) {
        const { data: buyerProfile } = await supabase
          .from('profiles')
          .select('referred_by')
          .eq('id', user.id)
          .maybeSingle();
        if (buyerProfile?.referred_by) {
          referrerId = buyerProfile.referred_by;
          console.log("Using database referred_by as fallback referrer:", referrerId);
        }
      }

      // If we only have a referrerId (e.g. database fallback), also store the referrer_code for admin visibility
      if (referrerId && !referrerCode) {
        const { data: referrerProfileById } = await supabase
          .from('profiles')
          .select('referral_code')
          .eq('id', referrerId)
          .maybeSingle();
        if (referrerProfileById?.referral_code) {
          referrerCode = referrerProfileById.referral_code;
        }
      }

      const diamondCredits = (selectedProduct.diamond_reward || 0) * quantity;

      const { data: orderNumberData, error: orderNumError } = await supabase.rpc("generate_order_number");
      if (orderNumError) throw orderNumError;

      const { data: order, error: orderError } = await supabase.from("orders").insert({
        user_id: user.id,
        order_number: orderNumberData,
        total_amount: totalAmount,
        shipping_fee: shippingFee,
        shipping_address: shippingAddress,
        customer_name: customerName,
        customer_email: effectiveCustomerEmail,
        customer_phone: customerPhone,
        customer_notes: customerNotes || null,
        status: "pending",
        product_referrer_id: referrerId,
        referrer_code: referrerCode,
        total_diamond_credits: diamondCredits,
      }).select().single();
      if (orderError) throw orderError;

      // Create order item with variant info
      const orderItemData: any = {
        order_id: order.id,
        product_id: selectedProduct.id,
        quantity: quantity,
        unit_price: price,
        subtotal: subtotal
      };

      // Add variant info if selected
      if (selectedVariant) {
        orderItemData.variant_id = selectedVariant.id;
        orderItemData.variant_name = `${selectedVariant.variant_type}: ${selectedVariant.variant_value}`;
      }

      const { error: itemError } = await supabase.from("order_items").insert(orderItemData);
      if (itemError) throw itemError;
      
      if (referrerId && selectedProduct.referral_commission_diamonds > 0) {
        const { error: referralError } = await supabase.from("product_referrals").insert({
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
          const { data: profile } = await supabase.from("profiles").select("referred_by").eq("id", user.id).single();
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
      setSelectedVariant(null);
      setShippingAddress("");
      setCustomerName("");
      setCustomerEmail("");
      setCustomerPhone("");
      setCustomerNotes("");
    } catch (error: any) {
      console.error("Error creating order:", error);
      const message =
        error?.message || error?.error_description || error?.details || "Failed to place order";
      toast.error(message);
    }
  }, [selectedProduct, selectedVariant, shippingAddress, customerName, customerEmail, customerPhone, customerNotes, quantity, shippingFee, user]);

  // Show skeleton immediately while loading
  if (loading) {
    return <ShopLayoutSkeleton />;
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

  return (
    <div className="min-h-screen bg-background pb-20 beehive-bg beehive-theme">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        {/* Sticky Search Header - Amazon/Lazada style */}
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border/50 shadow-sm px-3 py-2">
          <div className="flex items-center gap-2 max-w-7xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search products..." 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                className="pl-8 pr-9 h-9 text-sm bg-muted/40 border-border/50 focus:border-primary focus:ring-1 focus:ring-primary/20 rounded-lg" 
              />
              {/* Image Search Button */}
              <div className="absolute right-1 top-1/2 -translate-y-1/2">
                <ImageSearchButton 
                  onSearchResults={(query) => setSearchQuery(query)} 
                  onProductSelect={(product) => {
                    const fullProduct = products.find(p => p.id === product.id);
                    if (fullProduct) {
                      handleProductClick(fullProduct);
                    }
                  }}
                />
              </div>
              
              {/* Search Results Dropdown */}
              {isSearchFocused && searchQuery.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg max-h-72 overflow-y-auto z-50">
                  {filteredProducts.length > 0 ? (
                    filteredProducts.slice(0, 6).map(product => (
                      <div 
                        key={product.id}
                        className="flex items-center gap-2.5 p-2.5 hover:bg-muted/50 cursor-pointer border-b border-border/30 last:border-b-0 transition-colors"
                        onClick={() => handleProductClick(product)}
                      >
                        {product.image_url ? (
                          <img 
                            src={product.image_url} 
                            alt={product.name} 
                            className="w-10 h-10 object-cover rounded"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                            <Package className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{product.name}</p>
                          <p className="text-sm font-bold text-destructive">
                            ₱{getEffectivePrice(product).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-muted-foreground">
                      <p className="text-xs">No products found</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 shrink-0" 
              onClick={() => navigate("/dashboard?tab=cart")}
            >
              <ShoppingCart className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-3">
          {/* Account Overview - Compact */}
          <Suspense fallback={<div className="h-14 bg-muted/30 rounded-lg animate-pulse mt-2" />}>
            <ShopAccountOverview />
          </Suspense>

          {/* Navigation Tabs - Compact */}
          <TabsList className="w-full h-8 grid grid-cols-7 gap-0.5 mt-2 bg-muted/30 p-0.5 rounded-lg">
            <TabsTrigger value="shop" className="text-[9px] sm:text-[10px] px-1 py-1 gap-0.5 h-7 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Package className="w-3 h-3" />
              <span className="hidden sm:inline">Shop</span>
            </TabsTrigger>
            <TabsTrigger value="marketplace" className="text-[9px] sm:text-[10px] px-1 py-1 gap-0.5 h-7 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Building className="w-3 h-3" />
              <span className="hidden sm:inline">Market</span>
            </TabsTrigger>
            <TabsTrigger value="auction" className="text-[9px] sm:text-[10px] px-1 py-1 gap-0.5 h-7 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Gavel className="w-3 h-3" />
              <span className="hidden sm:inline">Auction</span>
            </TabsTrigger>
            <TabsTrigger value="food" className="text-[9px] sm:text-[10px] px-1 py-1 gap-0.5 h-7 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <UtensilsCrossed className="w-3 h-3" />
              <span className="hidden sm:inline">Food</span>
            </TabsTrigger>
            <TabsTrigger value="seller" className="text-[9px] sm:text-[10px] px-1 py-1 gap-0.5 h-7 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Store className="w-3 h-3" />
              <span className="hidden sm:inline">Seller</span>
            </TabsTrigger>
            <TabsTrigger value="supplier" className="text-[9px] sm:text-[10px] px-1 py-1 gap-0.5 h-7 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Truck className="w-3 h-3" />
              <span className="hidden sm:inline">Supplier</span>
            </TabsTrigger>
            <TabsTrigger value="cart" className="text-[9px] sm:text-[10px] px-1 py-1 gap-0.5 h-7 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <ShoppingCart className="w-3 h-3" />
              <span className="hidden sm:inline">Cart</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="shop" className="space-y-2 mt-2">
            {/* Quick Tabs - Deals, AI Picks, etc */}
            <QuickTabs activeTab={quickTab} onTabChange={setQuickTab} />

            {/* Two-Column Sliders: Promotions + Seller Ads */}
            <div className="grid grid-cols-2 gap-2">
              {/* Left: Promotions Slider */}
              <Suspense fallback={<AdSliderSkeleton />}>
                <AdSlider />
              </Suspense>
              
              {/* Right: Paid Seller Ads Slider */}
              <Suspense fallback={<AdSliderSkeleton />}>
                <CompactSellerAdsSlider placementKey="shop_top" />
              </Suspense>
            </div>

            {/* Swipeable Category Slider - Amazon/Lazada style */}
            {categories.length > 0 ? (
              <SwipeableCategorySlider 
                categories={categories} 
                selectedCategory={selectedCategory} 
                onSelectCategory={setSelectedCategory} 
              />
            ) : (
              <CategorySliderSkeleton />
            )}

            {/* Income Disclaimer - Minimal */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded px-2 py-1">
              <p className="text-[8px] text-amber-700 dark:text-amber-300 leading-tight">
                <span className="font-semibold">SEC:</span> Sales-based referral rewards. Earnings not guaranteed.
              </p>
            </div>

            {/* AI Product Recommendations - Compact */}
            <Suspense fallback={<ProductGridSkeleton count={4} />}>
              <AIProductRecommendations 
                currentProductId={detailProduct?.id}
                onProductClick={handleProductClick}
              />
            </Suspense>

            {/* Admin Product Recommendation Popup removed */}

            {/* Booking Services - Collapsible */}
            <button 
              onClick={() => setShowBookings(!showBookings)}
              className="w-full flex items-center justify-between p-2 rounded-lg bg-primary/5 border border-primary/10 hover:bg-primary/10 transition-colors"
            >
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium">Book Services</span>
              </div>
              {showBookings ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            {showBookings && (
              <div className="p-2 bg-card rounded-lg border border-border/50">
                <Suspense fallback={<div className="h-24 animate-pulse bg-muted rounded" />}>
                  <ServicesList />
                </Suspense>
              </div>
            )}

            {/* Main Product Grid - Infinite Scroll */}
            <div className="pt-1">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-foreground">
                  {quickTab === 'all' ? 'All Products' : 
                   quickTab === 'deals' ? '🔥 Hot Deals' :
                   quickTab === 'ai_picks' ? '🧠 AI Picks for You' :
                   quickTab === 'top_rated' ? '⭐ Top Rated' :
                   '📈 Trending Now'}
                </h2>
                <span className="text-[10px] text-muted-foreground">
                  {filteredProducts.length} items
                </span>
              </div>
              
              <InfiniteProductGrid
                products={filteredProducts}
                inCart={inCart}
                inWishlist={inWishlist}
                onProductClick={handleProductClick}
                onAddToCart={addToCart}
                onToggleWishlist={toggleWishlist}
                showRatings={enhancementsLoaded}
                batchSize={8}
              />
            </div>

            {/* Seller Ads Slider */}
            <Suspense fallback={null}>
              <SellerAdsSlider />
            </Suspense>

            {/* Live Streams Slider */}
            <Suspense fallback={null}>
              <LiveStreamSlider onSelectStream={setSelectedStream} />
            </Suspense>

            {/* Auction Products */}
            <Suspense fallback={null}>
              <AuctionProducts />
            </Suspense>

            {/* Checkout Dialog - Compact for Mobile */}
            <Dialog open={checkoutDialog} onOpenChange={setCheckoutDialog}>
              <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto p-4">
                <DialogHeader className="pb-2">
                  <DialogTitle className="text-sm">Complete Order</DialogTitle>
                </DialogHeader>

                <div className="space-y-2">
                  {/* Product Summary - Compact */}
                  <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                    {selectedProduct?.image_url && (
                      <img src={selectedProduct.image_url} alt="" className="w-10 h-10 object-cover rounded" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs truncate">{selectedProduct?.name}</p>
                      {selectedVariant && (
                        <p className="text-[10px] text-muted-foreground">
                          {selectedVariant.variant_type}: {selectedVariant.variant_value}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-destructive font-bold">
                        ₱{((getEffectivePrice(selectedProduct) + (selectedVariant?.price_adjustment || 0))).toFixed(0)}
                      </p>
                      <div className="flex items-center gap-1">
                        <Label className="text-[10px]">Qty:</Label>
                        <Input 
                          type="number" 
                          min="1" 
                          max={selectedVariant?.stock_quantity || selectedProduct?.stock_quantity || 1} 
                          value={quantity} 
                          onChange={e => setQuantity(parseInt(e.target.value) || 1)} 
                          className="h-6 w-12 text-xs px-1" 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Customer Info - Compact Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="customerName" className="text-[10px]">Name *</Label>
                      <Input id="customerName" value={customerName} onChange={e => setCustomerName(e.target.value)} className="h-7 text-xs" required />
                    </div>
                    <div>
                      <Label htmlFor="customerPhone" className="text-[10px]">Phone</Label>
                      <Input id="customerPhone" type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="h-7 text-xs" />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="customerEmail" className="text-[10px]">Email *</Label>
                    <Input id="customerEmail" type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} className="h-7 text-xs" required />
                  </div>

                  <div>
                    <Label htmlFor="shippingAddress" className="text-[10px]">Address *</Label>
                    <Textarea id="shippingAddress" value={shippingAddress} onChange={e => setShippingAddress(e.target.value)} rows={2} className="text-xs min-h-[50px]" required />
                  </div>

                  <div>
                    <Label htmlFor="customerNotes" className="text-[10px]">Notes (Optional)</Label>
                    <Textarea 
                      id="customerNotes" 
                      value={customerNotes} 
                      onChange={e => setCustomerNotes(e.target.value)} 
                      rows={1} 
                      className="text-xs min-h-[32px]" 
                      placeholder="Special instructions..."
                    />
                  </div>

                  {/* Compact Shipping Calculator */}
                  <ShippingCalculator 
                    productWeight={selectedProduct?.weight_kg || 1} 
                    subtotal={(getEffectivePrice(selectedProduct) + (selectedVariant?.price_adjustment || 0)) * quantity} 
                    onShippingCalculated={setShippingFee} 
                  />

                  {/* Order Summary - Sticky Footer Style */}
                  <div className="pt-2 border-t bg-background sticky bottom-0">
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span>₱{((getEffectivePrice(selectedProduct) + (selectedVariant?.price_adjustment || 0)) * quantity).toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs mb-2">
                      <span className="text-muted-foreground">Shipping:</span>
                      <span>₱{shippingFee.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-sm">Total:</span>
                      <span className="text-destructive text-base">
                        ₱{((getEffectivePrice(selectedProduct) + (selectedVariant?.price_adjustment || 0)) * quantity + shippingFee).toFixed(0)}
                      </span>
                    </div>
                    
                    <div className="flex gap-2 mt-2">
                      <Button variant="outline" onClick={() => setCheckoutDialog(false)} size="sm" className="flex-1 h-9 text-xs">
                        Cancel
                      </Button>
                      <Button onClick={handleCheckout} size="sm" className="flex-1 h-9 text-xs bg-destructive hover:bg-destructive/90">
                        Place Order
                      </Button>
                    </div>
                  </div>
                </div>
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
          </TabsContent>

          <TabsContent value="marketplace" className="mt-2">
            <Suspense fallback={<ProductGridSkeleton count={8} />}>
              <MarketplaceListings />
            </Suspense>
          </TabsContent>

          <TabsContent value="auction" className="mt-2">
            <Suspense fallback={<ProductGridSkeleton count={4} />}>
              <AuctionProducts />
            </Suspense>
          </TabsContent>

          <TabsContent value="seller" className="mt-2">
            <Suspense fallback={<div className="h-64 animate-pulse bg-muted rounded-lg" />}>
              <SellerDashboard />
            </Suspense>
          </TabsContent>

          <TabsContent value="supplier" className="mt-2">
            <Suspense fallback={<div className="h-64 animate-pulse bg-muted rounded-lg" />}>
              <SupplierApplication />
            </Suspense>
          </TabsContent>

          <TabsContent value="cart" className="mt-2">
            <Suspense fallback={<div className="h-64 animate-pulse bg-muted rounded-lg" />}>
              <CartView />
            </Suspense>
          </TabsContent>

          <TabsContent value="wishlist" className="mt-2">
            <Suspense fallback={<div className="h-64 animate-pulse bg-muted rounded-lg" />}>
              <WishlistView />
            </Suspense>
          </TabsContent>
        </div>
      </Tabs>

      {/* Live Stream Viewer */}
      {selectedStream && (
        <Suspense fallback={null}>
          <LiveStreamViewer
            stream={selectedStream}
            onClose={() => setSelectedStream(null)}
            onMinimize={handleMinimizeStream}
          />
        </Suspense>
      )}

      {/* Floating Live Stream (when minimized) */}
      {minimizedStream && (
        <Suspense fallback={null}>
          <FloatingLiveStream
            stream={minimizedStream}
            onExpand={handleExpandStream}
            onClose={handleCloseMinimized}
          />
        </Suspense>
      )}

      {/* Product Assistant */}
      <Suspense fallback={null}>
        <AIHealthConsultant onAddToCart={addToCart} onCartUpdated={refreshCart} />
      </Suspense>
    </div>
  );
};

export default Shop;
