import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ScanLine, Package, CheckCircle2 } from "lucide-react";

const HubScanningPanel = () => {
  const { toast } = useToast();
  const [trackingNumber, setTrackingNumber] = useState("");
  const [scanType, setScanType] = useState<string>("arrival");
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState<any>(null);

  const handleScan = async () => {
    if (!trackingNumber.trim()) {
      toast({ title: "Error", description: "Please enter a tracking number", variant: "destructive" });
      return;
    }

    setIsScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke("courier-hub-operations", {
        body: {
          action: "scan",
          tracking_number: trackingNumber,
          scan_type: scanType,
        },
      });

      if (error) throw error;

      setLastScanned({
        tracking_number: trackingNumber,
        scan_type: scanType,
        timestamp: new Date().toISOString(),
      });

      toast({ title: "Success", description: `Parcel scanned: ${scanType}` });
      setTrackingNumber("");
    } catch (error: any) {
      toast({ title: "Scan Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5" />
            Scan Parcel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tracking">Tracking Number</Label>
            <div className="flex gap-2">
              <Input
                id="tracking"
                placeholder="Scan or enter tracking number"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleScan()}
                className="font-mono"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="scan-type">Scan Type</Label>
            <Select value={scanType} onValueChange={setScanType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="arrival">Arrival at Hub</SelectItem>
                <SelectItem value="sorting">Sorting</SelectItem>
                <SelectItem value="dispatch">Dispatch</SelectItem>
                <SelectItem value="receiving">Receiving (from Linehaul)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleScan} disabled={isScanning} className="w-full">
            {isScanning ? "Scanning..." : "Scan Parcel"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Last Scanned
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lastScanned ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-8 w-8" />
                <span className="text-lg font-medium">Scan Successful</span>
              </div>
              <div className="space-y-2 p-4 bg-muted rounded-lg">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tracking #:</span>
                  <span className="font-mono font-medium">{lastScanned.tracking_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Scan Type:</span>
                  <span className="capitalize">{lastScanned.scan_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time:</span>
                  <span>{new Date(lastScanned.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <ScanLine className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No parcel scanned yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HubScanningPanel;
