import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import { Trophy, Users, Gamepad2, Zap, Star } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  game_type?: string;
}

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<GameCategory[]>([]);
  const [completedCategories, setCompletedCategories] = useState<string[]>([]);
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  useEffect(() => {
    fetchCategories();
    if (user) {
      fetchCompletedCategories();
    }
  }, [user]);

  const fetchCategories = async () => {
    const { data, error } = await (supabase as any)
      .from("game_categories")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setCategories(data);
    }
  };

  const fetchCompletedCategories = async () => {
    if (!user) return;
    
    const { data, error } = await (supabase as any)
      .from("user_completed_categories")
      .select("category_id")
      .eq("user_id", user.id);

    if (!error && data) {
      setCompletedCategories(data.map((c: any) => c.category_id));
    }
  };

  const handleCategoryClick = (e: React.MouseEvent, category: GameCategory) => {
    if (!user) {
      e.preventDefault();
      setShowAuthDialog(true);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-4">
        <div className="absolute inset-0 gradient-primary opacity-80" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />
        
        <div className="relative max-w-6xl mx-auto text-center">
          <div className="inline-block mb-6 animate-pulse-slow">
            <Trophy className="w-20 h-20 text-primary drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]" />
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 text-gradient-gold">
            Play. Win. Earn.
          </h1>
          
          <p className="text-xl md:text-2xl text-foreground/90 mb-8 max-w-2xl mx-auto">
            Test your knowledge, climb the levels, and unlock unlimited earning potential through our revolutionary trivia platform
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              variant="default" 
              size="lg" 
              className="text-lg shadow-gold"
              asChild
            >
              <Link to={user ? "/game" : "/auth"}>
                <Gamepad2 className="mr-2 h-5 w-5" />
                {user ? "Start Playing" : "Get Started"}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gradient-gold">
            How It Works
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-6 gradient-accent border-primary/20 shadow-card hover:shadow-gold transition-smooth">
              <div className="mb-4">
                <Zap className="w-12 h-12 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Play & Progress</h3>
              <p className="text-foreground/80">
                Answer trivia questions through 10 exciting levels. Use lifelines and strategy to reach the top!
              </p>
            </Card>

            <Card className="p-6 gradient-accent border-primary/20 shadow-card hover:shadow-gold transition-smooth">
              <div className="mb-4">
                <Users className="w-12 h-12 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Refer & Earn</h3>
              <p className="text-foreground/80">
                Build your network with our 7-level affiliate system. Earn commissions from your downline's activities.
              </p>
            </Card>

            <Card className="p-6 gradient-accent border-primary/20 shadow-card hover:shadow-gold transition-smooth">
              <div className="mb-4">
                <Star className="w-12 h-12 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Win Rewards</h3>
              <p className="text-foreground/80">
                Unlock Level 10 for exclusive rewards and special achievements. Keep climbing!
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Game Categories Section */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gradient-gold">
            Game Categories
          </h2>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => {
              const isCompleted = completedCategories.includes(category.id);
              
              const linkPath = category.game_type === 'treasure-hunt' ? '/treasure-hunt' : `/game/${category.slug}`;
              
              return (
                <Link to={linkPath} key={category.id} onClick={(e) => handleCategoryClick(e, category)}>
                  <Card 
                    className={`p-6 gradient-accent border-primary/20 shadow-card hover:shadow-gold transition-smooth cursor-pointer group relative ${
                      isCompleted ? 'opacity-80' : ''
                    }`}
                  >
                    {isCompleted && (
                      <div className="absolute top-3 right-3 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                        <Trophy className="w-3 h-3" />
                        Completed
                      </div>
                    )}
                    <div className="text-center">
                      <div className="text-5xl mb-4 group-hover:scale-110 transition-smooth flex items-center justify-center">
                        {category.icon.startsWith('http') || category.icon.startsWith('data:') ? (
                          <img src={category.icon} alt={category.name} className="w-16 h-16 object-cover rounded-lg" />
                        ) : (
                          category.icon
                        )}
                      </div>
                      <h3 className="text-xl font-bold">{category.name}</h3>
                      {category.description && (
                        <p className="text-sm text-muted-foreground mt-2">{category.description}</p>
                      )}
                      {isCompleted && (
                        <p className="text-xs text-green-500 mt-2 font-semibold">
                          ✓ Play again to improve your score
                        </p>
                      )}
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
          {categories.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              No game categories available yet.
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center gradient-primary rounded-2xl p-12 shadow-card">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Start Your Journey?
          </h2>
          <p className="text-xl mb-8 text-foreground/90">
            Join thousands of players earning while playing. Your success story starts here!
          </p>
          <Button 
            variant="default" 
            size="lg" 
            className="text-lg shadow-gold"
            asChild
          >
            <Link to="/auth">
              <Trophy className="mr-2 h-5 w-5" />
              Join Now
            </Link>
          </Button>
        </div>
      </section>

      {/* Auth Required Dialog */}
      <AlertDialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center">Create an Account First</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              You need to create an account to play the game and earn rewards. Sign up now to get started!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowAuthDialog(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={() => navigate("/auth")} className="w-full sm:w-auto">
              Create Account
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Home;