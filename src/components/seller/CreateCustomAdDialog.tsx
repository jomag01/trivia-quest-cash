import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { uploadToStorage } from '@/lib/storage';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { Loader2, Upload, ChevronRight, Target, MapPin, Users, Image, DollarSign, CreditCard, Wallet, Building2, Copy, Check } from 'lucide-react';
import imageCompression from 'browser-image-compression';

interface CreateCustomAdDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PricingTier {
  id: string;
  tier_name: string;
  price_diamonds: number;
  impressions_included: number;
  duration_days: number;
  priority_level: number;
  description: string | null;
}

interface SliderPlacement {
  id: string;
  placement_key: string;
  placement_label: string;
  fee_per_day: number;
}

interface InterestCategory {
  id: string;
  category_name: string;
  interests: string[];
}

interface RevenueSetting {
  setting_key: string;
  setting_value: string;
}

const PHILIPPINES_REGIONS = [
  { value: 'all', label: 'All Regions' },
  { value: 'NCR', label: 'National Capital Region (NCR)' },
  { value: 'Region I', label: 'Region I - Ilocos Region' },
  { value: 'Region II', label: 'Region II - Cagayan Valley' },
  { value: 'Region III', label: 'Region III - Central Luzon' },
  { value: 'Region IV-A', label: 'Region IV-A - CALABARZON' },
  { value: 'Region V', label: 'Region V - Bicol Region' },
  { value: 'Region VI', label: 'Region VI - Western Visayas' },
  { value: 'Region VII', label: 'Region VII - Central Visayas' },
  { value: 'Region XI', label: 'Region XI - Davao Region' },
];

export function CreateCustomAdDialog({ open, onOpenChange }: CreateCustomAdDialogProps) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    link_type: 'custom' as 'shop' | 'marketplace' | 'restaurant' | 'service' | 'custom',
    link_url: '',
    budget_type: 'tier' as 'tier' | 'custom',
    pricing_tier_id: '',
    custom_daily_budget: 50,
    custom_duration_days: 7,
    placement_id: '',
    target_locations: [] as string[],
    target_interests: [] as string[],
    target_age_min: 18,
    target_age_max: 65,
    target_gender: 'all',
    payment_method: 'diamonds' as 'diamonds' | 'ewallet' | 'bank',
    payment_reference: '',
  });

  // Fetch pricing tiers
  const { data: pricingTiers = [] } = useQuery({
    queryKey: ['ad-pricing-tiers-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_pricing_tiers')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data as PricingTier[];
    },
    enabled: open,
  });

  // Fetch placements
  const { data: placements = [] } = useQuery({
    queryKey: ['slider-placements-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('slider_ad_settings')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data as SliderPlacement[];
    },
    enabled: open,
  });

  // Fetch interest categories
  const { data: interestCategories = [] } = useQuery({
    queryKey: ['ad-interest-categories-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_interest_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data as InterestCategory[];
    },
    enabled: open,
  });

  // Fetch payment settings
  const { data: paymentSettings = [] } = useQuery({
    queryKey: ['ad-payment-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_revenue_settings')
        .select('setting_key, setting_value')
        .in('setting_key', [
          'ewallet_name', 'ewallet_number', 'ewallet_holder',
          'bank_name', 'bank_account_number', 'bank_account_holder',
          'qr_code_url', 'min_daily_budget', 'max_daily_budget',
          'min_duration_days', 'max_duration_days'
        ]);
      if (error) throw error;
      return data as RevenueSetting[];
    },
    enabled: open,
  });

  const getSetting = (key: string) => paymentSettings.find(s => s.setting_key === key)?.setting_value || '';
  const minDailyBudget = parseInt(getSetting('min_daily_budget')) || 10;
  const maxDailyBudget = parseInt(getSetting('max_daily_budget')) || 1000;
  const minDuration = parseInt(getSetting('min_duration_days')) || 1;
  const maxDuration = parseInt(getSetting('max_duration_days')) || 90;

  const selectedTier = pricingTiers.find((t) => t.id === formData.pricing_tier_id);
  const userDiamonds = (profile as any)?.diamonds || 0;
  
  // Calculate total cost based on budget type
  const totalCost = formData.budget_type === 'tier' 
    ? (selectedTier?.price_diamonds || 0)
    : (formData.custom_daily_budget * formData.custom_duration_days);
  
  const canAffordDiamonds = userDiamonds >= totalCost;

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const options = { maxSizeMB: 1, maxWidthOrHeight: 1200, useWebWorker: true };
        const compressed = await imageCompression(file, options);
        setImageFile(compressed);
        setImagePreview(URL.createObjectURL(compressed));
      } catch {
        toast.error('Failed to process image');
      }
    }
  };

  const handleProofChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const options = { maxSizeMB: 1, maxWidthOrHeight: 1200, useWebWorker: true };
        const compressed = await imageCompression(file, options);
        setProofFile(compressed);
        setProofPreview(URL.createObjectURL(compressed));
      } catch {
        toast.error('Failed to process image');
      }
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const toggleLocation = (location: string) => {
    setFormData((prev) => ({
      ...prev,
      target_locations: prev.target_locations.includes(location)
        ? prev.target_locations.filter((l) => l !== location)
        : [...prev.target_locations, location],
    }));
  };

  const toggleInterest = (interest: string) => {
    setFormData((prev) => ({
      ...prev,
      target_interests: prev.target_interests.includes(interest)
        ? prev.target_interests.filter((i) => i !== interest)
        : [...prev.target_interests, interest],
    }));
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      if (!formData.title) throw new Error('Missing ad title');
      if (formData.budget_type === 'tier' && !formData.pricing_tier_id) {
        throw new Error('Please select a pricing tier');
      }
      if (formData.payment_method === 'diamonds' && !canAffordDiamonds) {
        throw new Error('Insufficient diamonds');
      }

      setUploading(true);

      let image_url = '';
      if (imageFile) {
        const result = await uploadToStorage('custom-ads', `${user.id}/${Date.now()}`, imageFile);
        if (result.error) throw new Error(result.error.message);
        image_url = result.data?.publicUrl || '';
      }

      let proof_url = '';
      if (proofFile && formData.payment_method !== 'diamonds') {
        const result = await uploadToStorage('payment-proofs', `${user.id}/${Date.now()}`, proofFile);
        if (result.error) throw new Error(result.error.message);
        proof_url = result.data?.publicUrl || '';
      }

      const durationDays = formData.budget_type === 'tier' 
        ? (selectedTier?.duration_days || 7)
        : formData.custom_duration_days;
      
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + durationDays);

      // If payment is NOT diamonds, create an ad spend request for admin approval
      if (formData.payment_method !== 'diamonds') {
        const { error: requestError } = await supabase.from('ad_spend_requests').insert({
          seller_id: user.id,
          ad_title: formData.title,
          ad_description: formData.description || null,
          image_url: image_url || null,
          link_type: formData.link_type,
          link_url: formData.link_url || null,
          target_locations: formData.target_locations.length > 0 ? formData.target_locations : null,
          target_interests: formData.target_interests.length > 0 ? formData.target_interests : null,
          target_age_min: formData.target_age_min,
          target_age_max: formData.target_age_max,
          target_gender: formData.target_gender,
          placement_id: formData.placement_id || null,
          budget_type: formData.budget_type,
          pricing_tier_id: formData.budget_type === 'tier' ? formData.pricing_tier_id : null,
          custom_daily_budget: formData.budget_type === 'custom' ? formData.custom_daily_budget : null,
          custom_duration_days: formData.budget_type === 'custom' ? formData.custom_duration_days : null,
          total_budget: totalCost,
          payment_method: formData.payment_method,
          payment_reference: formData.payment_reference || null,
          payment_proof_url: proof_url || null,
          status: 'pending',
        });

        if (requestError) throw requestError;
        return { type: 'request' };
      }

      // Pay with diamonds - create ad directly
      const { error: adError } = await supabase.from('seller_custom_ads').insert({
        seller_id: user.id,
        title: formData.title,
        description: formData.description || null,
        image_url: image_url || null,
        link_type: formData.link_type,
        link_url: formData.link_url || null,
        pricing_tier_id: formData.budget_type === 'tier' ? formData.pricing_tier_id : null,
        placement_id: formData.placement_id || null,
        target_locations: formData.target_locations.length > 0 ? formData.target_locations : null,
        target_interests: formData.target_interests.length > 0 ? formData.target_interests : null,
        target_age_min: formData.target_age_min,
        target_age_max: formData.target_age_max,
        target_gender: formData.target_gender,
        diamonds_paid: totalCost,
        max_impressions: formData.budget_type === 'tier' ? (selectedTier?.impressions_included || 0) : Math.floor(totalCost * 100),
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        status: 'pending',
        budget_type: formData.budget_type,
        custom_daily_budget: formData.budget_type === 'custom' ? formData.custom_daily_budget : null,
        custom_duration_days: formData.budget_type === 'custom' ? formData.custom_duration_days : null,
        total_budget: totalCost,
        payment_method: 'diamonds',
      });

      if (adError) throw adError;

      // Deduct diamonds
      const { error: deductError } = await supabase
        .from('profiles')
        .update({ diamonds: userDiamonds - totalCost })
        .eq('id', user.id);

      if (deductError) throw deductError;
      return { type: 'direct' };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['seller-custom-ads'] });
      queryClient.invalidateQueries({ queryKey: ['ad-spend-requests'] });
      if (result?.type === 'request') {
        toast.success('Ad spend request submitted! Waiting for admin approval.');
      } else {
        toast.success('Ad submitted for review!');
      }
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create ad');
    },
    onSettled: () => {
      setUploading(false);
    },
  });

  const resetForm = () => {
    setCurrentStep(1);
    setFormData({
      title: '',
      description: '',
      link_type: 'custom',
      link_url: '',
      budget_type: 'tier',
      pricing_tier_id: '',
      custom_daily_budget: 50,
      custom_duration_days: 7,
      placement_id: '',
      target_locations: [],
      target_interests: [],
      target_age_min: 18,
      target_age_max: 65,
      target_gender: 'all',
      payment_method: 'diamonds',
      payment_reference: '',
    });
    setImageFile(null);
    setImagePreview('');
    setProofFile(null);
    setProofPreview('');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="p-4 border-b bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 text-white rounded-t-lg">
          <DialogTitle className="text-white">Create Custom Ad Campaign</DialogTitle>
          <div className="flex items-center gap-2 mt-2">
            {[1, 2, 3, 4, 5].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                  currentStep >= step ? 'bg-white text-purple-600' : 'bg-white/30 text-white'
                }`}>
                  {step}
                </div>
                {step < 5 && <ChevronRight className="w-4 h-4 text-white/60 mx-1" />}
              </div>
            ))}
          </div>
        </DialogHeader>

        <ScrollArea className="h-[60vh]">
          <div className="p-4 space-y-4">
            {/* Step 1: Creative */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-purple-600 mb-2">
                  <Image className="w-5 h-5" />
                  <span className="font-semibold">Ad Creative</span>
                </div>
                
                <div>
                  <Label>Ad Title *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter ad title..."
                    className="border-purple-200 focus:border-purple-500"
                  />
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter ad description..."
                    rows={3}
                    className="border-purple-200 focus:border-purple-500"
                  />
                </div>

                <div>
                  <Label>Upload Image</Label>
                  <div className="mt-2">
                    {imagePreview ? (
                      <div className="relative">
                        <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover rounded-lg" />
                        <Button
                          variant="secondary"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => { setImageFile(null); setImagePreview(''); }}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-purple-300 rounded-lg cursor-pointer hover:bg-purple-50 transition-colors">
                        <Upload className="w-8 h-8 text-purple-400 mb-2" />
                        <span className="text-sm text-purple-600">Click to upload image</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                      </label>
                    )}
                  </div>
                </div>

                <div>
                  <Label>Link Type</Label>
                  <Select
                    value={formData.link_type}
                    onValueChange={(v) => setFormData({ ...formData, link_type: v as any })}
                  >
                    <SelectTrigger className="border-purple-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="shop">My Shop Products</SelectItem>
                      <SelectItem value="marketplace">My Marketplace Listings</SelectItem>
                      <SelectItem value="restaurant">My Restaurant</SelectItem>
                      <SelectItem value="service">My Services</SelectItem>
                      <SelectItem value="custom">Custom URL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Link URL</Label>
                  <Input
                    value={formData.link_url}
                    onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                    placeholder="https://..."
                    className="border-purple-200 focus:border-purple-500"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Targeting */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-pink-600 mb-2">
                  <Target className="w-5 h-5" />
                  <span className="font-semibold">Audience Targeting</span>
                </div>

                <div>
                  <Label>Target Gender</Label>
                  <Select
                    value={formData.target_gender}
                    onValueChange={(v) => setFormData({ ...formData, target_gender: v })}
                  >
                    <SelectTrigger className="border-pink-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Genders</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Age Range: {formData.target_age_min} - {formData.target_age_max}</Label>
                  <Slider
                    value={[formData.target_age_min, formData.target_age_max]}
                    onValueChange={([min, max]) => setFormData({ ...formData, target_age_min: min, target_age_max: max })}
                    min={13}
                    max={65}
                    step={1}
                    className="mt-3"
                  />
                </div>

                <div>
                  <Label className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-pink-500" /> Target Locations
                  </Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {PHILIPPINES_REGIONS.map((region) => (
                      <div key={region.value} className="flex items-center gap-2">
                        <Checkbox
                          checked={formData.target_locations.includes(region.value)}
                          onCheckedChange={() => toggleLocation(region.value)}
                          className="border-pink-300 data-[state=checked]:bg-pink-500"
                        />
                        <span className="text-sm">{region.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Interests */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-orange-600 mb-2">
                  <Users className="w-5 h-5" />
                  <span className="font-semibold">Interest Targeting</span>
                </div>

                {interestCategories.map((category) => (
                  <div key={category.id}>
                    <Label className="text-sm font-medium">{category.category_name}</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {category.interests.map((interest) => (
                        <Badge
                          key={interest}
                          variant={formData.target_interests.includes(interest) ? 'default' : 'outline'}
                          className={`cursor-pointer transition-colors ${
                            formData.target_interests.includes(interest) 
                              ? 'bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600' 
                              : 'hover:bg-orange-100'
                          }`}
                          onClick={() => toggleInterest(interest)}
                        >
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}

                {formData.target_interests.length > 0 && (
                  <div className="text-sm text-orange-600 font-medium">
                    ✓ Selected: {formData.target_interests.length} interests
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Budget & Duration */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-600 mb-2">
                  <DollarSign className="w-5 h-5" />
                  <span className="font-semibold">Budget & Duration</span>
                </div>

                {/* Budget Type Selection */}
                <div>
                  <Label>Budget Type</Label>
                  <RadioGroup
                    value={formData.budget_type}
                    onValueChange={(v) => setFormData({ ...formData, budget_type: v as 'tier' | 'custom' })}
                    className="grid grid-cols-2 gap-3 mt-2"
                  >
                    <Label className={`flex items-center gap-2 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.budget_type === 'tier' ? 'border-green-500 bg-green-50' : 'border-muted hover:border-green-300'
                    }`}>
                      <RadioGroupItem value="tier" />
                      <span>Select Pricing Tier</span>
                    </Label>
                    <Label className={`flex items-center gap-2 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.budget_type === 'custom' ? 'border-green-500 bg-green-50' : 'border-muted hover:border-green-300'
                    }`}>
                      <RadioGroupItem value="custom" />
                      <span>Custom Budget</span>
                    </Label>
                  </RadioGroup>
                </div>

                {formData.budget_type === 'tier' ? (
                  <div>
                    <Label>Select Pricing Tier *</Label>
                    <div className="grid gap-3 mt-2">
                      {pricingTiers.map((tier) => (
                        <Card
                          key={tier.id}
                          className={`p-4 cursor-pointer transition-all border-2 ${
                            formData.pricing_tier_id === tier.id 
                              ? 'border-green-500 bg-gradient-to-r from-green-50 to-emerald-50' 
                              : 'hover:border-green-300'
                          }`}
                          onClick={() => setFormData({ ...formData, pricing_tier_id: tier.id })}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-green-700">{tier.tier_name}</h4>
                              <p className="text-sm text-muted-foreground">{tier.description}</p>
                              <div className="flex gap-3 mt-1 text-xs">
                                <span className="text-blue-600">👁 {tier.impressions_included.toLocaleString()} impressions</span>
                                <span className="text-purple-600">📅 {tier.duration_days} days</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-lg font-bold text-green-600">💎 {tier.price_diamonds}</span>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label>Daily Budget (💎 Diamonds): {formData.custom_daily_budget}</Label>
                      <Slider
                        value={[formData.custom_daily_budget]}
                        onValueChange={([v]) => setFormData({ ...formData, custom_daily_budget: v })}
                        min={minDailyBudget}
                        max={maxDailyBudget}
                        step={10}
                        className="mt-3"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>Min: 💎{minDailyBudget}</span>
                        <span>Max: 💎{maxDailyBudget}</span>
                      </div>
                    </div>

                    <div>
                      <Label>Duration (Days): {formData.custom_duration_days}</Label>
                      <Slider
                        value={[formData.custom_duration_days]}
                        onValueChange={([v]) => setFormData({ ...formData, custom_duration_days: v })}
                        min={minDuration}
                        max={maxDuration}
                        step={1}
                        className="mt-3"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>Min: {minDuration} day</span>
                        <span>Max: {maxDuration} days</span>
                      </div>
                    </div>

                    <Card className="p-4 bg-gradient-to-r from-green-100 to-emerald-100 border-green-300">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Total Budget</p>
                        <p className="text-3xl font-bold text-green-600">
                          💎 {totalCost.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          ({formData.custom_daily_budget} × {formData.custom_duration_days} days)
                        </p>
                      </div>
                    </Card>
                  </div>
                )}

                <div>
                  <Label>Placement (Optional)</Label>
                  <Select
                    value={formData.placement_id}
                    onValueChange={(v) => setFormData({ ...formData, placement_id: v })}
                  >
                    <SelectTrigger className="border-green-200">
                      <SelectValue placeholder="Select placement..." />
                    </SelectTrigger>
                    <SelectContent>
                      {placements.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.placement_label} (+{p.fee_per_day}💎/day)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 5: Payment */}
            {currentStep === 5 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-blue-600 mb-2">
                  <CreditCard className="w-5 h-5" />
                  <span className="font-semibold">Payment Method</span>
                </div>

                <Card className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                  <div className="text-center mb-4">
                    <p className="text-sm text-muted-foreground">Total to Pay</p>
                    <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      💎 {totalCost.toLocaleString()}
                    </p>
                  </div>
                </Card>

                <RadioGroup
                  value={formData.payment_method}
                  onValueChange={(v) => setFormData({ ...formData, payment_method: v as any })}
                  className="space-y-3"
                >
                  {/* Diamonds Payment */}
                  <Label className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    formData.payment_method === 'diamonds' ? 'border-yellow-500 bg-yellow-50' : 'hover:border-yellow-300'
                  }`}>
                    <RadioGroupItem value="diamonds" />
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">💎</span>
                      <div>
                        <p className="font-medium">Pay with Diamonds</p>
                        <p className="text-xs text-muted-foreground">
                          Your balance: 💎{userDiamonds.toLocaleString()}
                          {!canAffordDiamonds && <span className="text-destructive ml-2">(Insufficient)</span>}
                        </p>
                      </div>
                    </div>
                  </Label>

                  {/* E-Wallet Payment */}
                  <Label className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    formData.payment_method === 'ewallet' ? 'border-green-500 bg-green-50' : 'hover:border-green-300'
                  }`}>
                    <RadioGroupItem value="ewallet" />
                    <div className="flex items-center gap-2">
                      <Wallet className="w-6 h-6 text-green-600" />
                      <div>
                        <p className="font-medium">E-Wallet ({getSetting('ewallet_name') || 'GCash'})</p>
                        <p className="text-xs text-muted-foreground">Requires admin approval</p>
                      </div>
                    </div>
                  </Label>

                  {/* Bank Transfer Payment */}
                  <Label className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    formData.payment_method === 'bank' ? 'border-blue-500 bg-blue-50' : 'hover:border-blue-300'
                  }`}>
                    <RadioGroupItem value="bank" />
                    <div className="flex items-center gap-2">
                      <Building2 className="w-6 h-6 text-blue-600" />
                      <div>
                        <p className="font-medium">Bank Transfer</p>
                        <p className="text-xs text-muted-foreground">Requires admin approval</p>
                      </div>
                    </div>
                  </Label>
                </RadioGroup>

                {/* E-Wallet Details */}
                {formData.payment_method === 'ewallet' && (
                  <Card className="p-4 bg-green-50 border-green-200 space-y-3">
                    <h4 className="font-medium text-green-700">E-Wallet Payment Details</h4>
                    {getSetting('qr_code_url') && (
                      <div className="flex justify-center">
                        <img src={getSetting('qr_code_url')} alt="QR Code" className="w-40 h-40 rounded-lg" />
                      </div>
                    )}
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center p-2 bg-white rounded">
                        <span className="text-muted-foreground">Account Name:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{getSetting('ewallet_holder')}</span>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyToClipboard(getSetting('ewallet_holder'), 'ewallet_holder')}>
                            {copiedField === 'ewallet_holder' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                          </Button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-white rounded">
                        <span className="text-muted-foreground">Account Number:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{getSetting('ewallet_number')}</span>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyToClipboard(getSetting('ewallet_number'), 'ewallet_number')}>
                            {copiedField === 'ewallet_number' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div>
                      <Label>Payment Reference Number *</Label>
                      <Input
                        value={formData.payment_reference}
                        onChange={(e) => setFormData({ ...formData, payment_reference: e.target.value })}
                        placeholder="Enter reference number..."
                        className="border-green-200"
                      />
                    </div>
                    <div>
                      <Label>Upload Payment Proof</Label>
                      {proofPreview ? (
                        <div className="relative mt-2">
                          <img src={proofPreview} alt="Proof" className="w-full h-32 object-cover rounded-lg" />
                          <Button size="sm" variant="secondary" className="absolute top-2 right-2" onClick={() => { setProofFile(null); setProofPreview(''); }}>
                            Remove
                          </Button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-green-300 rounded-lg cursor-pointer hover:bg-green-50 mt-2">
                          <Upload className="w-6 h-6 text-green-400" />
                          <span className="text-xs text-green-600">Upload screenshot</span>
                          <input type="file" accept="image/*" className="hidden" onChange={handleProofChange} />
                        </label>
                      )}
                    </div>
                  </Card>
                )}

                {/* Bank Transfer Details */}
                {formData.payment_method === 'bank' && (
                  <Card className="p-4 bg-blue-50 border-blue-200 space-y-3">
                    <h4 className="font-medium text-blue-700">Bank Transfer Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center p-2 bg-white rounded">
                        <span className="text-muted-foreground">Bank Name:</span>
                        <span className="font-medium">{getSetting('bank_name')}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-white rounded">
                        <span className="text-muted-foreground">Account Name:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{getSetting('bank_account_holder')}</span>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyToClipboard(getSetting('bank_account_holder'), 'bank_holder')}>
                            {copiedField === 'bank_holder' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                          </Button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-white rounded">
                        <span className="text-muted-foreground">Account Number:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{getSetting('bank_account_number')}</span>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyToClipboard(getSetting('bank_account_number'), 'bank_number')}>
                            {copiedField === 'bank_number' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div>
                      <Label>Payment Reference Number *</Label>
                      <Input
                        value={formData.payment_reference}
                        onChange={(e) => setFormData({ ...formData, payment_reference: e.target.value })}
                        placeholder="Enter reference number..."
                        className="border-blue-200"
                      />
                    </div>
                    <div>
                      <Label>Upload Payment Proof</Label>
                      {proofPreview ? (
                        <div className="relative mt-2">
                          <img src={proofPreview} alt="Proof" className="w-full h-32 object-cover rounded-lg" />
                          <Button size="sm" variant="secondary" className="absolute top-2 right-2" onClick={() => { setProofFile(null); setProofPreview(''); }}>
                            Remove
                          </Button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:bg-blue-50 mt-2">
                          <Upload className="w-6 h-6 text-blue-400" />
                          <span className="text-xs text-blue-600">Upload screenshot</span>
                          <input type="file" accept="image/*" className="hidden" onChange={handleProofChange} />
                        </label>
                      )}
                    </div>
                  </Card>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t flex gap-2 bg-muted/30">
          {currentStep > 1 && (
            <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)}>
              Back
            </Button>
          )}
          <div className="flex-1" />
          {currentStep < 5 ? (
            <Button 
              onClick={() => setCurrentStep(currentStep + 1)}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              Continue
            </Button>
          ) : (
            <Button
              onClick={() => submitMutation.mutate()}
              disabled={
                !formData.title || 
                (formData.budget_type === 'tier' && !formData.pricing_tier_id) ||
                (formData.payment_method === 'diamonds' && !canAffordDiamonds) || 
                (formData.payment_method !== 'diamonds' && !formData.payment_reference) ||
                uploading || 
                submitMutation.isPending
              }
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              {uploading || submitMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : formData.payment_method === 'diamonds' ? (
                `Create Ad (${totalCost} 💎)`
              ) : (
                'Submit for Approval'
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
