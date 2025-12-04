import { Link, useLocation } from "react-router-dom";
import { Home, ShoppingBag, Plus, MessageSquare, User, CalendarCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { CreatePost } from "@/components/social/CreatePost";

const Navigation = () => {
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200">
      <div className="flex items-center justify-around h-14 max-w-screen-xl mx-auto px-2">
        {/* Home */}
        <Link
          to="/"
          className={`flex flex-col items-center justify-center gap-0.5 min-w-[40px] ${
            isActive("/") ? "text-black" : "text-gray-500"
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-medium">Home</span>
        </Link>

        {/* Booking */}
        <Link
          to="/booking"
          className={`flex flex-col items-center justify-center gap-0.5 min-w-[40px] ${
            isActive("/booking") ? "text-black" : "text-gray-500"
          }`}
        >
          <CalendarCheck className="w-5 h-5" />
          <span className="text-[10px] font-medium">Book</span>
        </Link>

        {/* Shop */}
        <Link
          to="/shop"
          className={`flex flex-col items-center justify-center gap-0.5 min-w-[40px] ${
            isActive("/shop") ? "text-black" : "text-gray-500"
          }`}
        >
          <ShoppingBag className="w-5 h-5" />
          <span className="text-[10px] font-medium">Shop</span>
        </Link>

        {/* Create Post (Center) - TikTok style black and white */}
        <Dialog>
          <DialogTrigger asChild>
            <button className="flex items-center justify-center w-10 h-10 rounded-lg bg-black text-white hover:opacity-90 transition-opacity">
              <Plus className="w-5 h-5" strokeWidth={3} />
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <CreatePost onPostCreated={() => {}} />
          </DialogContent>
        </Dialog>

        {/* Messages */}
        <Link
          to="/community"
          className={`flex flex-col items-center justify-center gap-0.5 min-w-[48px] relative ${
            isActive("/community") ? "text-black" : "text-gray-500"
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-[10px] font-medium">Messages</span>
        </Link>

        {/* Profile */}
        <Link
          to={user ? "/dashboard" : "/auth"}
          className={`flex flex-col items-center justify-center gap-0.5 min-w-[48px] ${
            isActive("/dashboard") || isActive("/auth") ? "text-black" : "text-gray-500"
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
