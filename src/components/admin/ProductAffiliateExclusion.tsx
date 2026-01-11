import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  Search, 
  Loader2,
  Package,
  Ban,
  CheckCircle,
  Users
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface ProductResult {
  id: string;
  name: string;
  base_price: number;
  image_url: string | null;
  exclude_from_affiliate: boolean;
  seller_id: string | null;
  profiles?: {
    full_name: string | null;
    email: string | null;
  } | null;
}

export default function ProductAffiliateExclusion() {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [results, setResults] = useState<ProductResult[]>([]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a product name to search');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('products')
        .select('id, name, base_price, image_url, exclude_from_affiliate, seller_id, profiles:seller_id(full_name, email)')
        .or(`name.ilike.%${searchQuery}%`)
        .limit(30);

      if (error) throw error;
      
      if (!data || data.length === 0) {
        setResults([]);
        toast.info('No products found');
        return;
      }

      setResults(data);
    } catch (error: any) {
      console.error('Search error:', error);
      toast.error('Failed to search products');
    } finally {
      setLoading(false);
    }
  };

  const toggleAffiliateExclusion = async (product: ProductResult) => {
    setUpdating(product.id);
    try {
      const newValue = !product.exclude_from_affiliate;
      
      const { error } = await (supabase as any)
        .from('products')
        .update({ exclude_from_affiliate: newValue })
        .eq('id', product.id);

      if (error) throw error;

      setResults(prev => 
        prev.map(p => 
          p.id === product.id 
            ? { ...p, exclude_from_affiliate: newValue } 
            : p
        )
      );

      toast.success(
        newValue 
          ? 'Product excluded from all affiliate systems' 
          : 'Product included in affiliate systems'
      );
    } catch (error: any) {
      console.error('Toggle error:', error);
      toast.error('Failed to update product');
    } finally {
      setUpdating(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ban className="h-5 w-5 text-destructive" />
          Product Affiliate Exclusion
        </CardTitle>
        <CardDescription>
          Exclude specific products from Unilevel, Stairstep, Leadership, and ASPN affiliate systems
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Search product by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        {results.length > 0 && (
          <ScrollArea className="h-[400px] rounded-md border p-2">
            <div className="space-y-3">
              {results.map((product) => (
                <Card key={product.id} className="p-3">
                  <div className="flex items-center gap-3">
                    {/* Product Image */}
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                      {product.image_url ? (
                        <img 
                          src={product.image_url} 
                          alt={product.name} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{product.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>₱{product.base_price.toLocaleString()}</span>
                        {product.profiles && (
                          <span className="truncate">
                            by {product.profiles.full_name || product.profiles.email}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Exclusion Status */}
                    <div className="flex items-center gap-2">
                      {product.exclude_from_affiliate ? (
                        <Badge variant="destructive" className="shrink-0 text-xs">
                          <Ban className="h-3 w-3 mr-1" />
                          Excluded
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="shrink-0 text-xs">
                          <Users className="h-3 w-3 mr-1" />
                          Included
                        </Badge>
                      )}
                    </div>

                    {/* Toggle */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch
                        checked={product.exclude_from_affiliate}
                        onCheckedChange={() => toggleAffiliateExclusion(product)}
                        disabled={updating === product.id}
                      />
                      {updating === product.id && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                    </div>
                  </div>

                  {product.exclude_from_affiliate && (
                    <div className="mt-2 p-2 bg-destructive/10 rounded text-xs text-destructive">
                      This product will NOT generate commissions for Unilevel, Stairstep, Leadership, or ASPN
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}

        {results.length === 0 && !loading && (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Search for products to manage affiliate exclusion</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}