import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RotateCcw, Plus, ArrowRight, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Warehouse } from '@/hooks/useWarehouse';

interface WarehouseTransfersProps {
  warehouses: Warehouse[];
  userRole: string;
}

interface Transfer {
  id: string;
  transfer_number: string;
  from_warehouse_id: string;
  to_warehouse_id: string;
  status: string;
  requested_at: string;
  from_warehouse?: { name: string };
  to_warehouse?: { name: string };
}

export default function WarehouseTransfers({ warehouses, userRole }: WarehouseTransfersProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [fromWarehouse, setFromWarehouse] = useState('');
  const [toWarehouse, setToWarehouse] = useState('');

  const { data: transfers = [], isLoading } = useQuery({
    queryKey: ['warehouse-transfers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouse_transfers')
        .select(`
          *,
          from_warehouse:warehouses!warehouse_transfers_from_warehouse_id_fkey(name),
          to_warehouse:warehouses!warehouse_transfers_to_warehouse_id_fkey(name)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as Transfer[];
    },
    enabled: !!user,
  });

  const createTransfer = useMutation({
    mutationFn: async () => {
      if (!fromWarehouse || !toWarehouse) {
        throw new Error('Select both warehouses');
      }
      if (fromWarehouse === toWarehouse) {
        throw new Error('Source and destination must be different');
      }

      const transferNumber = `TRF-${Date.now().toString(36).toUpperCase()}`;

      const { data, error } = await supabase
        .from('warehouse_transfers')
        .insert({
          transfer_number: transferNumber,
          from_warehouse_id: fromWarehouse,
          to_warehouse_id: toWarehouse,
          requested_by: user?.id,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-transfers'] });
      toast.success('Transfer request created');
      setIsCreateOpen(false);
      setFromWarehouse('');
      setToWarehouse('');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateStatus = async (id: string, newStatus: string) => {
    const updates: Record<string, any> = { status: newStatus };

    if (newStatus === 'approved') updates.approved_at = new Date().toISOString();
    if (newStatus === 'dispatched') updates.dispatched_at = new Date().toISOString();
    if (newStatus === 'received') updates.received_at = new Date().toISOString();

    const { error } = await supabase
      .from('warehouse_transfers')
      .update(updates)
      .eq('id', id);

    if (error) {
      toast.error(`Failed to update: ${error.message}`);
    } else {
      queryClient.invalidateQueries({ queryKey: ['warehouse-transfers'] });
      toast.success(`Transfer ${newStatus}`);
    }
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/10 text-yellow-600',
    approved: 'bg-blue-500/10 text-blue-600',
    dispatched: 'bg-purple-500/10 text-purple-600',
    in_transit: 'bg-orange-500/10 text-orange-600',
    received: 'bg-green-500/10 text-green-600',
    cancelled: 'bg-red-500/10 text-red-600',
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Warehouse Transfers ({transfers.length})
          </CardTitle>
          {(userRole === 'admin' || userRole === 'manager') && (
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  New Transfer
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Transfer Request</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>From Warehouse</Label>
                    <Select value={fromWarehouse} onValueChange={setFromWarehouse}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses.map((wh) => (
                          <SelectItem key={wh.id} value={wh.id}>
                            {wh.name} ({wh.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-center">
                    <ArrowRight className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <Label>To Warehouse</Label>
                    <Select value={toWarehouse} onValueChange={setToWarehouse}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select destination" />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses
                          .filter((wh) => wh.id !== fromWarehouse)
                          .map((wh) => (
                            <SelectItem key={wh.id} value={wh.id}>
                              {wh.name} ({wh.code})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={() => createTransfer.mutate()}
                    disabled={createTransfer.isPending || !fromWarehouse || !toWarehouse}
                    className="w-full"
                  >
                    {createTransfer.isPending ? 'Creating...' : 'Create Transfer Request'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transfer #</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No transfers found
                  </TableCell>
                </TableRow>
              ) : (
                transfers.map((transfer) => (
                  <TableRow key={transfer.id}>
                    <TableCell className="font-mono text-sm">{transfer.transfer_number}</TableCell>
                    <TableCell>{transfer.from_warehouse?.name || '-'}</TableCell>
                    <TableCell>{transfer.to_warehouse?.name || '-'}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[transfer.status]} variant="secondary">
                        {transfer.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(transfer.requested_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {transfer.status === 'pending' && (userRole === 'admin' || userRole === 'manager') && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateStatus(transfer.id, 'approved')}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => updateStatus(transfer.id, 'cancelled')}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {transfer.status === 'approved' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatus(transfer.id, 'dispatched')}
                          >
                            Dispatch
                          </Button>
                        )}
                        {transfer.status === 'dispatched' && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => updateStatus(transfer.id, 'received')}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Receive
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
