import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
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
  const navigate = useNavigate();
  const { playCorrectSound, playWrongSound, playTickSound, playUrgentTickSound } = useGameSounds();

  useEffect(() => {
    fetchCategoryInfo();
  }, [category]);

  useEffect(() => {
    if (categoryInfo?.id && user) {
      fetchQuestions();
    }
  }, [categoryInfo, user]);

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

    // Fetch questions from database, excluding already answered ones
    const { data, error } = await (supabase as any)
      .from('questions')
      .select('*')
      .eq('category_id', categoryInfo.id)
      .eq('is_active', true)
      .not('id', 'in', answeredIds.length > 0 ? `(${answeredIds.join(',')})` : '(00000000-0000-0000-0000-000000000000)')
      .order('difficulty', { ascending: true })
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

    setQuestions(data);
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
        
        // Check if this is a milestone level
        if (MILESTONE_LEVELS.includes(nextLevel)) {
          try {
            const { data, error } = await supabase.rpc('claim_level_prize', {
              _user_id: user.id,
              _level: nextLevel
            });

            if (error) throw error;

            const result = data as any;
            if (result?.success) {
              toast.success(`🎉 Level ${nextLevel} Prize!`, {
                description: `You won ${result.credits_awarded} credits! New balance: ${result.new_balance}`
              });
            }
          } catch (error) {
            console.error('Prize claim error:', error);
          }
        }
        
        toast.success("Correct! Moving to next level.");
        
        if (currentLevel < questions.length - 1) {
          setCurrentLevel(nextLevel);
          setSelectedAnswer(null);
          setShowResult(false);
          setTimeLeft(30);
          setEliminatedOptions([]);
        } else {
          toast.success("Congratulations! You've completed all 15 levels!");
          navigate("/dashboard");
        }
      } else {
        playWrongSound();
        toast.error("Wrong answer! Try again with new questions.");
        navigate("/dashboard");
      }
    }, 2000);
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
              {MILESTONE_LEVELS.includes(currentLevel + 1) && (
                <Badge variant="default" className="ml-2 animate-pulse">Milestone!</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-primary font-bold text-xl">
              <span>{prizes[currentLevel]}</span>
            </div>
          </div>
          <Progress value={((currentLevel + 1) / 15) * 100} className="h-2" />
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