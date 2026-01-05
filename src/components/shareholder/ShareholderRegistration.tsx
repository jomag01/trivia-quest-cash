import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, PiggyBank, DollarSign, Upload, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface ShareholderRegistrationProps {
  onSuccess?: () => void;
}

export default function ShareholderRegistration({ onSuccess }: ShareholderRegistrationProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    investment_amount: '',
    share_percentage: '',
    payment_method: '',
    payment_reference: '',
    payment_proof_url: '',
    notes: ''
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `shareholder-proof-${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `shareholder-proofs/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, payment_proof_url: publicUrl }));
      toast.success('Payment proof uploaded');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      toast.error('Please login to apply');
      return;
    }

    if (!formData.full_name || !formData.email || !formData.investment_amount) {
      toast.error('Please fill in required fields');
      return;
    }

    setLoading(true);
    try {
      // Calculate share percentage based on investment
      const investmentAmount = parseFloat(formData.investment_amount);
      const sharePercentage = formData.share_percentage 
        ? parseFloat(formData.share_percentage) / 100 
        : 0;

      const { error } = await supabase
        .from('shareholders')
        .insert({
          user_id: user.id,
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone || null,
          investment_amount: investmentAmount,
          share_percentage: sharePercentage,
          payment_method: formData.payment_method || null,
          payment_reference: formData.payment_reference || null,
          payment_proof_url: formData.payment_proof_url || null,
          notes: formData.notes || null,
          status: 'pending'
        });

      if (error) throw error;

      setSubmitted(true);
      toast.success('Application submitted successfully!');
      onSuccess?.();
    } catch (error: any) {
      console.error('Error submitting application:', error);
      toast.error(error.message || 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <Card className="max-w-xl mx-auto">
        <CardContent className="py-12 text-center space-y-4">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
          <h3 className="text-2xl font-bold">Application Submitted!</h3>
          <p className="text-muted-foreground">
            Your shareholder application has been submitted for review. 
            Our team will contact you within 2-3 business days.
          </p>
          <Button onClick={() => setSubmitted(false)} variant="outline">
            Submit Another Application
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-xl mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <PiggyBank className="h-12 w-12 text-primary" />
        </div>
        <CardTitle className="text-2xl">Become a Shareholder</CardTitle>
        <CardDescription>
          Invest in our company and receive a share of the net profits
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Your full legal name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="your@email.com"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+63 9XX XXX XXXX"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="investment_amount">Investment Amount (₱) *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="investment_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  className="pl-9"
                  value={formData.investment_amount}
                  onChange={(e) => setFormData({ ...formData, investment_amount: e.target.value })}
                  placeholder="100,000"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="share_percentage">Proposed Share (%)</Label>
              <Input
                id="share_percentage"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={formData.share_percentage}
                onChange={(e) => setFormData({ ...formData, share_percentage: e.target.value })}
                placeholder="e.g., 5"
              />
              <p className="text-xs text-muted-foreground">Subject to admin approval</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select 
              value={formData.payment_method} 
              onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="gcash">GCash</SelectItem>
                <SelectItem value="maya">Maya</SelectItem>
                <SelectItem value="check">Check</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="crypto">Cryptocurrency</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_reference">Payment Reference / Transaction ID</Label>
            <Input
              id="payment_reference"
              value={formData.payment_reference}
              onChange={(e) => setFormData({ ...formData, payment_reference: e.target.value })}
              placeholder="Enter transaction reference"
            />
          </div>

          <div className="space-y-2">
            <Label>Payment Proof</Label>
            <div className="border-2 border-dashed rounded-lg p-4 text-center">
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileUpload}
                className="hidden"
                id="proof-upload"
              />
              <label htmlFor="proof-upload" className="cursor-pointer">
                {uploading ? (
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                ) : formData.payment_proof_url ? (
                  <div className="space-y-2">
                    <CheckCircle className="h-8 w-8 mx-auto text-green-500" />
                    <p className="text-sm text-green-600">Proof uploaded</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Click to upload payment proof</p>
                  </div>
                )}
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional information..."
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <PiggyBank className="h-4 w-4 mr-2" />
            )}
            Submit Application
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}