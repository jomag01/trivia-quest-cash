import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Trophy, ShoppingBag, Users, Gamepad2, Zap, Star } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Home = () => {
  const { user } = useAuth();
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
            {user ? (
              <>
                <Button 
                  variant="default" 
                  size="lg" 
                  className="text-lg shadow-gold"
                  asChild
                >
                  <Link to="/game">
                    <Gamepad2 className="mr-2 h-5 w-5" />
                    Start Playing
                  </Link>
                </Button>
                
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="text-lg border-primary/50 hover:bg-primary/10"
                  asChild
                >
                  <Link to="/shop">
                    <ShoppingBag className="mr-2 h-5 w-5" />
                    Visit Shop
                  </Link>
                </Button>
              </>
            ) : (
              <Button 
                variant="default" 
                size="lg" 
                className="text-lg shadow-gold"
                asChild
              >
                <Link to="/auth">
                  <Trophy className="mr-2 h-5 w-5" />
                  Get Started
                </Link>
              </Button>
            )}
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
              <h3 className="text-xl font-bold mb-3">Shop & Profit</h3>
              <p className="text-foreground/80">
                Unlock Level 10 for residual income from shop purchases and exclusive earning opportunities.
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
            {[
              { title: "General Knowledge", icon: "🌍", color: "from-blue-500 to-purple-600" },
              { title: "Science & Tech", icon: "🔬", color: "from-green-500 to-teal-600" },
              { title: "History", icon: "📚", color: "from-orange-500 to-red-600" },
              { title: "Entertainment", icon: "🎬", color: "from-pink-500 to-rose-600" },
              { title: "Sports", icon: "⚽", color: "from-indigo-500 to-blue-600" },
              { title: "Geography", icon: "🗺️", color: "from-cyan-500 to-blue-600" },
            ].map((category, index) => (
              <Card 
                key={index}
                className="p-6 gradient-accent border-primary/20 shadow-card hover:shadow-gold transition-smooth cursor-pointer group"
              >
                <div className="text-center">
                  <div className="text-5xl mb-4 group-hover:scale-110 transition-smooth">
                    {category.icon}
                  </div>
                  <h3 className="text-xl font-bold">{category.title}</h3>
                </div>
              </Card>
            ))}
          </div>
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
            <Link to={user ? "/dashboard" : "/auth"}>
              <Trophy className="mr-2 h-5 w-5" />
              {user ? "View Dashboard" : "Join Now"}
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Home;