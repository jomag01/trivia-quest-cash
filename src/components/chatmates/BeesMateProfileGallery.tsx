import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  Plus, Trash2, Wand2, Star, Crown, Lock,
  Sparkles, Palette, Camera, ImageIcon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ProfileImage {
  id: string;
  image_url: string;
  is_primary: boolean;
  is_ai_enhanced: boolean;
  ai_enhancement_type: string | null;
  display_order: number;
}

interface BeesMateProfileGalleryProps {
  userSubscription?: {
    tier_key: string;
    tier_name: string;
  } | null;
  onUpgradeClick: () => void;
}

export function BeesMateProfileGallery({ userSubscription, onUpgradeClick }: BeesMateProfileGalleryProps) {
  const { user } = useAuth();
  const [images, setImages] = useState<ProfileImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [enhancing, setEnhancing] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<ProfileImage | null>(null);
  const [enhanceDialogOpen, setEnhanceDialogOpen] = useState(false);

  const isPremium = userSubscription && userSubscription.tier_key !== 'free';
  const canUseAI = isPremium;

  useEffect(() => {
    if (user) fetchImages();
  }, [user]);

  const fetchImages = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('beesmate_profile_images')
        .select('*')
        .eq('user_id', user.id)
        .order('display_order');
      if (error) throw error;
      setImages(data || []);
    } catch (error) {
      console.error('Error fetching images:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files?.length) return;
    const file = e.target.files[0];
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('beesmate-profiles')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('beesmate-profiles')
        .getPublicUrl(fileName);

      await supabase.from('beesmate_profile_images').insert({
        user_id: user.id,
        image_url: publicUrl,
        is_primary: images.length === 0,
        display_order: images.length
      });
      
      toast.success('Image uploaded!');
      fetchImages();
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const deleteImage = async (imageId: string) => {
    try {
      await supabase.from('beesmate_profile_images').delete().eq('id', imageId);
      setImages(prev => prev.filter(img => img.id !== imageId));
      toast.success('Image removed');
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error('Failed to delete image');
    }
  };

  const setAsPrimary = async (imageId: string) => {
    if (!user) return;
    try {
      await supabase.from('beesmate_profile_images').update({ is_primary: false }).eq('user_id', user.id);
      await supabase.from('beesmate_profile_images').update({ is_primary: true }).eq('id', imageId);
      setImages(prev => prev.map(img => ({ ...img, is_primary: img.id === imageId })));
      toast.success('Primary image updated!');
    } catch (error) {
      console.error('Error setting primary:', error);
    }
  };

  const openEnhanceDialog = (image: ProfileImage) => {
    if (!canUseAI) {
      onUpgradeClick();
      return;
    }
    setSelectedImage(image);
    setEnhanceDialogOpen(true);
  };

  const enhanceImage = async (enhancementType: 'background' | 'filter' | 'beautify') => {
    if (!selectedImage || !user) return;
    setEnhancing(selectedImage.id);
    setEnhanceDialogOpen(false);

    try {
      const { data, error } = await supabase.functions.invoke('beesmate-image-enhance', {
        body: { imageUrl: selectedImage.image_url, enhancementType, userId: user.id }
      });

      if (error) throw error;

      if (data?.enhancedUrl) {
        await supabase.from('beesmate_profile_images').update({
          image_url: data.enhancedUrl,
          is_ai_enhanced: true,
          ai_enhancement_type: enhancementType,
          original_image_url: selectedImage.image_url
        }).eq('id', selectedImage.id);

        fetchImages();
        toast.success('Image enhanced with AI!');
      }
    } catch (error) {
      console.error('Error enhancing image:', error);
      toast.error('Failed to enhance image');
    } finally {
      setEnhancing(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Profile Gallery
          </CardTitle>
          {isPremium && (
            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
              <Crown className="w-3 h-3 mr-1" />
              {userSubscription?.tier_name}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <AnimatePresence mode="popLayout">
              {images.map((image, index) => (
                <motion.div
                  key={image.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="relative aspect-square rounded-xl overflow-hidden group"
                >
                  <img src={image.image_url} alt={`Profile ${index + 1}`} className="w-full h-full object-cover" />
                  
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-white hover:bg-white/20"
                      onClick={() => openEnhanceDialog(image)}
                      disabled={enhancing === image.id}
                    >
                      {enhancing === image.id ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : canUseAI ? <Wand2 className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/20" onClick={() => deleteImage(image.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {image.is_primary && (
                    <div className="absolute top-1 left-1">
                      <Badge className="bg-rose-500 text-white text-xs px-1.5 py-0.5">
                        <Star className="w-2.5 h-2.5 mr-0.5" />Main
                      </Badge>
                    </div>
                  )}

                  {image.is_ai_enhanced && (
                    <div className="absolute top-1 right-1">
                      <Badge className="bg-purple-500 text-white text-xs px-1.5 py-0.5">
                        <Sparkles className="w-2.5 h-2.5" />
                      </Badge>
                    </div>
                  )}

                  {!image.is_primary && (
                    <button
                      onClick={() => setAsPrimary(image.id)}
                      className="absolute bottom-1 left-1 right-1 bg-black/70 text-white text-xs py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Set as Main
                    </button>
                  )}
                </motion.div>
              ))}

              {images.length < 6 && (
                <motion.label
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="aspect-square rounded-xl border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                >
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                  {uploading ? (
                    <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-6 h-6 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground mt-1">Add Photo</span>
                    </>
                  )}
                </motion.label>
              )}
            </AnimatePresence>
          </div>

          {!isPremium && images.length > 0 && (
            <div className="bg-gradient-to-r from-purple-50 to-rose-50 dark:from-purple-950/30 dark:to-rose-950/30 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-gradient-to-br from-purple-500 to-rose-500 text-white">
                  <Wand2 className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-sm">AI Image Enhancement</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Upgrade to beautify photos, change backgrounds, and apply AI filters
                  </p>
                  <Button size="sm" className="mt-2 bg-gradient-to-r from-purple-500 to-rose-500" onClick={onUpgradeClick}>
                    <Crown className="w-3 h-3 mr-1" />Upgrade Now
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={enhanceDialogOpen} onOpenChange={setEnhanceDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5" />
              AI Enhancement
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <button
              onClick={() => enhanceImage('beautify')}
              className="w-full p-4 rounded-xl border hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="font-medium">Beautify</p>
                  <p className="text-xs text-muted-foreground">Enhance lighting, smooth skin, improve colors</p>
                </div>
              </div>
            </button>
            <button
              onClick={() => enhanceImage('background')}
              className="w-full p-4 rounded-xl border hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <ImageIcon className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="font-medium">Change Background</p>
                  <p className="text-xs text-muted-foreground">Replace background with AI-generated scene</p>
                </div>
              </div>
            </button>
            <button
              onClick={() => enhanceImage('filter')}
              className="w-full p-4 rounded-xl border hover:border-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <Palette className="w-5 h-5 text-rose-500" />
                <div>
                  <p className="font-medium">Apply Filter</p>
                  <p className="text-xs text-muted-foreground">Add artistic filters and color grading</p>
                </div>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}