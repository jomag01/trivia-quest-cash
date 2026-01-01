import { useState, useEffect, memo, lazy, Suspense, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import { Trophy, Users, Gamepad2, Zap, Star } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiCache, withCache } from "@/lib/performance/ApiCache";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Lazy load non-critical components
const AdSlider = lazy(() => import("@/components/AdSlider").then(m => ({ default: m.AdSlider })));

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

// Static hero content - no re-renders needed
const HeroSection = memo(({ isLoggedIn }: { isLoggedIn: boolean }) => (
  <section className="relative overflow-hidden py-16 md:py-20 px-4">
    <div className="absolute inset-0 gradient-primary opacity-80" />
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />
    
    <div className="relative max-w-6xl mx-auto text-center">
      <div className="inline-block mb-6">
        <Trophy className="w-16 md:w-20 h-16 md:h-20 text-primary drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]" />
      </div>
      
      <h1 className="text-4xl md:text-7xl font-bold mb-4 md:mb-6 text-gradient-gold">
        Play. Win. Earn.
      </h1>
      
      <p className="text-lg md:text-2xl text-foreground/90 mb-6 md:mb-8 max-w-2xl mx-auto px-4">
        Test your knowledge, climb the levels, and unlock unlimited earning potential
      </p>
      
      <Button 
        variant="default" 
        size="lg" 
        className="text-base md:text-lg shadow-gold"
        asChild
      >
        <Link to={isLoggedIn ? "/game" : "/auth"}>
          <Gamepad2 className="mr-2 h-5 w-5" />
          {isLoggedIn ? "Start Playing" : "Get Started"}
        </Link>
      </Button>
    </div>
  </section>
));
HeroSection.displayName = 'HeroSection';

// Static features - never re-renders
const FeaturesSection = memo(() => (
  <section className="py-12 md:py-16 px-4">
    <div className="max-w-6xl mx-auto">
      <h2 className="text-2xl md:text-4xl font-bold text-center mb-8 md:mb-12 text-gradient-gold">
        How It Works
      </h2>
      
      <div className="grid md:grid-cols-3 gap-6 md:gap-8">
        <Card className="p-5 md:p-6 gradient-accent border-primary/20 shadow-card">
          <Zap className="w-10 md:w-12 h-10 md:h-12 text-primary mb-4" />
          <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-3">Play & Progress</h3>
          <p className="text-sm md:text-base text-foreground/80">
            Answer trivia questions through 10 exciting levels. Use lifelines and strategy to reach the top!
          </p>
        </Card>

        <Card className="p-5 md:p-6 gradient-accent border-primary/20 shadow-card">
          <Users className="w-10 md:w-12 h-10 md:h-12 text-primary mb-4" />
          <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-3">Refer & Earn</h3>
          <p className="text-sm md:text-base text-foreground/80">
            Build your network with our 7-level affiliate system. Earn commissions from your downline's activities.
          </p>
        </Card>

        <Card className="p-5 md:p-6 gradient-accent border-primary/20 shadow-card">
          <Star className="w-10 md:w-12 h-10 md:h-12 text-primary mb-4" />
          <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-3">Win Rewards</h3>
          <p className="text-sm md:text-base text-foreground/80">
            Unlock Level 10 for exclusive rewards and special achievements. Keep climbing!
          </p>
        </Card>
      </div>
    </div>
  </section>
));
FeaturesSection.displayName = 'FeaturesSection';

// Category card - memoized to prevent re-renders
const CategoryCard = memo(({ 
  category, 
  isCompleted, 
  onClick 
}: { 
  category: GameCategory; 
  isCompleted: boolean;
  onClick: (e: React.MouseEvent) => void;
}) => {
  const linkPath = category.game_type === 'treasure-hunt' ? '/treasure-hunt' : `/game/${category.slug}`;
  
  return (
    <Link to={linkPath} onClick={onClick}>
      <Card className={`p-5 md:p-6 gradient-accent border-primary/20 shadow-card hover:shadow-gold transition-shadow cursor-pointer relative ${isCompleted ? 'opacity-80' : ''}`}>
        {isCompleted && (
          <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
            <Trophy className="w-3 h-3" />
            Done
          </div>
        )}
        <div className="text-center">
          <div className="text-4xl md:text-5xl mb-3 md:mb-4 flex items-center justify-center">
            {category.icon.startsWith('http') || category.icon.startsWith('data:') ? (
              <img 
                src={category.icon} 
                alt=""
                className="w-12 md:w-16 h-12 md:h-16 object-cover rounded-lg"
                loading="lazy"
                decoding="async"
              />
            ) : (
              category.icon
            )}
          </div>
          <h3 className="text-lg md:text-xl font-bold">{category.name}</h3>
          {category.description && (
            <p className="text-xs md:text-sm text-muted-foreground mt-2 line-clamp-2">{category.description}</p>
          )}
        </div>
      </Card>
    </Link>
  );
});
CategoryCard.displayName = 'CategoryCard';

// Loading skeleton - lightweight
const CategorySkeleton = memo(() => (
  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
    {[1, 2, 3].map((i) => (
      <div key={i} className="h-40 md:h-48 bg-muted/20 rounded-lg animate-pulse" />
    ))}
  </div>
));
CategorySkeleton.displayName = 'CategorySkeleton';

// CTA Section - static
const CTASection = memo(() => (
  <section className="py-12 md:py-16 px-4">
    <div className="max-w-4xl mx-auto text-center gradient-primary rounded-2xl p-8 md:p-12 shadow-card">
      <h2 className="text-2xl md:text-4xl font-bold mb-4 md:mb-6">
        Ready to Start Your Journey?
      </h2>
      <p className="text-lg md:text-xl mb-6 md:mb-8 text-foreground/90">
        Join thousands of players earning while playing!
      </p>
      <Button variant="default" size="lg" className="text-base md:text-lg shadow-gold" asChild>
        <Link to="/auth">
          <Trophy className="mr-2 h-5 w-5" />
          Join Now
        </Link>
      </Button>
    </div>
  </section>
));
CTASection.displayName = 'CTASection';

// Main Home component - optimized for performance
const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<GameCategory[]>([]);
  const [completedCategories, setCompletedCategories] = useState<Set<string>>(new Set());
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch categories with aggressive caching (5 min TTL)
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await withCache<GameCategory[]>(
          'home:categories',
          async () => {
            const { data, error } = await supabase
              .from("game_categories")
              .select("id, name, slug, icon, description, color_from, color_to, is_active, min_level_required, game_type")
              .eq("is_active", true)
              .order("created_at", { ascending: true });
            
            if (error) throw error;
            return data || [];
          },
          300000 // 5 minute cache
        );
        setCategories(data);
      } catch (e) {
        console.error('Failed to load categories');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadCategories();
  }, []);

  // Fetch completed categories only when user exists
  useEffect(() => {
    if (!user) {
      setCompletedCategories(new Set());
      return;
    }

    const loadCompleted = async () => {
      try {
        const data = await withCache<string[]>(
          `home:completed:${user.id}`,
          async () => {
            const { data, error } = await supabase
              .from("user_completed_categories")
              .select("category_id")
              .eq("user_id", user.id);
            
            if (error) throw error;
            return (data || []).map((c: any) => c.category_id);
          },
          60000 // 1 minute cache for user data
        );
        setCompletedCategories(new Set(data));
      } catch (e) {
        // Silent fail - non-critical
      }
    };
    
    loadCompleted();
  }, [user?.id]);

  const handleCategoryClick = useCallback((e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      setShowAuthDialog(true);
    }
  }, [user]);

  const closeDialog = useCallback(() => setShowAuthDialog(false), []);
  const goToAuth = useCallback(() => navigate("/auth"), [navigate]);

  return (
    <div className="min-h-screen pb-20 beehive-bg beehive-theme">
      {/* Ad Slider - Lazy loaded, non-blocking */}
      <div className="max-w-6xl mx-auto px-4 pt-4">
        <Suspense fallback={<div className="h-28 md:h-32 bg-muted/10 rounded-lg" />}>
          <AdSlider />
        </Suspense>
      </div>

      {/* Static sections - no re-renders */}
      <HeroSection isLoggedIn={!!user} />
      <FeaturesSection />

      {/* Dynamic categories section */}
      <section className="py-12 md:py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-4xl font-bold text-center mb-8 md:mb-12 text-gradient-gold">
            Game Categories
          </h2>
          
          {isLoading ? (
            <CategorySkeleton />
          ) : categories.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {categories.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  isCompleted={completedCategories.has(category.id)}
                  onClick={handleCategoryClick}
                />
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No game categories available yet.
            </p>
          )}
        </div>
      </section>

      <CTASection />

      {/* Auth Dialog - Loaded on demand */}
      <AlertDialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center">Create an Account First</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Sign up to play games and earn rewards!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={closeDialog} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={goToAuth} className="w-full sm:w-auto">
              Create Account
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default memo(Home);
