import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Eye, Users, Radio, Clock, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface LiveStream {
  id: string;
  user_id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  status: string;
  viewer_count: number;
  total_views?: number;
  ended_at?: string;
  profiles?: {
    full_name: string;
    avatar_url: string;
  };
}

interface LiveStreamListProps {
  onSelectStream: (stream: LiveStream) => void;
}

export default function LiveStreamList({ onSelectStream }: LiveStreamListProps) {
  const { user } = useAuth();
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  const [endedStreams, setEndedStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [streamToDelete, setStreamToDelete] = useState<LiveStream | null>(null);

  useEffect(() => {
    fetchStreams();

    const channel = supabase
      .channel('live-streams-list')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_streams'
        },
        () => {
          fetchStreams();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchStreams = async () => {
    const { data: live } = await supabase
      .from('live_streams')
      .select('*')
      .eq('status', 'live')
      .order('created_at', { ascending: false });

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: ended } = await supabase
      .from('live_streams')
      .select('*')
      .eq('status', 'ended')
      .gte('ended_at', twentyFourHoursAgo)
      .order('ended_at', { ascending: false })
      .limit(10);

    const allStreams = [...(live || []), ...(ended || [])];
    if (allStreams.length > 0) {
      const userIds = [...new Set(allStreams.map(s => s.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      if (live) {
        setLiveStreams(live.map(s => ({
          ...s,
          profiles: profileMap.get(s.user_id)
        })));
      }
      
      if (ended) {
        setEndedStreams(ended.map(s => ({
          ...s,
          profiles: profileMap.get(s.user_id)
        })));
      }
    } else {
      setLiveStreams([]);
      setEndedStreams([]);
    }
    setLoading(false);
  };

  const handleDeleteStream = async () => {
    if (!streamToDelete || !user) return;

    try {
      const { error } = await supabase
        .from('live_streams')
        .delete()
        .eq('id', streamToDelete.id)
        .eq('user_id', user.id);

      if (error) throw error;
      
      toast.success("Stream deleted successfully");
      setStreamToDelete(null);
      fetchStreams();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete stream");
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (liveStreams.length === 0 && endedStreams.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>No live streams right now</p>
        <p className="text-sm">Be the first to go live!</p>
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="max-h-[calc(100dvh-9rem)]">
        <div className="space-y-6 p-2">
          {liveStreams.length > 0 && <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground"><Radio className="h-4 w-4 text-destructive" /> Live Now</h2>}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {liveStreams.map((stream) => (
            <Card 
              key={stream.id}
              className="group cursor-pointer overflow-hidden border-border bg-card transition-colors hover:border-destructive"
              onClick={() => onSelectStream(stream)}
            >
              <CardContent className="p-0">
                <div className="relative aspect-[9/16] overflow-hidden bg-muted">
                  {stream.thumbnail_url || stream.profiles?.avatar_url ? (
                    <img src={stream.thumbnail_url || stream.profiles?.avatar_url} alt={`${stream.profiles?.full_name || 'Seller'} live preview`} loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                  ) : <div className="flex h-full items-center justify-center"><Radio className="h-10 w-10 text-muted-foreground" /></div>}
                  <Badge variant="destructive" className="absolute left-2 top-2 text-[10px] animate-pulse">LIVE</Badge>
                  <span className="absolute right-2 top-2 flex items-center gap-1 rounded bg-background/80 px-1.5 py-0.5 text-xs text-foreground"><Eye className="h-3 w-3" />{stream.viewer_count || 0}</span>
                </div>
                <div className="min-w-0 p-2.5">
                  <p className="truncate text-sm font-semibold">{stream.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{stream.profiles?.full_name || "Seller"}</p>
                </div>
              </CardContent>
            </Card>
          ))}
          </div>

          {endedStreams.length > 0 && (
            <>
              <div className="flex items-center gap-2 px-1 pt-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Recently Ended</span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {endedStreams.map((stream) => (
                <Card 
                  key={stream.id}
                  className="overflow-hidden border-border bg-card"
                >
                  <CardContent className="p-0">
                    <div className="relative aspect-[9/16] overflow-hidden bg-muted">
                      {stream.thumbnail_url || stream.profiles?.avatar_url ? (
                        <img src={stream.thumbnail_url || stream.profiles?.avatar_url} alt={`${stream.profiles?.full_name || 'Seller'} stream preview`} loading="lazy" className="h-full w-full object-cover opacity-80" />
                      ) : <div className="flex h-full items-center justify-center"><Clock className="h-10 w-10 text-muted-foreground" /></div>}
                      <Badge variant="secondary" className="absolute left-2 top-2 text-[10px]">ENDED</Badge>
                      <span className="absolute right-2 top-2 flex items-center gap-1 rounded bg-background/80 px-1.5 py-0.5 text-xs text-foreground"><Eye className="h-3 w-3" />{stream.total_views || stream.viewer_count || 0}</span>
                    </div>
                    <div className="flex items-start gap-1 p-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{stream.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{stream.profiles?.full_name || "Seller"}</p>
                        <p className="text-xs text-muted-foreground">Ended {stream.ended_at ? formatDistanceToNow(new Date(stream.ended_at), { addSuffix: true }) : 'recently'}</p>
                      </div>
                      {user?.id === stream.user_id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete ${stream.title}`}
                          className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setStreamToDelete(stream);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              </div>
            </>
          )}
        </div>
      </ScrollArea>

      <AlertDialog open={!!streamToDelete} onOpenChange={() => setStreamToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Stream?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{streamToDelete?.title}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteStream} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}