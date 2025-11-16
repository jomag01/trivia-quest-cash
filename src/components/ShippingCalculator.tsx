import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calculator, MapPin, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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

export const ShippingCalculator = ({ 
  productWeight = 1, 
  subtotal,
  onShippingCalculated 
}: ShippingCalculatorProps) => {
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [selectedZone, setSelectedZone] = useState<ShippingZone | null>(null);
  const [selectedRegion, setSelectedRegion] = useState("");
  const [calculatedFee, setCalculatedFee] = useState(0);

  useEffect(() => {
    fetchZones();
  }, []);

  useEffect(() => {
    if (selectedZone) {
      calculateShipping();
    }
  }, [selectedZone, subtotal, productWeight]);

  const fetchZones = async () => {
    const { data, error } = await supabase
      .from("shipping_zones")
      .select("*")
      .eq("is_active", true)
      .order("base_rate");

    if (!error && data) {
      setZones(data);
    }
  };

  const calculateShipping = () => {
    if (!selectedZone) {
      setCalculatedFee(0);
      onShippingCalculated(0);
      return;
    }

    // Check free shipping threshold
    if (selectedZone.free_shipping_threshold && subtotal >= selectedZone.free_shipping_threshold) {
      setCalculatedFee(0);
      onShippingCalculated(0);
      return;
    }

    // Calculate weight-based shipping
    const fee = selectedZone.base_rate + (productWeight * selectedZone.per_kg_rate);
    setCalculatedFee(fee);
    onShippingCalculated(fee);
  };

  const handleRegionSelect = (region: string) => {
    setSelectedRegion(region);
    
    // Find zone that contains this region
    const zone = zones.find(z => 
      z.regions.some(r => r.toLowerCase() === region.toLowerCase())
    );
    
    if (zone) {
      setSelectedZone(zone);
    }
  };

  const allRegions = zones.flatMap(z => z.regions).sort();
  const qualifiesForFreeShipping = selectedZone?.free_shipping_threshold 
    && subtotal >= selectedZone.free_shipping_threshold;

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Calculator className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Shipping Calculator</h3>
      </div>

      <div className="space-y-3">
        <div>
          <Label htmlFor="region" className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4" />
            Select Your Region
          </Label>
          <Select value={selectedRegion} onValueChange={handleRegionSelect}>
            <SelectTrigger id="region">
              <SelectValue placeholder="Choose your city/province" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {allRegions.map((region) => (
                <SelectItem key={region} value={region}>
                  {region}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedZone && (
          <>
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Zone:</span>
                <Badge variant="secondary">{selectedZone.name}</Badge>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Package className="w-3 h-3" />
                  Weight:
                </span>
                <span className="font-medium">{productWeight} kg</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Base Rate:</span>
                <span>₱{selectedZone.base_rate.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Per KG Rate:</span>
                <span>₱{selectedZone.per_kg_rate.toFixed(2)}/kg</span>
              </div>

              {selectedZone.free_shipping_threshold && (
                <div className="pt-2 border-t text-xs text-muted-foreground">
                  💡 Free shipping on orders ≥ ₱{selectedZone.free_shipping_threshold.toFixed(2)}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border-2 border-primary/20">
              <span className="font-semibold">Shipping Fee:</span>
              <div className="text-right">
                {qualifiesForFreeShipping ? (
                  <div>
                    <Badge className="bg-green-500">FREE SHIPPING!</Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      You qualify for free shipping
                    </p>
                  </div>
                ) : (
                  <span className="text-xl font-bold text-primary">
                    ₱{calculatedFee.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </Card>
  );
};
