import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Check, X, Eye, Wallet, Clock, CheckCircle, XCircle, Search } from 'lucide-react';
import { format } from 'date-fns';

interface DepositRequest {
  id: string;
  user_id: string;
  amount: number;
  payment_method: string;
  payment_reference: string;
  payment_proof_url: string;
  sender_name: string;
  sender_account: string;
  status: string;
  admin_notes: string;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
    username: string;
  };
}

export default function CashDepositManagement() {
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<DepositRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['admin-deposit-requests', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('cash_deposit_requests')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch profiles separately
      const userIds = [...new Set(data?.map(d => d.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, username')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      return (data || []).map(d => ({
        ...d,
        profiles: profileMap.get(d.user_id)
      })) as DepositRequest[];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (request: DepositRequest) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('approve_cash_deposit', {
        p_request_id: request.id,
        p_admin_id: session.session.user.id
      });

      if (error) throw error;

      // Update admin notes
      if (adminNotes) {
        await supabase
          .from('cash_deposit_requests')
          .update({ admin_notes: adminNotes })
          .eq('id', request.id);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-deposit-requests'] });
      toast.success('Deposit approved and credited to user');
      setSelectedRequest(null);
      setAdminNotes('');
    },
    onError: () => toast.error('Failed to approve deposit'),
  });

  const rejectMutation = useMutation({
    mutationFn: async (request: DepositRequest) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('cash_deposit_requests')
        .update({
          status: 'rejected',
          processed_by: session.session.user.id,
          processed_at: new Date().toISOString(),
          admin_notes: adminNotes,
        })
        .eq('id', request.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-deposit-requests'] });
      toast.success('Deposit request rejected');
      setSelectedRequest(null);
      setAdminNotes('');
    },
    onError: () => toast.error('Failed to reject request'),
  });

  const filteredRequests = requests.filter((r) =>
    !searchTerm ||
    r.sender_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.payment_reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  const getPaymentMethodBadge = (method: string) => {
    switch (method) {
      case 'bank':
        return <Badge className="bg-emerald-500">Bank Transfer</Badge>;
      case 'ewallet':
        return <Badge className="bg-orange-500">E-Wallet</Badge>;
      case 'qr':
        return <Badge className="bg-purple-500">QR Code</Badge>;
      default:
        return <Badge variant="secondary">{method}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 p-6 text-white">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
              <Wallet className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold">Cash Deposit Management</h2>
            {pendingCount > 0 && (
              <Badge className="bg-yellow-500 text-yellow-900">{pendingCount} Pending</Badge>
            )}
          </div>
          <p className="text-white/80 text-sm">Review and approve user cash deposit requests</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or reference..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            <TabsTrigger value="pending" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-white">
              Pending
            </TabsTrigger>
            <TabsTrigger value="approved" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
              Approved
            </TabsTrigger>
            <TabsTrigger value="rejected" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">
              Rejected
            </TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Requests List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      ) : filteredRequests.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Wallet className="w-12 h-12 mb-4 opacity-50" />
            <p>No deposit requests found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((request) => (
            <Card 
              key={request.id} 
              className={`hover:shadow-md transition-shadow cursor-pointer ${
                request.status === 'pending' ? 'border-yellow-200 bg-yellow-50/30 dark:bg-yellow-900/10' : ''
              }`}
              onClick={() => setSelectedRequest(request)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold truncate">{request.profiles?.full_name || request.sender_name}</h4>
                      {getStatusBadge(request.status)}
                      {getPaymentMethodBadge(request.payment_method)}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {request.profiles?.email} • Ref: {request.payment_reference}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(request.created_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">
                      ₱{Number(request.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </p>
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4 mr-1" /> View
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Deposit Request Details</DialogTitle>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              {/* User Info */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">User</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold">{selectedRequest.profiles?.full_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedRequest.profiles?.email}</p>
                  <p className="text-sm text-muted-foreground">@{selectedRequest.profiles?.username}</p>
                </CardContent>
              </Card>

              {/* Payment Details */}
              <Card className="bg-green-50/50 dark:bg-green-900/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Payment Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>Amount:</span>
                    <span className="font-bold text-green-600">
                      ₱{Number(selectedRequest.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Method:</span>
                    {getPaymentMethodBadge(selectedRequest.payment_method)}
                  </div>
                  <div className="flex justify-between">
                    <span>Reference:</span>
                    <span className="font-mono">{selectedRequest.payment_reference}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sender Name:</span>
                    <span>{selectedRequest.sender_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sender Account:</span>
                    <span>{selectedRequest.sender_account}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Proof */}
              {selectedRequest.payment_proof_url && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Payment Proof</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <img 
                      src={selectedRequest.payment_proof_url} 
                      alt="Payment Proof" 
                      className="w-full max-h-64 object-contain rounded-lg border cursor-pointer"
                      onClick={() => window.open(selectedRequest.payment_proof_url, '_blank')}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Status */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <span>Status:</span>
                {getStatusBadge(selectedRequest.status)}
              </div>

              {/* Admin Notes */}
              {selectedRequest.status === 'pending' && (
                <div>
                  <label className="text-sm font-medium">Admin Notes (Optional)</label>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add notes about this request..."
                    rows={2}
                  />
                </div>
              )}

              {selectedRequest.admin_notes && selectedRequest.status !== 'pending' && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Admin Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{selectedRequest.admin_notes}</p>
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              {selectedRequest.status === 'pending' && (
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    onClick={() => rejectMutation.mutate(selectedRequest)}
                    disabled={rejectMutation.isPending || approveMutation.isPending}
                    className="flex-1"
                  >
                    {rejectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <X className="w-4 h-4 mr-2" />}
                    Reject
                  </Button>
                  <Button
                    onClick={() => approveMutation.mutate(selectedRequest)}
                    disabled={rejectMutation.isPending || approveMutation.isPending}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500"
                  >
                    {approveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                    Approve & Credit
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
