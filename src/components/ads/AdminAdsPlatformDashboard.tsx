import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';
import { DollarSign, Users, Eye, ShieldAlert, TrendingUp, Activity, AlertTriangle, CheckCircle, XCircle, Sparkles } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { toast } from 'sonner';

export const AdminAdsPlatformDashboard = () => {
  const [dateRange, setDateRange] = useState('7');
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch platform metrics
  const { data: platformMetrics = [] } = useQuery({
    queryKey: ['admin-platform-metrics', dateRange],
    queryFn: async () => {
      const startDate = subDays(new Date(), parseInt(dateRange));
      const { data, error } = await supabase
        .from('ad_platform_metrics')
        .select('*')
        .gte('metrics_date', startDate.toISOString().split('T')[0])
        .order('metrics_date', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch fraud alerts
  const { data: fraudAlerts = [], refetch: refetchFraud } = useQuery({
    queryKey: ['admin-fraud-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_fraud_detection')
        .select('*')
        .order('detected_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch top advertisers
  const { data: topAdvertisers = [] } = useQuery({
    queryKey: ['admin-top-advertisers', dateRange],
    queryFn: async () => {
      const startDate = subDays(new Date(), parseInt(dateRange));
      const { data, error } = await supabase
        .from('ad_daily_analytics')
        .select('seller_id, spend, revenue')
        .gte('analytics_date', startDate.toISOString().split('T')[0]);
      
      if (error) throw error;

      const sellerMap = new Map<string, { spend: number; revenue: number }>();
      for (const row of data || []) {
        if (!row.seller_id) continue;
        const existing = sellerMap.get(row.seller_id) || { spend: 0, revenue: 0 };
        sellerMap.set(row.seller_id, {
          spend: existing.spend + (row.spend || 0),
          revenue: existing.revenue + (row.revenue || 0),
        });
      }

      const sellerIds = Array.from(sellerMap.keys()).filter(Boolean);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', sellerIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

      return Array.from(sellerMap.entries())
        .map(([sellerId, metrics]) => ({
          seller_id: sellerId,
          name: profileMap.get(sellerId)?.full_name || 'Unknown',
          spend: metrics.spend,
          revenue: metrics.revenue,
          roas: metrics.spend > 0 ? metrics.revenue / metrics.spend : 0,
        }))
        .sort((a, b) => b.spend - a.spend)
        .slice(0, 10);
    },
  });

  // Fetch all sponsored products with quality scores
  const { data: sponsoredProducts = [] } = useQuery({
    queryKey: ['admin-sponsored-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sponsored_products')
        .select('*')
        .order('quality_score', { ascending: true })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate totals
  const totals = platformMetrics.reduce((acc, day) => ({
    impressions: acc.impressions + (day.total_impressions || 0),
    clicks: acc.clicks + (day.total_clicks || 0),
    conversions: acc.conversions + (day.total_conversions || 0),
    revenue: acc.revenue + (day.total_ad_revenue || 0),
    fraudBlocked: acc.fraudBlocked + (day.fraud_blocked_count || 0),
    fraudValue: acc.fraudValue + (day.fraud_blocked_value || 0),
    advertisers: day.active_advertisers || acc.advertisers,
  }), { impressions: 0, clicks: 0, conversions: 0, revenue: 0, fraudBlocked: 0, fraudValue: 0, advertisers: 0 });

  const avgQualityScore = platformMetrics.length > 0
    ? platformMetrics.reduce((sum, m) => sum + (m.avg_quality_score || 0), 0) / platformMetrics.length
    : 0;

  // Chart data
  const chartData = platformMetrics.map(day => ({
    date: format(new Date(day.metrics_date), 'MMM d'),
    revenue: day.total_ad_revenue || 0,
    impressions: day.total_impressions || 0,
    clicks: day.total_clicks || 0,
    conversions: day.total_conversions || 0,
    fraudBlocked: day.fraud_blocked_count || 0,
    qualityScore: day.avg_quality_score || 0,
  }));

  const handleReviewFraud = async (fraudId: string, action: 'dismiss' | 'block') => {
    const { error } = await supabase
      .from('ad_fraud_detection')
      .update({
        reviewed_at: new Date().toISOString(),
        review_action: action,
        is_blocked: action === 'block',
      })
      .eq('id', fraudId);

    if (error) {
      toast.error('Failed to update fraud status');
    } else {
      toast.success(`Fraud ${action === 'block' ? 'blocked' : 'dismissed'}`);
      refetchFraud();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Ads Platform Dashboard</h2>
          <p className="text-muted-foreground">Monitor platform-wide ad performance, fraud, and quality</p>
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
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Ad Revenue</span>
            </div>
            <p className="text-2xl font-bold mt-1">₱{totals.revenue.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Advertisers</span>
            </div>
            <p className="text-2xl font-bold mt-1">{totals.advertisers}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">Impressions</span>
            </div>
            <p className="text-2xl font-bold mt-1">{totals.impressions.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">Conversions</span>
            </div>
            <p className="text-2xl font-bold mt-1">{totals.conversions}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-500" />
              <span className="text-xs text-muted-foreground">Avg Quality</span>
            </div>
            <p className="text-2xl font-bold mt-1">{avgQualityScore.toFixed(1)}/10</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-500" />
              <span className="text-xs text-muted-foreground">Fraud Blocked</span>
            </div>
            <p className="text-2xl font-bold mt-1">{totals.fraudBlocked}</p>
            <p className="text-xs text-muted-foreground">₱{totals.fraudValue.toFixed(2)} saved</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="advertisers">Top Advertisers</TabsTrigger>
          <TabsTrigger value="fraud">Fraud Alerts</TabsTrigger>
          <TabsTrigger value="quality">Quality Control</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Platform Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="#10b981" fillOpacity={0.3} name="Revenue (₱)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Engagement & Fraud */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Engagement Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="clicks" stroke="#8b5cf6" name="Clicks" />
                      <Line type="monotone" dataKey="conversions" stroke="#06b6d4" name="Conversions" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fraud Detection</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="fraudBlocked" fill="#ef4444" name="Fraud Blocked" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="advertisers">
          <Card>
            <CardHeader>
              <CardTitle>Top Advertisers</CardTitle>
              <CardDescription>Ranked by total ad spend</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Advertiser</TableHead>
                    <TableHead>Spend</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>ROAS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topAdvertisers.map((adv, index) => (
                    <TableRow key={adv.seller_id}>
                      <TableCell>
                        <Badge variant={index < 3 ? 'default' : 'secondary'}>
                          #{index + 1}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{adv.name}</TableCell>
                      <TableCell>₱{adv.spend.toFixed(2)}</TableCell>
                      <TableCell>₱{adv.revenue.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={adv.roas >= 3 ? 'default' : adv.roas >= 1 ? 'secondary' : 'destructive'}>
                          {adv.roas.toFixed(2)}x
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fraud">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-500" />
                Fraud Alerts
              </CardTitle>
              <CardDescription>Review and take action on suspicious activity</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Visitor</TableHead>
                    <TableHead>Detected</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fraudAlerts.map((fraud) => (
                    <TableRow key={fraud.id}>
                      <TableCell>
                        <Badge variant="destructive">{fraud.fraud_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className={fraud.fraud_score > 0.7 ? 'text-red-500 font-bold' : ''}>
                          {(fraud.fraud_score * 100).toFixed(0)}%
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {fraud.visitor_id?.substring(0, 12)}...
                      </TableCell>
                      <TableCell className="text-xs">
                        {format(new Date(fraud.detected_at), 'MMM d, HH:mm')}
                      </TableCell>
                      <TableCell>
                        {fraud.is_blocked ? (
                          <Badge variant="destructive">Blocked</Badge>
                        ) : fraud.review_action ? (
                          <Badge variant="secondary">{fraud.review_action}</Badge>
                        ) : (
                          <Badge variant="outline">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {!fraud.reviewed_at && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReviewFraud(fraud.id, 'block')}
                            >
                              <XCircle className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReviewFraud(fraud.id, 'dismiss')}
                            >
                              <CheckCircle className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quality">
          <Card>
            <CardHeader>
              <CardTitle>Ad Quality Scores</CardTitle>
              <CardDescription>Ads with low quality scores may need review</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Quality Score</TableHead>
                    <TableHead>Bid</TableHead>
                    <TableHead>Relevance</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sponsoredProducts.map((sp: any) => (
                    <TableRow key={sp.id} className={(sp.quality_score || 5) < 3 ? 'bg-red-500/5' : ''}>
                      <TableCell>
                        <span className="truncate max-w-[150px]">ID: {sp.product_id?.substring(0, 8)}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={sp.status === 'active' ? 'default' : 'secondary'}>
                          {sp.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {(sp.quality_score || 5) < 3 && <AlertTriangle className="w-4 h-4 text-red-500" />}
                          <span className={(sp.quality_score || 5) < 3 ? 'text-red-500 font-bold' : ''}>
                            {sp.quality_score || 5}/10
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>₱{(sp.bid_amount || 0).toFixed(2)}</TableCell>
                      <TableCell>{sp.relevance_score}/10</TableCell>
                      <TableCell>
                        {sp.quality_score < 3 && (
                          <Button size="sm" variant="destructive">
                            Review
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
