import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Eye, Radio, PlayCircle } from "lucide-react";

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

interface LiveStreamSliderProps {
  onSelectStream: (stream: LiveStream) => void;
}

export default function LiveStreamSlider({ onSelectStream }: LiveStreamSliderProps) {
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStreams();

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
          fetchStreams();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchStreams = async () => {
    try {
      // Fetch live streams
      const { data: liveStreams } = await supabase
        .from('live_streams')
        .select('*')
        .eq('status', 'live')
        .order('viewer_count', { ascending: false });

      // Fetch recently ended streams (last 24 hours)
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: endedStreams } = await supabase
        .from('live_streams')
        .select('*')
        .eq('status', 'ended')
        .gte('ended_at', twentyFourHoursAgo)
        .order('ended_at', { ascending: false })
        .limit(5);

      // Combine streams (live first, then ended)
      const allStreams = [...(liveStreams || []), ...(endedStreams || [])];

      if (allStreams.length > 0) {
        // Fetch profiles for streamers
        const userIds = [...new Set(allStreams.map(s => s.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        const streamsWithProfiles = allStreams.map(stream => ({
          ...stream,
          profiles: profileMap.get(stream.user_id)
        }));

        setStreams(streamsWithProfiles);
      } else {
        setStreams([]);
      }
    } catch (error) {
      console.error("Error fetching live streams:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || streams.length === 0) {
    return null;
  }

  const liveCount = streams.filter(s => s.status === 'live').length;

  return (
    <div className="py-3">
      <div className="flex items-center gap-2 mb-2 px-1">
        <Radio className="w-4 h-4 text-red-500 animate-pulse" />
        <span className="text-sm font-semibold text-foreground">
          {liveCount > 0 ? 'Live Now' : 'Recent Streams'}
        </span>
        {liveCount > 0 && (
          <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
            {liveCount}
          </Badge>
        )}
      </div>
      
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-3 pb-2">
          {streams.map((stream) => {
            const isLive = stream.status === 'live';
            
            return (
              <div
                key={stream.id}
                className="flex-shrink-0 w-36 cursor-pointer group"
                onClick={() => onSelectStream(stream)}
              >
                {/* Thumbnail */}
                <div className={`relative aspect-[9/16] w-full rounded-xl overflow-hidden ${
                  isLive 
                    ? 'bg-gradient-to-br from-purple-600 to-pink-500' 
                    : 'bg-gradient-to-br from-gray-600 to-gray-800'
                }`}>
                  {stream.thumbnail_url ? (
                    <img
                      src={stream.thumbnail_url}
                      alt={stream.title}
                      className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
                        !isLive ? 'grayscale-[30%]' : ''
                      }`}
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {isLive ? (
                        <Radio className="w-8 h-8 text-white/50" />
                      ) : (
                        <PlayCircle className="w-8 h-8 text-white/50" />
                      )}
                    </div>
                  )}
                  
                  {/* Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  
                  {/* Status badge */}
                  {isLive ? (
                    <Badge 
                      variant="destructive" 
                      className="absolute top-2 left-2 text-[9px] px-1.5 py-0 h-4 animate-pulse"
                    >
                      ● LIVE
                    </Badge>
                  ) : (
                    <Badge 
                      variant="secondary" 
                      className="absolute top-2 left-2 text-[9px] px-1.5 py-0 h-4"
                    >
                      <PlayCircle className="w-2.5 h-2.5 mr-0.5" />
                      REPLAY
                    </Badge>
                  )}
                  
                  {/* Viewer count */}
                  <div className="absolute top-2 right-2 bg-black/50 rounded-full px-1.5 py-0.5 flex items-center gap-1">
                    <Eye className="w-3 h-3 text-white" />
                    <span className="text-[10px] text-white">
                      {isLive ? stream.viewer_count : stream.total_views || stream.viewer_count || 0}
                    </span>
                  </div>
                  
                  {/* Streamer info */}
                  <div className="absolute bottom-2 left-2 right-2">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Avatar className={`h-6 w-6 border-2 ${isLive ? 'border-pink-500' : 'border-gray-400'}`}>
                        <AvatarImage src={stream.profiles?.avatar_url || ""} />
                        <AvatarFallback className={`text-[10px] ${isLive ? 'bg-pink-500' : 'bg-gray-500'} text-white`}>
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
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}