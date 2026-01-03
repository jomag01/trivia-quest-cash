import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TruckIcon, Play, CheckCircle, Package, Printer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import type { FulfillmentOrder } from '@/hooks/useWarehouse';

interface FulfillmentQueueProps {
  orders: FulfillmentOrder[];
  userRole: string;
  warehouseId?: string;
}

export default function FulfillmentQueue({ orders, userRole, warehouseId }: FulfillmentQueueProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const filteredOrders = orders.filter(
    (order) => statusFilter === 'all' || order.status === statusFilter
  );

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/10 text-yellow-600',
    picking: 'bg-blue-500/10 text-blue-600',
    picked: 'bg-indigo-500/10 text-indigo-600',
    packing: 'bg-purple-500/10 text-purple-600',
    packed: 'bg-pink-500/10 text-pink-600',
    shipped: 'bg-green-500/10 text-green-600',
    delivered: 'bg-emerald-500/10 text-emerald-600',
    cancelled: 'bg-red-500/10 text-red-600',
  };

  const nextStatus: Record<string, string> = {
    pending: 'picking',
    picking: 'picked',
    picked: 'packing',
    packing: 'packed',
    packed: 'shipped',
    shipped: 'delivered',
  };

  const updateStatus = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      const updates: Record<string, any> = { status: newStatus };
      
      if (newStatus === 'picking') updates.picked_at = null;
      if (newStatus === 'picked') updates.picked_at = new Date().toISOString();
      if (newStatus === 'packed') updates.packed_at = new Date().toISOString();
      if (newStatus === 'shipped') updates.shipped_at = new Date().toISOString();

      const { error } = await supabase
        .from('fulfillment_orders')
        .update(updates)
        .eq('id', orderId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['fulfillment-orders'] });
      toast.success(`Order updated to ${newStatus}`);
    } catch (error: any) {
      toast.error(`Failed to update: ${error.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-base flex items-center gap-2">
            <TruckIcon className="h-5 w-5" />
            Fulfillment Queue ({filteredOrders.length})
          </CardTitle>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="picking">Picking</SelectItem>
              <SelectItem value="picked">Picked</SelectItem>
              <SelectItem value="packing">Packing</SelectItem>
              <SelectItem value="packed">Packed</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fulfillment #</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Courier</TableHead>
                <TableHead>Tracking</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No fulfillment orders found
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-sm">{order.fulfillment_number}</TableCell>
                    <TableCell>
                      <Badge
                        variant={order.priority >= 8 ? 'destructive' : order.priority >= 5 ? 'default' : 'secondary'}
                      >
                        P{order.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[order.status]} variant="secondary">
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{order.courier || '-'}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {order.tracking_number || '-'}
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(order.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {order.status !== 'delivered' && order.status !== 'cancelled' && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={updatingId === order.id}
                            onClick={() => updateStatus(order.id, nextStatus[order.status])}
                          >
                            {order.status === 'pending' && <Play className="h-4 w-4 mr-1" />}
                            {order.status === 'picking' && <Package className="h-4 w-4 mr-1" />}
                            {order.status === 'picked' && <Package className="h-4 w-4 mr-1" />}
                            {order.status === 'packing' && <CheckCircle className="h-4 w-4 mr-1" />}
                            {order.status === 'packed' && <TruckIcon className="h-4 w-4 mr-1" />}
                            {order.status === 'shipped' && <CheckCircle className="h-4 w-4 mr-1" />}
                            {nextStatus[order.status]?.charAt(0).toUpperCase() + nextStatus[order.status]?.slice(1)}
                          </Button>
                        )}
                        {order.shipping_label_url && (
                          <Button size="sm" variant="ghost">
                            <Printer className="h-4 w-4" />
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
