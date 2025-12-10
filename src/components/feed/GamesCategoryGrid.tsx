import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Zap, Star, ChevronRight, Play, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface GameCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description?: string;
  color_from: string;
  color_to: string;
  game_type: string;
  entry_cost_diamonds?: number;
}

export default function GamesCategoryGrid() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [categories, setCategories] = useState<GameCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("game_categories")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching game categories:", error);
      setLoading(false);
      return;
    }
    if (data) {
      setCategories(data);
    }
    setLoading(false);
  };

  const handleCategoryClick = (category: GameCategory) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    const path = category.game_type === "treasure-hunt" ? "/treasure-hunt" : `/game/${category.slug}`;
    navigate(path);
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <div className="h-40 bg-muted rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="aspect-square bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p>No game categories available</p>
      </div>
    );
  }

  const featuredCategory = categories[0];
  const otherCategories = categories.slice(1);

  return (
    <div className="space-y-4 pb-4">
      {/* Featured Game Banner */}
      {featuredCategory && (
        <div
          className="mx-4 p-6 rounded-2xl overflow-hidden relative"
          style={{
            background: `linear-gradient(135deg, ${featuredCategory.color_from}, ${featuredCategory.color_to})`
          }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 opacity-20">
            <div className="text-8xl">{featuredCategory.icon}</div>
          </div>
          
          <Badge className="bg-white/20 text-white mb-3">
            <Zap className="w-3 h-3 mr-1" />
            Featured
          </Badge>
          
          <h3 className="text-2xl font-bold text-white mb-2">{featuredCategory.name}</h3>
          <p className="text-white/80 text-sm mb-4 max-w-[200px]">
            {featuredCategory.description || "Test your knowledge and win diamonds!"}
          </p>
          
          <Button
            onClick={() => handleCategoryClick(featuredCategory)}
            className="bg-white text-foreground hover:bg-white/90 rounded-full"
          >
            <Play className="w-4 h-4 mr-2" />
            Play Now
          </Button>
        </div>
      )}

      {/* Quick Play Section */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Quick Play</h3>
          <Button variant="ghost" size="sm" onClick={() => navigate("/game")}>
            See All <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {otherCategories.slice(0, 4).map((category) => (
            <Card
              key={category.id}
              className="group overflow-hidden cursor-pointer border-0"
              style={{
                background: `linear-gradient(135deg, ${category.color_from}20, ${category.color_to}20)`
              }}
              onClick={() => handleCategoryClick(category)}
            >
              <div className="p-4 flex flex-col items-center text-center">
                <div 
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-3 transition-transform group-hover:scale-110"
                  style={{
                    background: `linear-gradient(135deg, ${category.color_from}, ${category.color_to})`
                  }}
                >
                  {category.icon.startsWith("http") ? (
                    <img src={category.icon} alt="" className="w-10 h-10 object-cover" />
                  ) : (
                    category.icon
                  )}
                </div>
                
                <h4 className="font-semibold text-sm mb-1">{category.name}</h4>
                
                {category.entry_cost_diamonds && category.entry_cost_diamonds > 0 ? (
                  <Badge variant="secondary" className="text-[10px]">
                    💎 {category.entry_cost_diamonds} to play
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-700">
                    Free to play
                  </Badge>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Leaderboard Preview */}
      <div className="px-4">
        <Card className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-semibold">Leaderboard</h4>
                <p className="text-xs text-muted-foreground">See top players</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard?tab=leaderboard")}>
              View <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </Card>
      </div>

      {/* Daily Challenges */}
      <div className="px-4">
        <Card className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
                <Star className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-semibold">Daily Challenge</h4>
                <p className="text-xs text-muted-foreground">Earn bonus diamonds</p>
              </div>
            </div>
            <Badge className="bg-purple-500">+50 💎</Badge>
          </div>
        </Card>
      </div>
    </div>
  );
}
