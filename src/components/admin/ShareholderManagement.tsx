import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  Loader2, Users, DollarSign, Percent, CheckCircle, XCircle, 
  Eye, TrendingUp, Wallet, PiggyBank, ArrowLeft, Link2, Copy, FileText, ExternalLink
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface Shareholder {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  investment_amount: number;
  share_percentage: number;
  total_earnings: number;
  pending_payout: number;
  status: string;
  payment_method: string | null;
  payment_reference: string | null;
  payment_proof_url: string | null;
  authenticated_document_url: string | null;
  approved_at: string | null;
  notes: string | null;
  created_at: string;
}

interface RegistrationToken {
  id: string;
  token: string;
  is_active: boolean;
  expires_at: string | null;
  uses_count: number;
  max_uses: number | null;
  created_at: string;
}

interface ShareholderManagementProps {
  onBack: () => void;
}

export default function ShareholderManagement({ onBack }: ShareholderManagementProps) {
  const { user } = useAuth();
  const [shareholders, setShareholders] = useState<Shareholder[]>([]);
  const [tokens, setTokens] = useState<RegistrationToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedShareholder, setSelectedShareholder] = useState<Shareholder | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [proofDialog, setProofDialog] = useState<string | null>(null);
  const [documentDialog, setDocumentDialog] = useState<string | null>(null);
  const [payoutDialog, setPayoutDialog] = useState<Shareholder | null>(null);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [netProfitAmount, setNetProfitAmount] = useState('');
  const [showTokenDialog, setShowTokenDialog] = useState(false);
  const [generatingToken, setGeneratingToken] = useState(false);

  useEffect(() => {
    fetchShareholders();
    fetchTokens();
  }, []);

  const fetchShareholders = async () => {
    try {
      const { data, error } = await supabase
        .from('shareholders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setShareholders(data || []);
    } catch (error) {
      console.error('Error fetching shareholders:', error);
      toast.error('Failed to load shareholders');
    } finally {
      setLoading(false);
    }
  };

  const fetchTokens = async () => {
    try {
      const { data, error } = await supabase
        .from('shareholder_registration_tokens')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTokens(data || []);
    } catch (error) {
      console.error('Error fetching tokens:', error);
    }
  };

  const generateShareableLink = async () => {
    if (!user?.id) return;
    setGeneratingToken(true);
    try {
      const { data, error } = await supabase
        .from('shareholder_registration_tokens')
        .insert({
          created_by: user.id,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      const link = `${window.location.origin}/shareholder-registration?token=${data.token}`;
      await navigator.clipboard.writeText(link);
      toast.success('Shareholder registration link copied to clipboard!');
      fetchTokens();
    } catch (error) {
      console.error('Error generating link:', error);
      toast.error('Failed to generate shareable link');
    } finally {
      setGeneratingToken(false);
    }
  };

  const copyLink = (token: string) => {
    const link = `${window.location.origin}/shareholder-registration?token=${token}`;
    navigator.clipboard.writeText(link);
    toast.success('Link copied to clipboard!');
  };

  const deactivateToken = async (tokenId: string) => {
    try {
      const { error } = await supabase
        .from('shareholder_registration_tokens')
        .update({ is_active: false })
        .eq('id', tokenId);

      if (error) throw error;
      toast.success('Token deactivated');
      fetchTokens();
    } catch (error) {
      console.error('Error deactivating token:', error);
      toast.error('Failed to deactivate token');
    }
  };

  const handleApprove = async (shareholder: Shareholder) => {
    if (!user?.id) return;
    setProcessing(shareholder.id);

    try {
      const { error } = await supabase
        .from('shareholders')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user.id,
          notes: adminNotes || null
        })
        .eq('id', shareholder.id);

      if (error) throw error;

      toast.success(`Shareholder ${shareholder.full_name} approved`);
      setSelectedShareholder(null);
      setAdminNotes('');
      fetchShareholders();
    } catch (error) {
      console.error('Error approving shareholder:', error);
      toast.error('Failed to approve shareholder');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (shareholder: Shareholder) => {
    setProcessing(shareholder.id);

    try {
      const { error } = await supabase
        .from('shareholders')
        .update({
          status: 'rejected',
          notes: adminNotes || null
        })
        .eq('id', shareholder.id);

      if (error) throw error;

      toast.success(`Shareholder ${shareholder.full_name} rejected`);
      setSelectedShareholder(null);
      setAdminNotes('');
      fetchShareholders();
    } catch (error) {
      console.error('Error rejecting shareholder:', error);
      toast.error('Failed to reject shareholder');
    } finally {
      setProcessing(null);
    }
  };

  const handleProcessPayout = async () => {
    if (!payoutDialog || !user?.id || !payoutAmount || !netProfitAmount) return;

    setProcessing(payoutDialog.id);

    try {
      // Insert payout record
      const { error: payoutError } = await supabase
        .from('shareholder_payouts')
        .insert({
          shareholder_id: payoutDialog.id,
          payout_amount: parseFloat(payoutAmount),
          net_profit_amount: parseFloat(netProfitAmount),
          payout_period: new Date().toISOString().slice(0, 7),
          status: 'completed',
          processed_at: new Date().toISOString(),
          processed_by: user.id
        });

      if (payoutError) throw payoutError;

      // Update shareholder totals
      const { error: updateError } = await supabase
        .from('shareholders')
        .update({
          total_earnings: payoutDialog.total_earnings + parseFloat(payoutAmount),
          pending_payout: 0
        })
        .eq('id', payoutDialog.id);

      if (updateError) throw updateError;

      toast.success(`Payout of ₱${parseFloat(payoutAmount).toLocaleString()} processed`);
      setPayoutDialog(null);
      setPayoutAmount('');
      setNetProfitAmount('');
      fetchShareholders();
    } catch (error) {
      console.error('Error processing payout:', error);
      toast.error('Failed to process payout');
    } finally {
      setProcessing(null);
    }
  };

  const totalInvestment = shareholders.filter(s => s.status === 'approved').reduce((sum, s) => sum + Number(s.investment_amount), 0);
  const totalSharePercentage = shareholders.filter(s => s.status === 'approved').reduce((sum, s) => sum + Number(s.share_percentage), 0);
  const pendingShareholders = shareholders.filter(s => s.status === 'pending').length;

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      approved: 'default',
      rejected: 'destructive'
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={onBack} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back to Admin Menu
      </Button>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <PiggyBank className="h-8 w-8 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Shareholder Management</h2>
            <p className="text-muted-foreground">Manage company shareholders and profit distributions</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowTokenDialog(true)} variant="outline">
            <Link2 className="h-4 w-4 mr-2" />
            Manage Links
          </Button>
          <Button onClick={generateShareableLink} disabled={generatingToken}>
            {generatingToken ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Copy className="h-4 w-4 mr-2" />
            )}
            Generate Shareable Link
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Shareholders</p>
                <p className="text-2xl font-bold">{shareholders.filter(s => s.status === 'approved').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Investment</p>
                <p className="text-2xl font-bold">₱{totalInvestment.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Percent className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Shares</p>
                <p className="text-2xl font-bold">{(totalSharePercentage * 100).toFixed(2)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Pending Applications</p>
                <p className="text-2xl font-bold">{pendingShareholders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shareholders List */}
      <Card>
        <CardHeader>
          <CardTitle>Shareholder Applications & Members</CardTitle>
          <CardDescription>Review and manage shareholder investments</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-4">
              {shareholders.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No shareholder applications yet</p>
              ) : (
                shareholders.map((shareholder) => (
                  <Card key={shareholder.id} className={`p-4 ${shareholder.status === 'pending' ? 'border-orange-500/50' : ''}`}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{shareholder.full_name}</h4>
                          {getStatusBadge(shareholder.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">{shareholder.email}</p>
                        <div className="flex flex-wrap gap-4 text-sm">
                          <span><strong>Investment:</strong> ₱{Number(shareholder.investment_amount).toLocaleString()}</span>
                          <span><strong>Share:</strong> {(Number(shareholder.share_percentage) * 100).toFixed(2)}%</span>
                          <span><strong>Earnings:</strong> ₱{Number(shareholder.total_earnings).toLocaleString()}</span>
                        </div>
                        {shareholder.payment_method && (
                          <p className="text-sm text-muted-foreground">
                            Payment: {shareholder.payment_method} - {shareholder.payment_reference}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {shareholder.authenticated_document_url && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setDocumentDialog(shareholder.authenticated_document_url)}
                          >
                            <FileText className="h-4 w-4 mr-1" /> Document
                          </Button>
                        )}
                        {shareholder.payment_proof_url && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setProofDialog(shareholder.payment_proof_url)}
                          >
                            <Eye className="h-4 w-4 mr-1" /> Proof
                          </Button>
                        )}
                        {shareholder.status === 'pending' && (
                          <Button 
                            size="sm"
                            onClick={() => setSelectedShareholder(shareholder)}
                          >
                            Process
                          </Button>
                        )}
                        {shareholder.status === 'approved' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setPayoutDialog(shareholder)}
                          >
                            <Wallet className="h-4 w-4 mr-1" /> Payout
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Process Dialog */}
      <Dialog open={!!selectedShareholder} onOpenChange={() => setSelectedShareholder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Shareholder Application</DialogTitle>
          </DialogHeader>
          {selectedShareholder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Name</Label>
                  <p className="font-medium">{selectedShareholder.full_name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Investment Amount</Label>
                  <p className="font-medium">₱{Number(selectedShareholder.investment_amount).toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Share Percentage</Label>
                  <p className="font-medium">{(Number(selectedShareholder.share_percentage) * 100).toFixed(2)}%</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Payment Method</Label>
                  <p className="font-medium">{selectedShareholder.payment_method || 'N/A'}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Admin Notes</Label>
                <Textarea 
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes..."
                />
              </div>
              <DialogFooter className="flex gap-2">
                <Button
                  onClick={() => handleApprove(selectedShareholder)}
                  disabled={processing === selectedShareholder.id}
                  className="flex-1"
                >
                  {processing === selectedShareholder.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleReject(selectedShareholder)}
                  disabled={processing === selectedShareholder.id}
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payout Dialog */}
      <Dialog open={!!payoutDialog} onOpenChange={() => setPayoutDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Shareholder Payout</DialogTitle>
          </DialogHeader>
          {payoutDialog && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Processing payout for <strong>{payoutDialog.full_name}</strong> ({(Number(payoutDialog.share_percentage) * 100).toFixed(2)}% share)
              </p>
              <div className="space-y-2">
                <Label>Company Net Profit (this period)</Label>
                <Input 
                  type="number"
                  value={netProfitAmount}
                  onChange={(e) => {
                    setNetProfitAmount(e.target.value);
                    const profit = parseFloat(e.target.value) || 0;
                    const share = Number(payoutDialog.share_percentage);
                    setPayoutAmount((profit * share).toFixed(2));
                  }}
                  placeholder="Enter net profit amount"
                />
              </div>
              <div className="space-y-2">
                <Label>Calculated Payout</Label>
                <Input 
                  type="number"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  placeholder="Payout amount"
                />
                <p className="text-xs text-muted-foreground">
                  Auto-calculated: Net Profit × {(Number(payoutDialog.share_percentage) * 100).toFixed(2)}%
                </p>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleProcessPayout}
                  disabled={!payoutAmount || processing === payoutDialog.id}
                >
                  {processing === payoutDialog.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wallet className="h-4 w-4 mr-2" />}
                  Process Payout
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Proof Dialog */}
      <Dialog open={!!proofDialog} onOpenChange={() => setProofDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payment Proof</DialogTitle>
          </DialogHeader>
          {proofDialog && (
            <img src={proofDialog} alt="Payment proof" className="w-full rounded-lg" />
          )}
        </DialogContent>
      </Dialog>

      {/* Authenticated Document Dialog */}
      <Dialog open={!!documentDialog} onOpenChange={() => setDocumentDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Authenticated Document</DialogTitle>
          </DialogHeader>
          {documentDialog && (
            <div className="space-y-4">
              {documentDialog.endsWith('.pdf') || documentDialog.includes('.pdf') ? (
                <div className="text-center space-y-4">
                  <FileText className="h-16 w-16 mx-auto text-primary" />
                  <p className="text-muted-foreground">PDF Document</p>
                  <Button asChild>
                    <a href={documentDialog} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Document
                    </a>
                  </Button>
                </div>
              ) : (
                <img src={documentDialog} alt="Authenticated document" className="w-full rounded-lg" />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Token Management Dialog */}
      <Dialog open={showTokenDialog} onOpenChange={setShowTokenDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Shareable Registration Links</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Generate and manage shareable links for potential shareholders to register.
            </p>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {tokens.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No links generated yet</p>
                ) : (
                  tokens.map((token) => (
                    <div 
                      key={token.id} 
                      className={`flex items-center justify-between p-3 rounded-lg border ${!token.is_active ? 'bg-muted/50 opacity-60' : ''}`}
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <p className="text-xs font-mono truncate">
                          ...?token={token.token.slice(-12)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Created: {new Date(token.created_at).toLocaleDateString()} • 
                          Uses: {token.uses_count}{token.max_uses ? `/${token.max_uses}` : ''}
                        </p>
                      </div>
                      <div className="flex gap-2 ml-2">
                        {token.is_active && (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => copyLink(token.token)}>
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => deactivateToken(token.id)}>
                              <XCircle className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                        {!token.is_active && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button onClick={generateShareableLink} disabled={generatingToken}>
                {generatingToken ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Link2 className="h-4 w-4 mr-2" />
                )}
                Generate New Link
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}