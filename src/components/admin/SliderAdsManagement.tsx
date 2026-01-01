import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Megaphone, Settings, Eye, MousePointer, Loader2, Check, X, Edit2 } from 'lucide-react';

interface SliderSetting {
  id: string;
  placement_key: string;
  placement_label: string;
  description: string | null;
  fee_per_day: number;
  min_duration_days: number;
  max_duration_days: number;
  max_ads_shown: number;
  is_active: boolean;
  display_order: number;
}

interface SliderAd {
  id: string;
  seller_id: string;
  placement_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  video_url: string | null;
  link_url: string | null;
  start_date: string;
  end_date: string;
  diamonds_paid: number;
  status: string;
  admin_notes: string | null;
  impressions: number;
  clicks: number;
  created_at: string;
  profiles?: { full_name: string | null; email: string };
  slider_ad_settings?: { placement_label: string };
}

export default function SliderAdsManagement() {
  const queryClient = useQueryClient();
  const [editingSetting, setEditingSetting] = useState<SliderSetting | null>(null);
  const [reviewingAd, setReviewingAd] = useState<SliderAd | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  const { data: settings = [], isLoading: loadingSettings } = useQuery({
    queryKey: ['slider-ad-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('slider_ad_settings')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data as SliderSetting[];
    },
  });

  const { data: pendingAds = [], isLoading: loadingAds } = useQuery({
    queryKey: ['pending-slider-ads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seller_slider_ads')
        .select(`
          *,
          slider_ad_settings:placement_id (placement_label)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      
      // Fetch seller profiles separately
      const sellerIds = [...new Set((data || []).map(d => d.seller_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', sellerIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      return (data || []).map(ad => ({
        ...ad,
        profiles: profileMap.get(ad.seller_id) || null,
      })) as SliderAd[];
    },
  });

  const updateSettingMutation = useMutation({
    mutationFn: async (setting: SliderSetting) => {
      const { error } = await supabase
        .from('slider_ad_settings')
        .update({
          fee_per_day: setting.fee_per_day,
          min_duration_days: setting.min_duration_days,
          max_duration_days: setting.max_duration_days,
          max_ads_shown: setting.max_ads_shown,
          is_active: setting.is_active,
        })
        .eq('id', setting.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slider-ad-settings'] });
      toast.success('Settings updated');
      setEditingSetting(null);
    },
    onError: () => toast.error('Failed to update settings'),
  });

  const updateAdStatusMutation = useMutation({
    mutationFn: async ({ adId, status, notes }: { adId: string; status: string; notes?: string }) => {
      const { error } = await supabase
        .from('seller_slider_ads')
        .update({ status, admin_notes: notes || null })
        .eq('id', adId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-slider-ads'] });
      toast.success('Ad status updated');
      setReviewingAd(null);
      setAdminNotes('');
    },
    onError: () => toast.error('Failed to update ad'),
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'expired':
        return <Badge variant="outline">Expired</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="settings">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="settings">
            <Settings className="w-4 h-4 mr-2" />
            Placements
          </TabsTrigger>
          <TabsTrigger value="ads">
            <Megaphone className="w-4 h-4 mr-2" />
            Seller Ads ({pendingAds.filter(a => a.status === 'pending').length} pending)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Slider Ad Placements</CardTitle>
              <CardDescription>Configure where seller ads can appear and their pricing</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSettings ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-3">
                  {settings.map((setting) => (
                    <Card key={setting.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{setting.placement_label}</h4>
                            <Badge variant={setting.is_active ? 'default' : 'outline'}>
                              {setting.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{setting.description}</p>
                          <div className="flex gap-4 mt-2 text-sm">
                            <span>💎 {setting.fee_per_day}/day</span>
                            <span>📅 {setting.min_duration_days}-{setting.max_duration_days} days</span>
                            <span>📊 Max {setting.max_ads_shown} ads</span>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setEditingSetting(setting)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ads" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Seller Slider Ads</CardTitle>
              <CardDescription>Review and manage seller-submitted ads</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingAds ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : pendingAds.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No ads submitted yet</p>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {pendingAds.map((ad) => (
                      <Card key={ad.id} className="p-4">
                        <div className="flex gap-4">
                          {ad.image_url && (
                            <img
                              src={ad.image_url}
                              alt={ad.title}
                              className="w-24 h-24 object-cover rounded-lg"
                            />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{ad.title}</h4>
                              {getStatusBadge(ad.status)}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">{ad.description}</p>
                            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                              <span>By: {ad.profiles?.full_name || ad.profiles?.email}</span>
                              <span>📍 {ad.slider_ad_settings?.placement_label}</span>
                              <span>💎 {ad.diamonds_paid} paid</span>
                            </div>
                            <div className="flex gap-4 mt-1 text-xs">
                              <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3" /> {ad.impressions}
                              </span>
                              <span className="flex items-center gap-1">
                                <MousePointer className="w-3 h-3" /> {ad.clicks}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            {ad.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => updateAdStatusMutation.mutate({ adId: ad.id, status: 'active' })}
                                  disabled={updateAdStatusMutation.isPending}
                                >
                                  <Check className="w-3 h-3 mr-1" /> Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    setReviewingAd(ad);
                                    setAdminNotes('');
                                  }}
                                >
                                  <X className="w-3 h-3 mr-1" /> Reject
                                </Button>
                              </>
                            )}
                            {ad.status === 'active' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateAdStatusMutation.mutate({ adId: ad.id, status: 'expired' })}
                              >
                                End Ad
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Setting Dialog */}
      <Dialog open={!!editingSetting} onOpenChange={() => setEditingSetting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Placement: {editingSetting?.placement_label}</DialogTitle>
          </DialogHeader>
          {editingSetting && (
            <div className="space-y-4">
              <div>
                <Label>Fee per Day (Diamonds)</Label>
                <Input
                  type="number"
                  value={editingSetting.fee_per_day}
                  onChange={(e) => setEditingSetting({ ...editingSetting, fee_per_day: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Min Duration (days)</Label>
                  <Input
                    type="number"
                    value={editingSetting.min_duration_days}
                    onChange={(e) => setEditingSetting({ ...editingSetting, min_duration_days: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <Label>Max Duration (days)</Label>
                  <Input
                    type="number"
                    value={editingSetting.max_duration_days}
                    onChange={(e) => setEditingSetting({ ...editingSetting, max_duration_days: parseInt(e.target.value) || 30 })}
                  />
                </div>
              </div>
              <div>
                <Label>Max Ads Shown</Label>
                <Input
                  type="number"
                  value={editingSetting.max_ads_shown}
                  onChange={(e) => setEditingSetting({ ...editingSetting, max_ads_shown: parseInt(e.target.value) || 10 })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch
                  checked={editingSetting.is_active}
                  onCheckedChange={(checked) => setEditingSetting({ ...editingSetting, is_active: checked })}
                />
              </div>
              <Button
                className="w-full"
                onClick={() => updateSettingMutation.mutate(editingSetting)}
                disabled={updateSettingMutation.isPending}
              >
                {updateSettingMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Ad Dialog */}
      <Dialog open={!!reviewingAd} onOpenChange={() => setReviewingAd(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Ad: {reviewingAd?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Reason for Rejection</Label>
              <Input
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Enter reason..."
              />
            </div>
            <Button
              className="w-full"
              variant="destructive"
              onClick={() => reviewingAd && updateAdStatusMutation.mutate({ adId: reviewingAd.id, status: 'rejected', notes: adminNotes })}
              disabled={updateAdStatusMutation.isPending}
            >
              Confirm Rejection
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
