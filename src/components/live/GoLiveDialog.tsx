import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Video, ShoppingBag, Loader2, Crown, Check, Wallet, CreditCard } from "lucide-react";
import { useLivePlans } from "@/hooks/useLivePlans";
import RestreamLivePanel from "./RestreamLivePanel";

interface Product {
  id: string;
  name: string;
  final_price: number;
  image_url: string;
  seller_id: string | null;
}

interface GoLiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGoLive: (streamId: string) => void;
}

export default function GoLiveDialog({ open, onOpenChange, onGoLive }: GoLiveDialogProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [planCode, setPlanCode] = useState<"basic" | "pro">("basic");
  const [paying, setPaying] = useState<string | null>(null);
  const [useRestream, setUseRestream] = useState(false);
  const [restreamId, setRestreamId] = useState<string | null>(null);
  const { plans, ent, refresh: refreshPlans, loading: plansLoading } = useLivePlans(open);

  const hasAccess = (code: "basic" | "pro") =>
    (code === "basic" && ent.approved) || (code === "basic" ? ent.basic_passes : ent.pro_passes) > 0;

  const buyWithWallet = async (code: "basic" | "pro") => {
    setPaying(code + "-wallet");
    const { error } = await supabase.rpc("live_buy_pass_wallet", { _plan_code: code });
    setPaying(null);
    if (error) return toast.error(error.message);
    toast.success("Pass purchased — you can go live now");
    await refreshPlans();
  };

  const buyWithPaymongo = async (code: "basic" | "pro") => {
    setPaying(code + "-paymongo");
    const { data, error } = await supabase.functions.invoke("create-payment", {
      body: { metadata: { purchase_type: "live_pass", plan_code: code } },
    });
    setPaying(null);
    if (error || !data?.checkout_url) return toast.error("Could not start payment");
    window.location.href = data.checkout_url;
  };
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [shopProducts, setShopProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [productTab, setProductTab] = useState<'my' | 'shop'>('my');

  useEffect(() => {
    if (open && user) {
      fetchProducts();
    }
  }, [open, user]);

  const fetchProducts = async () => {
    if (!user) return;
    
    // Fetch user's own products (any active product they own)
    const { data: myData, error: myError } = await supabase
      .from('products')
      .select('id, name, final_price, image_url, seller_id')
      .eq('seller_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    console.log("My products:", myData, "Error:", myError);
    if (myData) setMyProducts(myData);
    
    // Fetch all shop products (all active products for sharing)
    const { data: shopData, error: shopError } = await supabase
      .from('products')
      .select('id, name, final_price, image_url, seller_id')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    console.log("Shop products:", shopData, "Error:", shopError);
    
    if (shopData) {
      setShopProducts(shopData);
    }
  };

  const toggleProduct = (productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleGoLive = async () => {
    if (!user || !title.trim()) {
      toast.error("Please enter a stream title");
      return;
    }

    setLoading(true);
    try {
      // Create the live stream
      const { data: streamId, error: streamError } = await supabase.rpc("live_start_session", {
        _plan_code: planCode, _title: title.trim(), _description: description.trim(),
      });
      if (streamError) throw streamError;
      const stream = { id: streamId as string };

      // Add selected products to the stream with streamer_id for commission tracking
      if (selectedProducts.length > 0) {
        const productInserts = selectedProducts.map((productId, index) => ({
          stream_id: stream.id,
          product_id: productId,
          display_order: index,
          basket_number: index + 1,
          streamer_id: user.id // Track who's sharing for commission purposes
        }));

        await supabase
          .from('live_stream_products')
          .insert(productInserts);
      }

      if (useRestream) {
        setRestreamId(stream.id);
      } else {
        toast.success("You're now live!");
        onGoLive(stream.id);
      }
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.message || "Failed to start stream");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(0);
    setTitle("");
    setDescription("");
    setSelectedProducts([]);
    setProductTab('my');
  };

  const displayProducts = productTab === 'my' ? myProducts : shopProducts;

  return (
    <>
    {restreamId && <RestreamLivePanel streamId={restreamId} onClose={() => { setRestreamId(null); setUseRestream(false); }} />}
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5 text-red-500" />
            Go Live
          </DialogTitle>
          <DialogDescription>
            Start streaming and showcase your products
          </DialogDescription>
        </DialogHeader>

        {step === 0 && (
          <div className="space-y-3">
            {plansLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : plans.filter((p) => p.is_active).map((p) => {
              const owned = hasAccess(p.code);
              const passes = p.code === "basic" ? ent.basic_passes : ent.pro_passes;
              const selected = planCode === p.code;
              return (
                <Card key={p.code} className={`cursor-pointer ${selected ? "ring-2 ring-primary" : ""}`} onClick={() => setPlanCode(p.code)}>
                  <CardContent className="space-y-2 p-3">
                    <div className="flex items-center justify-between">
                      <p className="flex items-center gap-1 font-bold">{p.code === "pro" && <Crown className="h-4 w-4 text-primary" />}{p.name}</p>
                      <p className="font-bold text-primary">₱{Number(p.price_per_session).toLocaleString()}<span className="text-xs text-muted-foreground"> / live</span></p>
                    </div>
                    <p className="text-xs text-muted-foreground">{p.description}</p>
                    <ul className="grid grid-cols-2 gap-1 text-xs">
                      {[["chroma_key", "Green screen"], ["auto_bg_removal", "Auto background removal"], ["custom_background", "Custom backgrounds"], ["stickers", "Stickers"]]
                        .filter(([k]) => (p.features as any)?.[k]).map(([k, l]) => <li key={k} className="flex items-center gap-1"><Check className="h-3 w-3 text-primary" />{l}</li>)}
                    </ul>
                    {owned ? (
                      <p className="text-xs font-medium text-primary">
                        {p.code === "basic" && ent.approved ? "Free for approved sellers" : `${passes} unused pass${passes === 1 ? "" : "es"}`}
                      </p>
                    ) : (
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="outline" className="flex-1" disabled={!!paying} onClick={() => buyWithWallet(p.code)}>
                          {paying === p.code + "-wallet" ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Wallet className="mr-1 h-3 w-3" />} Cash Wallet
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1" disabled={!!paying} onClick={() => buyWithPaymongo(p.code)}>
                          {paying === p.code + "-paymongo" ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <CreditCard className="mr-1 h-3 w-3" />} GCash / Card
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
            <Button className="w-full" disabled={!hasAccess(planCode)} onClick={() => setStep(1)}>
              {hasAccess(planCode) ? `Continue with ${planCode === "pro" ? "Pro" : "Basic"}` : "Buy a pass to continue"}
            </Button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Stream Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What's your stream about?"
                maxLength={100}
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell viewers what to expect..."
                rows={3}
              />
            </div>

            <div>
              <Label className="mb-2 block">Where do you want to go live?</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setUseRestream(false)}
                  className={`rounded-lg border p-3 text-left transition-colors ${!useRestream ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-border"}`}
                >
                  <p className="text-sm font-medium">Triviabees only</p>
                  <p className="text-xs text-muted-foreground mt-1">Go live with your phone camera, only inside Triviabees.</p>
                </button>
                <button
                  type="button"
                  onClick={() => setUseRestream(true)}
                  className={`rounded-lg border p-3 text-left transition-colors ${useRestream ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-border"}`}
                >
                  <p className="text-sm font-medium">Cross-platform</p>
                  <p className="text-xs text-muted-foreground mt-1">Stream once in Restream and show on Facebook, YouTube and Triviabees at the same time.</p>
                </button>
              </div>
            </div>

            <Button 
              className="w-full" 
              onClick={() => setStep(2)}
              disabled={!title.trim()}
            >
              Next: Add Products
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <Label className="flex items-center gap-2 mb-3">
                <ShoppingBag className="w-4 h-4" />
                Select Products to Showcase ({selectedProducts.length} selected)
              </Label>
              
              <p className="text-xs text-muted-foreground mb-2">
                Share any product to earn commissions when viewers purchase!
              </p>
              
              {/* Product tabs */}
              <div className="flex gap-2 mb-3">
                <Button
                  size="sm"
                  variant={productTab === 'my' ? 'default' : 'outline'}
                  onClick={() => setProductTab('my')}
                  className="flex-1"
                >
                  My Products ({myProducts.length})
                </Button>
                <Button
                  size="sm"
                  variant={productTab === 'shop' ? 'default' : 'outline'}
                  onClick={() => setProductTab('shop')}
                  className="flex-1"
                >
                  Shop Products ({shopProducts.length})
                </Button>
              </div>
              
              <ScrollArea className="h-80 border rounded-lg p-2">
                {displayProducts.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    {productTab === 'my' 
                      ? "You don't have any approved products yet. Switch to 'Shop Products' to share others' products!" 
                      : "No shop products available"}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {displayProducts.map((product) => (
                      <Card 
                        key={product.id}
                        className={`cursor-pointer transition-all ${
                          selectedProducts.includes(product.id) 
                            ? 'ring-2 ring-primary bg-primary/5' 
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => toggleProduct(product.id)}
                      >
                        <CardContent className="p-2">
                          <div className="relative">
                            <img
                              src={product.image_url || "/placeholder.svg"}
                              alt={product.name}
                              className="w-full h-20 object-cover rounded"
                            />
                            {selectedProducts.includes(product.id) && (
                              <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full min-w-5 h-5 px-1 flex items-center justify-center text-xs font-bold">
                                #{selectedProducts.indexOf(product.id) + 1}
                              </div>
                            )}
                          </div>
                          <p className="text-xs mt-1 truncate font-medium">{product.name}</p>
                          <p className="text-xs font-bold text-primary">₱{product.final_price?.toLocaleString() || 0}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                Back
              </Button>
              <Button 
                className="flex-1 bg-red-500 hover:bg-red-600" 
                onClick={handleGoLive}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Video className="w-4 h-4 mr-2" />
                    Go Live Now
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}
