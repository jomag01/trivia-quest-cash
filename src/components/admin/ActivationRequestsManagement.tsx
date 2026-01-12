import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  MessageSquare,
  Calendar
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface ActivationRequest {
  id: string;
  user_id: string;
  request_message: string | null;
  status: string;
  admin_response: string | null;
  responded_at: string | null;
  created_at: string;
  profiles?: {
    full_name: string | null;
    email: string | null;
    block_reason: string | null;
  };
}

export const ActivationRequestsManagement = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<ActivationRequest | null>(null);
  const [adminResponse, setAdminResponse] = useState('');
  const [responseDialog, setResponseDialog] = useState(false);
  const [responseAction, setResponseAction] = useState<'approve' | 'reject'>('approve');

  const { data: requests, isLoading } = useQuery({
    queryKey: ['activation-requests'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('activation_requests')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email,
            block_reason
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ActivationRequest[];
    },
  });

  const respondMutation = useMutation({
    mutationFn: async ({ requestId, userId, action, response }: { 
      requestId: string; 
      userId: string; 
      action: 'approve' | 'reject'; 
      response: string 
    }) => {
      // Update the request status
      const { error: requestError } = await (supabase as any)
        .from('activation_requests')
        .update({
          status: action === 'approve' ? 'approved' : 'rejected',
          admin_response: response,
          responded_by: user?.id,
          responded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (requestError) throw requestError;

      // If approved, unblock the user
      if (action === 'approve') {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            is_blocked: false,
            blocked_at: null,
            blocked_by: null,
            block_reason: null,
          })
          .eq('id', userId);

        if (profileError) throw profileError;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['activation-requests'] });
      toast.success(
        variables.action === 'approve' 
          ? 'User has been unblocked and notified' 
          : 'Request has been rejected'
      );
      setResponseDialog(false);
      setSelectedRequest(null);
      setAdminResponse('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to process request');
    },
  });

  const handleOpenResponse = (request: ActivationRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setResponseAction(action);
    setAdminResponse('');
    setResponseDialog(true);
  };

  const handleSubmitResponse = () => {
    if (!selectedRequest) return;
    
    respondMutation.mutate({
      requestId: selectedRequest.id,
      userId: selectedRequest.user_id,
      action: responseAction,
      response: adminResponse,
    });
  };

  const pendingRequests = requests?.filter(r => r.status === 'pending') || [];
  const processedRequests = requests?.filter(r => r.status !== 'pending') || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-500" />
            Pending Activation Requests
          </CardTitle>
          <CardDescription>
            Review and respond to user requests for account reactivation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No pending activation requests
            </p>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {pendingRequests.map((request) => (
                  <Card key={request.id} className="border-yellow-200 bg-yellow-50/50">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {request.profiles?.full_name || request.profiles?.email || 'Unknown User'}
                            </span>
                            <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                              Pending
                            </Badge>
                          </div>
                          
                          {request.profiles?.block_reason && (
                            <div className="text-sm text-muted-foreground">
                              <span className="font-medium">Block Reason:</span> {request.profiles.block_reason}
                            </div>
                          )}
                          
                          <div className="bg-background p-3 rounded-lg border">
                            <div className="flex items-start gap-2">
                              <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                              <p className="text-sm">{request.request_message || 'No message provided'}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(request.created_at), 'MMM d, yyyy h:mm a')}
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleOpenResponse(request, 'approve')}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleOpenResponse(request, 'reject')}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Processed Requests
          </CardTitle>
          <CardDescription>
            History of approved and rejected requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {processedRequests.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No processed requests yet
            </p>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {processedRequests.map((request) => (
                  <Card key={request.id} className={request.status === 'approved' ? 'border-green-200' : 'border-red-200'}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {request.profiles?.full_name || request.profiles?.email || 'Unknown'}
                          </span>
                          <Badge 
                            variant={request.status === 'approved' ? 'default' : 'destructive'}
                            className={request.status === 'approved' ? 'bg-green-600' : ''}
                          >
                            {request.status === 'approved' ? 'Approved' : 'Rejected'}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {request.responded_at && format(new Date(request.responded_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                      {request.admin_response && (
                        <p className="text-xs text-muted-foreground mt-2 pl-6">
                          Response: {request.admin_response}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Response Dialog */}
      <Dialog open={responseDialog} onOpenChange={setResponseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {responseAction === 'approve' ? 'Approve Activation Request' : 'Reject Activation Request'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>User</Label>
              <p className="text-sm text-muted-foreground">
                {selectedRequest?.profiles?.full_name || selectedRequest?.profiles?.email}
              </p>
            </div>
            
            <div>
              <Label>User's Message</Label>
              <p className="text-sm bg-muted p-3 rounded-lg mt-1">
                {selectedRequest?.request_message || 'No message'}
              </p>
            </div>
            
            <div>
              <Label htmlFor="admin-response">Your Response (Optional)</Label>
              <Textarea
                id="admin-response"
                placeholder="Add a response message to the user..."
                value={adminResponse}
                onChange={(e) => setAdminResponse(e.target.value)}
                rows={3}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setResponseDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitResponse}
              disabled={respondMutation.isPending}
              className={responseAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
              variant={responseAction === 'reject' ? 'destructive' : 'default'}
            >
              {respondMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : responseAction === 'approve' ? (
                <CheckCircle className="h-4 w-4 mr-2" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              {responseAction === 'approve' ? 'Approve & Unblock' : 'Reject Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
