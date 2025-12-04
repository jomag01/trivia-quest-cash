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
import { Video, ShoppingBag, X, Plus, Loader2 } from "lucide-react";

interface Product {
  id: string;
  name: string;
  final_price: number;
  image_url: string;
}

interface GoLiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGoLive: (streamId: string) => void;
}

export default function GoLiveDialog({ open, onOpenChange, onGoLive }: GoLiveDialogProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  useEffect(() => {
    if (open && user) {
      fetchUserProducts();
    }
  }, [open, user]);

  const fetchUserProducts = async () => {
    if (!user) return;
    
    // Fetch products the user can showcase (their own or all approved products)
    const { data } = await supabase
      .from('products')
      .select('id, name, final_price, image_url')
      .eq('is_active', true)
      .eq('approval_status', 'approved')
      .limit(50);
    
    if (data) setProducts(data);
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
      const { data: stream, error: streamError } = await supabase
        .from('live_streams')
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim(),
          status: 'live',
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (streamError) throw streamError;

      // Add selected products to the stream
      if (selectedProducts.length > 0) {
        const productInserts = selectedProducts.map((productId, index) => ({
          stream_id: stream.id,
          product_id: productId,
          display_order: index
        }));

        await supabase
          .from('live_stream_products')
          .insert(productInserts);
      }

      toast.success("You're now live!");
      onGoLive(stream.id);
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.message || "Failed to start stream");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setTitle("");
    setDescription("");
    setSelectedProducts([]);
  };

  return (
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
              
              <ScrollArea className="h-64 border rounded-lg p-2">
                {products.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No products available
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {products.map((product) => (
                      <Card 
                        key={product.id}
                        className={`cursor-pointer transition-all ${
                          selectedProducts.includes(product.id) 
                            ? 'ring-2 ring-primary' 
                            : ''
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
                              <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">
                                ✓
                              </div>
                            )}
                          </div>
                          <p className="text-xs mt-1 truncate">{product.name}</p>
                          <p className="text-xs font-bold text-primary">₱{product.final_price}</p>
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
  );
}