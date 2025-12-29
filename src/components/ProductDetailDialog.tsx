import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Heart, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import SellerChat from "./shop/SellerChat";
import { supabase } from "@/integrations/supabase/client";
import { ProductReviews } from "./ProductReviews";
import { useInteractionTracking } from "@/hooks/useInteractionTracking";
import { VirtualTryOn } from "./shop/VirtualTryOn";
import ProductAvatarSpeaker from "./shop/ProductAvatarSpeaker";

interface Product {
  id: string;
  name: string;
  description: string;
  base_price: number;
  promo_price?: number;
  discount_percentage?: number;
  promo_active?: boolean;
  image_url?: string;
  stock_quantity?: number;
  diamond_reward?: number;
  seller_id?: string;
  product_categories?: {
    name: string;
  };
}

interface ProductVariant {
  id: string;
  variant_type: 'size' | 'color' | 'weight';
  variant_value: string;
  price_adjustment: number | null;
  stock_quantity: number | null;
  image_url: string | null;
  hex_color: string | null;
}

interface ProductDetailDialogProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBuyNow: () => void;
  onAddToCart: () => void;
  onToggleWishlist: () => void;
  inCart: boolean;
  inWishlist: boolean;
}

export const ProductDetailDialog = ({
  product,
  open,
  onOpenChange,
  onBuyNow,
  onAddToCart,
  onToggleWishlist,
  inCart,
  inWishlist,
}: ProductDetailDialogProps) => {
  const [images, setImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showTryOn, setShowTryOn] = useState(false);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, ProductVariant>>({});
  const [sellerInfo, setSellerInfo] = useState<{ id: string; name: string } | null>(null);
  const { trackInteraction } = useInteractionTracking();

  // Check if product is in a fashion/clothing category
  const isFashionItem = () => {
    const categoryName = product?.product_categories?.name?.toLowerCase() || '';
    const productName = product?.name?.toLowerCase() || '';
    const description = product?.description?.toLowerCase() || '';
    
    const fashionKeywords = [
      'clothing', 'clothes', 'fashion', 'apparel', 'wear',
      'shirt', 'pants', 'dress', 'jacket', 'coat', 'shorts',
      'skirt', 'blouse', 'top', 'bottom', 'jeans', 'sweater',
      'hoodie', 'tshirt', 't-shirt', 'polo', 'suit', 'blazer',
      'outfit', 'garment', 'attire', 'uniform', 'costume'
    ];
    
    return fashionKeywords.some(keyword => 
      categoryName.includes(keyword) || 
      productName.includes(keyword) || 
      description.includes(keyword)
    );
  };

  useEffect(() => {
    if (product && open) {
      fetchProductImages();
      fetchProductVariants();
      fetchSellerInfo();
      setSelectedVariants({});
    }
  }, [product?.id, open]);

  const fetchSellerInfo = async () => {
    if (!product?.id) {
      // Always show chat even without product id
      setSellerInfo({ id: "admin", name: "Store Support" });
      return;
    }
    
    try {
      // Always fetch seller_id from products table to ensure we have it
      const { data: productData } = await supabase
        .from("products")
        .select("seller_id")
        .eq("id", product.id)
        .single();
      
      const sellerId = productData?.seller_id || product?.seller_id;
      
      if (sellerId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("id", sellerId)
          .single();
        
        if (profile) {
          setSellerInfo({ id: profile.id, name: profile.full_name || "Seller" });
          return;
        }
      }
      
      // Fallback to Store Support for all products without seller info
      setSellerInfo({ id: "admin", name: "Store Support" });
    } catch (error) {
      console.error("Error fetching seller info:", error);
      // Fallback to store support on any error
      setSellerInfo({ id: "admin", name: "Store Support" });
    }
  };

  const fetchProductImages = async () => {
    if (!product?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("product_images")
        .select("image_url, is_primary, display_order, image_type")
        .eq("product_id", product.id)
        .order("is_primary", { ascending: false })
        .order("display_order", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const sortedImages = data.sort((a, b) => {
          if (a.is_primary && !b.is_primary) return -1;
          if (!a.is_primary && b.is_primary) return 1;
          
          const typeOrder: any = { static: 0, hover: 1, gallery: 2 };
          const aOrder = typeOrder[a.image_type || 'gallery'] ?? 3;
          const bOrder = typeOrder[b.image_type || 'gallery'] ?? 3;
          
          if (aOrder !== bOrder) return aOrder - bOrder;
          return (a.display_order || 0) - (b.display_order || 0);
        });
        
        setImages(sortedImages.map(img => img.image_url));
      } else if (product.image_url) {
        setImages([product.image_url]);
      } else {
        setImages([]);
      }
      setCurrentImageIndex(0);
    } catch (error) {
      console.error("Error fetching product images:", error);
      if (product.image_url) {
        setImages([product.image_url]);
      } else {
        setImages([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchProductVariants = async () => {
    if (!product?.id) return;

    try {
      const { data, error } = await supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", product.id)
        .order("variant_type")
        .order("variant_value");

      if (error) throw error;
      setVariants((data as ProductVariant[]) || []);
    } catch (error) {
      console.error("Error fetching variants:", error);
    }
  };

  const handleVariantSelect = (variant: ProductVariant) => {
    setSelectedVariants(prev => ({
      ...prev,
      [variant.variant_type]: variant
    }));

    // If this variant has an image, switch to it
    if (variant.image_url) {
      // Add variant image to beginning if not already there
      if (!images.includes(variant.image_url)) {
        setImages(prev => [variant.image_url!, ...prev]);
        setCurrentImageIndex(0);
      } else {
        // Switch to the variant image
        const idx = images.indexOf(variant.image_url);
        setCurrentImageIndex(idx);
      }
    }
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  // Group variants by type
  const groupedVariants = variants.reduce((acc, variant) => {
    const type = variant.variant_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(variant);
    return acc;
  }, {} as Record<string, ProductVariant[]>);

  // Calculate price adjustment from selected variants
  const priceAdjustment = Object.values(selectedVariants).reduce(
    (sum, v) => sum + (v.price_adjustment || 0), 
    0
  );

  if (!product) return null;

  const basePrice = product.promo_active && product.promo_price
    ? product.promo_price
    : product.base_price;
  const effectivePrice = basePrice + priceAdjustment;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{product.name}</DialogTitle>
        </DialogHeader>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* Product Image Gallery */}
          <div className="relative">
            <div className="aspect-square rounded-lg overflow-hidden bg-white flex items-center justify-center border border-border/50">
              {loading ? (
                <div className="text-muted-foreground">Loading images...</div>
              ) : images.length > 0 ? (
                <img
                  src={images[currentImageIndex]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                      // Safe DOM manipulation - use textContent to prevent XSS
                      const errorDiv = document.createElement('div');
                      errorDiv.className = 'text-muted-foreground';
                      errorDiv.textContent = 'Failed to load image';
                      parent.appendChild(errorDiv);
                    }
                  }}
                />
              ) : (
                <div className="text-muted-foreground">No image available</div>
              )}
            </div>

            {/* Image Navigation */}
            {images.length > 1 && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm"
                  onClick={prevImage}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm"
                  onClick={nextImage}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                
                {/* Image Counter */}
                <div className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-xs">
                  {currentImageIndex + 1} / {images.length}
                </div>
              </>
            )}

            {/* Thumbnail Gallery */}
            {images.length > 1 && (
              <div className="flex gap-2 mt-2 overflow-x-auto">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden transition-all ${
                      idx === currentImageIndex
                        ? "border-primary"
                        : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={img}
                      alt={`${product.name} ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              {product.promo_active && product.promo_price && (
                <Badge className="bg-red-500">
                  {product.discount_percentage}% OFF
                </Badge>
              )}
              {product.product_categories && (
                <Badge variant="outline">
                  {product.product_categories.name}
                </Badge>
              )}
              {product.diamond_reward && product.diamond_reward > 0 && (
                <Badge variant="secondary" className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0">
                  💎 Earn {product.diamond_reward} {product.diamond_reward === 1 ? 'Diamond' : 'Diamonds'} on delivery
                </Badge>
              )}
            </div>

            <div>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-primary">
                  ₱{effectivePrice.toFixed(2)}
                </span>
                {(product.promo_active && product.promo_price) || priceAdjustment !== 0 ? (
                  <span className="text-lg text-muted-foreground line-through">
                    ₱{product.base_price.toFixed(2)}
                  </span>
                ) : null}
              </div>
              {priceAdjustment !== 0 && (
                <p className="text-sm text-muted-foreground">
                  Includes variant adjustment: {priceAdjustment > 0 ? '+' : ''}₱{priceAdjustment.toFixed(2)}
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-2">
                Stock: {product.stock_quantity || 0} available
              </p>
            </div>

            {/* Product Variants Selection */}
            {Object.keys(groupedVariants).length > 0 && (
              <div className="space-y-4 border-t pt-4">
                {Object.entries(groupedVariants).map(([type, typeVariants]) => (
                  <div key={type}>
                    <h4 className="text-sm font-medium capitalize mb-2">
                      Select {type}
                      {selectedVariants[type] && (
                        <span className="text-muted-foreground ml-2">
                          : {selectedVariants[type].variant_value}
                        </span>
                      )}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {type === 'color' ? (
                        // Color swatches
                        typeVariants.map((variant) => (
                          <button
                            key={variant.id}
                            onClick={() => handleVariantSelect(variant)}
                            className={`relative w-10 h-10 rounded-full border-2 transition-all ${
                              selectedVariants[type]?.id === variant.id
                                ? 'border-primary ring-2 ring-primary/50'
                                : 'border-border hover:border-primary/50'
                            }`}
                            style={{ 
                              backgroundColor: variant.hex_color || '#gray' 
                            }}
                            title={variant.variant_value}
                          >
                            {variant.image_url && (
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full" title="Has image" />
                            )}
                          </button>
                        ))
                      ) : (
                        // Size/Weight buttons
                        typeVariants.map((variant) => (
                          <Button
                            key={variant.id}
                            type="button"
                            variant={selectedVariants[type]?.id === variant.id ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleVariantSelect(variant)}
                            className="relative"
                          >
                            {variant.variant_value}
                            {variant.price_adjustment !== 0 && variant.price_adjustment !== null && (
                              <span className="text-xs ml-1 opacity-70">
                                ({variant.price_adjustment > 0 ? '+' : ''}₱{variant.price_adjustment})
                              </span>
                            )}
                            {variant.image_url && (
                              <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
                            )}
                          </Button>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* AI Avatar Speaker */}
            <ProductAvatarSpeaker
              product={{
                id: product.id,
                name: product.name,
                description: product.description,
                price: effectivePrice,
                category: product.product_categories?.name
              }}
              onAddToCart={onAddToCart}
              isInCart={inCart}
            />

            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground">{product.description}</p>
            </div>

            <div className="space-y-2 pt-4">
              <Button
                className="w-full bg-red-500 hover:bg-red-600 text-white"
                onClick={() => {
                  trackInteraction('click', 'button', `buy_now_${product.id}`);
                  onBuyNow();
                }}
                disabled={!product.stock_quantity || product.stock_quantity === 0}
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                {product.stock_quantity > 0 ? "Buy Now" : "Out of Stock"}
              </Button>
              
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="border-red-500 text-red-500 hover:bg-red-50"
                  onClick={() => {
                    trackInteraction('click', 'button', `add_cart_${product.id}`);
                    onAddToCart();
                  }}
                  disabled={!product.stock_quantity || product.stock_quantity === 0 || inCart}
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  {inCart ? "In Cart" : "Add to Cart"}
                </Button>
                
                <Button
                  variant={inWishlist ? "default" : "outline"}
                  onClick={() => {
                    trackInteraction('click', 'button', `wishlist_${product.id}`);
                    onToggleWishlist();
                  }}
                >
                  <Heart className={`w-4 h-4 mr-2 ${inWishlist ? "fill-current" : ""}`} />
                  {inWishlist ? "Saved" : "Wishlist"}
                </Button>
              </div>

              {/* Virtual Try-On Button for Fashion Items */}
              {isFashionItem() && (
                <Button
                  variant="outline"
                  className="w-full border-primary text-primary hover:bg-primary/10"
                  onClick={() => setShowTryOn(true)}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Virtual Try-On (AI)
                </Button>
              )}

              {/* Chat to Seller Button */}
              {sellerInfo && (
                <SellerChat
                  productId={product.id}
                  productName={product.name}
                  sellerId={sellerInfo.id}
                  sellerName={sellerInfo.name}
                />
              )}
            </div>
          </div>
        </div>
        
        {/* Product Reviews Section */}
        <div className="mt-6">
          <ProductReviews productId={product.id} sellerId={sellerInfo?.id || null} />
        </div>
      </DialogContent>

      {/* Virtual Try-On Dialog */}
      {product && (
        <VirtualTryOn
          product={{
            id: product.id,
            name: product.name,
            image_url: images[0] || product.image_url,
            description: product.description
          }}
          open={showTryOn}
          onOpenChange={setShowTryOn}
        />
      )}
    </Dialog>
  );
};
