import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Sword, Shield, Zap, Heart, Clock, Star, Trophy, 
  Play, Pause, ArrowLeft, ShoppingCart, Lock, Crown,
  Crosshair, Target, Sparkles, Gem
} from 'lucide-react';
import { GameEngine } from '@/game/engine/GameEngine';
import { 
  useHeroes, useLevels, usePlayerProgress, usePlayerHeroes, 
  useStoreItems, useUnlockHero, useRecordLevelCompletion, usePurchaseItem 
} from '@/game/hooks/useGameData';
import { Hero, GameLevel, StoreItem } from '@/game/types';

const MobaGame = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Data hooks
  const { data: heroes = [], isLoading: heroesLoading } = useHeroes();
  const { data: levels = [], isLoading: levelsLoading } = useLevels();
  const { data: playerProgress, isLoading: progressLoading } = usePlayerProgress();
  const { data: playerHeroes = [] } = usePlayerHeroes();
  const { data: storeItems = [] } = useStoreItems();
  const unlockHeroMutation = useUnlockHero();
  const recordCompletionMutation = useRecordLevelCompletion();
  const purchaseItemMutation = usePurchaseItem();

  // Game state
  const [gamePhase, setGamePhase] = useState<'menu' | 'hero-select' | 'level-select' | 'store' | 'playing' | 'paused' | 'result'>('menu');
  const [selectedHero, setSelectedHero] = useState<Hero | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<GameLevel | null>(null);
  const [activeBoosts, setActiveBoosts] = useState<StoreItem[]>([]);
  const [gameResult, setGameResult] = useState<{
    victory: boolean;
    score: number;
    kills: number;
    timeUsed: number;
    diamonds: number;
    xp: number;
    stars: number;
  } | null>(null);
  const [showStoreDialog, setShowStoreDialog] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      toast.error('Please sign in to play');
      navigate('/auth');
    }
  }, [user, navigate]);

  // Auto-unlock starter heroes
  useEffect(() => {
    if (user && heroes.length > 0 && playerHeroes !== undefined) {
      const starterHeroes = heroes.filter(h => h.isStarter);
      const unlockedHeroIds = playerHeroes.map(ph => ph.heroId);
      
      starterHeroes.forEach(hero => {
        if (!unlockedHeroIds.includes(hero.id)) {
          unlockHeroMutation.mutate(hero.id);
        }
      });
    }
  }, [user, heroes, playerHeroes]);

  const handleGameEnd = useCallback((victory: boolean, score: number, kills: number, timeUsed: number) => {
    if (!selectedLevel) return;

    const stars = victory ? (timeUsed < selectedLevel.timeLimitSeconds / 2 ? 3 : timeUsed < selectedLevel.timeLimitSeconds * 0.75 ? 2 : 1) : 0;
    const diamonds = victory ? selectedLevel.rewardDiamonds * stars : 0;
    const xp = victory ? selectedLevel.rewardXp : Math.floor(selectedLevel.rewardXp * 0.2);

    setGameResult({
      victory,
      score,
      kills,
      timeUsed,
      diamonds,
      xp,
      stars,
    });
    setGamePhase('result');

    if (victory && selectedHero) {
      recordCompletionMutation.mutate({
        levelId: selectedLevel.id,
        heroUsed: selectedHero.id,
        score,
        timeSeconds: timeUsed,
        starsEarned: stars,
        diamondsEarned: diamonds,
        xpEarned: xp,
      });
    }
  }, [selectedLevel, selectedHero, recordCompletionMutation]);

  const startGame = () => {
    if (!canvasRef.current || !selectedHero || !selectedLevel) return;

    const engine = new GameEngine(
      canvasRef.current,
      Math.min(window.innerWidth - 32, 1200),
      Math.min(window.innerHeight - 200, 700),
      handleGameEnd
    );

    engineRef.current = engine;
    engine.startGame(selectedLevel, selectedHero);

    // Apply active boosts
    activeBoosts.forEach(boost => {
      const effect = boost.effectConfig;
      if (effect.hp_restore_percent) {
        engine.applyBoost('hp_restore', effect.hp_restore_percent, 0);
      }
      if (effect.attack_multiplier) {
        engine.applyBoost('attack', effect.attack_multiplier, boost.durationSeconds || 300);
      }
      if (effect.defense_multiplier) {
        engine.applyBoost('defense', effect.defense_multiplier, boost.durationSeconds || 300);
      }
      if (effect.speed_multiplier) {
        engine.applyBoost('speed', effect.speed_multiplier, boost.durationSeconds || 300);
      }
    });

    setGamePhase('playing');
  };

  const handlePurchaseBoost = async (item: StoreItem) => {
    try {
      await purchaseItemMutation.mutateAsync({
        itemId: item.id,
        itemType: item.itemType,
        priceDiamonds: item.priceDiamonds,
      });
      setActiveBoosts(prev => [...prev, item]);
      toast.success(`${item.name} activated!`);
    } catch (error) {
      // Error handled in mutation
    }
  };

  const isHeroUnlocked = (heroId: string) => {
    return playerHeroes.some(ph => ph.heroId === heroId);
  };

  const isLevelUnlocked = (level: GameLevel) => {
    if (!playerProgress) return level.levelNumber === 1;
    return level.levelNumber <= (playerProgress.highestLevelCompleted || 0) + 1;
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'warrior': return <Sword className="w-4 h-4" />;
      case 'mage': return <Zap className="w-4 h-4" />;
      case 'assassin': return <Target className="w-4 h-4" />;
      case 'tank': return <Shield className="w-4 h-4" />;
      case 'support': return <Heart className="w-4 h-4" />;
      default: return <Sword className="w-4 h-4" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'tutorial': return 'bg-blue-500';
      case 'easy': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'hard': return 'bg-orange-500';
      case 'boss': return 'bg-red-500';
      case 'nightmare': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  if (!user) return null;
  if (heroesLoading || levelsLoading || progressLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Sword className="w-16 h-16 mx-auto mb-4 animate-pulse text-primary" />
          <p className="text-muted-foreground">Loading game...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b px-4 py-3">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/feed?tab=games')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-bold text-lg">Battle Arena</h1>
              <p className="text-xs text-muted-foreground">Level {playerProgress?.playerLevel || 1} • {playerProgress?.totalXp || 0} XP</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowStoreDialog(true)}>
              <ShoppingCart className="w-4 h-4 mr-1" />
              Store
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-4">
        {/* Menu Phase */}
        {gamePhase === 'menu' && (
          <div className="space-y-6 animate-fade-in">
            {/* Player Stats */}
            <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                      <Crown className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <h2 className="font-bold text-xl">{profile?.full_name || 'Hero'}</h2>
                      <p className="text-sm text-muted-foreground">Level {playerProgress?.playerLevel || 1}</p>
                      <Progress value={(playerProgress?.totalXp || 0) % 100} className="w-32 h-2 mt-1" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-primary">{playerProgress?.totalWins || 0}</p>
                      <p className="text-xs text-muted-foreground">Wins</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-primary">{playerProgress?.totalKills || 0}</p>
                      <p className="text-xs text-muted-foreground">Kills</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-primary">{playerProgress?.highestLevelCompleted || 0}</p>
                      <p className="text-xs text-muted-foreground">Cleared</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Main Actions */}
            <div className="grid grid-cols-2 gap-4">
              <Button
                size="lg"
                className="h-24 text-lg"
                onClick={() => setGamePhase('hero-select')}
              >
                <Play className="w-8 h-8 mr-2" />
                Play Campaign
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-24 text-lg"
                onClick={() => setShowStoreDialog(true)}
              >
                <ShoppingCart className="w-8 h-8 mr-2" />
                Game Store
              </Button>
            </div>

            {/* Quick Level Select */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  Continue Adventure
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-40">
                  <div className="space-y-2">
                    {levels.slice(0, 5).map(level => (
                      <div
                        key={level.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          isLevelUnlocked(level) ? 'cursor-pointer hover:bg-muted/50' : 'opacity-50'
                        }`}
                        onClick={() => {
                          if (isLevelUnlocked(level)) {
                            setSelectedLevel(level);
                            setGamePhase('hero-select');
                          }
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getDifficultyColor(level.difficulty)}`}>
                            {level.levelNumber}
                          </div>
                          <div>
                            <p className="font-medium">{level.name}</p>
                            <p className="text-xs text-muted-foreground">{level.difficulty}</p>
                          </div>
                        </div>
                        {!isLevelUnlocked(level) && <Lock className="w-4 h-4 text-muted-foreground" />}
                        {isLevelUnlocked(level) && (
                          <div className="flex items-center gap-1">
                            <Gem className="w-4 h-4 text-cyan-500" />
                            <span className="text-sm">{level.rewardDiamonds}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Hero Select Phase */}
        {gamePhase === 'hero-select' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => setGamePhase('menu')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <h2 className="text-xl font-bold">Select Your Hero</h2>
              <div className="w-20" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {heroes.map(hero => {
                const unlocked = isHeroUnlocked(hero.id) || hero.isStarter;
                return (
                  <Card
                    key={hero.id}
                    className={`cursor-pointer transition-all ${
                      selectedHero?.id === hero.id ? 'ring-2 ring-primary' : ''
                    } ${!unlocked ? 'opacity-50' : ''}`}
                    onClick={() => unlocked && setSelectedHero(hero)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {getRoleIcon(hero.role)}
                          <Badge variant="secondary">{hero.role}</Badge>
                        </div>
                        {!unlocked && <Lock className="w-4 h-4 text-muted-foreground" />}
                      </div>
                      <h3 className="font-bold text-lg mb-1">{hero.name}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{hero.description}</p>
                      <div className="grid grid-cols-4 gap-2 text-center text-xs">
                        <div>
                          <Heart className="w-4 h-4 mx-auto text-red-500" />
                          <p>{hero.baseHp}</p>
                        </div>
                        <div>
                          <Sword className="w-4 h-4 mx-auto text-orange-500" />
                          <p>{hero.baseAttack}</p>
                        </div>
                        <div>
                          <Shield className="w-4 h-4 mx-auto text-blue-500" />
                          <p>{hero.baseDefense}</p>
                        </div>
                        <div>
                          <Zap className="w-4 h-4 mx-auto text-yellow-500" />
                          <p>{hero.baseSpeed}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {selectedHero && (
              <div className="flex justify-center">
                <Button size="lg" onClick={() => setGamePhase('level-select')}>
                  Continue with {selectedHero.name}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Level Select Phase */}
        {gamePhase === 'level-select' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => setGamePhase('hero-select')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <h2 className="text-xl font-bold">Select Level</h2>
              <div className="w-20" />
            </div>

            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {levels.map(level => {
                  const unlocked = isLevelUnlocked(level);
                  return (
                    <Card
                      key={level.id}
                      className={`cursor-pointer transition-all ${
                        selectedLevel?.id === level.id ? 'ring-2 ring-primary' : ''
                      } ${!unlocked ? 'opacity-50' : ''}`}
                      onClick={() => unlocked && setSelectedLevel(level)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${getDifficultyColor(level.difficulty)}`}>
                              {level.levelNumber}
                            </div>
                            <div>
                              <h3 className="font-bold">{level.name}</h3>
                              <p className="text-sm text-muted-foreground">{level.description}</p>
                              <div className="flex items-center gap-3 mt-1 text-xs">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {Math.floor(level.timeLimitSeconds / 60)}:{(level.timeLimitSeconds % 60).toString().padStart(2, '0')}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Gem className="w-3 h-3 text-cyan-500" />
                                  {level.rewardDiamonds}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Sparkles className="w-3 h-3 text-yellow-500" />
                                  {level.rewardXp} XP
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {level.bossConfig && <Badge variant="destructive">BOSS</Badge>}
                            {!unlocked && <Lock className="w-5 h-5 text-muted-foreground" />}
                          </div>
                        </div>
                        {level.storyChapter && (
                          <p className="mt-2 text-xs italic text-muted-foreground border-l-2 border-primary pl-2">
                            {level.storyChapter}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>

            {selectedLevel && (
              <div className="flex justify-center gap-4">
                <Button variant="outline" onClick={() => setShowStoreDialog(true)}>
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Buy Boosts
                </Button>
                <Button size="lg" onClick={startGame}>
                  <Play className="w-5 h-5 mr-2" />
                  Start Level {selectedLevel.levelNumber}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Playing Phase */}
        {gamePhase === 'playing' && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <p className="font-bold">{selectedLevel?.name}</p>
                <Badge>{selectedHero?.name}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => {
                  engineRef.current?.togglePause();
                  setGamePhase('paused');
                }}>
                  <Pause className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="border rounded-lg overflow-hidden bg-black">
              <canvas ref={canvasRef} className="w-full" />
            </div>
            <div className="mt-2 flex items-center justify-center gap-4 text-sm">
              <p>Press <kbd className="px-2 py-1 bg-muted rounded">1</kbd><kbd className="px-2 py-1 bg-muted rounded">2</kbd><kbd className="px-2 py-1 bg-muted rounded">3</kbd> for skills</p>
              <p>Move: <kbd className="px-2 py-1 bg-muted rounded">WASD</kbd> or Click</p>
            </div>
          </div>
        )}

        {/* Paused Phase */}
        {gamePhase === 'paused' && (
          <div className="animate-fade-in">
            <div className="border rounded-lg overflow-hidden bg-black relative">
              <canvas ref={canvasRef} className="w-full opacity-50" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Card className="w-64">
                  <CardContent className="p-6 text-center">
                    <Pause className="w-12 h-12 mx-auto mb-4 text-primary" />
                    <h3 className="font-bold text-lg mb-4">Game Paused</h3>
                    <div className="space-y-2">
                      <Button className="w-full" onClick={() => {
                        engineRef.current?.togglePause();
                        setGamePhase('playing');
                      }}>
                        <Play className="w-4 h-4 mr-2" />
                        Resume
                      </Button>
                      <Button variant="outline" className="w-full" onClick={() => {
                        engineRef.current?.destroy();
                        setGamePhase('menu');
                      }}>
                        Quit Level
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* Result Phase */}
        {gamePhase === 'result' && gameResult && (
          <div className="animate-fade-in flex items-center justify-center min-h-[60vh]">
            <Card className="w-full max-w-md">
              <CardContent className="p-6 text-center">
                {gameResult.victory ? (
                  <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
                ) : (
                  <Crosshair className="w-16 h-16 mx-auto mb-4 text-red-500" />
                )}
                <h2 className="text-2xl font-bold mb-2">
                  {gameResult.victory ? 'Victory!' : 'Defeated'}
                </h2>
                <p className="text-muted-foreground mb-4">{selectedLevel?.name}</p>

                {gameResult.victory && (
                  <div className="flex justify-center gap-1 mb-4">
                    {[1, 2, 3].map(star => (
                      <Star
                        key={star}
                        className={`w-8 h-8 ${star <= gameResult.stars ? 'text-yellow-500 fill-yellow-500' : 'text-muted'}`}
                      />
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 mb-6 text-left">
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm text-muted-foreground">Score</p>
                    <p className="text-xl font-bold">{gameResult.score}</p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm text-muted-foreground">Kills</p>
                    <p className="text-xl font-bold">{gameResult.kills}</p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm text-muted-foreground">Time</p>
                    <p className="text-xl font-bold">
                      {Math.floor(gameResult.timeUsed / 60)}:{(gameResult.timeUsed % 60).toString().padStart(2, '0')}
                    </p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm text-muted-foreground">Rewards</p>
                    <div className="flex items-center gap-2">
                      <Gem className="w-4 h-4 text-cyan-500" />
                      <span className="font-bold">{gameResult.diamonds}</span>
                      <Sparkles className="w-4 h-4 text-yellow-500 ml-2" />
                      <span className="font-bold">{gameResult.xp}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {gameResult.victory && selectedLevel && selectedLevel.levelNumber < levels.length && (
                    <Button
                      className="w-full"
                      onClick={() => {
                        const nextLevel = levels.find(l => l.levelNumber === selectedLevel.levelNumber + 1);
                        if (nextLevel) {
                          setSelectedLevel(nextLevel);
                          setActiveBoosts([]);
                          startGame();
                        }
                      }}
                    >
                      Next Level
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setActiveBoosts([]);
                      startGame();
                    }}
                  >
                    Retry Level
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      setGamePhase('menu');
                      setSelectedLevel(null);
                      setActiveBoosts([]);
                    }}
                  >
                    Back to Menu
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Store Dialog */}
      <Dialog open={showStoreDialog} onOpenChange={setShowStoreDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Game Store
            </DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="boosts">
            <TabsList className="w-full">
              <TabsTrigger value="boosts" className="flex-1">Boosts</TabsTrigger>
              <TabsTrigger value="heroes" className="flex-1">Heroes</TabsTrigger>
            </TabsList>
            <TabsContent value="boosts" className="space-y-3 mt-4">
              {storeItems.filter(i => i.itemType !== 'hero').map(item => (
                <Card key={item.id}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handlePurchaseBoost(item)}
                      disabled={purchaseItemMutation.isPending}
                    >
                      <Gem className="w-3 h-3 mr-1" />
                      {item.priceDiamonds}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
            <TabsContent value="heroes" className="space-y-3 mt-4">
              {heroes.filter(h => !h.isStarter && !isHeroUnlocked(h.id)).map(hero => (
                <Card key={hero.id}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getRoleIcon(hero.role)}
                      <div>
                        <p className="font-medium">{hero.name}</p>
                        <p className="text-xs text-muted-foreground">{hero.role}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        purchaseItemMutation.mutate({
                          itemId: hero.id,
                          itemType: 'hero',
                          priceDiamonds: hero.unlockCostDiamonds,
                        }, {
                          onSuccess: () => unlockHeroMutation.mutate(hero.id),
                        });
                      }}
                      disabled={purchaseItemMutation.isPending}
                    >
                      <Gem className="w-3 h-3 mr-1" />
                      {hero.unlockCostDiamonds}
                    </Button>
                  </CardContent>
                </Card>
              ))}
              {heroes.filter(h => !h.isStarter && !isHeroUnlocked(h.id)).length === 0 && (
                <p className="text-center text-muted-foreground py-8">All heroes unlocked!</p>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MobaGame;
