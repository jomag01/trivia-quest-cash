import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Eye, Users, PlayCircle, Clock, Trash2 } from "lucide-react";
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
      <ScrollArea className="h-[400px]">
        <div className="space-y-3 p-2">
          {liveStreams.map((stream) => (
            <Card 
              key={stream.id}
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => onSelectStream(stream)}
            >
              <CardContent className="p-3 flex items-center gap-3">
                <div className="relative">
                  <Avatar className="h-12 w-12 border-2 border-red-500">
                    <AvatarImage src={stream.profiles?.avatar_url || ""} />
                    <AvatarFallback>{stream.profiles?.full_name?.[0] || "?"}</AvatarFallback>
                  </Avatar>
                  <Badge variant="destructive" className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] px-1 animate-pulse">
                    LIVE
                  </Badge>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{stream.title}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {stream.profiles?.full_name || "Anonymous"}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Eye className="w-4 h-4" />
                  {stream.viewer_count}
                </div>
              </CardContent>
            </Card>
          ))}

          {endedStreams.length > 0 && (
            <>
              <div className="flex items-center gap-2 px-1 pt-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Recently Ended</span>
              </div>
              {endedStreams.map((stream) => (
                <Card 
                  key={stream.id}
                  className="cursor-pointer hover:bg-accent/50 transition-colors opacity-80"
                >
                  <CardContent className="p-3 flex items-center gap-3">
                    <div 
                      className="flex items-center gap-3 flex-1 min-w-0"
                      onClick={() => onSelectStream(stream)}
                    >
                      <div className="relative">
                        <Avatar className="h-12 w-12 border-2 border-muted-foreground grayscale-[30%]">
                          <AvatarImage src={stream.profiles?.avatar_url || ""} />
                          <AvatarFallback>{stream.profiles?.full_name?.[0] || "?"}</AvatarFallback>
                        </Avatar>
                        <Badge variant="secondary" className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] px-1">
                          <PlayCircle className="w-2.5 h-2.5 mr-0.5" />
                          REPLAY
                        </Badge>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{stream.title}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {stream.profiles?.full_name || "Anonymous"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Ended {stream.ended_at ? formatDistanceToNow(new Date(stream.ended_at), { addSuffix: true }) : 'recently'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Eye className="w-4 h-4" />
                        {stream.total_views || stream.viewer_count || 0}
                      </div>
                      {user?.id === stream.user_id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
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