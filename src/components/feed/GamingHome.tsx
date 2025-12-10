import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { 
  Play, Eye, Clock, Flame, Gamepad2, Trophy, 
  ChevronRight, Star, Users, Zap
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface GameCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string | null;
  color_from: string;
  color_to: string;
}

interface VideoClip {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  views: number;
  creator: string;
  game: string;
}

// Sample data for gaming content
const sampleClips: VideoClip[] = [
  { id: "1", title: "Epic Victory Royale!", thumbnail: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400", duration: "2:34", views: 12500, creator: "ProGamer", game: "Battle Royale" },
  { id: "2", title: "Insane Headshot Compilation", thumbnail: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400", duration: "5:12", views: 8900, creator: "SnipeKing", game: "FPS Arena" },
  { id: "3", title: "Speed Run World Record", thumbnail: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400", duration: "15:45", views: 45000, creator: "SpeedRunner", game: "Platform X" },
  { id: "4", title: "Boss Fight No Damage", thumbnail: "https://images.unsplash.com/photo-1493711662062-fa541f7f55a4?w=400", duration: "8:22", views: 23000, creator: "BossHunter", game: "Dark Quest" },
  { id: "5", title: "Clutch Play of the Year", thumbnail: "https://images.unsplash.com/photo-1558742569-fe6d39d05837?w=400", duration: "1:45", views: 67000, creator: "ClutchMaster", game: "Esports Arena" },
];

const featuredStream = {
  title: "World Championship Finals - Live",
  thumbnail: "https://images.unsplash.com/photo-1542751110-97427bbecf20?w=800",
  viewers: 125000,
  streamer: "EsportsTV",
  game: "League of Champions",
};

export default function GamingHome() {
  const [categories, setCategories] = useState<GameCategory[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data } = await (supabase as any)
      .from("game_categories")
      .select("*")
      .eq("is_active", true)
      .order("name");
    
    if (data) setCategories(data);
  };

  const formatViews = (views: number) => {
    if (views >= 1000000) return (views / 1000000).toFixed(1) + "M";
    if (views >= 1000) return (views / 1000).toFixed(1) + "K";
    return views.toString();
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Featured Stream Banner */}
      <div className="relative h-64 md:h-80 overflow-hidden">
        <img
          src={featuredStream.thumbnail}
          alt={featuredStream.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        
        {/* Live Badge */}
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <Badge className="bg-red-500 text-white animate-pulse">
            <span className="w-2 h-2 rounded-full bg-white mr-1.5 animate-ping" />
            LIVE
          </Badge>
          <Badge variant="secondary" className="bg-black/50 backdrop-blur-sm">
            <Eye className="w-3 h-3 mr-1" />
            {formatViews(featuredStream.viewers)}
          </Badge>
        </div>

        {/* Stream Info */}
        <div className="absolute bottom-4 left-4 right-4">
          <Badge variant="secondary" className="mb-2 bg-primary/20 text-primary">
            {featuredStream.game}
          </Badge>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 line-clamp-1">
            {featuredStream.title}
          </h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent" />
              <span className="font-medium text-white">{featuredStream.streamer}</span>
            </div>
            <Button size="sm" className="rounded-full">
              <Play className="w-4 h-4 mr-1" />
              Watch Now
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 p-4 overflow-x-auto">
        <Button variant="secondary" className="rounded-full whitespace-nowrap">
          <Flame className="w-4 h-4 mr-2 text-orange-500" />
          Trending
        </Button>
        <Button variant="secondary" className="rounded-full whitespace-nowrap">
          <Trophy className="w-4 h-4 mr-2 text-amber-500" />
          Esports
        </Button>
        <Button variant="secondary" className="rounded-full whitespace-nowrap">
          <Zap className="w-4 h-4 mr-2 text-yellow-500" />
          Clips
        </Button>
        <Button variant="secondary" className="rounded-full whitespace-nowrap">
          <Users className="w-4 h-4 mr-2 text-blue-500" />
          Following
        </Button>
      </div>

      {/* Game Categories */}
      <section className="px-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-primary" />
            Play & Earn
          </h3>
          <Button variant="ghost" size="sm" className="text-primary">
            See all
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-3">
            {categories.map((category) => (
              <Card
                key={category.id}
                className="flex-shrink-0 w-28 p-3 cursor-pointer hover:scale-105 transition-transform overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${category.color_from}20, ${category.color_to}20)`,
                  borderColor: `${category.color_from}40`,
                }}
                onClick={() => navigate(`/game/${category.slug}`)}
              >
                <div className="text-3xl mb-2">{category.icon}</div>
                <p className="text-sm font-medium truncate">{category.name}</p>
              </Card>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </section>

      {/* Popular Clips */}
      <section className="px-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500" />
            Popular Clips
          </h3>
          <Button variant="ghost" size="sm" className="text-primary">
            See all
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-4">
            {sampleClips.map((clip) => (
              <div key={clip.id} className="flex-shrink-0 w-64 group cursor-pointer">
                <div className="relative aspect-video rounded-xl overflow-hidden mb-2">
                  <img
                    src={clip.thumbnail}
                    alt={clip.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/80 rounded text-xs text-white">
                    {clip.duration}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                      <Play className="w-6 h-6 text-black fill-black" />
                    </div>
                  </div>
                </div>
                <h4 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                  {clip.title}
                </h4>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span>{clip.creator}</span>
                  <span>•</span>
                  <span>{formatViews(clip.views)} views</span>
                </div>
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </section>

      {/* Recommended Streams */}
      <section className="px-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            Live Now
          </h3>
          <Button variant="ghost" size="sm" className="text-primary">
            See all
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="overflow-hidden group cursor-pointer">
              <div className="relative aspect-video">
                <img
                  src={`https://images.unsplash.com/photo-${1542751371 + i * 10000}-adc38448a05e?w=400`}
                  alt="Stream thumbnail"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-2 left-2 flex items-center gap-2">
                  <Badge className="bg-red-500 text-white text-xs px-1.5 py-0.5">
                    LIVE
                  </Badge>
                  <Badge variant="secondary" className="bg-black/60 text-white text-xs px-1.5 py-0.5">
                    <Eye className="w-3 h-3 mr-1" />
                    {formatViews(Math.floor(Math.random() * 10000))}
                  </Badge>
                </div>
              </div>
              <div className="p-3">
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm line-clamp-1">Streamer{i + 1}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">Gaming Session</p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Esports Highlights */}
      <section className="px-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Esports Highlights
          </h3>
          <Button variant="ghost" size="sm" className="text-primary">
            See all
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        <div className="space-y-3">
          {sampleClips.slice(0, 3).map((clip) => (
            <Card key={clip.id} className="flex gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="relative w-32 aspect-video rounded-lg overflow-hidden flex-shrink-0">
                <img
                  src={clip.thumbnail}
                  alt={clip.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/80 rounded text-xs text-white">
                  {clip.duration}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm line-clamp-2">{clip.title}</h4>
                <p className="text-xs text-muted-foreground mt-1">{clip.creator}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {formatViews(clip.views)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    2h ago
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}