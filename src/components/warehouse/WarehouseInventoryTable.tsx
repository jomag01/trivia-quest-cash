import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Filter, Download, Package } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { WarehouseInventory } from '@/hooks/useWarehouse';

interface WarehouseInventoryTableProps {
  inventory: WarehouseInventory[];
  userRole: string;
  warehouseId?: string;
}

export default function WarehouseInventoryTable({
  inventory,
  userRole,
  warehouseId,
}: WarehouseInventoryTableProps) {
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState<string>('all');

  const filteredInventory = inventory.filter((inv) => {
    const matchesSearch =
      inv.sku?.sku?.toLowerCase().includes(search.toLowerCase()) ||
      inv.sku?.name?.toLowerCase().includes(search.toLowerCase()) ||
      inv.lot_number?.toLowerCase().includes(search.toLowerCase());
    const matchesState = stateFilter === 'all' || inv.state === stateFilter;
    return matchesSearch && matchesState;
  });

  const stateColors: Record<string, string> = {
    available: 'bg-green-500/10 text-green-600',
    reserved: 'bg-blue-500/10 text-blue-600',
    in_transit: 'bg-yellow-500/10 text-yellow-600',
    damaged: 'bg-red-500/10 text-red-600',
    returned: 'bg-orange-500/10 text-orange-600',
    quarantine: 'bg-purple-500/10 text-purple-600',
  };

  const exportToCSV = () => {
    const headers = ['SKU', 'Name', 'Warehouse', 'Quantity', 'Reserved', 'State', 'Lot Number', 'Expiry Date'];
    const rows = filteredInventory.map((inv) => [
      inv.sku?.sku || '',
      inv.sku?.name || '',
      inv.warehouse?.name || '',
      inv.quantity,
      inv.reserved_quantity,
      inv.state,
      inv.lot_number || '',
      inv.expiry_date || '',
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-5 w-5" />
            Inventory ({filteredInventory.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search SKU, name, lot..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger className="w-32">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="reserved">Reserved</SelectItem>
                <SelectItem value="in_transit">In Transit</SelectItem>
                <SelectItem value="damaged">Damaged</SelectItem>
                <SelectItem value="returned">Returned</SelectItem>
                <SelectItem value="quarantine">Quarantine</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={exportToCSV}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Reserved</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Lot #</TableHead>
                <TableHead>Expiry</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInventory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No inventory found
                  </TableCell>
                </TableRow>
              ) : (
                filteredInventory.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-sm">{inv.sku?.sku || '-'}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{inv.sku?.name || '-'}</TableCell>
                    <TableCell>{inv.warehouse?.name || '-'}</TableCell>
                    <TableCell className="text-right font-medium">{inv.quantity.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{inv.reserved_quantity.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      {(inv.quantity - inv.reserved_quantity).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge className={stateColors[inv.state] || ''} variant="secondary">
                        {inv.state.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{inv.lot_number || '-'}</TableCell>
                    <TableCell className="text-xs">
                      {inv.expiry_date
                        ? new Date(inv.expiry_date).toLocaleDateString()
                        : '-'}
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
