import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  Search, 
  Loader2,
  Users,
  Calendar,
  Crown,
  Hexagon,
  CreditCard,
  Clock,
  CheckCircle,
  RefreshCw,
  Filter
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface BeehiveMember {
  id: string;
  user_id: string;
  admin_activated: boolean;
  has_deferred_payment: boolean;
  deferred_amount: number;
  deferred_paid_amount: number;
  deferred_plan_type: string | null;
  created_at: string;
  profile?: {
    full_name: string;
    email: string;
    referral_code: string;
  };
  subscription?: {
    plan_type: string;
    status: string;
    credits_remaining: number;
    expires_at: string;
  } | null;
}

const PLAN_ICONS: Record<string, React.ReactNode> = {
  monthly: <Calendar className="h-3 w-3 text-blue-500" />,
  biannual: <Hexagon className="h-3 w-3 text-purple-500" />,
  yearly: <Crown className="h-3 w-3 text-yellow-500" />
};

const PLAN_LABELS: Record<string, string> = {
  monthly: 'Monthly',
  biannual: '6-Month',
  yearly: 'Yearly'
};

export default function AIhivesMembersList() {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<BeehiveMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'deferred' | 'paid'>('all');
  const [filterPlan, setFilterPlan] = useState<'all' | 'monthly' | 'biannual' | 'yearly'>('all');

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      // Fetch all binary network members
      const { data: binaryMembers, error: binaryError } = await supabase
        .from('binary_network')
        .select('id, user_id, admin_activated, has_deferred_payment, deferred_amount, deferred_paid_amount, deferred_plan_type, created_at')
        .eq('account_number', 1)
        .order('created_at', { ascending: false });

      if (binaryError) throw binaryError;

      const binaryData = binaryMembers as any[] | null;
      
      if (!binaryData || binaryData.length === 0) {
        setMembers([]);
        setLoading(false);
        return;
      }

      const userIds = binaryData.map(m => m.user_id);

      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, referral_code')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Fetch subscriptions
      const { data: subscriptions } = await supabase
        .from('ai_subscriptions')
        .select('user_id, plan_type, status, credits_remaining, expires_at')
        .in('user_id', userIds)
        .eq('status', 'active');

      const subscriptionMap = new Map(subscriptions?.map(s => [s.user_id, s]) || []);

      const enrichedMembers: BeehiveMember[] = binaryData.map(m => ({
        id: m.id,
        user_id: m.user_id,
        admin_activated: m.admin_activated,
        has_deferred_payment: m.has_deferred_payment,
        deferred_amount: m.deferred_amount,
        deferred_paid_amount: m.deferred_paid_amount,
        deferred_plan_type: m.deferred_plan_type,
        created_at: m.created_at,
        profile: profileMap.get(m.user_id) || undefined,
        subscription: subscriptionMap.get(m.user_id) || null
      }));

      setMembers(enrichedMembers);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast.error('Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = members.filter(m => {
    // Search filter
    const matchesSearch = !searchQuery || 
      m.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.profile?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.profile?.referral_code?.toLowerCase().includes(searchQuery.toLowerCase());

    // Type filter
    const matchesType = filterType === 'all' ||
      (filterType === 'deferred' && m.has_deferred_payment) ||
      (filterType === 'paid' && !m.has_deferred_payment);

    // Plan filter
    const planType = m.subscription?.plan_type || m.deferred_plan_type;
    const matchesPlan = filterPlan === 'all' || planType === filterPlan;

    return matchesSearch && matchesType && matchesPlan;
  });

  const getMemberDesignation = (member: BeehiveMember) => {
    if (member.has_deferred_payment) {
      const planLabel = member.deferred_plan_type 
        ? PLAN_LABELS[member.deferred_plan_type] || member.deferred_plan_type
        : 'Pending';
      return { label: `Deferred - ${planLabel}`, variant: 'outline' as const, color: 'text-amber-600 border-amber-400' };
    }
    if (member.subscription) {
      const planLabel = PLAN_LABELS[member.subscription.plan_type] || member.subscription.plan_type;
      return { label: `Paid - ${planLabel}`, variant: 'default' as const, color: 'bg-green-500' };
    }
    if (member.admin_activated) {
      return { label: 'Admin Activated', variant: 'outline' as const, color: 'text-blue-600 border-blue-400' };
    }
    return { label: 'Inactive', variant: 'secondary' as const, color: '' };
  };

  const getMemberStatus = (member: BeehiveMember) => {
    // If admin_activated, they are approved even if deferred
    if (member.admin_activated && !member.has_deferred_payment) {
      return { label: 'Approved', variant: 'default' as const, color: 'bg-blue-500' };
    }
    if (member.subscription?.status === 'active') {
      return { label: 'Active', variant: 'default' as const, color: 'bg-green-500' };
    }
    if (member.has_deferred_payment && member.admin_activated) {
      return { label: 'Deferred (Active)', variant: 'outline' as const, color: 'text-amber-600 border-amber-400' };
    }
    if (member.has_deferred_payment && !member.admin_activated) {
      return { label: 'Pending Approval', variant: 'outline' as const, color: 'text-red-600 border-red-400' };
    }
    return { label: 'Inactive', variant: 'secondary' as const, color: '' };
  };

  const getPlanIcon = (planType: string | null | undefined) => {
    if (!planType) return null;
    return PLAN_ICONS[planType] || null;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-primary" />
              AIhives Members Master List
            </CardTitle>
            <CardDescription className="text-xs">
              All members in the AI Beehives system with subscription details
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchMembers}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or code..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
          <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
            <SelectTrigger className="w-[130px] h-9 text-xs">
              <Filter className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Members</SelectItem>
              <SelectItem value="deferred">Deferred Only</SelectItem>
              <SelectItem value="paid">Paid Only</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPlan} onValueChange={(v: any) => setFilterPlan(v)}>
            <SelectTrigger className="w-[120px] h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Plans</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="biannual">6-Month</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          <div className="p-2 rounded bg-muted/50 text-center">
            <p className="text-lg font-bold">{members.length}</p>
            <p className="text-[10px] text-muted-foreground">Total</p>
          </div>
          <div className="p-2 rounded bg-amber-500/10 text-center">
            <p className="text-lg font-bold text-amber-600">{members.filter(m => m.has_deferred_payment).length}</p>
            <p className="text-[10px] text-muted-foreground">Deferred</p>
          </div>
          <div className="p-2 rounded bg-green-500/10 text-center">
            <p className="text-lg font-bold text-green-600">{members.filter(m => (m.subscription && !m.has_deferred_payment) || (m.admin_activated && !m.has_deferred_payment)).length}</p>
            <p className="text-[10px] text-muted-foreground">Paid</p>
          </div>
          <div className="p-2 rounded bg-red-500/10 text-center">
            <p className="text-lg font-bold text-red-600">{members.filter(m => !m.subscription && !m.has_deferred_payment && !m.admin_activated).length}</p>
            <p className="text-[10px] text-muted-foreground">Inactive</p>
          </div>
        </div>

        {/* Table */}
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Member</TableHead>
                <TableHead className="text-xs">Designation</TableHead>
                <TableHead className="text-xs">Plan</TableHead>
                <TableHead className="text-xs">Credits</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map(member => {
                const designation = getMemberDesignation(member);
                const planType = member.subscription?.plan_type || member.deferred_plan_type;
                
                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{member.profile?.full_name || 'Unknown'}</p>
                        <p className="text-[10px] text-muted-foreground">{member.profile?.email}</p>
                        <p className="text-[10px] text-muted-foreground/70 font-mono">{member.profile?.referral_code}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={designation.variant} className={`text-[10px] ${designation.color}`}>
                        {designation.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {planType && (
                        <div className="flex items-center gap-1">
                          {getPlanIcon(planType)}
                          <span className="text-xs">{PLAN_LABELS[planType] || planType}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {member.subscription ? (
                        <span className="text-xs">{member.subscription.credits_remaining?.toLocaleString()}</span>
                      ) : member.has_deferred_payment ? (
                        <span className="text-xs text-amber-600">
                          Owes: ₱{((member.deferred_amount || 0) - (member.deferred_paid_amount || 0)).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const status = getMemberStatus(member);
                        return (
                          <Badge variant={status.variant} className={`text-[10px] ${status.color}`}>
                            {status.label}
                          </Badge>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(member.created_at), 'MMM d, yyyy')}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          
          {filteredMembers.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No members found</p>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
