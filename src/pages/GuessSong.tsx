import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Music, Clock, Diamond, Lock, Users, Play, Pause, 
  RotateCcw, Trophy, Share2, Sparkles, Volume2, Youtube, Search, Loader2 
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useGameSounds } from "@/hooks/useGameSounds";

interface Level {
  id: string;
  level_number: number;
  difficulty: string;
  credits_to_play: number;
  diamonds_reward: number;
  sample_length_seconds: number;
  notes: string | null;
}

interface YouTubeVideo {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  originalSongTitle: string;
}

interface WalletData {
  credits: number;
  diamonds: number;
}

// Predefined popular songs to search for instrumentals
const SONG_LIBRARY = [
  { title: "Shape of You", artist: "Ed Sheeran" },
  { title: "Blinding Lights", artist: "The Weeknd" },
  { title: "Dance Monkey", artist: "Tones and I" },
  { title: "Uptown Funk", artist: "Bruno Mars" },
  { title: "Happy", artist: "Pharrell Williams" },
  { title: "Despacito", artist: "Luis Fonsi" },
  { title: "Thinking Out Loud", artist: "Ed Sheeran" },
  { title: "Someone Like You", artist: "Adele" },
  { title: "Perfect", artist: "Ed Sheeran" },
  { title: "Havana", artist: "Camila Cabello" },
  { title: "Bad Guy", artist: "Billie Eilish" },
  { title: "Old Town Road", artist: "Lil Nas X" },
  { title: "Shallow", artist: "Lady Gaga" },
  { title: "Señorita", artist: "Shawn Mendes" },
  { title: "Sunflower", artist: "Post Malone" },
  { title: "Believer", artist: "Imagine Dragons" },
  { title: "Thunder", artist: "Imagine Dragons" },
  { title: "Faded", artist: "Alan Walker" },
  { title: "Closer", artist: "The Chainsmokers" },
  { title: "Stay", artist: "The Kid LAROI" },
  { title: "Peaches", artist: "Justin Bieber" },
  { title: "Levitating", artist: "Dua Lipa" },
  { title: "drivers license", artist: "Olivia Rodrigo" },
  { title: "Watermelon Sugar", artist: "Harry Styles" },
  { title: "Dynamite", artist: "BTS" },
  { title: "Butter", artist: "BTS" },
  { title: "Good 4 U", artist: "Olivia Rodrigo" },
  { title: "Montero", artist: "Lil Nas X" },
  { title: "Save Your Tears", artist: "The Weeknd" },
  { title: "Kiss Me More", artist: "Doja Cat" },
];

const LEVEL_COLORS: Record<string, { from: string; to: string; text: string }> = {
  "Very Easy": { from: "from-green-400", to: "to-emerald-500", text: "text-emerald-600" },
  "Easy": { from: "from-blue-400", to: "to-cyan-500", text: "text-cyan-600" },
  "Medium": { from: "from-yellow-400", to: "to-amber-500", text: "text-amber-600" },
  "Hard": { from: "from-orange-400", to: "to-red-500", text: "text-red-600" },
  "Very Hard": { from: "from-red-500", to: "to-rose-600", text: "text-rose-600" },
  "Expert": { from: "from-purple-500", to: "to-violet-600", text: "text-violet-600" },
  "Legendary": { from: "from-pink-500", to: "to-fuchsia-600", text: "text-fuchsia-600" }
};

const GuessSong = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { playCorrectSound, playWrongSound, playTickSound } = useGameSounds();
  const playerRef = useRef<HTMLIFrameElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Game state
  const [levels, setLevels] = useState<Level[]>([]);
  const [currentLevel, setCurrentLevel] = useState<Level | null>(null);
  const [currentVideo, setCurrentVideo] = useState<YouTubeVideo | null>(null);
  const [completedLevels, setCompletedLevels] = useState<Set<number>>(new Set());
  const [wallet, setWallet] = useState<WalletData>({ credits: 0, diamonds: 0 });
  const [referralCount, setReferralCount] = useState(0);

  // UI state
  const [gameStarted, setGameStarted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [userGuess, setUserGuess] = useState("");
  const [timeLeft, setTimeLeft] = useState(30);
  const [showWinDialog, setShowWinDialog] = useState(false);
  const [showLoseDialog, setShowLoseDialog] = useState(false);
  const [showLockedDialog, setShowLockedDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [earnedDiamonds, setEarnedDiamonds] = useState(0);
  const [samplePlayed, setSamplePlayed] = useState(false);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!user) {
      toast.error("Please create an account to play");
      navigate("/auth");
    }
  }, [user, navigate]);

  // Fetch initial data
  useEffect(() => {
    if (user) {
      fetchLevels();
      fetchWallet();
      fetchProgress();
      fetchReferrals();
    }
  }, [user]);

  // Timer effect
  useEffect(() => {
    if (!gameStarted || timeLeft <= 0 || !samplePlayed) return;

    if (timeLeft <= 5) {
      playTickSound();
    }

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameStarted, samplePlayed]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const fetchLevels = async () => {
    try {
      const { data, error } = await supabase
        .from("guess_song_levels")
        .select("*")
        .eq("is_active", true)
        .order("level_number");

      if (error) throw error;
      setLevels(data || []);
    } catch (error) {
      console.error("Error fetching levels:", error);
      toast.error("Failed to load game levels");
    } finally {
      setLoading(false);
    }
  };

  const fetchWallet = async () => {
    if (!user) return;
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("credits")
        .eq("id", user.id)
        .single();

      const { data: treasure } = await supabase
        .from("treasure_wallet")
        .select("diamonds")
        .eq("user_id", user.id)
        .single();

      setWallet({
        credits: profile?.credits || 0,
        diamonds: treasure?.diamonds || 0
      });
    } catch (error) {
      console.error("Error fetching wallet:", error);
    }
  };

  const fetchProgress = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("guess_song_progress")
        .select("level_number")
        .eq("user_id", user.id);

      if (error) throw error;
      setCompletedLevels(new Set(data?.map(d => d.level_number) || []));
    } catch (error) {
      console.error("Error fetching progress:", error);
    }
  };

  const fetchReferrals = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.rpc("get_referral_count", {
        p_user_id: user.id
      });
      if (error) throw error;
      setReferralCount(data || 0);
    } catch (error) {
      console.error("Error fetching referrals:", error);
    }
  };

  const searchYouTubeInstrumental = async (songTitle: string): Promise<YouTubeVideo | null> => {
    try {
      setIsSearching(true);
      const { data, error } = await supabase.functions.invoke('youtube-search', {
        body: { query: songTitle, maxResults: 5 }
      });

      if (error) throw error;
      if (!data.success || !data.videos?.length) {
        throw new Error("No instrumental found");
      }

      // Pick a random video from the results
      const randomIndex = Math.floor(Math.random() * data.videos.length);
      const video = data.videos[randomIndex];
      
      return {
        ...video,
        originalSongTitle: songTitle
      };
    } catch (error) {
      console.error("Error searching YouTube:", error);
      return null;
    } finally {
      setIsSearching(false);
    }
  };

  const getRandomSong = (difficulty: number) => {
    // Higher difficulty = pick from less popular songs (later in array)
    const startIndex = Math.min((difficulty - 1) * 2, SONG_LIBRARY.length - 5);
    const endIndex = Math.min(startIndex + 10, SONG_LIBRARY.length);
    const availableSongs = SONG_LIBRARY.slice(startIndex, endIndex);
    const randomIndex = Math.floor(Math.random() * availableSongs.length);
    return availableSongs[randomIndex];
  };

  const checkLevel5Lock = (): boolean => {
    if (referralCount < 2 || wallet.diamonds < 150) {
      return true;
    }
    return false;
  };

  // Check if user has enough credits to play a level (auto-unlock)
  const isLevelUnlocked = (level: Level): boolean => {
    // Level 5 special lock still applies
    if (level.level_number === 5 && checkLevel5Lock()) {
      return false;
    }
    // All other levels are unlocked if user has enough credits
    return wallet.credits >= level.credits_to_play;
  };

  const startLevel = async (level: Level) => {
    if (!user) return;

    // Check level 5 special lock
    if (level.level_number === 5 && checkLevel5Lock()) {
      setShowLockedDialog(true);
      return;
    }

    // Check credits - this is the only requirement now
    if (wallet.credits < level.credits_to_play) {
      toast.error("Oops! Not Enough Credits 😕", {
        description: `You need ${level.credits_to_play} credits to play this level.`
      });
      return;
    }

    // Deduct credits
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ credits: wallet.credits - level.credits_to_play })
        .eq("id", user.id);

      if (error) throw error;

      setWallet(prev => ({ ...prev, credits: prev.credits - level.credits_to_play }));
      setCurrentLevel(level);
      setTimeLeft(30);
      setUserGuess("");
      setGameStarted(true);
      setIsPlaying(false);
      setSamplePlayed(false);
      setCurrentVideo(null);

      // Search for a random song instrumental on YouTube
      const song = getRandomSong(level.level_number);
      const video = await searchYouTubeInstrumental(`${song.title} ${song.artist}`);
      
      if (video) {
        setCurrentVideo({
          ...video,
          originalSongTitle: song.title
        });
      } else {
        toast.error("Failed to find instrumental. Try again.");
        setGameStarted(false);
        // Refund credits
        await supabase
          .from("profiles")
          .update({ credits: wallet.credits })
          .eq("id", user.id);
        setWallet(prev => ({ ...prev, credits: prev.credits + level.credits_to_play }));
      }
    } catch (error) {
      console.error("Error starting level:", error);
      toast.error("Failed to start level");
    }
  };

  const playYouTubeVideo = useCallback(() => {
    if (!currentVideo || !currentLevel) return;
    
    setIsPlaying(true);
    setSamplePlayed(true);

    // Stop after sample length
    setTimeout(() => {
      setIsPlaying(false);
    }, currentLevel.sample_length_seconds * 1000);
  }, [currentVideo, currentLevel]);

  const handleSubmitGuess = async () => {
    if (!currentVideo || !currentLevel || !user) return;

    // Compare guess with the original song title
    const normalizedGuess = userGuess.toLowerCase().trim();
    const normalizedTitle = currentVideo.originalSongTitle.toLowerCase().trim();
    
    // Check if the guess contains the main words of the title
    const isCorrect = normalizedGuess.includes(normalizedTitle) || 
                     normalizedTitle.includes(normalizedGuess) ||
                     normalizedTitle.split(' ').some(word => 
                       word.length > 2 && normalizedGuess.includes(word)
                     );

    if (isCorrect) {
      playCorrectSound();
      
      // Award diamonds
      try {
        await supabase.rpc("update_treasure_wallet", {
          p_user_id: user.id,
          p_gems: 0,
          p_diamonds: currentLevel.diamonds_reward
        });

        // Record progress
        await supabase
          .from("guess_song_progress")
          .upsert({
            user_id: user.id,
            level_number: currentLevel.level_number,
            diamonds_earned: currentLevel.diamonds_reward,
            credits_spent: currentLevel.credits_to_play
          });

        setEarnedDiamonds(currentLevel.diamonds_reward);
        setCompletedLevels(prev => new Set([...prev, currentLevel.level_number]));
        setShowWinDialog(true);
        setGameStarted(false);
        fetchWallet();
      } catch (error) {
        console.error("Error recording win:", error);
      }
    } else {
      playWrongSound();
      setShowLoseDialog(true);
      setGameStarted(false);
    }

    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleTimeUp = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    toast.error("Time's Up!", {
      description: "The song slipped away—try again!"
    });
    setShowLoseDialog(true);
    setGameStarted(false);
  };

  const handleNextLevel = () => {
    setShowWinDialog(false);
    if (currentLevel && currentLevel.level_number < 15) {
      const nextLevel = levels.find(l => l.level_number === currentLevel.level_number + 1);
      if (nextLevel) {
        startLevel(nextLevel);
      }
    } else {
      toast.success("🎉 Congratulations! You've completed all 15 levels!");
      navigate("/games");
    }
  };

  const handleRetry = () => {
    setShowLoseDialog(false);
    if (currentLevel) {
      startLevel(currentLevel);
    }
  };

  // YouTube embed URL with autoplay based on isPlaying state
  const getYouTubeEmbedUrl = (videoId: string) => {
    const startTime = Math.floor(Math.random() * 30) + 15; // Random start between 15-45 seconds
    return `https://www.youtube.com/embed/${videoId}?autoplay=${isPlaying ? 1 : 0}&start=${startTime}&controls=0&modestbranding=1&rel=0&showinfo=0&enablejsapi=1`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-violet-500/10">
        <div className="text-center space-y-4">
          <Music className="w-16 h-16 mx-auto text-primary animate-bounce" />
          <p className="text-lg font-medium">Loading Guess Me the Song!...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 bg-gradient-to-br from-pink-500/5 via-purple-500/5 to-violet-500/5">
      {/* Hero Header */}
      <section className="relative overflow-hidden bg-gradient-to-r from-pink-500 via-purple-500 to-violet-500 py-8">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzMiAyIDIgNC0yIDQtMiA0LTItMi0yLTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm">
              <Youtube className="h-5 w-5 text-white" />
              <span className="text-white font-medium">🎵 Guess Me the Song!</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white">
              Can You Name That Tune?
            </h1>
            <p className="text-white/80 max-w-md mx-auto">
              Listen to instrumental versions from YouTube and guess the original song title!
            </p>
            
            {/* Wallet Display */}
            <div className="flex justify-center gap-4 mt-4">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm">
                <Sparkles className="h-4 w-4 text-yellow-300" />
                <span className="text-white font-bold">{wallet.credits} Credits</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm">
                <Diamond className="h-4 w-4 text-cyan-300" />
                <span className="text-white font-bold">{wallet.diamonds} Diamonds</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Game Content */}
      {gameStarted && currentLevel ? (
        <section className="container mx-auto px-4 py-8">
          <Card className="max-w-2xl mx-auto overflow-hidden shadow-2xl border-0">
            {/* Level Header */}
            <div className={`p-6 bg-gradient-to-r ${LEVEL_COLORS[currentLevel.difficulty]?.from || "from-primary"} ${LEVEL_COLORS[currentLevel.difficulty]?.to || "to-primary"}`}>
              <div className="flex items-center justify-between text-white">
                <div>
                  <Badge variant="secondary" className="mb-2">
                    Level {currentLevel.level_number}
                  </Badge>
                  <h2 className="text-2xl font-bold">{currentLevel.difficulty}</h2>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 justify-end mb-1">
                    <Diamond className="h-5 w-5" />
                    <span className="text-xl font-bold">+{currentLevel.diamonds_reward}</span>
                  </div>
                  <p className="text-sm opacity-80">{currentLevel.sample_length_seconds}s sample</p>
                </div>
              </div>
            </div>

            {/* Timer */}
            {samplePlayed && (
              <div className="p-4 bg-muted/50 border-b">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Clock className={`h-5 w-5 ${timeLeft <= 10 ? "text-destructive animate-pulse" : "text-muted-foreground"}`} />
                    <span className={`text-xl font-bold ${timeLeft <= 10 ? "text-destructive" : ""}`}>
                      {timeLeft}s
                    </span>
                  </div>
                  <Badge variant={timeLeft <= 10 ? "destructive" : "secondary"}>
                    {timeLeft <= 10 ? "Hurry!" : "Take your time"}
                  </Badge>
                </div>
                <Progress value={(timeLeft / 30) * 100} className="h-2" />
              </div>
            )}

            {/* YouTube Player Area */}
            <div className="p-8 space-y-6">
              {isSearching ? (
                <div className="text-center space-y-4">
                  <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center shadow-lg animate-pulse">
                    <Search className="w-12 h-12 text-white animate-spin" />
                  </div>
                  <p className="text-muted-foreground">Searching for instrumental...</p>
                </div>
              ) : currentVideo ? (
                <div className="text-center space-y-4">
                  {/* Hidden YouTube iframe for audio */}
                  <div className={`relative w-full aspect-video rounded-lg overflow-hidden ${isPlaying ? '' : 'hidden'}`}>
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/90 to-pink-500/90 z-10 flex items-center justify-center">
                      <div className="text-center text-white space-y-2">
                        <Volume2 className="w-16 h-16 mx-auto animate-bounce" />
                        <p className="text-lg font-medium">🎵 Listen carefully...</p>
                        <p className="text-sm opacity-80">Guess the song title!</p>
                      </div>
                    </div>
                    <iframe
                      ref={playerRef}
                      src={getYouTubeEmbedUrl(currentVideo.videoId)}
                      className="absolute inset-0 w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>

                  {!isPlaying && (
                    <>
                      <div className={`w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center shadow-lg`}>
                        <Youtube className="w-12 h-12 text-white" />
                      </div>
                      
                      <Button
                        size="lg"
                        onClick={playYouTubeVideo}
                        disabled={isPlaying}
                        className={`gap-2 px-8 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700`}
                      >
                        <Play className="h-5 w-5" />
                        Play Instrumental ({currentLevel.sample_length_seconds}s)
                      </Button>

                      {!samplePlayed && (
                        <p className="text-sm text-muted-foreground">
                          Click to play the instrumental version. Timer starts after playback.
                        </p>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
                  <p className="text-muted-foreground">Preparing your challenge...</p>
                </div>
              )}

              {/* Answer Input - Show after first play */}
              {samplePlayed && currentVideo && (
                <div className="space-y-4 pt-4 border-t">
                  <Input
                    type="text"
                    placeholder="Type the original song title..."
                    value={userGuess}
                    onChange={(e) => setUserGuess(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && userGuess.trim()) {
                        handleSubmitGuess();
                      }
                    }}
                    className="text-lg py-6 text-center"
                    autoFocus
                  />
                  <Button
                    className="w-full py-6 text-lg bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                    onClick={handleSubmitGuess}
                    disabled={!userGuess.trim()}
                  >
                    <Sparkles className="mr-2 h-5 w-5" />
                    Submit Answer
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </section>
      ) : (
        /* Level Selection Grid */
        <section className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Select a Level</h2>
            <p className="text-muted-foreground">Listen to instrumental versions and guess the original song!</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 max-w-6xl mx-auto">
            {levels.map((level) => {
              const isCompleted = completedLevels.has(level.level_number);
              const hasEnoughCredits = wallet.credits >= level.credits_to_play;
              const isLevel5Locked = level.level_number === 5 && checkLevel5Lock();
              const isLocked = isLevel5Locked || !hasEnoughCredits;
              const colors = LEVEL_COLORS[level.difficulty] || { from: "from-primary", to: "to-primary", text: "text-primary" };

              return (
                <Card
                  key={level.id}
                  className={`relative overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                    isCompleted ? "ring-2 ring-green-500" : ""
                  } ${isLocked ? "opacity-75" : ""}`}
                  onClick={() => startLevel(level)}
                >
                  <div className={`h-20 bg-gradient-to-r ${colors.from} ${colors.to} flex items-center justify-center relative`}>
                    <span className="text-4xl font-bold text-white">{level.level_number}</span>
                    {isCompleted && (
                      <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full">
                        <Trophy className="h-4 w-4" />
                      </div>
                    )}
                    {isLocked && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Lock className="h-8 w-8 text-white" />
                      </div>
                    )}
                    {!isLocked && !isCompleted && (
                      <div className="absolute top-2 right-2 bg-green-500/80 text-white px-2 py-0.5 rounded-full text-xs">
                        Unlocked
                      </div>
                    )}
                  </div>
                  <div className="p-4 space-y-2">
                    <Badge className={`${colors.text} bg-transparent border ${colors.text.replace("text", "border")}`}>
                      {level.difficulty}
                    </Badge>
                    <div className="flex items-center justify-between text-sm">
                      <span className={`flex items-center gap-1 ${hasEnoughCredits ? 'text-green-600' : 'text-red-500'}`}>
                        <Sparkles className="h-3 w-3" />
                        {level.credits_to_play} {!hasEnoughCredits && '(need more)'}
                      </span>
                      <span className="flex items-center gap-1 text-cyan-600 font-medium">
                        <Diamond className="h-3 w-3" />
                        +{level.diamonds_reward}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {level.sample_length_seconds}s sample
                    </div>
                    {level.notes && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{level.notes}</p>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Win Dialog */}
      <Dialog open={showWinDialog} onOpenChange={setShowWinDialog}>
        <DialogContent className="sm:max-w-md text-center">
          <div className="space-y-6 py-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-r from-green-400 to-emerald-500 flex items-center justify-center animate-bounce">
              <Trophy className="h-10 w-10 text-white" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-2xl">🎉 Correct!</DialogTitle>
              <DialogDescription className="text-lg">
                You guessed the song right!
              </DialogDescription>
            </DialogHeader>
            {currentVideo && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">The song was:</p>
                <p className="font-bold">{currentVideo.originalSongTitle}</p>
              </div>
            )}
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-xl">
                <Diamond className="h-6 w-6 text-cyan-500" />
                <span className="font-bold text-cyan-600">+{earnedDiamonds} Diamonds Earned</span>
              </div>
              <p className="text-sm text-green-600 flex items-center justify-center gap-1">
                <Sparkles className="h-4 w-4" />
                Progress saved
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowWinDialog(false)}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Play Again
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600"
                onClick={handleNextLevel}
              >
                Next Level
                <Sparkles className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lose Dialog */}
      <Dialog open={showLoseDialog} onOpenChange={setShowLoseDialog}>
        <DialogContent className="sm:max-w-md text-center">
          <div className="space-y-6 py-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-r from-red-400 to-rose-500 flex items-center justify-center">
              <Music className="h-10 w-10 text-white" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-2xl">😢 Oops!</DialogTitle>
              <DialogDescription className="text-lg">
                That wasn't the correct song.
              </DialogDescription>
            </DialogHeader>
            <p className="text-muted-foreground">
              Don't worry—every try makes you better!
            </p>
            {currentVideo && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">The correct answer was:</p>
                <p className="font-bold">{currentVideo.originalSongTitle}</p>
              </div>
            )}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowLoseDialog(false);
                  navigate("/games");
                }}
              >
                Exit
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-orange-500 to-red-600"
                onClick={handleRetry}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Level 5 Locked Dialog */}
      <Dialog open={showLockedDialog} onOpenChange={setShowLockedDialog}>
        <DialogContent className="sm:max-w-md text-center">
          <div className="space-y-6 py-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 flex items-center justify-center">
              <Lock className="h-10 w-10 text-white" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-2xl">Level 5 Locked 🔒</DialogTitle>
              <DialogDescription className="text-lg">
                To continue, you must:
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-left bg-muted p-4 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${referralCount >= 2 ? "bg-green-500" : "bg-muted-foreground"}`}>
                  <Users className="h-4 w-4 text-white" />
                </div>
                <span className={referralCount >= 2 ? "text-green-600" : ""}>
                  Invite 2 friends ({referralCount}/2)
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${wallet.diamonds >= 150 ? "bg-green-500" : "bg-muted-foreground"}`}>
                  <Diamond className="h-4 w-4 text-white" />
                </div>
                <span className={wallet.diamonds >= 150 ? "text-green-600" : ""}>
                  Earn 150 Diamonds 💎 ({wallet.diamonds}/150)
                </span>
              </div>
            </div>
            <p className="text-muted-foreground text-sm">
              You're almost there—keep playing!
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowLockedDialog(false)}
              >
                Check Referral Status
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600"
                onClick={() => {
                  setShowLockedDialog(false);
                  navigate("/dashboard?tab=referrals");
                }}
              >
                <Share2 className="mr-2 h-4 w-4" />
                Invite Now
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GuessSong;
