import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, Eye, MousePointer, ShoppingCart, TrendingUp, Target, AlertTriangle, Sparkles, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { format, subDays } from 'date-fns';

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

export const SellerAdsDashboard = () => {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState('7');
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch sponsored products
  const { data: sponsoredProducts = [] } = useQuery({
    queryKey: ['seller-sponsored-products', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sponsored_products')
        .select('*')
        .eq('seller_id', user?.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch analytics data
  const { data: analyticsData = [] } = useQuery({
    queryKey: ['seller-ad-analytics', user?.id, dateRange],
    queryFn: async () => {
      const startDate = subDays(new Date(), parseInt(dateRange));
      const { data, error } = await supabase
        .from('ad_daily_analytics')
        .select('*')
        .eq('seller_id', user?.id)
        .gte('analytics_date', startDate.toISOString().split('T')[0])
        .order('analytics_date', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch AI creatives
  const { data: aiCreatives = [] } = useQuery({
    queryKey: ['seller-ai-creatives', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_ad_creatives')
        .select('*')
        .eq('seller_id', user?.id)
        .order('performance_score', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Calculate totals
  const totals = analyticsData.reduce((acc, day) => ({
    impressions: acc.impressions + (day.impressions || 0),
    clicks: acc.clicks + (day.clicks || 0),
    conversions: acc.conversions + (day.conversions || 0),
    spend: acc.spend + (day.spend || 0),
    revenue: acc.revenue + (day.revenue || 0),
  }), { impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0 });

  const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions * 100) : 0;
  const cvr = totals.clicks > 0 ? (totals.conversions / totals.clicks * 100) : 0;
  const roas = totals.spend > 0 ? (totals.revenue / totals.spend) : 0;
  const cpc = totals.clicks > 0 ? (totals.spend / totals.clicks) : 0;

  // Chart data
  const chartData = analyticsData.map(day => ({
    date: format(new Date(day.analytics_date), 'MMM d'),
    impressions: day.impressions || 0,
    clicks: day.clicks || 0,
    conversions: day.conversions || 0,
    spend: day.spend || 0,
    revenue: day.revenue || 0,
    roas: day.spend > 0 ? (day.revenue / day.spend) : 0,
  }));

  // Product performance pie chart
  const productPerformance = sponsoredProducts.slice(0, 5).map((sp: any, i) => ({
    name: `Product ${i + 1}`,
    value: analyticsData.filter((d: any) => d.sponsored_product_id === sp.id)
      .reduce((sum: number, d: any) => sum + (d.impressions || 0), 0),
    color: COLORS[i % COLORS.length],
  }));

  const handleGenerateCreatives = async (sponsoredProductId: string, productId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-ad-creative-generator', {
        body: { sponsored_product_id: sponsoredProductId, product_id: productId },
      });
      if (error) throw error;
      toast.success(`Generated ${data.creatives?.length || 0} ad creatives!`);
    } catch (err) {
      toast.error('Failed to generate creatives');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Ads Performance</h2>
          <p className="text-muted-foreground">Track your sponsored products and optimize performance</p>
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Impressions</span>
            </div>
            <p className="text-2xl font-bold mt-1">{totals.impressions.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MousePointer className="w-4 h-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Clicks</span>
            </div>
            <p className="text-2xl font-bold mt-1">{totals.clicks.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">CTR: {ctr.toFixed(2)}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">Conversions</span>
            </div>
            <p className="text-2xl font-bold mt-1">{totals.conversions}</p>
            <p className="text-xs text-muted-foreground">CVR: {cvr.toFixed(2)}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-orange-500" />
              <span className="text-xs text-muted-foreground">Spend</span>
            </div>
            <p className="text-2xl font-bold mt-1">₱{totals.spend.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">CPC: ₱{cpc.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">Revenue</span>
            </div>
            <p className="text-2xl font-bold mt-1">₱{totals.revenue.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card className={roas >= 3 ? 'border-green-500' : roas >= 1 ? 'border-yellow-500' : 'border-red-500'}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-violet-500" />
              <span className="text-xs text-muted-foreground">ROAS</span>
            </div>
            <p className="text-2xl font-bold mt-1">{roas.toFixed(2)}x</p>
            <p className="text-xs text-muted-foreground">
              {roas >= 3 ? '🎉 Excellent' : roas >= 1 ? '⚠️ Break-even' : '❌ Below target'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="creatives">AI Creatives</TabsTrigger>
          <TabsTrigger value="recommendations">AI Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Line yAxisId="left" type="monotone" dataKey="impressions" stroke="#8b5cf6" name="Impressions" />
                    <Line yAxisId="left" type="monotone" dataKey="clicks" stroke="#06b6d4" name="Clicks" />
                    <Line yAxisId="right" type="monotone" dataKey="roas" stroke="#10b981" name="ROAS" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Revenue vs Spend */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue vs Spend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="spend" fill="#ef4444" name="Spend" />
                      <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Impressions by Product</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={productPerformance}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        label
                      >
                        {productPerformance.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>Sponsored Products</CardTitle>
              <CardDescription>Manage your active ad campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Bid</TableHead>
                    <TableHead>Daily Budget</TableHead>
                    <TableHead>Spent</TableHead>
                    <TableHead>Quality Score</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sponsoredProducts.map((sp: any) => (
                    <TableRow key={sp.id}>
                      <TableCell className="flex items-center gap-2">
                        <span className="truncate max-w-[150px]">Product ID: {sp.product_id?.substring(0, 8)}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={sp.status === 'active' ? 'default' : 'secondary'}>
                          {sp.status}
                        </Badge>
                      </TableCell>
                      <TableCell>₱{(sp.bid_amount || 0).toFixed(2)}</TableCell>
                      <TableCell>₱{(sp.daily_budget || 0).toFixed(2)}</TableCell>
                      <TableCell>₱{(sp.spent_amount || 0).toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={(sp.quality_score || 5) * 10} className="w-16" />
                          <span>{sp.quality_score || 5}/10</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleGenerateCreatives(sp.id, sp.product_id)}
                        >
                          <Sparkles className="w-3 h-3 mr-1" />
                          AI Creatives
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="creatives">
          <Card>
            <CardHeader>
              <CardTitle>AI-Generated Creatives</CardTitle>
              <CardDescription>View and manage AI-generated ad variations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {aiCreatives.map((creative) => (
                  <Card key={creative.id} className={creative.auto_paused ? 'opacity-60' : ''}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant={creative.is_control ? 'default' : 'outline'}>
                          {creative.is_control ? 'Control' : creative.variation_key}
                        </Badge>
                        {creative.auto_paused && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Auto-paused
                          </Badge>
                        )}
                      </div>
                      {creative.primary_image_url && (
                        <img
                          src={creative.primary_image_url}
                          alt=""
                          className="w-full h-24 object-cover rounded mb-2"
                        />
                      )}
                      <h4 className="font-semibold text-sm">{creative.headline}</h4>
                      <p className="text-xs text-muted-foreground">{creative.description}</p>
                      <Button size="sm" className="mt-2 w-full" variant="secondary">
                        {creative.cta_text}
                      </Button>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                        <div>
                          <p className="text-muted-foreground">Impressions</p>
                          <p className="font-semibold">{creative.impressions || 0}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Clicks</p>
                          <p className="font-semibold">{creative.clicks || 0}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">CTR</p>
                          <p className="font-semibold">
                            {creative.impressions > 0
                              ? ((creative.clicks / creative.impressions) * 100).toFixed(1)
                              : 0}%
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                AI Recommendations
              </CardTitle>
              <CardDescription>Smart suggestions to improve your ad performance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {roas < 1 && (
                <div className="flex items-start gap-3 p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                  <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-red-500">Low ROAS Alert</h4>
                    <p className="text-sm text-muted-foreground">
                      Your ROAS is below 1x. Consider reducing bids on underperforming products or pausing them temporarily.
                    </p>
                    <Button size="sm" variant="outline" className="mt-2">
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Auto-optimize Bids
                    </Button>
                  </div>
                </div>
              )}

              {ctr < 0.5 && (
                <div className="flex items-start gap-3 p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                  <Target className="w-5 h-5 text-yellow-500 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-yellow-500">Low Click-Through Rate</h4>
                    <p className="text-sm text-muted-foreground">
                      Your CTR is {ctr.toFixed(2)}%. Try generating new AI creatives with more compelling headlines and CTAs.
                    </p>
                    <Button size="sm" variant="outline" className="mt-2">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Generate New Creatives
                    </Button>
                  </div>
                </div>
              )}

              {totals.impressions > 1000 && cvr < 1 && (
                <div className="flex items-start gap-3 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <ShoppingCart className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-500">Improve Conversion Rate</h4>
                    <p className="text-sm text-muted-foreground">
                      You're getting clicks but few conversions. Consider improving product pages or targeting more relevant audiences.
                    </p>
                  </div>
                </div>
              )}

              {roas >= 3 && (
                <div className="flex items-start gap-3 p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                  <TrendingUp className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-green-500">Excellent Performance!</h4>
                    <p className="text-sm text-muted-foreground">
                      Your ROAS of {roas.toFixed(2)}x is excellent. Consider increasing your budget to scale successful campaigns.
                    </p>
                    <Button size="sm" variant="outline" className="mt-2">
                      Increase Budget
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
