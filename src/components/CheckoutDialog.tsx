import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Truck, Wallet, Building2, Package, CreditCard, MapPin } from "lucide-react";
import { toast } from "sonner";

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cartTotal: number;
  onCheckoutComplete: () => void;
}

const couriers = [
  { id: "lbc", name: "LBC Express", fee: 100, estimatedDays: "2-3 days", icon: "📦" },
  { id: "jnt", name: "J&T Express", fee: 80, estimatedDays: "2-4 days", icon: "🚚" },
  { id: "ninjavan", name: "Ninja Van", fee: 90, estimatedDays: "2-3 days", icon: "🥷" },
  { id: "lalamove", name: "Lalamove", fee: 150, estimatedDays: "Same day", icon: "⚡" },
  { id: "grab", name: "Grab Express", fee: 120, estimatedDays: "Same day", icon: "🛵" },
];

export const CheckoutDialog = ({ open, onOpenChange, cartTotal, onCheckoutComplete }: CheckoutDialogProps) => {
  const [step, setStep] = useState<"shipping" | "payment">("shipping");
  const [loading, setLoading] = useState(false);
  
  const [shippingInfo, setShippingInfo] = useState({
    fullName: "",
    phone: "",
    address: "",
    city: "",
    province: "",
    postalCode: "",
    notes: "",
  });

  const [selectedCourier, setSelectedCourier] = useState(couriers[0].id);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "gcash" | "maya" | "bank">("cod");

  const selectedCourierInfo = couriers.find(c => c.id === selectedCourier) || couriers[0];
  const shippingFee = selectedCourierInfo.fee;
  const total = cartTotal + shippingFee;

  const handleShippingContinue = () => {
    if (!shippingInfo.fullName || !shippingInfo.phone || !shippingInfo.address || !shippingInfo.city) {
      toast.error("Please fill in all required shipping information");
      return;
    }
    setStep("payment");
  };

  const handlePlaceOrder = async () => {
    setLoading(true);
    
    try {
      // Here you would typically:
      // 1. Create order in database
      // 2. Process payment (if online payment)
      // 3. Send order details to courier API
      // 4. Send confirmation email
      
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call

      toast.success("Order placed successfully!", {
        description: `Order will be delivered via ${selectedCourierInfo.name} in ${selectedCourierInfo.estimatedDays}`
      });
      
      onCheckoutComplete();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast.error("Failed to place order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep("shipping");
    setShippingInfo({
      fullName: "",
      phone: "",
      address: "",
      city: "",
      province: "",
      postalCode: "",
      notes: "",
    });
    setSelectedCourier(couriers[0].id);
    setPaymentMethod("cod");
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetForm();
    }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "shipping" ? "Shipping Information" : "Payment & Review"}
          </DialogTitle>
          <DialogDescription>
            {step === "shipping" 
              ? "Enter your delivery details" 
              : "Choose payment method and review your order"}
          </DialogDescription>
        </DialogHeader>

        {step === "shipping" ? (
          <div className="space-y-6">
            {/* Shipping Address */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <MapPin className="w-5 h-5 text-primary" />
                <span>Delivery Address</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    value={shippingInfo.fullName}
                    onChange={(e) => setShippingInfo({ ...shippingInfo, fullName: e.target.value })}
                    placeholder="Juan Dela Cruz"
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    value={shippingInfo.phone}
                    onChange={(e) => setShippingInfo({ ...shippingInfo, phone: e.target.value })}
                    placeholder="09123456789"
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="address">Street Address *</Label>
                  <Textarea
                    id="address"
                    value={shippingInfo.address}
                    onChange={(e) => setShippingInfo({ ...shippingInfo, address: e.target.value })}
                    placeholder="House/Unit No., Street Name, Barangay"
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="city">City/Municipality *</Label>
                  <Input
                    id="city"
                    value={shippingInfo.city}
                    onChange={(e) => setShippingInfo({ ...shippingInfo, city: e.target.value })}
                    placeholder="Quezon City"
                  />
                </div>

                <div>
                  <Label htmlFor="province">Province</Label>
                  <Input
                    id="province"
                    value={shippingInfo.province}
                    onChange={(e) => setShippingInfo({ ...shippingInfo, province: e.target.value })}
                    placeholder="Metro Manila"
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="postalCode">Postal Code</Label>
                  <Input
                    id="postalCode"
                    value={shippingInfo.postalCode}
                    onChange={(e) => setShippingInfo({ ...shippingInfo, postalCode: e.target.value })}
                    placeholder="1100"
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="notes">Delivery Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={shippingInfo.notes}
                    onChange={(e) => setShippingInfo({ ...shippingInfo, notes: e.target.value })}
                    placeholder="Landmark, special instructions, etc."
                    rows={2}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Courier Selection */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Truck className="w-5 h-5 text-primary" />
                <span>Select Courier</span>
              </div>

              <RadioGroup value={selectedCourier} onValueChange={setSelectedCourier}>
                {couriers.map((courier) => (
                  <div
                    key={courier.id}
                    className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                  >
                    <RadioGroupItem value={courier.id} id={courier.id} />
                    <Label
                      htmlFor={courier.id}
                      className="flex items-center justify-between flex-1 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{courier.icon}</span>
                        <div>
                          <div className="font-semibold">{courier.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {courier.estimatedDays}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-primary">₱{courier.fee}</div>
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <Button onClick={handleShippingContinue} className="w-full" size="lg">
              Continue to Payment
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Payment Method */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Wallet className="w-5 h-5 text-primary" />
                <span>Payment Method</span>
              </div>

              <RadioGroup value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
                <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
                  <RadioGroupItem value="cod" id="cod" />
                  <Label htmlFor="cod" className="flex items-center gap-3 cursor-pointer flex-1">
                    <Package className="w-5 h-5 text-primary" />
                    <div>
                      <div className="font-semibold">Cash on Delivery (COD)</div>
                      <div className="text-sm text-muted-foreground">Pay when you receive</div>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
                  <RadioGroupItem value="gcash" id="payment-gcash" />
                  <Label htmlFor="payment-gcash" className="flex items-center gap-3 cursor-pointer flex-1">
                    <Wallet className="w-5 h-5 text-primary" />
                    <div>
                      <div className="font-semibold">GCash</div>
                      <div className="text-sm text-muted-foreground">Pay via GCash e-wallet</div>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
                  <RadioGroupItem value="maya" id="payment-maya" />
                  <Label htmlFor="payment-maya" className="flex items-center gap-3 cursor-pointer flex-1">
                    <Wallet className="w-5 h-5 text-primary" />
                    <div>
                      <div className="font-semibold">Maya (PayMaya)</div>
                      <div className="text-sm text-muted-foreground">Pay via Maya e-wallet</div>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
                  <RadioGroupItem value="bank" id="payment-bank" />
                  <Label htmlFor="payment-bank" className="flex items-center gap-3 cursor-pointer flex-1">
                    <Building2 className="w-5 h-5 text-primary" />
                    <div>
                      <div className="font-semibold">Bank Transfer</div>
                      <div className="text-sm text-muted-foreground">Direct bank deposit</div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Separator />

            {/* Order Summary */}
            <div className="space-y-4 p-4 bg-accent/30 rounded-lg">
              <h3 className="font-semibold text-lg">Order Summary</h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>₱{cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Shipping ({selectedCourierInfo.name})
                  </span>
                  <span>₱{shippingFee.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">₱{total.toFixed(2)}</span>
                </div>
              </div>

              <div className="text-xs text-muted-foreground pt-2 border-t">
                <p className="font-semibold mb-1">Delivery to:</p>
                <p>{shippingInfo.fullName}</p>
                <p>{shippingInfo.phone}</p>
                <p>{shippingInfo.address}, {shippingInfo.city}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("shipping")} className="flex-1">
                Back
              </Button>
              <Button onClick={handlePlaceOrder} disabled={loading} className="flex-1" size="lg">
                {loading ? "Processing..." : `Place Order (₱${total.toFixed(2)})`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};