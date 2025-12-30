import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  PiggyBank,
  AlertTriangle,
  CheckCircle,
  Calendar,
  BarChart3,
  Download,
  FileText
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';

interface DailySummary {
  id: string;
  summary_date: string;
  total_purchases: number;
  total_volume_generated: number;
  total_commissions_paid: number;
  total_ai_cost_deducted: number;
  total_admin_profit: number;
  total_direct_referral_paid: number;
  total_volume_flushed: number;
  total_commission_lost_to_caps: number;
  net_admin_earnings: number;
  total_cycles_completed: number;
  total_users_cycled: number;
}

interface AccountingEntry {
  id: string;
  created_at: string;
  transaction_type: string;
  user_id: string | null;
  amount: number;
  description: string;
  profile?: { full_name: string; email: string } | null;
}

interface FlushEntry {
  id: string;
  created_at: string;
  user_id: string;
  flush_reason: string;
  volume_flushed: number;
  potential_commission: number;
  actual_commission: number;
  commission_lost: number;
  cycles_affected: number;
  profile?: { full_name: string; email: string } | null;
}

export default function BinaryAccountingDashboard() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7days' | '30days' | 'month' | 'all'>('30days');
  const [summaries, setSummaries] = useState<DailySummary[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<AccountingEntry[]>([]);
  const [flushLog, setFlushLog] = useState<FlushEntry[]>([]);
  const [totals, setTotals] = useState({
    totalInflow: 0,
    totalCommissionsPaid: 0,
    totalAiCost: 0,
    totalAdminProfit: 0,
    totalDirectReferral: 0,
    totalFlushed: 0,
    netAdminEarnings: 0,
    totalCycles: 0,
    totalPurchases: 0
  });

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const getDateFilter = () => {
    const now = new Date();
    switch (dateRange) {
      case '7days':
        return subDays(now, 7).toISOString();
      case '30days':
        return subDays(now, 30).toISOString();
      case 'month':
        return startOfMonth(now).toISOString();
      default:
        return null;
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const dateFilter = getDateFilter();

      // Fetch daily summaries
      let summaryQuery = supabase
        .from('binary_daily_summary')
        .select('*')
        .order('summary_date', { ascending: false });

      if (dateFilter) {
        summaryQuery = summaryQuery.gte('summary_date', dateFilter.split('T')[0]);
      }

      const { data: summaryData, error: summaryError } = await summaryQuery.limit(100);

      if (summaryError) throw summaryError;
      setSummaries(summaryData as DailySummary[] || []);

      // Calculate totals from summaries
      if (summaryData && summaryData.length > 0) {
        const totalsCalc = summaryData.reduce((acc, s) => ({
          totalInflow: acc.totalInflow + Number(s.total_volume_generated || 0),
          totalCommissionsPaid: acc.totalCommissionsPaid + Number(s.total_commissions_paid || 0),
          totalAiCost: acc.totalAiCost + Number(s.total_ai_cost_deducted || 0),
          totalAdminProfit: acc.totalAdminProfit + Number(s.total_admin_profit || 0),
          totalDirectReferral: acc.totalDirectReferral + Number(s.total_direct_referral_paid || 0),
          totalFlushed: acc.totalFlushed + Number(s.total_commission_lost_to_caps || 0),
          netAdminEarnings: acc.netAdminEarnings + Number(s.net_admin_earnings || 0),
          totalCycles: acc.totalCycles + Number(s.total_cycles_completed || 0),
          totalPurchases: acc.totalPurchases + Number(s.total_purchases || 0)
        }), {
          totalInflow: 0,
          totalCommissionsPaid: 0,
          totalAiCost: 0,
          totalAdminProfit: 0,
          totalDirectReferral: 0,
          totalFlushed: 0,
          netAdminEarnings: 0,
          totalCycles: 0,
          totalPurchases: 0
        });
        setTotals(totalsCalc);
      }

      // Fetch recent accounting entries
      let accountingQuery = supabase
        .from('binary_accounting_ledger')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (dateFilter) {
        accountingQuery = accountingQuery.gte('created_at', dateFilter);
      }

      const { data: accountingData } = await accountingQuery;

      if (accountingData) {
        // Fetch profiles for user entries
        const userIds = accountingData.filter(a => a.user_id).map(a => a.user_id) as string[];
        const { data: profilesData } = userIds.length 
          ? await supabase.from('profiles').select('id, full_name, email').in('id', userIds)
          : { data: [] };

        const profileMap = new Map<string, { id: string; full_name: string; email: string }>();
        profilesData?.forEach(p => profileMap.set(p.id, p));

        const entriesWithProfiles = accountingData.map(a => ({
          ...a,
          profile: a.user_id ? profileMap.get(a.user_id) : null
        }));

        setRecentTransactions(entriesWithProfiles as AccountingEntry[]);
      }

      // Fetch flush log
      let flushQuery = supabase
        .from('binary_flush_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (dateFilter) {
        flushQuery = flushQuery.gte('created_at', dateFilter);
      }

      const { data: flushData } = await flushQuery;

      if (flushData) {
        const userIds = flushData.map(f => f.user_id) as string[];
        const { data: profilesData } = userIds.length
          ? await supabase.from('profiles').select('id, full_name, email').in('id', userIds)
          : { data: [] };

        const profileMap = new Map<string, { id: string; full_name: string; email: string }>();
        profilesData?.forEach(p => profileMap.set(p.id, p));

        const flushWithProfiles = flushData.map(f => ({
          ...f,
          profile: profileMap.get(f.user_id)
        }));

        setFlushLog(flushWithProfiles as FlushEntry[]);
      }

    } catch (error) {
      console.error('Error fetching accounting data:', error);
      toast.error('Failed to load accounting data');
    } finally {
      setLoading(false);
    }
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'purchase': return 'bg-green-500/10 text-green-700 border-green-500/20';
      case 'commission': return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
      case 'flush': return 'bg-red-500/10 text-red-700 border-red-500/20';
      case 'ai_cost': return 'bg-purple-500/10 text-purple-700 border-purple-500/20';
      case 'admin_profit': return 'bg-amber-500/10 text-amber-700 border-amber-500/20';
      case 'direct_referral': return 'bg-cyan-500/10 text-cyan-700 border-cyan-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'purchase': return 'Purchase';
      case 'commission': return 'Commission';
      case 'flush': return 'Flushed';
      case 'ai_cost': return 'AI Cost';
      case 'admin_profit': return 'Admin Profit';
      case 'direct_referral': return 'Direct Referral';
      default: return type;
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Purchases', 'Volume', 'Commissions', 'AI Cost', 'Admin Profit', 'Flushed', 'Cycles'];
    const rows = summaries.map(s => [
      s.summary_date,
      s.total_purchases,
      s.total_volume_generated,
      s.total_commissions_paid,
      s.total_ai_cost_deducted,
      s.total_admin_profit,
      s.total_commission_lost_to_caps,
      s.total_cycles_completed
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `binary-accounting-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-100px)]">
      <div className="space-y-3 sm:space-y-6 p-0.5 sm:p-1">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg sm:text-2xl font-bold">Binary Accounting</h2>
            <p className="text-muted-foreground text-xs sm:text-sm">Complete financial overview of the binary system</p>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as typeof dateRange)}>
              <SelectTrigger className="w-[120px] sm:w-[150px] h-8 sm:h-10 text-xs sm:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchData} className="h-8 w-8 sm:h-10 sm:w-10">
              <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={exportToCSV} className="h-8 sm:h-10 px-2 sm:px-3 text-xs sm:text-sm">
              <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </div>
        </div>

        {/* Money Flow Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
          <Card className="border-green-500/20 bg-green-500/5">
            <CardContent className="p-2 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <ArrowUpRight className="h-5 w-5 sm:h-8 sm:w-8 text-green-500" />
                <div>
                  <p className="text-sm sm:text-2xl font-bold text-green-700">₱{totals.totalInflow.toLocaleString()}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Total Inflow (Purchases)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-500/20 bg-blue-500/5">
            <CardContent className="p-2 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <ArrowDownRight className="h-5 w-5 sm:h-8 sm:w-8 text-blue-500" />
                <div>
                  <p className="text-sm sm:text-2xl font-bold text-blue-700">₱{totals.totalCommissionsPaid.toLocaleString()}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Commissions Paid</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-500/20 bg-purple-500/5">
            <CardContent className="p-2 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <TrendingDown className="h-5 w-5 sm:h-8 sm:w-8 text-purple-500" />
                <div>
                  <p className="text-sm sm:text-2xl font-bold text-purple-700">₱{totals.totalAiCost.toLocaleString()}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">AI Cost Deducted</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="p-2 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <PiggyBank className="h-5 w-5 sm:h-8 sm:w-8 text-amber-500" />
                <div>
                  <p className="text-sm sm:text-2xl font-bold text-amber-700">₱{totals.netAdminEarnings.toLocaleString()}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Net Admin Earnings</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
          <Card>
            <CardContent className="p-2 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-lg font-semibold">₱{totals.totalDirectReferral.toLocaleString()}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Direct Referral (5%)</p>
                </div>
                <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-2 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-lg font-semibold">₱{totals.totalAdminProfit.toLocaleString()}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Admin Profit (10%)</p>
                </div>
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-500/20">
            <CardContent className="p-2 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-lg font-semibold text-red-600">₱{totals.totalFlushed.toLocaleString()}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Commission Flushed (Cap)</p>
                </div>
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-2 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-lg font-semibold">{totals.totalCycles}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Total Cycles</p>
                </div>
                <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Money Flow Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Money Flow Breakdown
            </CardTitle>
            <CardDescription>
              Where every peso goes in the binary system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {totals.totalInflow > 0 && (
                <>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded bg-green-500" />
                      <span className="font-medium">Total Inflow</span>
                    </div>
                    <span className="font-bold">₱{totals.totalInflow.toLocaleString()} (100%)</span>
                  </div>

                  <Separator />

                  <div className="space-y-2 pl-6">
                    <div className="flex items-center justify-between p-2 rounded bg-purple-500/10">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-purple-500" />
                        <span>AI Cost (30%)</span>
                      </div>
                      <span>₱{totals.totalAiCost.toLocaleString()} ({((totals.totalAiCost / totals.totalInflow) * 100).toFixed(1)}%)</span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded bg-amber-500/10">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-amber-500" />
                        <span>Admin Profit (10%)</span>
                      </div>
                      <span>₱{totals.totalAdminProfit.toLocaleString()} ({((totals.totalAdminProfit / totals.totalInflow) * 100).toFixed(1)}%)</span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded bg-cyan-500/10">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-cyan-500" />
                        <span>Direct Referral (5%)</span>
                      </div>
                      <span>₱{totals.totalDirectReferral.toLocaleString()} ({((totals.totalDirectReferral / totals.totalInflow) * 100).toFixed(1)}%)</span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded bg-blue-500/10">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-blue-500" />
                        <span>Binary Commissions (10%)</span>
                      </div>
                      <span>₱{totals.totalCommissionsPaid.toLocaleString()} ({((totals.totalCommissionsPaid / totals.totalInflow) * 100).toFixed(1)}%)</span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded bg-red-500/10">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-red-500" />
                        <span>Flushed (Cap Exceeded)</span>
                      </div>
                      <span>₱{totals.totalFlushed.toLocaleString()} ({((totals.totalFlushed / totals.totalInflow) * 100).toFixed(1)}%)</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="font-medium">Net Admin Earnings</span>
                    </div>
                    <span className="font-bold text-green-700">
                      ₱{totals.netAdminEarnings.toLocaleString()} 
                      ({((totals.netAdminEarnings / totals.totalInflow) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </>
              )}

              {totals.totalInflow === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No transactions in the selected period</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Daily Summary Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Daily Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Purchases</TableHead>
                  <TableHead className="text-right">Volume</TableHead>
                  <TableHead className="text-right">Commissions</TableHead>
                  <TableHead className="text-right">AI Cost</TableHead>
                  <TableHead className="text-right">Admin</TableHead>
                  <TableHead className="text-right">Flushed</TableHead>
                  <TableHead className="text-right">Cycles</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No summary data available
                    </TableCell>
                  </TableRow>
                ) : (
                  summaries.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{format(new Date(s.summary_date), 'MMM d, yyyy')}</TableCell>
                      <TableCell className="text-right">{s.total_purchases}</TableCell>
                      <TableCell className="text-right">₱{Number(s.total_volume_generated).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-blue-600">₱{Number(s.total_commissions_paid).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-purple-600">₱{Number(s.total_ai_cost_deducted).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-amber-600">₱{Number(s.total_admin_profit).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-red-600">₱{Number(s.total_commission_lost_to_caps).toLocaleString()}</TableCell>
                      <TableCell className="text-right">{s.total_cycles_completed}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Flush Log */}
        <Card className="border-red-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Flush Log (Commission Lost to Daily Cap)
            </CardTitle>
            <CardDescription>
              Commissions that exceeded the daily cap and were retained by the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right">Potential</TableHead>
                  <TableHead className="text-right">Actual Paid</TableHead>
                  <TableHead className="text-right">Lost (Flushed)</TableHead>
                  <TableHead className="text-right">Cycles</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flushLog.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No flush events - all commissions paid in full
                    </TableCell>
                  </TableRow>
                ) : (
                  flushLog.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell>{format(new Date(f.created_at), 'MMM d, HH:mm')}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{f.profile?.full_name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{f.profile?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">₱{Number(f.potential_commission).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-green-600">₱{Number(f.actual_commission).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-red-600 font-medium">₱{Number(f.commission_lost).toLocaleString()}</TableCell>
                      <TableCell className="text-right">{f.cycles_affected}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Recent Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No transactions recorded yet
                    </TableCell>
                  </TableRow>
                ) : (
                  recentTransactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>{format(new Date(t.created_at), 'MMM d, HH:mm')}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getTransactionTypeColor(t.transaction_type)}>
                          {getTransactionTypeLabel(t.transaction_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {t.profile ? (
                          <div>
                            <p className="font-medium">{t.profile.full_name}</p>
                            <p className="text-xs text-muted-foreground">{t.profile.email}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">System</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{t.description}</TableCell>
                      <TableCell className={`text-right font-medium ${
                        t.transaction_type === 'purchase' ? 'text-green-600' :
                        t.transaction_type === 'flush' ? 'text-red-600' :
                        t.transaction_type === 'commission' || t.transaction_type === 'direct_referral' ? 'text-blue-600' :
                        'text-muted-foreground'
                      }`}>
                        ₱{Number(t.amount).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}