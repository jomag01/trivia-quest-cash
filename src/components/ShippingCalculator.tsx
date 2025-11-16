import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
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
    <Card>
      <CardHeader>
        <CardTitle>Shipping Calculator</CardTitle>
        <CardDescription>
          Calculate shipping fees using zone rates or real-time courier pricing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {courierOptions.length > 0 && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <Truck className="h-4 w-4" />
            <label className="text-sm font-medium cursor-pointer flex-1" htmlFor="use-courier">
              Use Real-Time Courier Rates
            </label>
            <input
              id="use-courier"
              type="checkbox"
              checked={useCourier}
              onChange={(e) => setUseCourier(e.target.checked)}
              className="w-4 h-4"
            />
          </div>
        )}

        {useCourier && courierOptions.length > 0 ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Courier</label>
              <Select value={selectedCourier} onValueChange={setSelectedCourier}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose courier service" />
                </SelectTrigger>
                <SelectContent>
                  {courierOptions.map((courier) => (
                    <SelectItem key={courier.value} value={courier.value}>
                      {courier.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={calculateCourierRate}
              disabled={!selectedCourier || calculatingCourier}
              className="w-full"
            >
              {calculatingCourier ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Calculating...
                </>
              ) : (
                'Calculate Shipping Rate'
              )}
            </Button>

            {courierRate && (
              <div className="space-y-2 p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium">Courier Rate Details</p>
                <div className="text-sm space-y-1 text-muted-foreground">
                  <p>Service: {courierRate.service_type}</p>
                  <p>Est. Delivery: {courierRate.estimated_delivery_days} days</p>
                  {courierRate.is_estimated && (
                    <p className="text-amber-600">* Estimated rate (API key not configured)</p>
                  )}
                </div>
                <div className="pt-2 border-t mt-2">
                  <p className="text-lg font-semibold">
                    Shipping Fee: ₱{courierRate.estimated_cost.toFixed(2)}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Region</label>
              <Select value={selectedRegion} onValueChange={handleRegionSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose your region" />
                </SelectTrigger>
                <SelectContent>
                  {allRegions.map((region) => (
                    <SelectItem key={region} value={region}>
                      {region}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedZone && (
              <div className="space-y-2 p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium">Shipping Details</p>
                <div className="text-sm space-y-1 text-muted-foreground">
                  <p>Zone: {selectedZone.name}</p>
                  <p>Base Rate: ₱{selectedZone.base_rate}</p>
                  <p>Per KG Rate: ₱{selectedZone.per_kg_rate}</p>
                  {selectedZone.free_shipping_threshold && (
                    <p>Free shipping on orders over ₱{selectedZone.free_shipping_threshold}</p>
                  )}
                </div>
                <div className="pt-2 border-t mt-2">
                  <p className="text-lg font-semibold">
                    Shipping Fee: {shippingFee === 0 ? (
                      <span className="text-green-600">FREE</span>
                    ) : (
                      `₱${shippingFee.toFixed(2)}`
                    )}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
