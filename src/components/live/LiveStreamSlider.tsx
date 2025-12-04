import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Eye, Radio } from "lucide-react";

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

interface LiveStreamSliderProps {
  onSelectStream: (stream: LiveStream) => void;
}

export default function LiveStreamSlider({ onSelectStream }: LiveStreamSliderProps) {
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLiveStreams();

    // Subscribe to live stream updates
    const channel = supabase
      .channel('shop-live-streams')
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
    try {
      const { data: streams, error } = await supabase
        .from('live_streams')
        .select('*')
        .eq('status', 'live')
        .order('viewer_count', { ascending: false });

      if (error) throw error;

      if (streams && streams.length > 0) {
        // Fetch profiles for streamers
        const userIds = streams.map(s => s.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        const streamsWithProfiles = streams.map(stream => ({
          ...stream,
          profiles: profileMap.get(stream.user_id)
        }));

        setLiveStreams(streamsWithProfiles);
      } else {
        setLiveStreams([]);
      }
    } catch (error) {
      console.error("Error fetching live streams:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || liveStreams.length === 0) {
    return null;
  }

  return (
    <div className="py-3">
      <div className="flex items-center gap-2 mb-2 px-1">
        <Radio className="w-4 h-4 text-red-500 animate-pulse" />
        <span className="text-sm font-semibold text-foreground">Live Now</span>
        <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
          {liveStreams.length}
        </Badge>
      </div>
      
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-3 pb-2">
          {liveStreams.map((stream) => (
            <div
              key={stream.id}
              className="flex-shrink-0 w-36 cursor-pointer group"
              onClick={() => onSelectStream(stream)}
            >
              {/* Thumbnail */}
              <div className="relative aspect-[9/16] w-full rounded-xl overflow-hidden bg-gradient-to-br from-purple-600 to-pink-500">
                {stream.thumbnail_url ? (
                  <img
                    src={stream.thumbnail_url}
                    alt={stream.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Radio className="w-8 h-8 text-white/50" />
                  </div>
                )}
                
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                
                {/* Live badge */}
                <Badge 
                  variant="destructive" 
                  className="absolute top-2 left-2 text-[9px] px-1.5 py-0 h-4 animate-pulse"
                >
                  ● LIVE
                </Badge>
                
                {/* Viewer count */}
                <div className="absolute top-2 right-2 bg-black/50 rounded-full px-1.5 py-0.5 flex items-center gap-1">
                  <Eye className="w-3 h-3 text-white" />
                  <span className="text-[10px] text-white">{stream.viewer_count || 0}</span>
                </div>
                
                {/* Streamer info */}
                <div className="absolute bottom-2 left-2 right-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Avatar className="h-6 w-6 border-2 border-pink-500">
                      <AvatarImage src={stream.profiles?.avatar_url || ""} />
                      <AvatarFallback className="text-[10px] bg-pink-500 text-white">
                        {stream.profiles?.full_name?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-white text-[11px] font-medium truncate">
                      {stream.profiles?.full_name || "Streamer"}
                    </span>
                  </div>
                  <p className="text-white/90 text-[10px] truncate leading-tight">
                    {stream.title}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
