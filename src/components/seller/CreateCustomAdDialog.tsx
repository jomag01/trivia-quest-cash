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
import { toast } from 'sonner';
import { Loader2, Upload, ChevronRight, Target, MapPin, Users, Image } from 'lucide-react';
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

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    link_type: 'custom' as 'shop' | 'marketplace' | 'restaurant' | 'service' | 'custom',
    link_url: '',
    pricing_tier_id: '',
    placement_id: '',
    target_locations: [] as string[],
    target_interests: [] as string[],
    target_age_min: 18,
    target_age_max: 65,
    target_gender: 'all',
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

  const selectedTier = pricingTiers.find((t) => t.id === formData.pricing_tier_id);
  const selectedPlacement = placements.find((p) => p.id === formData.placement_id);
  const userDiamonds = (profile as any)?.diamonds || 0;
  const totalCost = selectedTier?.price_diamonds || 0;
  const canAfford = userDiamonds >= totalCost;

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
      if (!canAfford) throw new Error('Insufficient diamonds');
      if (!formData.title || !formData.pricing_tier_id) throw new Error('Missing required fields');

      setUploading(true);

      let image_url = '';
      if (imageFile) {
        const result = await uploadToStorage('custom-ads', `${user.id}/${Date.now()}`, imageFile);
        if (result.error) throw new Error(result.error.message);
        image_url = result.data?.publicUrl || '';
      }

      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + (selectedTier?.duration_days || 7));

      // Create the ad
      const { error: adError } = await supabase.from('seller_custom_ads').insert({
        seller_id: user.id,
        title: formData.title,
        description: formData.description || null,
        image_url: image_url || null,
        link_type: formData.link_type,
        link_url: formData.link_url || null,
        pricing_tier_id: formData.pricing_tier_id,
        placement_id: formData.placement_id || null,
        target_locations: formData.target_locations.length > 0 ? formData.target_locations : null,
        target_interests: formData.target_interests.length > 0 ? formData.target_interests : null,
        target_age_min: formData.target_age_min,
        target_age_max: formData.target_age_max,
        target_gender: formData.target_gender,
        diamonds_paid: totalCost,
        max_impressions: selectedTier?.impressions_included || 0,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        status: 'pending',
      });

      if (adError) throw adError;

      // Deduct diamonds
      const { error: deductError } = await supabase
        .from('profiles')
        .update({ diamonds: userDiamonds - totalCost })
        .eq('id', user.id);

      if (deductError) throw deductError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-custom-ads'] });
      toast.success('Ad submitted for review!');
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
      pricing_tier_id: '',
      placement_id: '',
      target_locations: [],
      target_interests: [],
      target_age_min: 18,
      target_age_max: 65,
      target_gender: 'all',
    });
    setImageFile(null);
    setImagePreview('');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Create Custom Ad Campaign</DialogTitle>
          <div className="flex items-center gap-2 mt-2">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                  currentStep >= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  {step}
                </div>
                {step < 4 && <ChevronRight className="w-4 h-4 text-muted-foreground mx-1" />}
              </div>
            ))}
          </div>
        </DialogHeader>

        <ScrollArea className="h-[60vh]">
          <div className="p-4 space-y-4">
            {/* Step 1: Creative */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Image className="w-4 h-4" />
                  <span className="text-sm font-medium">Ad Creative</span>
                </div>
                
                <div>
                  <Label>Ad Title *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter ad title..."
                  />
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter ad description..."
                    rows={3}
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
                      <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50">
                        <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground">Click to upload image</span>
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
                    <SelectTrigger>
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
                  />
                </div>
              </div>
            )}

            {/* Step 2: Targeting */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Target className="w-4 h-4" />
                  <span className="text-sm font-medium">Audience Targeting</span>
                </div>

                <div>
                  <Label>Target Gender</Label>
                  <Select
                    value={formData.target_gender}
                    onValueChange={(v) => setFormData({ ...formData, target_gender: v })}
                  >
                    <SelectTrigger>
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
                    <MapPin className="w-4 h-4" /> Target Locations
                  </Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {PHILIPPINES_REGIONS.map((region) => (
                      <div key={region.value} className="flex items-center gap-2">
                        <Checkbox
                          checked={formData.target_locations.includes(region.value)}
                          onCheckedChange={() => toggleLocation(region.value)}
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
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Users className="w-4 h-4" />
                  <span className="text-sm font-medium">Interest Targeting</span>
                </div>

                {interestCategories.map((category) => (
                  <div key={category.id}>
                    <Label className="text-sm font-medium">{category.category_name}</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {category.interests.map((interest) => (
                        <Badge
                          key={interest}
                          variant={formData.target_interests.includes(interest) ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => toggleInterest(interest)}
                        >
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}

                {formData.target_interests.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    Selected: {formData.target_interests.length} interests
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Budget & Placement */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div>
                  <Label>Select Pricing Tier *</Label>
                  <div className="grid gap-3 mt-2">
                    {pricingTiers.map((tier) => (
                      <Card
                        key={tier.id}
                        className={`p-4 cursor-pointer transition-colors ${
                          formData.pricing_tier_id === tier.id ? 'border-primary bg-primary/5' : ''
                        }`}
                        onClick={() => setFormData({ ...formData, pricing_tier_id: tier.id })}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{tier.tier_name}</h4>
                            <p className="text-sm text-muted-foreground">{tier.description}</p>
                            <div className="flex gap-3 mt-1 text-xs">
                              <span>👁 {tier.impressions_included.toLocaleString()} impressions</span>
                              <span>📅 {tier.duration_days} days</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-bold">💎 {tier.price_diamonds}</span>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Placement (Optional)</Label>
                  <Select
                    value={formData.placement_id}
                    onValueChange={(v) => setFormData({ ...formData, placement_id: v })}
                  >
                    <SelectTrigger>
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

                {/* Summary */}
                <Card className="p-4 bg-muted/50">
                  <h4 className="font-medium mb-2">Campaign Summary</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Pricing Tier:</span>
                      <span>{selectedTier?.tier_name || 'Not selected'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Impressions:</span>
                      <span>{selectedTier?.impressions_included.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Duration:</span>
                      <span>{selectedTier?.duration_days || 0} days</span>
                    </div>
                    <div className="flex justify-between font-medium pt-2 border-t">
                      <span>Total Cost:</span>
                      <span>💎 {totalCost}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Your Balance:</span>
                      <span className={canAfford ? '' : 'text-destructive'}>💎 {userDiamonds}</span>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t flex gap-2">
          {currentStep > 1 && (
            <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)}>
              Back
            </Button>
          )}
          <div className="flex-1" />
          {currentStep < 4 ? (
            <Button onClick={() => setCurrentStep(currentStep + 1)}>
              Continue
            </Button>
          ) : (
            <Button
              onClick={() => submitMutation.mutate()}
              disabled={!formData.title || !formData.pricing_tier_id || !canAfford || uploading || submitMutation.isPending}
            >
              {uploading || submitMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                `Create Ad (${totalCost} 💎)`
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}