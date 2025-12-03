import { Link, useLocation } from "react-router-dom";
import { Home, ShoppingBag, Plus, MessageSquare, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { CreatePost } from "@/components/social/CreatePost";

const Navigation = () => {
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200">
      <div className="flex items-center justify-around h-16 max-w-screen-xl mx-auto px-2">
        {/* Home */}
        <Link
          to="/"
          className={`flex flex-col items-center justify-center gap-1 min-w-[60px] ${
            isActive("/") ? "text-black" : "text-gray-500"
          }`}
        >
          <Home className="w-6 h-6" />
          <span className="text-xs font-medium">Home</span>
        </Link>

        {/* Shop */}
        <Link
          to="/shop"
          className={`flex flex-col items-center justify-center gap-1 min-w-[60px] ${
            isActive("/shop") ? "text-black" : "text-gray-500"
          }`}
        >
          <ShoppingBag className="w-6 h-6" />
          <span className="text-xs font-medium">Shop</span>
        </Link>

        {/* Create Post (Center) - TikTok style black and white */}
        <Dialog>
          <DialogTrigger asChild>
            <button className="flex items-center justify-center w-12 h-12 rounded-xl bg-black text-white hover:opacity-90 transition-opacity">
              <Plus className="w-7 h-7" strokeWidth={3} />
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <CreatePost onPostCreated={() => {}} />
          </DialogContent>
        </Dialog>

        {/* Messages */}
        <Link
          to="/community"
          className={`flex flex-col items-center justify-center gap-1 min-w-[60px] relative ${
            isActive("/community") ? "text-black" : "text-gray-500"
          }`}
        >
          <MessageSquare className="w-6 h-6" />
          <span className="text-xs font-medium">Messages</span>
        </Link>

        {/* Profile */}
        <Link
          to={user ? "/dashboard" : "/auth"}
          className={`flex flex-col items-center justify-center gap-1 min-w-[60px] ${
            isActive("/dashboard") || isActive("/auth") ? "text-black" : "text-gray-500"
          }`}
        >
          <User className="w-6 h-6" />
          <span className="text-xs font-medium">Profile</span>
        </Link>
      </div>
    </nav>
  );
};

export default Navigation;
