import { Link, useLocation } from "react-router-dom";
import { Home, ShoppingBag, Plus, MessageSquare, User, UtensilsCrossed } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { CreatePost } from "@/components/social/CreatePost";

const Navigation = () => {
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] bg-background/95 backdrop-blur-lg border-t border-border shadow-lg">
      <div className="flex items-center justify-around h-16 max-w-screen-xl mx-auto px-2 safe-area-pb">
        {/* Home */}
        <Link
          to="/"
          className={`flex flex-col items-center justify-center gap-0.5 min-w-[48px] py-2 ${
            isActive("/") ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-medium">Home</span>
        </Link>

        {/* Food */}
        <Link
          to="/food"
          className={`flex flex-col items-center justify-center gap-0.5 min-w-[48px] py-2 ${
            isActive("/food") ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <UtensilsCrossed className="w-5 h-5" />
          <span className="text-[10px] font-medium">Food</span>
        </Link>

        {/* Shop */}
        <Link
          to="/shop"
          className={`flex flex-col items-center justify-center gap-0.5 min-w-[48px] py-2 ${
            isActive("/shop") ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <ShoppingBag className="w-5 h-5" />
          <span className="text-[10px] font-medium">Shop</span>
        </Link>

        {/* Create Post (Center) - TikTok style */}
        <Dialog>
          <DialogTrigger asChild>
            <button className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md">
              <Plus className="w-6 h-6" strokeWidth={3} />
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <CreatePost onPostCreated={() => {}} />
          </DialogContent>
        </Dialog>

        {/* Messages */}
        <Link
          to="/community"
          className={`flex flex-col items-center justify-center gap-0.5 min-w-[48px] py-2 relative ${
            isActive("/community") ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-[10px] font-medium">Chat</span>
        </Link>

        {/* Profile */}
        <Link
          to={user ? "/dashboard" : "/auth"}
          className={`flex flex-col items-center justify-center gap-0.5 min-w-[48px] py-2 ${
            isActive("/dashboard") || isActive("/auth") ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] font-medium">Profile</span>
        </Link>
      </div>
    </nav>
  );
};

export default Navigation;
