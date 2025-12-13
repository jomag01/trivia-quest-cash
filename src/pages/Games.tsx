import React, { useState, useEffect, memo, useCallback, Suspense, lazy } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Play, Trophy, Star, Lock, Gamepad2 } from 'lucide-react';
import { withCache } from '@/lib/performance/ApiCache';
import { AdSlider } from '@/components/AdSlider';

interface GameCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  color_from: string;
  color_to: string;
  is_active: boolean;
  entry_cost_diamonds: number | null;
}

const HeroSection = memo(() => (
  <section className="relative overflow-hidden bg-gradient-to-br from-primary/20 via-purple-500/10 to-pink-500/10 py-16">
    <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black)]" />
    <div className="container mx-auto px-4 relative z-10">
      <div className="text-center space-y-6 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
          <Gamepad2 className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Play & Earn</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-bold">
          <span className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
            Game Arena
          </span>
        </h1>
        <p className="text-lg text-muted-foreground">
          Play exciting games, complete challenges, and earn diamonds. Level up your skills and compete with others!
        </p>
      </div>
    </div>
  </section>
));

HeroSection.displayName = 'HeroSection';

const CategoryCard = memo(({ 
  category, 
  isCompleted, 
  onClick 
}: { 
  category: GameCategory; 
  isCompleted: boolean;
  onClick: () => void;
}) => (
  <Card 
    className="group cursor-pointer overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
    onClick={onClick}
  >
    <div 
      className="h-32 relative flex items-center justify-center"
      style={{
        background: `linear-gradient(135deg, ${category.color_from}, ${category.color_to})`
      }}
    >
      <span className="text-5xl group-hover:scale-110 transition-transform duration-300">
        {category.icon}
      </span>
      {isCompleted && (
        <div className="absolute top-3 right-3 bg-green-500 text-white p-1.5 rounded-full">
          <Trophy className="h-4 w-4" />
        </div>
      )}
      {category.entry_cost_diamonds && category.entry_cost_diamonds > 0 && (
        <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
          <span>💎</span>
          <span>{category.entry_cost_diamonds}</span>
        </div>
      )}
    </div>
    <CardHeader className="pb-2">
      <CardTitle className="text-lg flex items-center gap-2">
        {category.name}
        {isCompleted && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
      </CardTitle>
      <CardDescription className="line-clamp-2">
        {category.description || 'Test your knowledge and earn rewards!'}
      </CardDescription>
    </CardHeader>
    <CardContent>
      <Button className="w-full gap-2" size="sm">
        <Play className="h-4 w-4" />
        {isCompleted ? 'Play Again' : 'Start Playing'}
      </Button>
    </CardContent>
  </Card>
));

CategoryCard.displayName = 'CategoryCard';

const CategorySkeleton = memo(() => (
  <Card className="overflow-hidden">
    <Skeleton className="h-32 rounded-none" />
    <CardHeader>
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-full mt-2" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-9 w-full" />
    </CardContent>
  </Card>
));

CategorySkeleton.displayName = 'CategorySkeleton';

const Games = memo(() => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<GameCategory[]>([]);
  const [completedCategories, setCompletedCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await withCache(
          'game-categories',
          async () => {
            const { data, error } = await supabase
              .from('game_categories')
              .select('*')
              .eq('is_active', true)
              .order('name');
            
            if (error) throw error;
            return data || [];
          },
          5 * 60 * 1000
        );
        setCategories(data as GameCategory[]);
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchCompletedCategories = async () => {
      if (!user) return;

      try {
        const completedIds = await withCache(
          `completed-categories-${user.id}`,
          async () => {
            const { data, error } = await supabase
              .from('game_level_completions')
              .select('category_id')
              .eq('user_id', user.id);
            
            if (error) throw error;
            return [...new Set((data || []).map(c => c.category_id))];
          },
          60 * 1000
        );
        setCompletedCategories(completedIds as string[]);
      } catch (error) {
        console.error('Error fetching completed categories:', error);
      }
    };

    fetchCompletedCategories();
  }, [user]);

  const handleCategoryClick = useCallback((category: GameCategory) => {
    if (!user) {
      setShowAuthDialog(true);
      return;
    }
    // Route chess to its dedicated multiplayer page
    if (category.slug === 'chess') {
      navigate('/chess');
    } else {
      navigate(`/game/${category.slug}`);
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <HeroSection />

      <div className="container mx-auto px-4 py-6">
        <AdSlider />
      </div>

      <section className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Game Categories</h2>
            <p className="text-muted-foreground">Choose a category to start playing</p>
          </div>
          {user && completedCategories.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Trophy className="h-4 w-4 text-yellow-500" />
              <span>{completedCategories.length} completed</span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <CategorySkeleton key={i} />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <Card className="p-12 text-center">
            <Gamepad2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Games Available</h3>
            <p className="text-muted-foreground">Check back soon for new games!</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {categories.map(category => (
              <CategoryCard
                key={category.id}
                category={category}
                isCompleted={completedCategories.includes(category.id)}
                onClick={() => handleCategoryClick(category)}
              />
            ))}
          </div>
        )}
      </section>

      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Login Required
            </DialogTitle>
            <DialogDescription>
              Create an account first to play games and earn diamonds!
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setShowAuthDialog(false)}>
              Cancel
            </Button>
            <Button className="flex-1" asChild>
              <Link to="/auth">Sign Up / Login</Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});

Games.displayName = 'Games';

export default Games;
