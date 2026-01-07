import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  AlertTriangle, Shield, Eye, Ban, RefreshCw, 
  CheckCircle, XCircle, User, TrendingUp
} from "lucide-react";

interface AbuseFlag {
  id: string;
  user_id: string;
  flag_type: string;
  severity: string;
  confidence: number;
  details: any;
  detected_at: string;
  reviewed_at: string | null;
  action_taken: string | null;
  user_name?: string;
  user_email?: string;
}

interface RefundReversal {
  id: string;
  user_id: string;
  source_type: string;
  sp_reversed: number;
  earnings_reversed: number;
  reason: string;
  created_at: string;
}

export function ASPNAbuseMonitor() {
  const [flags, setFlags] = useState<AbuseFlag[]>([]);
  const [reversals, setReversals] = useState<RefundReversal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFlag, setSelectedFlag] = useState<AbuseFlag | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionNotes, setActionNotes] = useState("");
  const [stats, setStats] = useState({
    totalFlags: 0,
    pendingReview: 0,
    frozenUsers: 0,
    totalReversed: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch abuse flags with user info
      const { data: flagsData } = await supabase
        .from('aspn_abuse_flags')
        .select('*')
        .order('detected_at', { ascending: false })
        .limit(100);

      if (flagsData) {
        // Fetch user names
        const userIds = [...new Set(flagsData.map(f => f.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        const enrichedFlags = flagsData.map(f => ({
          ...f,
          user_name: profileMap.get(f.user_id)?.full_name,
          user_email: profileMap.get(f.user_id)?.email
        }));

        setFlags(enrichedFlags);
        
        setStats({
          totalFlags: enrichedFlags.length,
          pendingReview: enrichedFlags.filter(f => !f.reviewed_at).length,
          frozenUsers: enrichedFlags.filter(f => f.action_taken === 'frozen').length,
          totalReversed: 0
        });
      }

      // Fetch recent reversals
      const { data: reversalsData } = await supabase
        .from('aspn_refund_reversals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (reversalsData) {
        setReversals(reversalsData);
        const totalReversed = reversalsData.reduce((sum, r) => sum + Number(r.sp_reversed), 0);
        setStats(prev => ({ ...prev, totalReversed }));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: 'freeze' | 'dismiss' | 'ban') => {
    if (!selectedFlag) return;

    try {
      if (action === 'freeze') {
        await supabase.rpc('freeze_aspn_user', {
          p_user_id: selectedFlag.user_id,
          p_reason: actionNotes || 'Abuse detected'
        });
      }

      await supabase
        .from('aspn_abuse_flags')
        .update({
          reviewed_at: new Date().toISOString(),
          action_taken: action === 'dismiss' ? 'none' : action
        })
        .eq('id', selectedFlag.id);

      toast.success(`Action "${action}" applied`);
      setActionDialogOpen(false);
      setSelectedFlag(null);
      setActionNotes("");
      fetchData();
    } catch (error) {
      console.error('Error applying action:', error);
      toast.error('Failed to apply action');
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'frozen':
        return <Badge variant="destructive">Frozen</Badge>;
      case 'warning':
        return <Badge className="bg-amber-500">Warning</Badge>;
      case 'banned':
        return <Badge variant="destructive" className="bg-red-700">Banned</Badge>;
      default:
        return <Badge variant="secondary">{severity}</Badge>;
    }
  };

  const getFlagTypeIcon = (flagType: string) => {
    switch (flagType) {
      case 'wide_growth':
        return <TrendingUp className="w-4 h-4 text-amber-500" />;
      case 'sp_velocity':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'circular_buying':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.totalFlags}</p>
              <p className="text-xs text-muted-foreground">Total Flags</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-600">{stats.pendingReview}</p>
              <p className="text-xs text-muted-foreground">Pending Review</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{stats.frozenUsers}</p>
              <p className="text-xs text-muted-foreground">Frozen Users</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.totalReversed.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">SP Reversed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Abuse Flags Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Abuse Flags
            </CardTitle>
            <Button size="sm" variant="outline" onClick={fetchData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {flags.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
              <p>No abuse flags detected</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Flag Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Detected</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flags.map((flag) => (
                  <TableRow key={flag.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{flag.user_name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{flag.user_email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getFlagTypeIcon(flag.flag_type)}
                        <span className="capitalize">{flag.flag_type.replace('_', ' ')}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getSeverityBadge(flag.severity)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-amber-500" 
                            style={{ width: `${flag.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-xs">{(flag.confidence * 100).toFixed(0)}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(flag.detected_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {flag.reviewed_at ? (
                        <Badge variant="outline" className="text-green-600">
                          Reviewed
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-600">
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {!flag.reviewed_at && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedFlag(flag);
                            setActionDialogOpen(true);
                          }}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Review
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent Reversals */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Refund Reversals</CardTitle>
        </CardHeader>
        <CardContent>
          {reversals.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No reversals recorded</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>SP Reversed</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reversals.slice(0, 10).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{new Date(r.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="capitalize">{r.source_type.replace('_', ' ')}</TableCell>
                    <TableCell className="text-red-600">-{Number(r.sp_reversed).toFixed(2)}</TableCell>
                    <TableCell>{r.reason}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Abuse Flag</DialogTitle>
          </DialogHeader>
          {selectedFlag && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p><strong>User:</strong> {selectedFlag.user_name || selectedFlag.user_email}</p>
                <p><strong>Flag:</strong> {selectedFlag.flag_type.replace('_', ' ')}</p>
                <p><strong>Severity:</strong> {selectedFlag.severity}</p>
                <p><strong>Confidence:</strong> {(selectedFlag.confidence * 100).toFixed(0)}%</p>
                {selectedFlag.details && (
                  <pre className="text-xs bg-background p-2 rounded overflow-auto">
                    {JSON.stringify(selectedFlag.details, null, 2)}
                  </pre>
                )}
              </div>

              <Textarea
                placeholder="Add notes about your decision..."
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
              />

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => handleAction('dismiss')}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Dismiss
                </Button>
                <Button variant="destructive" onClick={() => handleAction('freeze')}>
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Freeze ASPN
                </Button>
                <Button variant="destructive" className="bg-red-700" onClick={() => handleAction('ban')}>
                  <Ban className="w-4 h-4 mr-2" />
                  Ban User
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
