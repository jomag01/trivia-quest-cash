import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, Users } from "lucide-react";

interface LiveStream {
  id: string;
  user_id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  status: string;
  viewer_count: number;
  profiles?: {
    full_name: string;
    avatar_url: string;
  };
}

interface LiveStreamListProps {
  onSelectStream: (stream: LiveStream) => void;
}

export default function LiveStreamList({ onSelectStream }: LiveStreamListProps) {
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLiveStreams();

    // Subscribe to stream updates
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
          fetchLiveStreams();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLiveStreams = async () => {
    const { data, error } = await supabase
      .from('live_streams')
      .select('*')
      .eq('status', 'live')
      .order('viewer_count', { ascending: false });

    if (data) {
      // Fetch profiles separately
      const userIds = [...new Set(data.map(s => s.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      setStreams(data.map(s => ({
        ...s,
        profiles: profileMap.get(s.user_id)
      })));
    }
    setLoading(false);
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

  if (streams.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>No live streams right now</p>
        <p className="text-sm">Be the first to go live!</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[300px]">
      <div className="space-y-3 p-2">
        {streams.map((stream) => (
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
                <Badge variant="destructive" className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] px-1">
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
      </div>
    </ScrollArea>
  );
}