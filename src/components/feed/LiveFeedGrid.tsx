import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Eye, Users, TrendingUp, Flame } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface LiveStream {
  id: string;
  user_id: string;
  title: string;
  thumbnail_url?: string;
  viewer_count: number;
  status: string;
  profiles?: {
    full_name: string;
    avatar_url?: string;
  };
}

interface LiveFeedGridProps {
  onSelectStream: (stream: LiveStream) => void;
}

const CATEGORIES = [
  { id: "all", label: "All", icon: TrendingUp },
  { id: "trending", label: "Trending", icon: Flame },
  { id: "gaming", label: "Gaming" },
  { id: "music", label: "Music" },
  { id: "chat", label: "Just Chatting" },
  { id: "irl", label: "IRL" },
];

export default function LiveFeedGrid({ onSelectStream }: LiveFeedGridProps) {
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");

  useEffect(() => {
    fetchStreams();
    
    const channel = supabase
      .channel("live-grid")
      .on("postgres_changes", { event: "*", schema: "public", table: "live_streams" }, () => {
        fetchStreams();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchStreams = async () => {
    const { data } = await supabase
      .from("live_streams")
      .select("*")
      .eq("status", "live")
      .order("viewer_count", { ascending: false });

    if (data) {
      const userIds = [...new Set(data.map(s => s.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="aspect-[9/16] bg-muted rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (streams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Users className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-lg font-medium">No live streams right now</p>
        <p className="text-sm">Be the first to go live!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Category Filter */}
      <div className="px-4 overflow-x-auto scrollbar-hide">
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="h-9 bg-secondary/50 p-1 gap-1">
            {CATEGORIES.map(cat => (
              <TabsTrigger
                key={cat.id}
                value={cat.id}
                className="h-7 px-3 text-xs rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 px-4">
        {streams.map((stream, index) => (
          <Card
            key={stream.id}
            className="group relative overflow-hidden rounded-xl cursor-pointer border-0 bg-secondary aspect-[9/16]"
            onClick={() => onSelectStream(stream)}
          >
            {/* Thumbnail */}
            <div className="absolute inset-0">
              {stream.thumbnail_url ? (
                <img
                  src={stream.thumbnail_url}
                  alt={stream.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-accent/30 to-purple-500/30" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            </div>

            {/* Live badge */}
            <Badge className="absolute top-2 left-2 bg-destructive text-white animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-white mr-1 animate-pulse" />
              LIVE
            </Badge>

            {/* Viewer count */}
            <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-2 py-0.5 text-white text-xs">
              <Eye className="w-3 h-3" />
              {stream.viewer_count.toLocaleString()}
            </div>

            {/* Trending badge */}
            {index < 3 && (
              <Badge className="absolute top-10 left-2 bg-orange-500 text-white text-[10px]">
                <Flame className="w-3 h-3 mr-0.5" />
                Hot
              </Badge>
            )}

            {/* Bottom info */}
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Avatar className="h-8 w-8 ring-2 ring-destructive">
                  <AvatarImage src={stream.profiles?.avatar_url || ""} />
                  <AvatarFallback className="bg-accent text-white text-xs">
                    {stream.profiles?.full_name?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm truncate">
                    {stream.profiles?.full_name || "Anonymous"}
                  </p>
                </div>
              </div>
              <p className="text-white/90 text-xs line-clamp-2">{stream.title}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
