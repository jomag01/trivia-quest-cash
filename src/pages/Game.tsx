import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useNavigate, useParams } from "react-router-dom";
import { Phone, Users, Divide, Trophy, Clock } from "lucide-react";
import { toast } from "sonner";
import { useGameSounds } from "@/hooks/useGameSounds";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Question {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: number;
  difficulty: number;
}

interface GameCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string | null;
  color_from: string;
  color_to: string;
  is_active: boolean;
  min_level_required: number;
}

const prizes = [
  "₱100", "₱500", "₱1,000", "₱5,000", "₱10,000",
  "₱25,000", "₱50,000", "₱100,000", "₱500,000", "₱1,000,000",
  "₱2,500,000", "₱5,000,000", "₱7,500,000", "₱10,000,000", "₱25,000,000"
];

const MILESTONE_LEVELS = [5, 10, 15];

const Game = () => {
  const { category = "general" } = useParams<{ category: string }>();
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [lifelines, setLifelines] = useState({
    fiftyFifty: true,
    callFriend: true,
    split: true
  });
  const [eliminatedOptions, setEliminatedOptions] = useState<number[]>([]);
  const [categoryInfo, setCategoryInfo] = useState<GameCategory | null>(null);
  const [referralCount, setReferralCount] = useState(0);
  const [completedLevels, setCompletedLevels] = useState<Set<number>>(new Set());
  const [isCategoryUnlocked, setIsCategoryUnlocked] = useState(false);
  const [unlockedCategoriesCount, setUnlockedCategoriesCount] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const navigate = useNavigate();
  const { playCorrectSound, playWrongSound, playTickSound, playUrgentTickSound } = useGameSounds();

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!user) {
      toast.error("Please create an account to play");
      navigate("/auth");
    }
  }, [user, navigate]);

  useEffect(() => {
    fetchCategoryInfo();
  }, [category]);

  useEffect(() => {
    if (categoryInfo?.id && user) {
      fetchQuestions();
      fetchReferralCount();
      fetchCompletedLevels();
      checkCategoryUnlock();
    }
  }, [categoryInfo, user]);

  const checkCategoryUnlock = async () => {
    if (!user || !categoryInfo?.id) return;
    try {
      // Check if category is unlocked
      const { data: unlocked, error: unlockError } = await supabase
        .from("user_unlocked_categories")
        .select("id")
        .eq("user_id", user.id)
        .eq("category_id", categoryInfo.id)
        .maybeSingle();
      
      if (unlockError) throw unlockError;
      setIsCategoryUnlocked(!!unlocked);

      // Get count of unlocked categories
      const { data: countData, error: countError } = await supabase.rpc('get_unlocked_categories_count', {
        p_user_id: user.id
      });
      if (countError) throw countError;
      setUnlockedCategoriesCount(countData || 0);
    } catch (error: any) {
      console.error("Error checking category unlock:", error);
    }
  };

  const handleUnlockCategory = async () => {
    if (!user || !categoryInfo?.id) return;
    try {
      const { data, error } = await supabase.rpc('unlock_category', {
        p_user_id: user.id,
        p_category_id: categoryInfo.id
      });

      if (error) throw error;

      const result = data as { success: boolean; message: string; referrals_needed?: number };
      if (result.success) {
        toast.success(result.message);
        setIsCategoryUnlocked(true);
        await checkCategoryUnlock();
      } else {
        toast.error(result.message, {
          description: result.referrals_needed 
            ? `You need ${result.referrals_needed} more referral${result.referrals_needed > 1 ? 's' : ''}.`
            : undefined
        });
      }
    } catch (error: any) {
      console.error("Error unlocking category:", error);
      toast.error("Failed to unlock category");
    }
  };

  const fetchReferralCount = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.rpc('get_referral_count', {
        p_user_id: user.id
      });
      if (error) throw error;
      setReferralCount(data || 0);
    } catch (error: any) {
      console.error("Error fetching referral count:", error);
    }
  };

  const fetchCompletedLevels = async () => {
    if (!user || !categoryInfo?.id) return;
    try {
      const { data, error } = await supabase
        .from("game_level_completions")
        .select("level_number")
        .eq("user_id", user.id)
        .eq("category_id", categoryInfo.id);
      
      if (error) throw error;
      const levels = new Set(data?.map(d => d.level_number) || []);
      setCompletedLevels(levels);
    } catch (error: any) {
      console.error("Error fetching completed levels:", error);
    }
  };

  const fetchCategoryInfo = async () => {
    const { data, error } = await (supabase as any)
      .from("game_categories")
      .select("*")
      .eq("slug", category)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !data) {
      toast.error("Category not found");
      navigate("/");
      return;
    }

    setCategoryInfo(data);
  };

  const fetchQuestions = async () => {
    if (!categoryInfo?.id || !user) return;

    // Get questions user has already answered
    const { data: answeredQuestions } = await (supabase as any)
      .from('user_answered_questions')
      .select('question_id')
      .eq('user_id', user.id);

    const answeredIds = answeredQuestions?.map((q: any) => q.question_id) || [];

    // Fetch questions ordered by difficulty (1-15) to ensure progressive difficulty
    // Each level gets a question matching its difficulty level
    const { data, error } = await (supabase as any)
      .from('questions')
      .select('*')
      .eq('category_id', categoryInfo.id)
      .eq('is_active', true)
      .not('id', 'in', answeredIds.length > 0 ? `(${answeredIds.join(',')})` : '(00000000-0000-0000-0000-000000000000)')
      .order('difficulty', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(15);

    if (error) {
      toast.error("Failed to load questions");
      console.error(error);
      return;
    }

    if (!data || data.length === 0) {
      toast.error("No new questions available. All questions have been answered!");
      navigate("/dashboard");
      return;
    }

    // Sort questions by difficulty to ensure level 1 gets easiest, level 15 gets hardest
    const sortedQuestions = data.sort((a, b) => a.difficulty - b.difficulty);
    setQuestions(sortedQuestions);
  };

  useEffect(() => {
    if (timeLeft === 0) {
      toast.error("Time's up! Watch an ad to continue.");
      // In a real app, show ad here
      setTimeLeft(30);
      return;
    }

    // Play tick sound
    if (timeLeft <= 10 && timeLeft > 0) {
      playUrgentTickSound();
    } else if (timeLeft > 10) {
      playTickSound();
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, playTickSound, playUrgentTickSound]);

  const handleAnswer = async (index: number) => {
    if (showResult || !user) return;
    setSelectedAnswer(index);
    setShowResult(true);

    const currentQuestion = questions[currentLevel];
    const isCorrect = index === currentQuestion.correct_answer;

    // Save answered question to database
    await (supabase as any)
      .from('user_answered_questions')
      .insert({
        user_id: user.id,
        question_id: currentQuestion.id,
        was_correct: isCorrect
      });

    setTimeout(async () => {
      if (isCorrect) {
        playCorrectSound();
        const nextLevel = currentLevel + 1;
        
        // Award diamonds for completing this level (1-based level number)
        const completedLevel = nextLevel;
        const alreadyCompleted = completedLevels.has(completedLevel);
        
        if (!alreadyCompleted && categoryInfo?.id) {
          // Calculate diamonds based on level (e.g., level 1 = 10 diamonds, level 15 = 150 diamonds)
          const diamondsEarned = completedLevel * 10;
          
          try {
            // Record level completion and award diamonds
            const { error: completionError } = await supabase
              .from('game_level_completions')
              .insert({
                user_id: user.id,
                category_id: categoryInfo.id,
                level_number: completedLevel,
                diamonds_earned: diamondsEarned
              });

            if (completionError) throw completionError;

            // Credit diamonds to user's treasure wallet
            await supabase.rpc('update_treasure_wallet', {
              p_user_id: user.id,
              p_gems: 0,
              p_diamonds: diamondsEarned
            });

            // Update local state
            setCompletedLevels(prev => new Set([...prev, completedLevel]));

            toast.success(`🎉 Level ${completedLevel} Complete!`, {
              description: `You earned ${diamondsEarned} diamonds! 💎`
            });
          } catch (error: any) {
            console.error('Error recording level completion:', error);
          }
        } else if (alreadyCompleted) {
          toast.info(`Level ${completedLevel} completed again!`, {
            description: "Diamonds already earned for this level. Advance to earn more!"
          });
        }
        
        // Check milestone levels for additional rewards
        if (MILESTONE_LEVELS.includes(nextLevel)) {
          try {
            const { data, error } = await supabase.rpc('claim_level_prize', {
              _user_id: user.id,
              _level: nextLevel
            });

            if (error) throw error;

            const result = data as { success: boolean; credits_awarded: number; new_balance: number } | null;
            if (result?.success) {
              toast.success(`🏆 Milestone Bonus!`, {
                description: `You won ${result.credits_awarded} bonus credits!`
              });
            }
          } catch (error) {
            console.error('Prize claim error:', error);
          }
        }
        
        // Check if user can access next level (needs category unlock for level 6+)
        if (currentLevel < questions.length - 1) {
          if (nextLevel >= 6 && !isCategoryUnlocked) {
            const requiredReferrals = (unlockedCategoriesCount + 1) * 2;
            toast.error("🔒 Level 6+ Locked!", {
              description: `Unlock this category first. Need ${requiredReferrals} total referrals (${referralCount}/${requiredReferrals}).`,
              duration: 5000
            });
            setTimeout(() => {
              navigate("/dashboard");
            }, 3000);
            return;
          }

          toast.success("Correct! Moving to next level.");
          setCurrentLevel(nextLevel);
          setSelectedAnswer(null);
          setShowResult(false);
          setTimeLeft(30);
          setEliminatedOptions([]);
        } else {
          // User completed all 15 levels - mark category as completed
          if (categoryInfo?.id) {
            await (supabase as any)
              .from('user_completed_categories')
              .insert({
                user_id: user.id,
                category_id: categoryInfo.id,
                total_levels_completed: 15
              });
          }
          
          toast.success("🎉 Congratulations! You've completed all 15 levels!", {
            description: "Redirecting to play another game..."
          });
          
          // Redirect to dashboard to select next game
          setTimeout(() => {
            navigate("/dashboard");
          }, 3000);
        }
      } else {
        playWrongSound();
        toast.error("Wrong answer! Try again with new questions.");
        navigate("/dashboard");
      }
    }, 2000);
  };

  const handleTextAnswer = async () => {
    if (showResult || !user || !userAnswer.trim()) return;
    
    const currentQuestion = questions[currentLevel];
    const correctAnswerText = [
      currentQuestion.option_a,
      currentQuestion.option_b,
      currentQuestion.option_c,
      currentQuestion.option_d
    ][currentQuestion.correct_answer];
    
    const isCorrect = userAnswer.trim().toLowerCase() === correctAnswerText.toLowerCase();
    setSelectedAnswer(isCorrect ? currentQuestion.correct_answer : -1);
    setShowResult(true);

    // Save answered question to database
    await (supabase as any)
      .from('user_answered_questions')
      .insert({
        user_id: user.id,
        question_id: currentQuestion.id,
        was_correct: isCorrect
      });

    setTimeout(async () => {
      if (isCorrect) {
        playCorrectSound();
        const nextLevel = currentLevel + 1;
        
        const completedLevel = nextLevel;
        const alreadyCompleted = completedLevels.has(completedLevel);
        
        if (!alreadyCompleted && categoryInfo?.id) {
          const diamondsEarned = completedLevel * 10;
          
          try {
            const { error: completionError } = await supabase
              .from('game_level_completions')
              .insert({
                user_id: user.id,
                category_id: categoryInfo.id,
                level_number: completedLevel,
                diamonds_earned: diamondsEarned
              });

            if (completionError) throw completionError;

            await supabase.rpc('update_treasure_wallet', {
              p_user_id: user.id,
              p_gems: 0,
              p_diamonds: diamondsEarned
            });

            setCompletedLevels(prev => new Set([...prev, completedLevel]));

            toast.success(`🎉 Level ${completedLevel} Complete!`, {
              description: `You earned ${diamondsEarned} diamonds! 💎`
            });
          } catch (error: any) {
            console.error('Error recording level completion:', error);
          }
        } else if (alreadyCompleted) {
          toast.info(`Level ${completedLevel} completed again!`, {
            description: "Diamonds already earned for this level. Advance to earn more!"
          });
        }

        if (currentLevel < questions.length - 1) {
          if (nextLevel >= 6 && !isCategoryUnlocked) {
            const requiredReferrals = (unlockedCategoriesCount + 1) * 2;
            toast.error("🔒 Level 6+ Locked!", {
              description: `Unlock this category first. Need ${requiredReferrals} total referrals (${referralCount}/${requiredReferrals}).`,
              duration: 5000
            });
            navigate("/dashboard");
            return;
          }

          setCurrentLevel(nextLevel);
          setSelectedAnswer(null);
          setShowResult(false);
          setTimeLeft(30);
          setEliminatedOptions([]);
          setUserAnswer("");
        } else {
          toast.success("🎉 Congratulations! You completed all 15 levels!");
          navigate("/dashboard");
        }
      } else {
        playWrongSound();
        toast.error("Wrong answer! Game Over.");
        setTimeout(() => {
          navigate("/dashboard");
        }, 1500);
      }
    }, 1000);
  };

  const useFiftyFifty = () => {
    if (!lifelines.fiftyFifty) return;
    
    const correctAnswer = questions[currentLevel].correct_answer;
    const wrongAnswers = [0, 1, 2, 3].filter(i => i !== correctAnswer);
    const toEliminate = wrongAnswers.slice(0, 2);
    
    setEliminatedOptions(toEliminate);
    setLifelines({ ...lifelines, fiftyFifty: false });
    toast.success("50/50 used! Two wrong answers eliminated.");
  };

  const useCallFriend = () => {
    if (!lifelines.callFriend) return;
    
    const currentQuestion = questions[currentLevel];
    const options = [
      currentQuestion.option_a,
      currentQuestion.option_b,
      currentQuestion.option_c,
      currentQuestion.option_d
    ];
    toast.success(`Your friend suggests: ${options[currentQuestion.correct_answer]}`);
    setLifelines({ ...lifelines, callFriend: false });
  };

  const useSplit = () => {
    if (!lifelines.split) return;
    
    toast("Audience vote", {
      description: "Results will show after voting..."
    });
    setLifelines({ ...lifelines, split: false });
  };

  const getButtonVariant = (index: number) => {
    if (!showResult) return "outline";
    if (index === questions[currentLevel].correct_answer) return "default";
    if (index === selectedAnswer) return "destructive";
    return "outline";
  };

  if (questions.length === 0 || !categoryInfo) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Category Header */}
        <div className="text-center mb-6">
          <Badge className="text-2xl px-4 py-2 mb-2">
            {categoryInfo.icon} {categoryInfo.name}
          </Badge>
          {categoryInfo.description && (
            <p className="text-muted-foreground mt-2">{categoryInfo.description}</p>
          )}
        </div>

        {/* Prize Ladder */}
        <Card className="p-4 mb-6 gradient-accent border-primary/20 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-primary" />
              <span className="font-bold">Level {currentLevel + 1}/15</span>
              {completedLevels.has(currentLevel + 1) && (
                <Badge variant="secondary" className="ml-2">✓ Completed</Badge>
              )}
              {MILESTONE_LEVELS.includes(currentLevel + 1) && (
                <Badge variant="default" className="ml-2 animate-pulse">Milestone!</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-primary font-bold text-xl">
              <span>{prizes[currentLevel]}</span>
            </div>
          </div>
          <Progress value={((currentLevel + 1) / 15) * 100} className="h-2" />
          
          {/* Category Unlock Status */}
          {currentLevel >= 5 && (
            <div className="mt-3 pt-3 border-t border-primary/20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Category Status:</span>
                </div>
                <Badge variant={isCategoryUnlocked ? "default" : "destructive"}>
                  {isCategoryUnlocked ? "✓ Unlocked" : "🔒 Locked"}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Total Referrals: {referralCount}</p>
                <p>Unlocked Categories: {unlockedCategoriesCount}</p>
                <p>Required for this category: {(unlockedCategoriesCount + (isCategoryUnlocked ? 0 : 1)) * 2} referrals</p>
              </div>
              {!isCategoryUnlocked && referralCount >= (unlockedCategoriesCount + 1) * 2 && (
                <Button 
                  onClick={handleUnlockCategory}
                  className="w-full mt-2"
                  size="sm"
                >
                  Unlock This Category
                </Button>
              )}
              {!isCategoryUnlocked && referralCount < (unlockedCategoriesCount + 1) * 2 && (
                <p className="text-xs text-destructive mt-2">
                  Need {(unlockedCategoriesCount + 1) * 2 - referralCount} more referral(s) to unlock!
                </p>
              )}
            </div>
          )}
        </Card>

        {/* Timer */}
        <Card className="p-4 mb-6 gradient-primary border-primary/20 shadow-card">
          <div className="flex items-center justify-center gap-3">
            <Clock className="w-6 h-6 text-primary animate-pulse" />
            <span className="text-2xl font-bold">{timeLeft}s</span>
          </div>
        </Card>

        {/* Question */}
        <Card className="p-8 mb-6 gradient-accent border-primary/20 shadow-card">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            {questions[currentLevel].question}
          </h2>

          {categoryInfo?.slug === 'scrambled' ? (
            <div className="space-y-4">
              <Input
                type="text"
                placeholder="Type your answer here..."
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !showResult) {
                    handleTextAnswer();
                  }
                }}
                disabled={showResult}
                className="text-lg py-6 text-center"
              />
              <Button
                variant="default"
                className="w-full h-auto py-4 px-6 text-lg transition-smooth hover:shadow-gold"
                onClick={handleTextAnswer}
                disabled={showResult || !userAnswer.trim()}
              >
                Submit Answer
              </Button>
              {showResult && (
                <p className={`text-center font-bold ${selectedAnswer === -1 ? 'text-destructive' : 'text-primary'}`}>
                  {selectedAnswer === -1 ? '❌ Incorrect!' : '✓ Correct!'}
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                questions[currentLevel].option_a,
                questions[currentLevel].option_b,
                questions[currentLevel].option_c,
                questions[currentLevel].option_d
              ].map((option, index) => (
                <Button
                  key={index}
                  variant={getButtonVariant(index)}
                  className="h-auto py-4 px-6 text-lg transition-smooth hover:shadow-gold"
                  onClick={() => handleAnswer(index)}
                  disabled={showResult || eliminatedOptions.includes(index)}
                >
                  <span className="font-bold mr-2">{String.fromCharCode(65 + index)}:</span>
                  {option}
                </Button>
              ))}
            </div>
          )}
        </Card>

        {/* Lifelines */}
        <Card className="p-6 gradient-accent border-primary/20 shadow-card">
          <h3 className="text-xl font-bold mb-4 text-center">Lifelines</h3>
          <div className="grid grid-cols-3 gap-4">
            <Button
              variant={lifelines.fiftyFifty ? "default" : "outline"}
              onClick={useFiftyFifty}
              disabled={!lifelines.fiftyFifty || showResult}
              className="flex flex-col items-center gap-2 h-auto py-4"
            >
              <Divide className="w-6 h-6" />
              <span className="text-xs">50/50</span>
            </Button>

            <Button
              variant={lifelines.callFriend ? "default" : "outline"}
              onClick={useCallFriend}
              disabled={!lifelines.callFriend || showResult}
              className="flex flex-col items-center gap-2 h-auto py-4"
            >
              <Phone className="w-6 h-6" />
              <span className="text-xs">Call Friend</span>
            </Button>

            <Button
              variant={lifelines.split ? "default" : "outline"}
              onClick={useSplit}
              disabled={!lifelines.split || showResult}
              className="flex flex-col items-center gap-2 h-auto py-4"
            >
              <Users className="w-6 h-6" />
              <span className="text-xs">Ask Audience</span>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Game;