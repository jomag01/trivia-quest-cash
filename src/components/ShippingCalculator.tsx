import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ShippingZone {
  id: string;
  name: string;
  regions: string[];
  base_rate: number;
  per_kg_rate: number;
  free_shipping_threshold: number | null;
}

interface ShippingCalculatorProps {
  productWeight?: number;
  subtotal: number;
  onShippingCalculated: (fee: number) => void;
}

export default function ShippingCalculator({
  productWeight = 0,
  subtotal = 0,
  onShippingCalculated
}: ShippingCalculatorProps) {
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [selectedZone, setSelectedZone] = useState<ShippingZone | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [shippingFee, setShippingFee] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [useCourier, setUseCourier] = useState(false);
  const [selectedCourier, setSelectedCourier] = useState<string>("");
  const [courierRate, setCourierRate] = useState<any>(null);
  const [calculatingCourier, setCalculatingCourier] = useState(false);
  const [enabledCouriers, setEnabledCouriers] = useState<string[]>([]);

  useEffect(() => {
    fetchZones();
    fetchEnabledCouriers();
  }, []);

  useEffect(() => {
    if (!useCourier && selectedZone && productWeight > 0) {
      const fee = calculateShipping(selectedZone, productWeight, subtotal);
      setShippingFee(fee);
      onShippingCalculated?.(fee);
    } else if (useCourier && courierRate) {
      setShippingFee(courierRate.estimated_cost);
      onShippingCalculated?.(courierRate.estimated_cost);
    }
  }, [selectedZone, productWeight, subtotal, useCourier, courierRate]);

  const fetchEnabledCouriers = async () => {
    try {
      const { data, error } = await supabase
        .from('treasure_admin_settings')
        .select('*')
        .like('setting_key', 'courier_%_enabled')
        .eq('setting_value', 'true');

      if (error) throw error;

      const couriers = data?.map(setting => 
        setting.setting_key.replace('courier_', '').replace('_enabled', '')
      ) || [];
      
      setEnabledCouriers(couriers);
    } catch (error) {
      console.error('Error fetching enabled couriers:', error);
    }
  };

  const fetchZones = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shipping_zones')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      setZones(data || []);
    } catch (error) {
      console.error('Error fetching zones:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateShipping = (zone: ShippingZone, weight: number, orderSubtotal: number): number => {
    if (zone.free_shipping_threshold && orderSubtotal >= zone.free_shipping_threshold) {
      return 0;
    }
    return zone.base_rate + (weight * zone.per_kg_rate);
  };

  const handleRegionSelect = (region: string) => {
    setSelectedRegion(region);
    const zone = zones.find(z => z.regions.includes(region));
    setSelectedZone(zone || null);
    setCourierRate(null);
  };

  const calculateCourierRate = async () => {
    if (!selectedCourier || !productWeight) {
      toast.error("Please select a courier and ensure product has weight");
      return;
    }

    try {
      setCalculatingCourier(true);
      
      const { data, error } = await supabase.functions.invoke('calculate-courier-rate', {
        body: {
          courier: selectedCourier,
          weight: productWeight,
          service_type: "Standard"
        }
      });

      if (error) throw error;

      if (data.success) {
        setCourierRate(data.shipping_rate);
        toast.success(`Shipping rate calculated: ₱${data.shipping_rate.estimated_cost}`);
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Error calculating courier rate:', error);
      toast.error('Failed to calculate courier rate');
    } finally {
      setCalculatingCourier(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-3 bg-muted/50 rounded">
        <Loader2 className="h-4 w-4 animate-spin text-primary mr-2" />
        <span className="text-xs text-muted-foreground">Loading shipping...</span>
      </div>
    );
  }

  const allRegions = zones.flatMap(z => z.regions).sort();

  const courierOptions = [
    { value: 'ninja_van', label: 'Ninja Van 🥷' },
    { value: 'jnt', label: 'J&T Express 📦' },
    { value: 'lbc', label: 'LBC 🚚' },
    { value: 'flash_express', label: 'Flash Express ⚡' },
  ].filter(c => enabledCouriers.includes(c.value));

  return (
    <div className="space-y-2 p-2 bg-muted/30 rounded border">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium flex items-center gap-1">
          <Truck className="h-3 w-3" />
          Shipping
        </p>
        {courierOptions.length > 0 && (
          <label className="text-[10px] flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={useCourier}
              onChange={(e) => setUseCourier(e.target.checked)}
              className="w-3 h-3"
            />
            Courier Rates
          </label>
        )}
      </div>

      {useCourier && courierOptions.length > 0 ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Select value={selectedCourier} onValueChange={setSelectedCourier}>
              <SelectTrigger className="h-7 text-xs flex-1">
                <SelectValue placeholder="Courier" />
              </SelectTrigger>
              <SelectContent>
                {courierOptions.map((courier) => (
                  <SelectItem key={courier.value} value={courier.value} className="text-xs">
                    {courier.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={calculateCourierRate}
              disabled={!selectedCourier || calculatingCourier}
              size="sm"
              className="h-7 text-xs px-2"
            >
              {calculatingCourier ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Get Rate'}
            </Button>
          </div>

          {courierRate && (
            <div className="p-2 bg-background rounded text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{courierRate.service_type} ({courierRate.estimated_delivery_days}d)</span>
                <span className="font-bold">₱{courierRate.estimated_cost.toFixed(0)}</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <Select value={selectedRegion} onValueChange={handleRegionSelect}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="Select region" />
            </SelectTrigger>
            <SelectContent>
              {allRegions.map((region) => (
                <SelectItem key={region} value={region} className="text-xs">
                  {region}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedZone && (
            <div className="p-2 bg-background rounded text-xs">
              <div className="flex justify-between text-muted-foreground mb-1">
                <span>{selectedZone.name}</span>
                <span>₱{selectedZone.base_rate} + ₱{selectedZone.per_kg_rate}/kg</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Shipping Fee:</span>
                <span className={shippingFee === 0 ? "text-green-600" : ""}>
                  {shippingFee === 0 ? 'FREE' : `₱${shippingFee.toFixed(0)}`}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
