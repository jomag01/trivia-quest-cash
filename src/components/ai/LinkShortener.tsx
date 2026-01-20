import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Link2, Copy, Check, Loader2, ExternalLink, Trash2, BarChart3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface ShortenedLink {
  id: string;
  original_url: string;
  short_code: string;
  clicks: number;
  created_at: string;
  user_id: string;
}

export default function LinkShortener() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [url, setUrl] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const baseUrl = window.location.origin;

  // Fetch user's shortened links
  const { data: links = [], isLoading } = useQuery({
    queryKey: ['shortened-links', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await (supabase
        .from('shortened_links' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50) as any);
      if (error) throw error;
      return (data || []) as ShortenedLink[];
    },
    enabled: !!user,
  });

  // Generate random short code
  const generateShortCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Create shortened link
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Please login to shorten links');
      if (!url) throw new Error('Please enter a URL');

      // Validate URL
      try {
        new URL(url);
      } catch {
        throw new Error('Please enter a valid URL');
      }

      const shortCode = customCode || generateShortCode();

      // Check if custom code already exists
      if (customCode) {
        const { data: existing } = await (supabase
          .from('shortened_links' as any)
          .select('id')
          .eq('short_code', customCode)
          .maybeSingle() as any);
        if (existing) throw new Error('This custom code is already taken');
      }

      const { data, error } = await (supabase
        .from('shortened_links' as any)
        .insert({
          user_id: user.id,
          original_url: url,
          short_code: shortCode,
          clicks: 0,
        })
        .select()
        .single() as any);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Link shortened successfully!');
      setUrl('');
      setCustomCode('');
      queryClient.invalidateQueries({ queryKey: ['shortened-links'] });
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  // Delete link
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase
        .from('shortened_links' as any)
        .delete()
        .eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Link deleted');
      queryClient.invalidateQueries({ queryKey: ['shortened-links'] });
    },
  });

  const copyToClipboard = (link: ShortenedLink) => {
    const shortUrl = `${baseUrl}/s/${link.short_code}`;
    navigator.clipboard.writeText(shortUrl);
    setCopiedId(link.id);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Link Shortener
          </CardTitle>
          <CardDescription>
            Create short, memorable links for your content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>URL to shorten *</Label>
            <Input
              placeholder="https://example.com/your-long-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Custom code (optional)</Label>
            <div className="flex gap-2">
              <span className="flex items-center text-sm text-muted-foreground bg-muted px-3 rounded-l-md border border-r-0">
                {baseUrl}/s/
              </span>
              <Input
                placeholder="my-link"
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value.replace(/[^a-zA-Z0-9-_]/g, ''))}
                className="rounded-l-none"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Leave empty for auto-generated code. Only letters, numbers, dashes allowed.
            </p>
          </div>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !url}
            className="w-full"
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Link2 className="h-4 w-4 mr-2" />
            )}
            Shorten Link
          </Button>
        </CardContent>
      </Card>

      {/* Links List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Your Links
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : links.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No shortened links yet. Create one above!
            </p>
          ) : (
            <div className="space-y-3">
              {links.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex-1 min-w-0 mr-3">
                    <div className="flex items-center gap-2">
                      <a
                        href={`${baseUrl}/s/${link.short_code}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-primary hover:underline truncate"
                      >
                        {baseUrl}/s/{link.short_code}
                      </a>
                      <ExternalLink className="h-3 w-3 flex-shrink-0" />
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {link.original_url}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="flex-shrink-0">
                      {link.clicks} clicks
                    </Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => copyToClipboard(link)}
                    >
                      {copiedId === link.id ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(link.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
