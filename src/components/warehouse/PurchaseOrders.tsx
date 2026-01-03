import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ClipboardList, Plus, Check, X, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface PurchaseOrdersProps {
  userRole: string;
  warehouseId?: string;
}

interface PurchaseOrder {
  id: string;
  po_number: string;
  warehouse_id: string;
  supplier_id: string;
  status: string;
  expected_date?: string;
  total_amount: number;
  created_at: string;
  warehouse?: { name: string };
  supplier?: { full_name: string; email: string };
}

export default function PurchaseOrders({ userRole, warehouseId }: PurchaseOrdersProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['purchase-orders', warehouseId, userRole],
    queryFn: async () => {
      let query = supabase
        .from('purchase_orders')
        .select(`
          *,
          warehouse:warehouses(name)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (warehouseId) {
        query = query.eq('warehouse_id', warehouseId);
      }

      if (userRole === 'supplier') {
        query = query.eq('supplier_id', user?.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as PurchaseOrder[];
    },
    enabled: !!user,
  });

  const updateStatus = async (id: string, newStatus: string) => {
    const updates: Record<string, any> = { status: newStatus };

    if (newStatus === 'confirmed') updates.approved_at = new Date().toISOString();
    if (newStatus === 'received') updates.received_date = new Date().toISOString().split('T')[0];

    const { error } = await supabase
      .from('purchase_orders')
      .update(updates)
      .eq('id', id);

    if (error) {
      toast.error(`Failed to update: ${error.message}`);
    } else {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast.success(`PO ${newStatus}`);
    }
  };

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-500/10 text-gray-600',
    pending: 'bg-yellow-500/10 text-yellow-600',
    confirmed: 'bg-blue-500/10 text-blue-600',
    partial: 'bg-purple-500/10 text-purple-600',
    received: 'bg-green-500/10 text-green-600',
    cancelled: 'bg-red-500/10 text-red-600',
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Purchase Orders ({orders.length})
          </CardTitle>
          {(userRole === 'admin' || userRole === 'manager') && (
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              New PO
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO #</TableHead>
                <TableHead>Warehouse</TableHead>
                {userRole !== 'supplier' && <TableHead>Supplier</TableHead>}
                <TableHead>Status</TableHead>
                <TableHead>Expected</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={userRole !== 'supplier' ? 7 : 6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No purchase orders found
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-sm">{order.po_number}</TableCell>
                    <TableCell>{order.warehouse?.name || '-'}</TableCell>
                    {userRole !== 'supplier' && (
                      <TableCell>
                        {order.supplier?.full_name || order.supplier?.email || '-'}
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge className={statusColors[order.status]} variant="secondary">
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {order.expected_date
                        ? new Date(order.expected_date).toLocaleDateString()
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ₱{order.total_amount?.toLocaleString() || '0'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="ghost">
                          <Eye className="h-4 w-4" />
                        </Button>

                        {/* Supplier actions */}
                        {userRole === 'supplier' && order.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateStatus(order.id, 'confirmed')}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Confirm
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => updateStatus(order.id, 'cancelled')}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}

                        {/* Admin/Manager actions */}
                        {(userRole === 'admin' || userRole === 'manager') && (
                          <>
                            {order.status === 'confirmed' && (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => updateStatus(order.id, 'received')}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Receive
                              </Button>
                            )}
                          </>
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
