import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Crown, TrendingUp, DollarSign, X, Sparkles, ArrowRight, Calculator, Copy, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  base_price: number;
  promo_price?: number | null;
  promo_active?: boolean | null;
  image_url?: string | null;
  diamond_reward?: number | null;
  referral_commission_diamonds?: number | null;
  seller_id?: string | null;
}

interface CommissionRates {
  unilevel: number;
  stairstep: number;
  leadership: number;
}

interface AdminProductRecommendationPopupProps {
  onProductClick: (product: Product) => void;
}

export default function AdminProductRecommendationPopup({ onProductClick }: AdminProductRecommendationPopupProps) {
  const { user, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [commissionRates, setCommissionRates] = useState<CommissionRates>({
    unilevel: 40,
    stairstep: 35,
    leadership: 25,
  });
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [hasDismissed, setHasDismissed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user && profile && !hasDismissed) {
      // Check if user is a registered affiliate (has referral_code)
      if (profile.referral_code) {
        // Check session storage to avoid showing popup too frequently
        const lastShown = sessionStorage.getItem('admin_product_popup_shown');
        const now = Date.now();
        
        // Show every 30 minutes
        if (!lastShown || (now - parseInt(lastShown)) > 30 * 60 * 1000) {
          // Delay popup appearance
          const timer = setTimeout(() => {
            fetchAdminProducts();
            fetchCommissionRates();
          }, 5000); // Show after 5 seconds

          return () => clearTimeout(timer);
        }
      }
    }
  }, [user, profile, hasDismissed]);

  const fetchAdminProducts = async () => {
    try {
      // Use direct fetch to bypass TypeScript type issues
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      const url = `${supabaseUrl}/rest/v1/products?select=id,name,base_price,promo_price,promo_active,image_url,diamond_reward,referral_commission_diamonds,seller_id&active=eq.true&limit=50`;
      
      const response = await fetch(url, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch products');
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        // Filter for admin products (no seller_id) with referral commission
        const adminProducts = data.filter((p: any) => 
          p.seller_id === null && (p.referral_commission_diamonds || 0) > 0
        );
        
        // Sort by commission and take top 6
        const sorted = adminProducts
          .sort((a: any, b: any) => (b.referral_commission_diamonds || 0) - (a.referral_commission_diamonds || 0))
          .slice(0, 6);
        
        if (sorted.length > 0) {
          setProducts(sorted as Product[]);
          setIsOpen(true);
          sessionStorage.setItem('admin_product_popup_shown', Date.now().toString());
        }
      }
    } catch (error) {
      console.error("Error fetching admin products:", error);
    }
  };

  const fetchCommissionRates = async () => {
    try {
      const { data } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["ai_unilevel_percent", "ai_stairstep_percent", "ai_leadership_percent"]);

      if (data) {
        const rates: CommissionRates = { unilevel: 40, stairstep: 35, leadership: 25 };
        data.forEach(setting => {
          if (setting.key === "ai_unilevel_percent") rates.unilevel = parseFloat(setting.value || "40");
          if (setting.key === "ai_stairstep_percent") rates.stairstep = parseFloat(setting.value || "35");
          if (setting.key === "ai_leadership_percent") rates.leadership = parseFloat(setting.value || "25");
        });
        setCommissionRates(rates);
      }
    } catch (error) {
      console.error("Error fetching commission rates:", error);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setHasDismissed(true);
    setSelectedProduct(null);
  };

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
  };

  const handlePromote = (product: Product) => {
    handleClose();
    onProductClick(product);
  };

  const copyReferralLink = async (product: Product) => {
    if (!profile?.referral_code) return;
    
    const link = `${window.location.origin}/shop?product=${product.id}&ref=${profile.referral_code}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const getEffectivePrice = (product: Product) => {
    return product.promo_active && product.promo_price ? product.promo_price : product.base_price;
  };

  // Calculate sample earnings based on referral commission diamonds and admin rates
  const calculateSampleEarnings = (product: Product) => {
    const commissionDiamonds = product.referral_commission_diamonds || 0;
    
    // Sample: If you refer 10 sales
    const sampleSales = 10;
    const totalCommission = commissionDiamonds * sampleSales;
    
    return {
      unilevel: Math.round(totalCommission * (commissionRates.unilevel / 100)),
      stairstep: Math.round(totalCommission * (commissionRates.stairstep / 100)),
      leadership: Math.round(totalCommission * (commissionRates.leadership / 100)),
      total: totalCommission,
      perSale: commissionDiamonds,
    };
  };

  if (!isOpen || products.length === 0) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto p-0">
        <DialogHeader className="p-4 pb-2 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-gradient-to-br from-amber-500 to-orange-600">
                <Crown className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg">High Commission Products</DialogTitle>
                <DialogDescription className="text-xs">
                  Admin products with higher markup = bigger affiliate earnings!
                </DialogDescription>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleClose} className="h-8 w-8">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="p-4 space-y-4">
          {/* Products Grid */}
          <div className="grid grid-cols-2 gap-3">
            {products.map(product => (
              <Card 
                key={product.id}
                onClick={() => handleProductSelect(product)}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedProduct?.id === product.id 
                    ? 'ring-2 ring-amber-500 border-amber-500' 
                    : 'hover:border-amber-400/50'
                }`}
              >
                <CardContent className="p-2">
                  {product.image_url ? (
                    <img 
                      src={product.image_url} 
                      alt={product.name}
                      className="w-full h-20 object-cover rounded mb-2"
                    />
                  ) : (
                    <div className="w-full h-20 bg-muted rounded mb-2 flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  <p className="text-xs font-medium truncate">{product.name}</p>
                  <p className="text-sm font-bold text-primary">₱{getEffectivePrice(product).toLocaleString()}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      <DollarSign className="w-2.5 h-2.5 mr-0.5" />
                      {product.referral_commission_diamonds || 0} 💎/sale
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Selected Product Earnings Calculator */}
          {selectedProduct && (
            <Card className="border-amber-500/30 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-amber-600" />
                  <p className="font-semibold text-sm">Sample Earnings: {selectedProduct.name}</p>
                </div>

                <p className="text-xs text-muted-foreground">
                  If you refer 10 customers who purchase this product:
                </p>

                {(() => {
                  const earnings = calculateSampleEarnings(selectedProduct);
                  return (
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="p-2 rounded bg-blue-500/10 text-center">
                          <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">Unilevel ({commissionRates.unilevel}%)</p>
                          <p className="text-sm font-bold text-blue-700 dark:text-blue-300">💎 {earnings.unilevel}</p>
                        </div>
                        <div className="p-2 rounded bg-purple-500/10 text-center">
                          <p className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">Stairstep ({commissionRates.stairstep}%)</p>
                          <p className="text-sm font-bold text-purple-700 dark:text-purple-300">💎 {earnings.stairstep}</p>
                        </div>
                        <div className="p-2 rounded bg-orange-500/10 text-center">
                          <p className="text-[10px] text-orange-600 dark:text-orange-400 font-medium">Leadership ({commissionRates.leadership}%)</p>
                          <p className="text-sm font-bold text-orange-700 dark:text-orange-300">💎 {earnings.leadership}</p>
                        </div>
                      </div>
                      
                      <div className="p-2 rounded bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-center">
                        <p className="text-xs text-muted-foreground">Total Pool (10 sales × {earnings.perSale} 💎)</p>
                        <p className="text-lg font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                          💎 {earnings.total} diamonds
                        </p>
                      </div>
                    </div>
                  );
                })()}

                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 text-xs h-8"
                    onClick={() => copyReferralLink(selectedProduct)}
                  >
                    {copied ? <CheckCircle className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                    {copied ? "Copied!" : "Copy Link"}
                  </Button>
                  <Button 
                    size="sm" 
                    className="flex-1 text-xs h-8 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                    onClick={() => handlePromote(selectedProduct)}
                  >
                    View Product <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Why Admin Products */}
          <div className="p-3 rounded-lg bg-muted/50 border text-xs space-y-1">
            <p className="font-semibold flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-green-500" />
              Why promote admin products?
            </p>
            <ul className="text-muted-foreground space-y-0.5 ml-4">
              <li>• Higher markup = bigger commission pool</li>
              <li>• Direct from platform = faster processing</li>
              <li>• Verified quality products</li>
              <li>• Commissions distributed to 7-level network</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
