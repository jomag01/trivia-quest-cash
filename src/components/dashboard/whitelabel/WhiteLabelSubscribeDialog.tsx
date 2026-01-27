import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CreditCard, Building2, Globe, Upload, Loader2 } from "lucide-react";

interface WhiteLabelTier {
  id: string;
  tier_name: string;
  price_php: number;
  billing_cycle: string;
}

interface Props {
  tier: WhiteLabelTier;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function WhiteLabelSubscribeDialog({ tier, open, onOpenChange, onSuccess }: Props) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    custom_domain: '',
    payment_method: 'gcash',
    payment_reference: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    if (!formData.company_name || !formData.payment_reference) {
      toast.error('Please fill in required fields');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('whitelabel_subscriptions').insert({
        client_id: user.id,
        tier_id: tier.id,
        client_name: profile?.full_name || user.email?.split('@')[0] || 'Unknown',
        client_email: user.email,
        company_name: formData.company_name,
        custom_domain: formData.custom_domain,
        payment_method: formData.payment_method,
        payment_reference: formData.payment_reference,
        amount_paid: tier.price_php,
        admin_notes: formData.notes,
        status: 'pending',
      });

      if (error) throw error;

      toast.success('Application submitted! We will review your payment and activate your platform.');
      onSuccess();
    } catch (error: any) {
      console.error('Error submitting application:', error);
      toast.error(error.message || 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Subscribe to {tier.tier_name}
          </DialogTitle>
          <DialogDescription>
            Complete your application for the white-label platform
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Pricing Summary */}
          <div className="p-3 bg-primary/5 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">{tier.tier_name} Plan</span>
              <span className="text-lg font-bold">₱{tier.price_php.toLocaleString()}</span>
            </div>
            <p className="text-xs text-muted-foreground">Billed {tier.billing_cycle}</p>
          </div>

          {/* Company Name */}
          <div className="space-y-1.5">
            <Label className="text-sm flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              Company Name *
            </Label>
            <Input
              placeholder="Your company or brand name"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              required
            />
          </div>

          {/* Custom Domain */}
          <div className="space-y-1.5">
            <Label className="text-sm flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" />
              Preferred Domain (optional)
            </Label>
            <Input
              placeholder="yourplatform.com"
              value={formData.custom_domain}
              onChange={(e) => setFormData({ ...formData, custom_domain: e.target.value })}
            />
            <p className="text-[10px] text-muted-foreground">
              You can set this up later if you don't have a domain yet
            </p>
          </div>

          {/* Payment Method */}
          <div className="space-y-1.5">
            <Label className="text-sm">Payment Method *</Label>
            <Select
              value={formData.payment_method}
              onValueChange={(v) => setFormData({ ...formData, payment_method: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gcash">GCash</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="maya">Maya/PayMaya</SelectItem>
                <SelectItem value="credit_card">Credit/Debit Card</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payment Reference */}
          <div className="space-y-1.5">
            <Label className="text-sm">Payment Reference Number *</Label>
            <Input
              placeholder="Transaction ID or Reference #"
              value={formData.payment_reference}
              onChange={(e) => setFormData({ ...formData, payment_reference: e.target.value })}
              required
            />
            <p className="text-[10px] text-muted-foreground">
              Enter your payment transaction reference for verification
            </p>
          </div>

          {/* Additional Notes */}
          <div className="space-y-1.5">
            <Label className="text-sm">Additional Notes (optional)</Label>
            <Textarea
              placeholder="Any special requirements or notes..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
            />
          </div>

          {/* Payment Instructions */}
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <p className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-1">
              Payment Instructions:
            </p>
            <ul className="text-[10px] text-amber-700 dark:text-amber-300 space-y-0.5">
              <li>• Send ₱{tier.price_php.toLocaleString()} to our payment accounts</li>
              <li>• GCash: 0917-XXX-XXXX</li>
              <li>• BDO: XXXX-XXXX-XXXX</li>
              <li>• Include your email as payment reference</li>
            </ul>
          </div>

          {/* Submit Button */}
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Application'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
