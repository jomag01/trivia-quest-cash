import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScanLine, Package, TruckIcon, RotateCcw, Camera, Keyboard, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BarcodeScannerProps {
  warehouseId?: string;
}

interface ScanResult {
  id: string;
  barcode: string;
  sku?: string;
  name?: string;
  quantity?: number;
  status: 'success' | 'error' | 'pending';
  message: string;
  timestamp: Date;
}

export default function BarcodeScanner({ warehouseId }: BarcodeScannerProps) {
  const [mode, setMode] = useState<'receive' | 'pick' | 'transfer' | 'count'>('receive');
  const [inputMode, setInputMode] = useState<'keyboard' | 'camera'>('keyboard');
  const [barcode, setBarcode] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input for quick scanning
  useEffect(() => {
    if (inputMode === 'keyboard') {
      inputRef.current?.focus();
    }
  }, [inputMode, mode]);

  const processBarcode = async () => {
    if (!barcode.trim()) return;

    setIsProcessing(true);
    const scanId = crypto.randomUUID();

    try {
      // Look up SKU by barcode
      const { data: sku, error: skuError } = await supabase
        .from('sku_master')
        .select('*')
        .or(`barcode_ean.eq.${barcode},barcode_upc.eq.${barcode},sku.eq.${barcode}`)
        .maybeSingle();

      if (skuError) throw skuError;

      if (!sku) {
        setScanResults((prev) => [
          {
            id: scanId,
            barcode,
            status: 'error',
            message: 'SKU not found in system',
            timestamp: new Date(),
          },
          ...prev,
        ]);
        toast.error('Barcode not found');
        setBarcode('');
        inputRef.current?.focus();
        return;
      }

      // Process based on mode
      let result: ScanResult = {
        id: scanId,
        barcode,
        sku: sku.sku,
        name: sku.name,
        quantity: parseInt(quantity) || 1,
        status: 'pending',
        message: 'Processing...',
        timestamp: new Date(),
      };

      switch (mode) {
        case 'receive':
          // Add to inventory (inbound)
          if (warehouseId) {
            const { error: invError } = await supabase
              .from('warehouse_inventory')
              .upsert({
                warehouse_id: warehouseId,
                sku_id: sku.id,
                quantity: parseInt(quantity) || 1,
                state: 'available',
                received_at: new Date().toISOString(),
              }, {
                onConflict: 'warehouse_id,sku_id,location_id,lot_number,serial_number',
              });

            if (invError) throw invError;
            result.status = 'success';
            result.message = `Received ${quantity} units`;
          } else {
            result.status = 'error';
            result.message = 'Select a warehouse first';
          }
          break;

        case 'pick':
          result.status = 'success';
          result.message = `Picked ${quantity} units for order`;
          break;

        case 'transfer':
          result.status = 'success';
          result.message = `Verified for transfer`;
          break;

        case 'count':
          result.status = 'success';
          result.message = `Counted ${quantity} units`;
          break;
      }

      setScanResults((prev) => [result, ...prev]);
      toast.success(result.message);
      setBarcode('');
      setQuantity('1');
      inputRef.current?.focus();

      // Log audit
      await supabase.from('inventory_audit_log').insert({
        warehouse_id: warehouseId,
        sku_id: sku.id,
        action: `barcode_scan_${mode}`,
        quantity_after: parseInt(quantity) || 1,
        reason: `Barcode scan: ${mode}`,
        metadata: { barcode, mode },
      });

    } catch (error: any) {
      setScanResults((prev) => [
        {
          id: scanId,
          barcode,
          status: 'error',
          message: error.message,
          timestamp: new Date(),
        },
        ...prev,
      ]);
      toast.error(`Scan failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      processBarcode();
    }
  };

  const clearHistory = () => {
    setScanResults([]);
  };

  const modeIcons = {
    receive: Package,
    pick: ScanLine,
    transfer: RotateCcw,
    count: ScanLine,
  };

  const modeColors = {
    receive: 'bg-green-500',
    pick: 'bg-blue-500',
    transfer: 'bg-orange-500',
    count: 'bg-purple-500',
  };

  return (
    <div className="space-y-4">
      {/* Mode Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ScanLine className="h-5 w-5" />
            Barcode Scanner
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="receive" className="text-xs sm:text-sm">
                <Package className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Receive</span>
              </TabsTrigger>
              <TabsTrigger value="pick" className="text-xs sm:text-sm">
                <ScanLine className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Pick</span>
              </TabsTrigger>
              <TabsTrigger value="transfer" className="text-xs sm:text-sm">
                <RotateCcw className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Transfer</span>
              </TabsTrigger>
              <TabsTrigger value="count" className="text-xs sm:text-sm">
                <ScanLine className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Count</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Input Mode Toggle */}
          <div className="flex gap-2">
            <Button
              variant={inputMode === 'keyboard' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setInputMode('keyboard')}
              className="flex-1"
            >
              <Keyboard className="h-4 w-4 mr-2" />
              Keyboard
            </Button>
            <Button
              variant={inputMode === 'camera' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setInputMode('camera')}
              className="flex-1"
            >
              <Camera className="h-4 w-4 mr-2" />
              Camera
            </Button>
          </div>

          {/* Barcode Input */}
          {inputMode === 'keyboard' && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Scan or enter barcode..."
                  className="font-mono text-lg"
                  autoFocus
                />
                <Input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-20"
                  placeholder="Qty"
                />
                <Button onClick={processBarcode} disabled={isProcessing || !barcode}>
                  {isProcessing ? 'Processing...' : 'Scan'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Press Enter or click Scan after entering barcode
              </p>
            </div>
          )}

          {inputMode === 'camera' && (
            <div className="bg-muted rounded-lg p-8 text-center">
              <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Camera scanning requires mobile device with camera access.
                <br />
                Use keyboard input for desktop.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scan History */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Scan History ({scanResults.length})</CardTitle>
            {scanResults.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearHistory}>
                Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {scanResults.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No scans yet. Start scanning barcodes above.
            </p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {scanResults.map((result) => (
                <div
                  key={result.id}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    result.status === 'success'
                      ? 'bg-green-500/10'
                      : result.status === 'error'
                      ? 'bg-red-500/10'
                      : 'bg-yellow-500/10'
                  }`}
                >
                  {result.status === 'success' ? (
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  ) : result.status === 'error' ? (
                    <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  ) : (
                    <ScanLine className="h-5 w-5 text-yellow-500 flex-shrink-0 animate-pulse" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{result.barcode}</span>
                      {result.sku && (
                        <Badge variant="outline" className="text-xs">
                          {result.sku}
                        </Badge>
                      )}
                    </div>
                    {result.name && (
                      <p className="text-sm truncate">{result.name}</p>
                    )}
                    <p className="text-xs text-muted-foreground">{result.message}</p>
                  </div>
                  {result.quantity && (
                    <Badge variant="secondary">×{result.quantity}</Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {result.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
