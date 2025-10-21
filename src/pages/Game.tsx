import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useNavigate, useParams } from "react-router-dom";
import { Phone, Users, Divide, Trophy, Clock } from "lucide-react";
import { toast } from "sonner";
import { useGameSounds } from "@/hooks/useGameSounds";
import { getCategoryQuestions, getAllCategories, type Question } from "@/lib/questions";
import { supabase } from "@/integrations/supabase/client";

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
  "₱25,000", "₱50,000", "₱100,000", "₱500,000", "₱1,000,000"
];

const Game = () => {
  const { category = "general" } = useParams<{ category: string }>();
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
    setQuestions(getCategoryQuestions(category));
  }, [category]);

  const fetchCategoryInfo = async () => {
    const { data, error } = await supabase
      .from("game_categories")
      .select("*")
      .eq("slug", category)
      .eq("is_active", true)
      .single();

    if (error || !data) {
      toast.error("Category not found");
      navigate("/");
      return;
    }

    setCategoryInfo(data);
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

  const handleAnswer = (index: number) => {
    if (showResult) return;
    setSelectedAnswer(index);
    setShowResult(true);

    setTimeout(() => {
      if (index === questions[currentLevel].correctAnswer) {
        playCorrectSound();
        toast.success("Correct! Moving to next level.");
        if (currentLevel === 4) {
          toast("Unlock more levels by referring 2 friends!", {
            description: "Get your referral code from the dashboard"
          });
        }
        if (currentLevel < questions.length - 1) {
          setCurrentLevel(currentLevel + 1);
          setSelectedAnswer(null);
          setShowResult(false);
          setTimeLeft(30);
          setEliminatedOptions([]);
        } else {
          toast.success("Congratulations! You've completed all levels!");
          navigate("/dashboard");
        }
      } else {
        playWrongSound();
        toast.error("Wrong answer! Game over.");
        navigate("/dashboard");
      }
    }, 2000);
  };

  const useFiftyFifty = () => {
    if (!lifelines.fiftyFifty) return;
    
    const correctAnswer = questions[currentLevel].correctAnswer;
    const wrongAnswers = [0, 1, 2, 3].filter(i => i !== correctAnswer);
    const toEliminate = wrongAnswers.slice(0, 2);
    
    setEliminatedOptions(toEliminate);
    setLifelines({ ...lifelines, fiftyFifty: false });
    toast.success("50/50 used! Two wrong answers eliminated.");
  };

  const useCallFriend = () => {
    if (!lifelines.callFriend) return;
    
    const correctAnswer = questions[currentLevel].correctAnswer;
    toast.success(`Your friend suggests: ${questions[currentLevel].options[correctAnswer]}`);
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
    if (index === questions[currentLevel].correctAnswer) return "default";
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
              <span className="font-bold">Level {currentLevel + 1}/10</span>
            </div>
            <div className="flex items-center gap-2 text-primary font-bold text-xl">
              <span>{prizes[currentLevel]}</span>
            </div>
          </div>
          <Progress value={(currentLevel + 1) * 10} className="h-2" />
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
            {questions[currentLevel].options.map((option, index) => (
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