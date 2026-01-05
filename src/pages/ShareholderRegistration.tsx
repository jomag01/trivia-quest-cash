import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, PiggyBank, DollarSign, Upload, CheckCircle, FileText, Shield, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function ShareholderRegistrationPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [validatingToken, setValidatingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [uploadingPayment, setUploadingPayment] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    investment_amount: '',
    share_percentage: '',
    payment_method: '',
    payment_reference: '',
    payment_proof_url: '',
    authenticated_document_url: '',
    notes: ''
  });

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    // If user is logged in, allow access without token
    if (user) {
      setTokenValid(true);
      setValidatingToken(false);
      return;
    }

    if (!token) {
      setTokenValid(false);
      setValidatingToken(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('shareholder_registration_tokens')
        .select('*')
        .eq('token', token)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        setTokenValid(false);
      } else {
        // Check if expired
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          setTokenValid(false);
        } else if (data.max_uses && data.uses_count >= data.max_uses) {
          setTokenValid(false);
        } else {
          setTokenValid(true);
        }
      }
    } catch (error) {
      console.error('Token validation error:', error);
      setTokenValid(false);
    } finally {
      setValidatingToken(false);
    }
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>, 
    type: 'payment' | 'document'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const setUploading = type === 'payment' ? setUploadingPayment : setUploadingDocument;
    const fieldName = type === 'payment' ? 'payment_proof_url' : 'authenticated_document_url';

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `shareholder-${type}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `shareholder-${type}s/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, [fieldName]: publicUrl }));
      toast.success(`${type === 'payment' ? 'Payment proof' : 'Authenticated document'} uploaded`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.full_name || !formData.email || !formData.investment_amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!formData.authenticated_document_url) {
      toast.error('Please upload the signed authenticated document from admin');
      return;
    }

    setLoading(true);
    try {
      const investmentAmount = parseFloat(formData.investment_amount);
      const sharePercentage = formData.share_percentage 
        ? parseFloat(formData.share_percentage) / 100 
        : 0;

      const { error } = await supabase
        .from('shareholders')
        .insert({
          user_id: user?.id || '00000000-0000-0000-0000-000000000000', // Guest user placeholder
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone || null,
          investment_amount: investmentAmount,
          share_percentage: sharePercentage,
          payment_method: formData.payment_method || null,
          payment_reference: formData.payment_reference || null,
          payment_proof_url: formData.payment_proof_url || null,
          authenticated_document_url: formData.authenticated_document_url,
          notes: formData.notes || null,
          status: 'pending'
        });

      if (error) throw error;

      // Update token usage if used
      if (token) {
        // Simple increment - ignore errors as this is not critical
        await supabase
          .from('shareholder_registration_tokens')
          .update({ uses_count: 1 })
          .eq('token', token);
      }

      setSubmitted(true);
      toast.success('Application submitted successfully!');
    } catch (error: any) {
      console.error('Error submitting application:', error);
      toast.error(error.message || 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  if (validatingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Validating access...</p>
        </div>
      </div>
    );
  }

  if (!tokenValid && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center space-y-4">
            <Shield className="h-16 w-16 text-destructive mx-auto" />
            <h3 className="text-2xl font-bold">Access Denied</h3>
            <p className="text-muted-foreground">
              This registration form requires a valid invitation link or you need to be logged in.
            </p>
            <div className="flex flex-col gap-2">
              <Button asChild>
                <Link to="/auth">Login to Continue</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Home
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-xl w-full">
          <CardContent className="py-12 text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h3 className="text-2xl font-bold">Application Submitted!</h3>
            <p className="text-muted-foreground">
              Your shareholder application has been submitted for review. 
              Our team will verify your authenticated documents and contact you within 2-3 business days.
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => setSubmitted(false)} variant="outline">
                Submit Another Application
              </Button>
              <Button variant="ghost" asChild>
                <Link to="/">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Home
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Button variant="ghost" asChild className="mb-4">
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
        </Button>

        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <PiggyBank className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl">Shareholder Registration</CardTitle>
            <CardDescription>
              Invest in our company and receive a share of the net profits. 
              Please ensure you have the admin-signed authenticated document ready for upload.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Legal Name *</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      placeholder="Juan Dela Cruz"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="juan@email.com"
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
              </div>

              {/* Investment Details */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Investment Details</h3>
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
                    <Label htmlFor="share_percentage">Proposed Share Percentage (%)</Label>
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
                    <p className="text-xs text-muted-foreground">Subject to admin approval based on total investment</p>
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Payment Information</h3>
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
                    placeholder="Enter transaction reference number"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Payment Proof</Label>
                  <div className="border-2 border-dashed rounded-lg p-4 text-center">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => handleFileUpload(e, 'payment')}
                      className="hidden"
                      id="payment-proof-upload"
                    />
                    <label htmlFor="payment-proof-upload" className="cursor-pointer">
                      {uploadingPayment ? (
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                      ) : formData.payment_proof_url ? (
                        <div className="space-y-2">
                          <CheckCircle className="h-8 w-8 mx-auto text-green-500" />
                          <p className="text-sm text-green-600">Payment proof uploaded</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">Click to upload payment proof (receipt/screenshot)</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              </div>

              {/* Authenticated Document */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Authenticated Document *</h3>
                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <div className="flex items-start gap-2">
                    <Shield className="h-5 w-5 text-primary mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium">Required: Admin-Signed Document</p>
                      <p className="text-muted-foreground">
                        Please upload the official shareholder agreement document that has been signed and authenticated by the company administrator. This serves as proof of your legitimate investment.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="border-2 border-dashed border-primary/50 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={(e) => handleFileUpload(e, 'document')}
                    className="hidden"
                    id="authenticated-doc-upload"
                  />
                  <label htmlFor="authenticated-doc-upload" className="cursor-pointer">
                    {uploadingDocument ? (
                      <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
                    ) : formData.authenticated_document_url ? (
                      <div className="space-y-2">
                        <CheckCircle className="h-10 w-10 mx-auto text-green-500" />
                        <p className="text-sm font-medium text-green-600">Authenticated document uploaded</p>
                        <p className="text-xs text-muted-foreground">Click to replace</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <FileText className="h-10 w-10 mx-auto text-primary" />
                        <p className="text-sm font-medium">Upload Signed Document</p>
                        <p className="text-xs text-muted-foreground">
                          PDF, DOC, DOCX, or Image (max 10MB)
                        </p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Additional Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any additional information you'd like to share..."
                  rows={3}
                />
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <PiggyBank className="h-4 w-4 mr-2" />
                )}
                Submit Shareholder Application
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
