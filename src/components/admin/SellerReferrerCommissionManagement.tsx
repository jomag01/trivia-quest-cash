import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Save, Users, DollarSign, TrendingUp, Percent } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface CommissionCategory {
  id: string;
  category: string;
  commission_percent: number;
  admin_markup_percent: number;
  unilevel_percent: number;
  stairstep_percent: number;
  leadership_percent: number;
  is_active: boolean;
}

interface EarningsSummary {
  total_earnings: number;
  total_referrers: number;
  total_sellers: number;
  by_category: { [key: string]: number };
}

export default function SellerReferrerCommissionManagement() {
  const [categories, setCategories] = useState<CommissionCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [summary, setSummary] = useState<EarningsSummary>({
    total_earnings: 0,
    total_referrers: 0,
    total_sellers: 0,
    by_category: {}
  });

  useEffect(() => {
    fetchCategories();
    fetchSummary();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("seller_referrer_commissions")
        .select("*")
        .order("category");

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const { data: earnings, error } = await supabase
        .from("seller_referrer_earnings")
        .select("referrer_id, seller_id, referrer_commission, source_category");

      if (error) throw error;

      const uniqueReferrers = new Set((earnings || []).map(e => e.referrer_id));
      const uniqueSellers = new Set((earnings || []).map(e => e.seller_id));
      const totalEarnings = (earnings || []).reduce((sum, e) => sum + (e.referrer_commission || 0), 0);
      
      const byCategory: { [key: string]: number } = {};
      (earnings || []).forEach(e => {
        byCategory[e.source_category] = (byCategory[e.source_category] || 0) + (e.referrer_commission || 0);
      });

      setSummary({
        total_earnings: totalEarnings,
        total_referrers: uniqueReferrers.size,
        total_sellers: uniqueSellers.size,
        by_category: byCategory
      });
    } catch (error) {
      console.error("Error fetching summary:", error);
    }
  };

  const handleUpdateCategory = async (category: CommissionCategory) => {
    setSaving(category.id);
    try {
      const { error } = await supabase
        .from("seller_referrer_commissions")
        .update({
          commission_percent: category.commission_percent,
          admin_markup_percent: category.admin_markup_percent,
          unilevel_percent: category.unilevel_percent,
          stairstep_percent: category.stairstep_percent,
          leadership_percent: category.leadership_percent,
          is_active: category.is_active,
          updated_at: new Date().toISOString()
        })
        .eq("id", category.id);

      if (error) throw error;
      toast.success(`${category.category} commission settings saved!`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(null);
    }
  };

  const updateCategoryField = (id: string, field: string, value: any) => {
    setCategories(cats => 
      cats.map(c => c.id === id ? { ...c, [field]: value } : c)
    );
  };

  const getCategoryLabel = (cat: string) => {
    const labels: { [key: string]: string } = {
      products: "Shop Products",
      auctions: "Auction Sales",
      services: "Booking Services",
      food: "Food Delivery",
      marketplace: "Marketplace Listings"
    };
    return labels[cat] || cat;
  };

  const getCategoryColor = (cat: string) => {
    const colors: { [key: string]: string } = {
      products: "bg-blue-500",
      auctions: "bg-amber-500",
      services: "bg-purple-500",
      food: "bg-green-500",
      marketplace: "bg-pink-500"
    };
    return colors[cat] || "bg-gray-500";
  };

  if (loading) {
    return <div className="flex items-center justify-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <CardHeader className="px-0">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Seller Referrer Commission Settings
        </CardTitle>
        <CardDescription>
          Configure recurring commissions for affiliates who refer sellers. When a referred seller makes a sale, 
          their referrer earns a commission from the admin's markup (not from seller's price).
        </CardDescription>
      </CardHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">₱{summary.total_earnings.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Commissions Paid</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.total_referrers}</p>
                <p className="text-xs text-muted-foreground">Active Referrers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.total_sellers}</p>
                <p className="text-xs text-muted-foreground">Referred Sellers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Percent className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{categories.filter(c => c.is_active).length}</p>
                <p className="text-xs text-muted-foreground">Active Categories</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Commission by Category</CardTitle>
          <CardDescription>
            Set commission rates for each seller category. Commissions are calculated from admin markup.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-center">Admin Markup %</TableHead>
                  <TableHead className="text-center">Referrer Commission %</TableHead>
                  <TableHead className="text-center">Unilevel %</TableHead>
                  <TableHead className="text-center">Stairstep %</TableHead>
                  <TableHead className="text-center">Leadership %</TableHead>
                  <TableHead className="text-center">Active</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map(category => (
                  <TableRow key={category.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getCategoryColor(category.category)}`} />
                        <span className="font-medium">{getCategoryLabel(category.category)}</span>
                      </div>
                      {summary.by_category[category.category] > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          ₱{summary.by_category[category.category].toLocaleString()} earned
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={category.admin_markup_percent}
                        onChange={(e) => updateCategoryField(category.id, 'admin_markup_percent', parseFloat(e.target.value) || 0)}
                        className="w-20 text-center"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={category.commission_percent}
                        onChange={(e) => updateCategoryField(category.id, 'commission_percent', parseFloat(e.target.value) || 0)}
                        className="w-20 text-center"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={category.unilevel_percent}
                        onChange={(e) => updateCategoryField(category.id, 'unilevel_percent', parseFloat(e.target.value) || 0)}
                        className="w-20 text-center"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={category.stairstep_percent}
                        onChange={(e) => updateCategoryField(category.id, 'stairstep_percent', parseFloat(e.target.value) || 0)}
                        className="w-20 text-center"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={category.leadership_percent}
                        onChange={(e) => updateCategoryField(category.id, 'leadership_percent', parseFloat(e.target.value) || 0)}
                        className="w-20 text-center"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={category.is_active}
                        onCheckedChange={(checked) => updateCategoryField(category.id, 'is_active', checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => handleUpdateCategory(category)}
                        disabled={saving === category.id}
                      >
                        {saving === category.id ? "Saving..." : <Save className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <div className="mt-4 p-4 bg-muted/30 rounded-lg">
            <h4 className="font-medium text-sm mb-2">How Commission Distribution Works:</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• <strong>Admin Markup:</strong> Percentage added to seller's wholesale price (taken from sale total)</li>
              <li>• <strong>Referrer Commission:</strong> Direct commission to the affiliate who referred the seller</li>
              <li>• <strong>Unilevel/Stairstep/Leadership:</strong> Distribution of remaining pool to upline network</li>
              <li>• Commissions are distributed from admin markup, NOT from seller's price</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
