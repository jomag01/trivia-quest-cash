import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Trophy, MapPin, Clock, Star, Users, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface TreasureLevel {
  id: string;
  level_number: number;
  name: string;
  description: string | null;
  required_symbols: number;
  credit_reward: number;
  map_image_url: string | null;
  difficulty_multiplier: number;
  time_limit_seconds: number | null;
}

interface PlayerProgress {
  current_level: number;
  symbols_found: number;
  total_credits_earned: number;
}

interface TreasureWallet {
  gems: number;
  diamonds: number;
}

interface Symbol {
  id: number;
  emoji: string;
  x: number;
  y: number;
  found: boolean;
}

export default function TreasureHunt() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [levels, setLevels] = useState<TreasureLevel[]>([]);
  const [progress, setProgress] = useState<PlayerProgress | null>(null);
  const [currentLevel, setCurrentLevel] = useState<TreasureLevel | null>(null);
  const [symbols, setSymbols] = useState<Symbol[]>([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [referralCount, setReferralCount] = useState(0);
  const [treasureWallet, setTreasureWallet] = useState<TreasureWallet>({ gems: 0, diamonds: 0 });

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!user) {
      toast.error("Please create an account to play");
      navigate("/auth");
    }
  }, [user, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
      fetchReferralCount();
      fetchTreasureWallet();
    }
  }, [user]);

  useEffect(() => {
    if (playing && timeLeft !== null && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0) {
      handleLevelFail();
    }
  }, [playing, timeLeft]);

  const fetchData = async () => {
    try {
      const [levelsRes, progressRes] = await Promise.all([
        supabase.from("treasure_hunt_levels").select("*").eq("is_active", true).order("level_number"),
        supabase.from("treasure_hunt_progress").select("*").eq("user_id", user!.id).single(),
      ]);

      if (levelsRes.error) throw levelsRes.error;
      setLevels(levelsRes.data || []);

      if (progressRes.data) {
        setProgress(progressRes.data);
      } else {
        const newProgress = {
          user_id: user!.id,
          current_level: 1,
          symbols_found: 0,
          total_credits_earned: 0,
        };
        const { data, error } = await supabase
          .from("treasure_hunt_progress")
          .insert([newProgress])
          .select()
          .single();

        if (error) throw error;
        setProgress(data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load game data");
    } finally {
      setLoading(false);
    }
  };

  const fetchReferralCount = async () => {
    try {
      const { count, error } = await supabase
        .from("referrals")
        .select("*", { count: "exact", head: true })
        .eq("referrer_id", user!.id);

      if (error) throw error;
      setReferralCount(count || 0);
    } catch (error) {
      console.error("Error fetching referral count:", error);
    }
  };

  const fetchTreasureWallet = async () => {
    try {
      const { data, error } = await supabase
        .from("treasure_wallet")
        .select("gems, diamonds")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setTreasureWallet(data);
      } else {
        // Create wallet if it doesn't exist
        const { data: newWallet, error: insertError } = await supabase
          .from("treasure_wallet")
          .insert([{ user_id: user!.id, gems: 0, diamonds: 0 }])
          .select()
          .single();

        if (insertError) throw insertError;
        setTreasureWallet({ gems: newWallet.gems, diamonds: newWallet.diamonds });
      }
    } catch (error) {
      console.error("Error fetching treasure wallet:", error);
    }
  };

  const startLevel = (level: TreasureLevel) => {
    if (level.level_number === 5 && referralCount < 2) {
      toast.error("You need at least 2 referrals to unlock level 5!");
      return;
    }

    if (progress && level.level_number > progress.current_level) {
      toast.error("Complete previous levels first!");
      return;
    }

    setCurrentLevel(level);
    setPlaying(true);
    setTimeLeft(level.time_limit_seconds);
    generateSymbols(level);
  };

  const generateSymbols = (level: TreasureLevel) => {
    const symbolEmojis = ["🗝️", "💎", "👑", "🏺", "📜", "⚱️", "🔱", "💰"];
    const newSymbols: Symbol[] = [];

    for (let i = 0; i < level.required_symbols; i++) {
      newSymbols.push({
        id: i,
        emoji: symbolEmojis[Math.floor(Math.random() * symbolEmojis.length)],
        x: Math.random() * 80 + 10,
        y: Math.random() * 70 + 15,
        found: false,
      });
    }

    setSymbols(newSymbols);
  };

  const handleSymbolClick = (symbolId: number) => {
    const updatedSymbols = symbols.map((s) =>
      s.id === symbolId ? { ...s, found: true } : s
    );
    setSymbols(updatedSymbols);

    const foundCount = updatedSymbols.filter((s) => s.found).length;
    if (foundCount === currentLevel?.required_symbols) {
      handleLevelComplete();
    }
  };

  const handleLevelComplete = async () => {
    if (!currentLevel || !progress) return;

    try {
      const timeTaken = currentLevel.time_limit_seconds
        ? currentLevel.time_limit_seconds - (timeLeft || 0)
        : null;

      // Determine reward type based on level
      const isGemLevel = currentLevel.level_number < 10;
      const isDiamondLevel = currentLevel.level_number >= 10;
      
      // Calculate rewards - base 10 gems for level 1, increases with level
      const gemReward = isGemLevel ? 10 + (currentLevel.level_number * 5) : 0;
      const diamondReward = isDiamondLevel ? currentLevel.level_number - 9 : 0;

      await supabase.from("treasure_hunt_completions").insert([
        {
          user_id: user!.id,
          level_number: currentLevel.level_number,
          symbols_found: currentLevel.required_symbols,
          credits_earned: currentLevel.credit_reward,
          time_taken_seconds: timeTaken,
        },
      ]);

      const newTotalCredits = progress.total_credits_earned + currentLevel.credit_reward;
      const newLevel = currentLevel.level_number < 15 ? currentLevel.level_number + 1 : currentLevel.level_number;

      await supabase
        .from("treasure_hunt_progress")
        .update({
          current_level: newLevel,
          symbols_found: progress.symbols_found + currentLevel.required_symbols,
          total_credits_earned: newTotalCredits,
          last_played_at: new Date().toISOString(),
        })
        .eq("user_id", user!.id);

      // Update credits
      await supabase.rpc("update_credits", {
        user_id: user!.id,
        amount: currentLevel.credit_reward,
      });

      // Update treasure wallet with gems or diamonds
      await supabase.rpc("update_treasure_wallet", {
        p_user_id: user!.id,
        p_gems: gemReward,
        p_diamonds: diamondReward,
      });

      // Fetch updated wallet
      await fetchTreasureWallet();

      const rewardMessage = isGemLevel 
        ? `💎 +${gemReward} Gems` 
        : `💠 +${diamondReward} Diamonds`;

      toast.success(
        `🎉 Level ${currentLevel.level_number} Complete! ${rewardMessage} & +${currentLevel.credit_reward} credits`
      );

      setProgress({
        ...progress,
        current_level: newLevel,
        symbols_found: progress.symbols_found + currentLevel.required_symbols,
        total_credits_earned: newTotalCredits,
      });

      setPlaying(false);
      setCurrentLevel(null);
    } catch (error) {
      console.error("Error completing level:", error);
      toast.error("Failed to save progress");
    }
  };

  const handleLevelFail = () => {
    toast.error("Time's up! Try again!");
    setPlaying(false);
    setCurrentLevel(null);
  };

  const quitLevel = () => {
    setPlaying(false);
    setCurrentLevel(null);
    setTimeLeft(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Trophy className="w-16 h-16 mx-auto mb-4 animate-pulse" />
          <p className="text-lg">Loading treasure hunt...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Trophy className="w-16 h-16 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Sign In Required</h2>
            <p className="text-muted-foreground mb-4">
              You need to be signed in to play the treasure hunt
            </p>
            <Button onClick={() => navigate("/auth")}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (playing && currentLevel) {
    const foundSymbols = symbols.filter((s) => s.found).length;
    const progressPercent = (foundSymbols / currentLevel.required_symbols) * 100;

    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-900/20 via-background to-emerald-900/20 p-4">
        <div className="max-w-6xl mx-auto">
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    {currentLevel.name}
                  </h2>
                  <p className="text-sm text-muted-foreground">{currentLevel.description}</p>
                </div>
                <Button variant="outline" size="sm" onClick={quitLevel}>
                  Quit
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  <span className="text-sm">
                    {foundSymbols}/{currentLevel.required_symbols} Symbols
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  <span className="text-sm">{currentLevel.credit_reward} Credits</span>
                </div>
                {timeLeft !== null && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">{timeLeft}s</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-sm">Level {currentLevel.level_number}/15</span>
                </div>
              </div>

              <Progress value={progressPercent} className="h-2" />
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div
              className="relative w-full h-[500px] md:h-[600px] bg-gradient-to-br from-amber-100 to-emerald-100 dark:from-amber-950 dark:to-emerald-950"
              style={{
                backgroundImage: currentLevel.map_image_url
                  ? `url(${currentLevel.map_image_url})`
                  : "none",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <div className="absolute inset-0 bg-grid-pattern opacity-20"></div>
              {symbols.map((symbol) => (
                <button
                  key={symbol.id}
                  onClick={() => !symbol.found && handleSymbolClick(symbol.id)}
                  className={`absolute transform -translate-x-1/2 -translate-y-1/2 text-4xl md:text-5xl transition-all duration-300 ${
                    symbol.found
                      ? "scale-0 opacity-0"
                      : "scale-100 opacity-100 hover:scale-125 animate-pulse"
                  }`}
                  style={{ left: `${symbol.x}%`, top: `${symbol.y}%` }}
                  disabled={symbol.found}
                >
                  {symbol.emoji}
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-900/20 via-background to-emerald-900/20 p-4">
      <div className="max-w-6xl mx-auto">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Trophy className="w-8 h-8" />
              <div>
                <div className="text-2xl">Treasure Hunt Adventure</div>
                <p className="text-sm font-normal text-muted-foreground mt-1">
                  Find hidden symbols to unlock treasures and earn credits!
                </p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
          {progress && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-3 bg-secondary/50 rounded-lg">
                  <div className="text-2xl font-bold">{progress.current_level}</div>
                  <div className="text-xs text-muted-foreground">Current Level</div>
                </div>
                <div className="text-center p-3 bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-lg border border-emerald-500/30">
                  <div className="text-2xl font-bold flex items-center justify-center gap-1">
                    💎 {treasureWallet.gems}
                  </div>
                  <div className="text-xs text-muted-foreground">Gems</div>
                </div>
                <div className="text-center p-3 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-lg border border-blue-500/30">
                  <div className="text-2xl font-bold flex items-center justify-center gap-1">
                    💠 {treasureWallet.diamonds}
                  </div>
                  <div className="text-xs text-muted-foreground">Diamonds</div>
                </div>
                <div className="text-center p-3 bg-secondary/50 rounded-lg">
                  <div className="text-2xl font-bold">{progress.total_credits_earned}</div>
                  <div className="text-xs text-muted-foreground">Credits Earned</div>
                </div>
                <div className="text-center p-3 bg-secondary/50 rounded-lg">
                  <div className="text-2xl font-bold flex items-center justify-center gap-1">
                    <Users className="w-5 h-5" />
                    {referralCount}
                  </div>
                  <div className="text-xs text-muted-foreground">Referrals</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {levels.map((level) => {
            const isLocked = progress && level.level_number > progress.current_level;
            const isLevel5Locked = level.level_number === 5 && referralCount < 2;
            const canPlay = !isLocked && !isLevel5Locked;

            return (
              <Card
                key={level.id}
                className={`${!canPlay ? "opacity-60" : ""} hover:shadow-lg transition-shadow`}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MapPin className="w-5 h-5" />
                    Level {level.level_number}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <h3 className="font-bold text-base">{level.name}</h3>
                    <p className="text-sm text-muted-foreground">{level.description}</p>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Symbols to find:</span>
                      <span className="font-semibold">{level.required_symbols}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Reward:</span>
                      <span className="font-semibold text-primary">
                        {level.credit_reward} credits
                      </span>
                    </div>
                    {level.time_limit_seconds && (
                      <div className="flex justify-between">
                        <span>Time limit:</span>
                        <span className="font-semibold">{level.time_limit_seconds}s</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Difficulty:</span>
                      <span className="font-semibold">{level.difficulty_multiplier}x</span>
                    </div>
                  </div>

                  {isLevel5Locked && (
                    <div className="bg-accent/20 p-2 rounded text-xs flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      <span>Requires 2 referrals ({referralCount}/2)</span>
                    </div>
                  )}

                  <Button
                    onClick={() => startLevel(level)}
                    disabled={!canPlay}
                    className="w-full"
                    size="sm"
                  >
                    {isLocked ? "🔒 Locked" : isLevel5Locked ? "🔒 Need Referrals" : "Start Level"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {levels.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Trophy className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">
                No treasure hunt levels available yet. Check back later!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}