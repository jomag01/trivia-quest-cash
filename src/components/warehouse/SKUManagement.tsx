import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Plus, QrCode, Barcode, Copy, Check } from 'lucide-react';
import { useSKUs, useCreateSKU, generateSKU, generateEAN13 } from '@/hooks/useWarehouse';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface SKUManagementProps {
  userRole: string;
}

export default function SKUManagement({ userRole }: SKUManagementProps) {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: skus = [], isLoading } = useSKUs(userRole === 'seller' ? user?.id : undefined);
  const createSKU = useCreateSKU();

  const [newSKU, setNewSKU] = useState({
    name: '',
    sku: '',
    barcode_ean: '',
    barcode_upc: '',
    weight_kg: '',
    unit_of_measure: 'piece',
    is_serialized: false,
    is_lot_tracked: false,
    is_expirable: false,
    reorder_point: '10',
    reorder_quantity: '50',
  });

  const filteredSKUs = skus.filter(
    (sku) =>
      sku.sku.toLowerCase().includes(search.toLowerCase()) ||
      sku.name.toLowerCase().includes(search.toLowerCase()) ||
      sku.barcode_ean?.includes(search) ||
      sku.barcode_upc?.includes(search)
  );

  const handleGenerateSKU = () => {
    setNewSKU((prev) => ({ ...prev, sku: generateSKU() }));
  };

  const handleGenerateBarcode = () => {
    setNewSKU((prev) => ({ ...prev, barcode_ean: generateEAN13() }));
  };

  const handleCreate = async () => {
    if (!newSKU.name || !newSKU.sku) {
      toast.error('Name and SKU are required');
      return;
    }

    await createSKU.mutateAsync({
      name: newSKU.name,
      sku: newSKU.sku,
      barcode_ean: newSKU.barcode_ean || undefined,
      barcode_upc: newSKU.barcode_upc || undefined,
      weight_kg: newSKU.weight_kg ? parseFloat(newSKU.weight_kg) : undefined,
      unit_of_measure: newSKU.unit_of_measure,
      is_serialized: newSKU.is_serialized,
      is_lot_tracked: newSKU.is_lot_tracked,
      is_expirable: newSKU.is_expirable,
      reorder_point: parseInt(newSKU.reorder_point) || 10,
      reorder_quantity: parseInt(newSKU.reorder_quantity) || 50,
      seller_id: userRole === 'seller' ? user?.id : undefined,
    });

    setIsCreateOpen(false);
    setNewSKU({
      name: '',
      sku: '',
      barcode_ean: '',
      barcode_upc: '',
      weight_kg: '',
      unit_of_measure: 'piece',
      is_serialized: false,
      is_lot_tracked: false,
      is_expirable: false,
      reorder_point: '10',
      reorder_quantity: '50',
    });
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-base flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            SKU Management ({filteredSKUs.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search SKU, name, barcode..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add SKU
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New SKU</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Product Name *</Label>
                    <Input
                      value={newSKU.name}
                      onChange={(e) => setNewSKU((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter product name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>SKU Code *</Label>
                    <div className="flex gap-2">
                      <Input
                        value={newSKU.sku}
                        onChange={(e) => setNewSKU((prev) => ({ ...prev, sku: e.target.value }))}
                        placeholder="SKU-XXXX-XXXX"
                        className="font-mono"
                      />
                      <Button variant="outline" onClick={handleGenerateSKU}>
                        Generate
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>EAN-13 Barcode</Label>
                      <div className="flex gap-2">
                        <Input
                          value={newSKU.barcode_ean}
                          onChange={(e) => setNewSKU((prev) => ({ ...prev, barcode_ean: e.target.value }))}
                          placeholder="13 digits"
                          maxLength={13}
                          className="font-mono"
                        />
                        <Button variant="outline" size="icon" onClick={handleGenerateBarcode}>
                          <Barcode className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>UPC Barcode</Label>
                      <Input
                        value={newSKU.barcode_upc}
                        onChange={(e) => setNewSKU((prev) => ({ ...prev, barcode_upc: e.target.value }))}
                        placeholder="12 digits"
                        maxLength={12}
                        className="font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Weight (kg)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={newSKU.weight_kg}
                        onChange={(e) => setNewSKU((prev) => ({ ...prev, weight_kg: e.target.value }))}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Unit of Measure</Label>
                      <Input
                        value={newSKU.unit_of_measure}
                        onChange={(e) => setNewSKU((prev) => ({ ...prev, unit_of_measure: e.target.value }))}
                        placeholder="piece, box, kg..."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Reorder Point</Label>
                      <Input
                        type="number"
                        value={newSKU.reorder_point}
                        onChange={(e) => setNewSKU((prev) => ({ ...prev, reorder_point: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Reorder Quantity</Label>
                      <Input
                        type="number"
                        value={newSKU.reorder_quantity}
                        onChange={(e) => setNewSKU((prev) => ({ ...prev, reorder_quantity: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Track by Serial Number</Label>
                      <Switch
                        checked={newSKU.is_serialized}
                        onCheckedChange={(checked) => setNewSKU((prev) => ({ ...prev, is_serialized: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Track by Lot Number</Label>
                      <Switch
                        checked={newSKU.is_lot_tracked}
                        onCheckedChange={(checked) => setNewSKU((prev) => ({ ...prev, is_lot_tracked: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Has Expiry Date</Label>
                      <Switch
                        checked={newSKU.is_expirable}
                        onCheckedChange={(checked) => setNewSKU((prev) => ({ ...prev, is_expirable: checked }))}
                      />
                    </div>
                  </div>

                  <Button onClick={handleCreate} className="w-full" disabled={createSKU.isPending}>
                    {createSKU.isPending ? 'Creating...' : 'Create SKU'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
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
                <TableHead>Barcode</TableHead>
                <TableHead>Weight</TableHead>
                <TableHead>Reorder</TableHead>
                <TableHead>Tracking</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSKUs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No SKUs found
                  </TableCell>
                </TableRow>
              ) : (
                filteredSKUs.map((sku) => (
                  <TableRow key={sku.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">{sku.sku}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(sku.sku, sku.id)}
                        >
                          {copiedId === sku.id ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{sku.name}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {sku.barcode_ean || sku.barcode_upc || '-'}
                    </TableCell>
                    <TableCell>{sku.weight_kg ? `${sku.weight_kg} kg` : '-'}</TableCell>
                    <TableCell>
                      <span className="text-xs">
                        {sku.reorder_point} / {sku.reorder_quantity}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {sku.is_serialized && <Badge variant="outline" className="text-xs">Serial</Badge>}
                        {sku.is_lot_tracked && <Badge variant="outline" className="text-xs">Lot</Badge>}
                        {sku.is_expirable && <Badge variant="outline" className="text-xs">Expiry</Badge>}
                        {!sku.is_serialized && !sku.is_lot_tracked && !sku.is_expirable && (
                          <span className="text-xs text-muted-foreground">None</span>
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
