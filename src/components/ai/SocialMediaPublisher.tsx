import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Youtube,
  Facebook,
  Instagram,
  Music2,
  Upload,
  Image as ImageIcon,
  Globe,
  Lock,
  Users,
  Calendar,
  Clock,
  Settings,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Link2,
  Eye,
  EyeOff,
  Hash,
  AtSign,
  X,
  Plus,
  Trash2,
  RefreshCw
} from 'lucide-react';

interface SocialAccount {
  id: string;
  platform: string;
  accountName: string;
  profileImage?: string;
  isConnected: boolean;
}

interface PublishSettings {
  title: string;
  description: string;
  hashtags: string[];
  thumbnail?: string;
  visibility: 'public' | 'private' | 'unlisted';
  scheduledTime?: Date;
  category?: string;
  playlist?: string;
  madeForKids?: boolean;
  ageRestricted?: boolean;
  allowComments?: boolean;
  allowSharing?: boolean;
}

interface SocialMediaPublisherProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoUrl: string | null;
  defaultTitle?: string;
  defaultDescription?: string;
  defaultHashtags?: string[];
  thumbnailOptions?: string[];
}

// Platform-specific icons and colors
const PLATFORMS = {
  youtube: {
    name: 'YouTube',
    icon: Youtube,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    studioUrl: 'https://studio.youtube.com',
    categories: ['Entertainment', 'Education', 'Gaming', 'Music', 'News & Politics', 'Science & Technology', 'Sports', 'Film & Animation', 'People & Blogs', 'Comedy', 'Howto & Style', 'Travel & Events']
  },
  facebook: {
    name: 'Facebook',
    icon: Facebook,
    color: 'text-blue-600',
    bgColor: 'bg-blue-600/10',
    borderColor: 'border-blue-600/30',
    studioUrl: 'https://business.facebook.com/creatorstudio',
    categories: ['Entertainment', 'Business', 'Education', 'Lifestyle', 'News', 'Sports', 'Gaming']
  },
  tiktok: {
    name: 'TikTok',
    icon: Music2,
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/30',
    studioUrl: 'https://www.tiktok.com/creator-center',
    categories: ['Entertainment', 'Dance', 'Comedy', 'Sports', 'Food', 'Beauty', 'Fashion', 'DIY', 'Life Hacks']
  },
  instagram: {
    name: 'Instagram',
    icon: Instagram,
    color: 'text-purple-500',
    bgColor: 'bg-gradient-to-br from-purple-500/10 to-pink-500/10',
    borderColor: 'border-purple-500/30',
    studioUrl: 'https://business.facebook.com/creatorstudio',
    categories: ['Reels', 'IGTV', 'Feed Video', 'Story']
  }
};

const SocialMediaPublisher = ({
  open,
  onOpenChange,
  videoUrl,
  defaultTitle = '',
  defaultDescription = '',
  defaultHashtags = [],
  thumbnailOptions = []
}: SocialMediaPublisherProps) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('accounts');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [connectedAccounts, setConnectedAccounts] = useState<SocialAccount[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishProgress, setPublishProgress] = useState<Record<string, string>>({});
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  // Platform-specific settings
  const [youtubeSettings, setYoutubeSettings] = useState<PublishSettings>({
    title: defaultTitle,
    description: defaultDescription,
    hashtags: defaultHashtags,
    visibility: 'public',
    category: 'Entertainment',
    madeForKids: false,
    ageRestricted: false,
    allowComments: true,
    allowSharing: true
  });

  const [facebookSettings, setFacebookSettings] = useState<PublishSettings>({
    title: defaultTitle,
    description: defaultDescription,
    hashtags: defaultHashtags,
    visibility: 'public',
    allowComments: true,
    allowSharing: true
  });

  const [tiktokSettings, setTiktokSettings] = useState<PublishSettings>({
    title: defaultTitle,
    description: defaultDescription,
    hashtags: defaultHashtags,
    visibility: 'public',
    allowComments: true
  });

  const [instagramSettings, setInstagramSettings] = useState<PublishSettings>({
    title: defaultTitle,
    description: defaultDescription,
    hashtags: defaultHashtags,
    visibility: 'public'
  });

  const [customThumbnail, setCustomThumbnail] = useState<string | null>(null);
  const [selectedThumbnailIndex, setSelectedThumbnailIndex] = useState(0);

  const handleConnectAccount = async (platform: string) => {
    // Open OAuth popup for the selected platform
    const platformInfo = PLATFORMS[platform as keyof typeof PLATFORMS];
    
    toast.info(`Opening ${platformInfo.name} login...`, {
      description: 'Connect your account to enable direct uploads'
    });

    // In a real implementation, this would open OAuth flow
    // For now, we'll open the creator studio in a new window
    window.open(platformInfo.studioUrl, `${platform}_auth`, 'width=600,height=700,scrollbars=yes');

    // Simulated account connection for demo
    const mockAccount: SocialAccount = {
      id: `${platform}_${Date.now()}`,
      platform,
      accountName: `My ${platformInfo.name} Account`,
      isConnected: true
    };

    setConnectedAccounts(prev => {
      const filtered = prev.filter(a => a.platform !== platform);
      return [...filtered, mockAccount];
    });

    toast.success(`${platformInfo.name} account connected!`, {
      description: 'You can now upload directly to this platform'
    });
  };

  const handleDisconnectAccount = (platform: string) => {
    setConnectedAccounts(prev => prev.filter(a => a.platform !== platform));
    setSelectedPlatforms(prev => prev.filter(p => p !== platform));
    toast.success('Account disconnected');
  };

  const togglePlatformSelection = (platform: string) => {
    const isConnected = connectedAccounts.some(a => a.platform === platform && a.isConnected);
    if (!isConnected) {
      toast.error('Please connect your account first');
      return;
    }

    setSelectedPlatforms(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setCustomThumbnail(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAddHashtag = (settings: PublishSettings, setSettings: React.Dispatch<React.SetStateAction<PublishSettings>>, tag: string) => {
    if (!tag.trim()) return;
    const cleanTag = tag.replace(/^#/, '').trim();
    if (cleanTag && !settings.hashtags.includes(cleanTag)) {
      setSettings(prev => ({
        ...prev,
        hashtags: [...prev.hashtags, cleanTag]
      }));
    }
  };

  const handleRemoveHashtag = (settings: PublishSettings, setSettings: React.Dispatch<React.SetStateAction<PublishSettings>>, tag: string) => {
    setSettings(prev => ({
      ...prev,
      hashtags: prev.hashtags.filter(t => t !== tag)
    }));
  };

  const handlePublish = async () => {
    if (selectedPlatforms.length === 0) {
      toast.error('Please select at least one platform');
      return;
    }

    if (!videoUrl) {
      toast.error('No video to publish');
      return;
    }

    setIsPublishing(true);
    setPublishProgress({});

    for (const platform of selectedPlatforms) {
      setPublishProgress(prev => ({ ...prev, [platform]: 'uploading' }));

      try {
        // Get platform-specific settings
        let settings: PublishSettings;
        switch (platform) {
          case 'youtube':
            settings = youtubeSettings;
            break;
          case 'facebook':
            settings = facebookSettings;
            break;
          case 'tiktok':
            settings = tiktokSettings;
            break;
          case 'instagram':
            settings = instagramSettings;
            break;
          default:
            settings = youtubeSettings;
        }

        // In a real implementation, this would call the platform's API
        // For now, we'll save to our database and open the platform's studio
        await supabase.from('social_media_uploads').insert({
          user_id: user?.id,
          platform,
          video_url: videoUrl,
          title: settings.title,
          description: `${settings.description}\n\n${settings.hashtags.map(h => `#${h}`).join(' ')}`,
          status: 'pending'
        });

        // Simulate upload delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        setPublishProgress(prev => ({ ...prev, [platform]: 'opening_studio' }));

        // Open the platform's creator studio
        const platformInfo = PLATFORMS[platform as keyof typeof PLATFORMS];
        window.open(platformInfo.studioUrl, `${platform}_upload`, 'width=1200,height=800,scrollbars=yes');

        setPublishProgress(prev => ({ ...prev, [platform]: 'completed' }));

      } catch (error) {
        console.error(`Error publishing to ${platform}:`, error);
        setPublishProgress(prev => ({ ...prev, [platform]: 'error' }));
      }
    }

    setIsPublishing(false);
    toast.success('Opening creator studios for upload!', {
      description: 'Complete the upload in each platform\'s studio'
    });
  };

  const renderPlatformStudio = (
    platform: keyof typeof PLATFORMS,
    settings: PublishSettings,
    setSettings: React.Dispatch<React.SetStateAction<PublishSettings>>
  ) => {
    const platformInfo = PLATFORMS[platform];
    const Icon = platformInfo.icon;

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className={`p-4 rounded-lg ${platformInfo.bgColor} border ${platformInfo.borderColor}`}>
          <div className="flex items-center gap-3">
            <Icon className={`h-6 w-6 ${platformInfo.color}`} />
            <div>
              <h3 className="font-semibold">{platformInfo.name} Studio</h3>
              <p className="text-xs text-muted-foreground">Configure your upload settings</p>
            </div>
          </div>
        </div>

        {/* Video Preview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Video Preview</Label>
            <div className="aspect-video rounded-lg overflow-hidden bg-black/50 border">
              {videoUrl ? (
                <video src={videoUrl} className="w-full h-full object-contain" controls />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  No video selected
                </div>
              )}
            </div>
          </div>

          {/* Thumbnail Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Thumbnail</Label>
            <div className="grid grid-cols-3 gap-2">
              {thumbnailOptions.slice(0, 3).map((thumb, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedThumbnailIndex(idx);
                    setCustomThumbnail(null);
                  }}
                  className={`aspect-video rounded border overflow-hidden ${
                    selectedThumbnailIndex === idx && !customThumbnail
                      ? 'ring-2 ring-primary'
                      : 'hover:ring-2 ring-primary/50'
                  }`}
                >
                  <img src={thumb} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={() => thumbnailInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              Upload Custom Thumbnail
            </Button>
            <input
              ref={thumbnailInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleThumbnailUpload}
            />
            {customThumbnail && (
              <div className="relative aspect-video rounded border overflow-hidden ring-2 ring-primary">
                <img src={customThumbnail} alt="Custom thumbnail" className="w-full h-full object-cover" />
                <button
                  onClick={() => setCustomThumbnail(null)}
                  className="absolute top-1 right-1 p-1 bg-black/50 rounded-full"
                >
                  <X className="h-4 w-4 text-white" />
                </button>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor={`${platform}-title`}>Title</Label>
          <Input
            id={`${platform}-title`}
            value={settings.title}
            onChange={(e) => setSettings(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Enter video title"
            maxLength={platform === 'youtube' ? 100 : platform === 'tiktok' ? 150 : 255}
          />
          <p className="text-xs text-muted-foreground">
            {settings.title.length}/{platform === 'youtube' ? 100 : platform === 'tiktok' ? 150 : 255} characters
          </p>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor={`${platform}-description`}>Description</Label>
          <Textarea
            id={`${platform}-description`}
            value={settings.description}
            onChange={(e) => setSettings(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Enter video description"
            rows={4}
            maxLength={platform === 'youtube' ? 5000 : platform === 'tiktok' ? 2200 : 2000}
          />
          <p className="text-xs text-muted-foreground">
            {settings.description.length}/{platform === 'youtube' ? 5000 : platform === 'tiktok' ? 2200 : 2000} characters
          </p>
        </div>

        {/* Hashtags */}
        <div className="space-y-2">
          <Label>Hashtags</Label>
          <div className="flex flex-wrap gap-2 p-3 rounded-lg border bg-muted/30 min-h-[60px]">
            {settings.hashtags.map(tag => (
              <Badge key={tag} variant="secondary" className="gap-1">
                <Hash className="h-3 w-3" />
                {tag}
                <button
                  onClick={() => handleRemoveHashtag(settings, setSettings, tag)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            <Input
              placeholder="Add hashtag..."
              className="w-32 h-7 text-sm border-0 bg-transparent focus-visible:ring-0"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddHashtag(settings, setSettings, (e.target as HTMLInputElement).value);
                  (e.target as HTMLInputElement).value = '';
                }
              }}
            />
          </div>
        </div>

        {/* Visibility */}
        <div className="space-y-2">
          <Label>Visibility</Label>
          <Select
            value={settings.visibility}
            onValueChange={(value: 'public' | 'private' | 'unlisted') => 
              setSettings(prev => ({ ...prev, visibility: value }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Public
                </div>
              </SelectItem>
              <SelectItem value="unlisted">
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  Unlisted
                </div>
              </SelectItem>
              <SelectItem value="private">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Private
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Platform-specific options */}
        {platform === 'youtube' && (
          <>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={settings.category}
                onValueChange={(value) => setSettings(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {platformInfo.categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Audience</Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Made for kids</span>
                  </div>
                  <Switch
                    checked={settings.madeForKids}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, madeForKids: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Age restricted (18+)</span>
                  </div>
                  <Switch
                    checked={settings.ageRestricted}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, ageRestricted: checked }))}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {(platform === 'youtube' || platform === 'facebook') && (
          <div className="space-y-3">
            <Label>Engagement</Label>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Allow comments</span>
                <Switch
                  checked={settings.allowComments}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, allowComments: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Allow sharing</span>
                <Switch
                  checked={settings.allowSharing}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, allowSharing: checked }))}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-4 sm:p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Publish to Social Media
          </DialogTitle>
          <DialogDescription>
            Upload your video directly to multiple social media platforms
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <div className="px-4 sm:px-6">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="accounts" className="gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Accounts</span>
              </TabsTrigger>
              <TabsTrigger value="configure" className="gap-2" disabled={selectedPlatforms.length === 0}>
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Configure</span>
              </TabsTrigger>
              <TabsTrigger value="publish" className="gap-2" disabled={selectedPlatforms.length === 0}>
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Publish</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1 h-[60vh]">
            <div className="p-4 sm:p-6">
              {/* Accounts Tab */}
              <TabsContent value="accounts" className="mt-0 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Object.entries(PLATFORMS).map(([key, platform]) => {
                    const Icon = platform.icon;
                    const isConnected = connectedAccounts.some(a => a.platform === key && a.isConnected);
                    const isSelected = selectedPlatforms.includes(key);
                    const account = connectedAccounts.find(a => a.platform === key);

                    return (
                      <Card
                        key={key}
                        className={`cursor-pointer transition-all ${
                          isSelected ? `ring-2 ring-primary ${platform.bgColor}` : 'hover:bg-muted/50'
                        }`}
                        onClick={() => isConnected && togglePlatformSelection(key)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${platform.bgColor}`}>
                                <Icon className={`h-6 w-6 ${platform.color}`} />
                              </div>
                              <div>
                                <h4 className="font-medium">{platform.name}</h4>
                                {isConnected && account ? (
                                  <p className="text-xs text-muted-foreground">{account.accountName}</p>
                                ) : (
                                  <p className="text-xs text-muted-foreground">Not connected</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {isSelected && (
                                <CheckCircle2 className="h-5 w-5 text-primary" />
                              )}
                              {isConnected ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDisconnectAccount(key);
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleConnectAccount(key);
                                  }}
                                >
                                  Connect
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {selectedPlatforms.length > 0 && (
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <p className="text-sm">
                      <strong>{selectedPlatforms.length}</strong> platform{selectedPlatforms.length > 1 ? 's' : ''} selected for publishing
                    </p>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button
                    onClick={() => setActiveTab('configure')}
                    disabled={selectedPlatforms.length === 0}
                    className="gap-2"
                  >
                    Configure Upload
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </TabsContent>

              {/* Configure Tab */}
              <TabsContent value="configure" className="mt-0 space-y-4">
                {selectedPlatforms.length === 0 ? (
                  <div className="p-8 text-center border rounded-lg bg-muted/30">
                    <p className="text-muted-foreground">Select platforms to configure</p>
                  </div>
                ) : (
                  <Tabs defaultValue={selectedPlatforms[0]} className="w-full">
                    <TabsList className="w-full flex flex-wrap h-auto gap-1 p-1">
                      {selectedPlatforms.map(platform => {
                        const platformInfo = PLATFORMS[platform as keyof typeof PLATFORMS];
                        const Icon = platformInfo.icon;
                        return (
                          <TabsTrigger key={platform} value={platform} className="gap-2">
                            <Icon className={`h-4 w-4 ${platformInfo.color}`} />
                            {platformInfo.name}
                          </TabsTrigger>
                        );
                      })}
                    </TabsList>

                    {selectedPlatforms.includes('youtube') && (
                      <TabsContent value="youtube" className="mt-4">
                        {renderPlatformStudio('youtube', youtubeSettings, setYoutubeSettings)}
                      </TabsContent>
                    )}
                    {selectedPlatforms.includes('facebook') && (
                      <TabsContent value="facebook" className="mt-4">
                        {renderPlatformStudio('facebook', facebookSettings, setFacebookSettings)}
                      </TabsContent>
                    )}
                    {selectedPlatforms.includes('tiktok') && (
                      <TabsContent value="tiktok" className="mt-4">
                        {renderPlatformStudio('tiktok', tiktokSettings, setTiktokSettings)}
                      </TabsContent>
                    )}
                    {selectedPlatforms.includes('instagram') && (
                      <TabsContent value="instagram" className="mt-4">
                        {renderPlatformStudio('instagram', instagramSettings, setInstagramSettings)}
                      </TabsContent>
                    )}
                  </Tabs>
                )}

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setActiveTab('accounts')}>
                    Back
                  </Button>
                  <Button onClick={() => setActiveTab('publish')} className="gap-2">
                    Review & Publish
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>
              </TabsContent>

              {/* Publish Tab */}
              <TabsContent value="publish" className="mt-0 space-y-4">
                <div className="space-y-4">
                  <h3 className="font-medium">Publishing to:</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedPlatforms.map(platform => {
                      const platformInfo = PLATFORMS[platform as keyof typeof PLATFORMS];
                      const Icon = platformInfo.icon;
                      const status = publishProgress[platform];
                      
                      let settings: PublishSettings;
                      switch (platform) {
                        case 'youtube':
                          settings = youtubeSettings;
                          break;
                        case 'facebook':
                          settings = facebookSettings;
                          break;
                        case 'tiktok':
                          settings = tiktokSettings;
                          break;
                        case 'instagram':
                          settings = instagramSettings;
                          break;
                        default:
                          settings = youtubeSettings;
                      }

                      return (
                        <Card key={platform} className={`${platformInfo.bgColor} border ${platformInfo.borderColor}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <Icon className={`h-6 w-6 ${platformInfo.color} mt-1`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-medium">{platformInfo.name}</h4>
                                  {status && (
                                    <Badge variant={status === 'completed' ? 'default' : status === 'error' ? 'destructive' : 'secondary'}>
                                      {status === 'uploading' && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                                      {status === 'completed' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                                      {status}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground truncate">{settings.title}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {settings.visibility === 'public' && <Globe className="h-3 w-3 mr-1" />}
                                    {settings.visibility === 'unlisted' && <Link2 className="h-3 w-3 mr-1" />}
                                    {settings.visibility === 'private' && <Lock className="h-3 w-3 mr-1" />}
                                    {settings.visibility}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                <Separator />

                <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <p className="text-sm">
                    <strong>Note:</strong> After clicking publish, each platform's creator studio will open in a new window. 
                    Complete the upload process in each studio to finalize your post.
                  </p>
                </div>

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setActiveTab('configure')}>
                    Back
                  </Button>
                  <Button 
                    onClick={handlePublish} 
                    disabled={isPublishing || selectedPlatforms.length === 0}
                    className="gap-2"
                  >
                    {isPublishing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Publishing...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Publish to {selectedPlatforms.length} Platform{selectedPlatforms.length > 1 ? 's' : ''}
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default SocialMediaPublisher;
