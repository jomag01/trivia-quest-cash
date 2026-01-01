import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Megaphone, Gem, Calendar, Loader2, Upload } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { uploadToStorage } from '@/lib/storage';

interface PromoteToSliderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  linkType?: 'product' | 'restaurant' | 'service' | 'listing';
  linkEntityId?: string;
  linkTitle?: string;
}

interface SliderPlacement {
  id: string;
  placement_key: string;
  placement_label: string;
  description: string | null;
  fee_per_day: number;
  min_duration_days: number;
  max_duration_days: number;
  is_active: boolean;
}

export function PromoteToSliderDialog({
  open,
  onOpenChange,
  linkType = 'product',
  linkEntityId,
  linkTitle,
}: PromoteToSliderDialogProps) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPlacement, setSelectedPlacement] = useState<string>('');
  const [duration, setDuration] = useState(7);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [formData, setFormData] = useState({
    title: linkTitle || '',
    description: '',
    link_url: '',
  });

  const { data: placements = [], isLoading } = useQuery({
    queryKey: ['slider-placements'],
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

  const selectedPlacementData = placements.find(p => p.id === selectedPlacement);
  const totalCost = selectedPlacementData ? selectedPlacementData.fee_per_day * duration : 0;
  const userDiamonds = (profile as any)?.diamonds || 0;
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

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user || !selectedPlacement) throw new Error('Missing data');
      if (!canAfford) throw new Error('Insufficient diamonds');

      let image_url = '';
      if (imageFile) {
        const result = await uploadToStorage('slider-ads', `${user.id}/${Date.now()}`, imageFile);
        if (result.error) throw new Error(result.error.message);
        image_url = result.data?.publicUrl || '';
      }

      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + duration);

      // Create the ad
      const { error: adError } = await supabase.from('seller_slider_ads').insert({
        seller_id: user.id,
        placement_id: selectedPlacement,
        title: formData.title,
        description: formData.description || null,
        image_url: image_url || null,
        link_url: formData.link_url || null,
        link_type: linkType,
        link_entity_id: linkEntityId || null,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        diamonds_paid: totalCost,
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
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast.success('Ad submitted for review!');
      onOpenChange(false);
      setFormData({ title: linkTitle || '', description: '', link_url: '' });
      setImageFile(null);
      setImagePreview('');
      setSelectedPlacement('');
      setDuration(7);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to submit ad'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-primary" />
            Promote to Slider
          </DialogTitle>
          <DialogDescription>
            Create a featured ad to promote your {linkType} in the slider
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label>Select Placement</Label>
              <Select value={selectedPlacement} onValueChange={setSelectedPlacement}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose where to display your ad" />
                </SelectTrigger>
                <SelectContent>
                  {placements.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2">
                        <span>{p.placement_label}</span>
                        <Badge variant="outline" className="text-xs">
                          💎 {p.fee_per_day}/day
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPlacementData && (
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedPlacementData.description}
                </p>
              )}
            </div>

            {selectedPlacement && (
              <>
                <div>
                  <Label>Duration (days)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={selectedPlacementData?.min_duration_days || 1}
                      max={selectedPlacementData?.max_duration_days || 30}
                      value={duration}
                      onChange={(e) => setDuration(parseInt(e.target.value) || 1)}
                    />
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>

                <div>
                  <Label>Ad Title</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Catchy headline for your ad"
                  />
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Short description..."
                    rows={2}
                  />
                </div>

                <div>
                  <Label>Ad Image</Label>
                  <div className="mt-2">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover rounded-lg mb-2" />
                    ) : (
                      <div className="w-full h-40 border-2 border-dashed rounded-lg flex items-center justify-center">
                        <Upload className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    <Input type="file" accept="image/*" onChange={handleImageChange} />
                  </div>
                </div>

                <div>
                  <Label>Link URL (optional)</Label>
                  <Input
                    value={formData.link_url}
                    onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>

                <Card className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Total Cost</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedPlacementData?.fee_per_day} × {duration} days
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold flex items-center gap-1">
                        <Gem className="w-5 h-5 text-cyan-500" />
                        {totalCost}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        You have: {userDiamonds} 💎
                      </p>
                    </div>
                  </div>
                </Card>

                {!canAfford && (
                  <p className="text-sm text-destructive text-center">
                    Insufficient diamonds. You need {totalCost - userDiamonds} more.
                  </p>
                )}

                <Button
                  className="w-full"
                  onClick={() => submitMutation.mutate()}
                  disabled={submitMutation.isPending || !canAfford || !formData.title}
                >
                  {submitMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Megaphone className="w-4 h-4 mr-2" />
                  )}
                  Submit for Review
                </Button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
