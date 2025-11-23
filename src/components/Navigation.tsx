import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Home, Gamepad2, LayoutDashboard, LogIn, LogOut, Trophy, Shield, ShoppingBag, MessageSquare, Package } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const {
    user,
    profile,
    isAdmin,
    signOut
  } = useAuth();
  const navLinks = [{
    to: "/",
    label: "Home",
    icon: Home
  }, {
    to: "/game",
    label: "Play Game",
    icon: Gamepad2
  }, {
    to: "/diamond-marketplace",
    label: "Marketplace",
    icon: Trophy
  }, {
    to: "/shop",
    label: "Merchandise",
    icon: ShoppingBag
  }, ...(user ? [{
    to: "/community",
    label: "Community",
    icon: MessageSquare
  }] : []), {
    to: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard
  }];
  const isActive = (path: string) => location.pathname === path;
  return <nav className="sticky top-0 z-50 w-full border-b border-primary/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-smooth">
            <Trophy className="w-8 h-8 text-primary" />
            <span className="text-xl font-bold text-gradient-gold">TriviaBees</span>
          </Link>

          {/* Desktop Navigation - Now Burger Menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64 gradient-accent border-primary/20">
              <div className="flex flex-col gap-4 mt-8">
                {navLinks.map(link => {
                const Icon = link.icon;
                return <Button key={link.to} variant={isActive(link.to) ? "default" : "ghost"} asChild className="justify-start transition-smooth" onClick={() => setIsOpen(false)}>
                      <Link to={link.to}>
                        <Icon className="w-4 h-4 mr-2" />
                        {link.label}
                      </Link>
                    </Button>;
              })}

                {isAdmin && <Button variant={isActive("/admin") ? "default" : "ghost"} asChild className="justify-start transition-smooth" onClick={() => setIsOpen(false)}>
                    <Link to="/admin">
                      <Shield className="w-4 h-4 mr-2" />
                      Admin Panel
                    </Link>
                  </Button>}

                {user && <Button variant={isActive("/seller") ? "default" : "ghost"} asChild className="justify-start transition-smooth" onClick={() => setIsOpen(false)}>
                    <Link to="/seller">
                      <Package className="w-4 h-4 mr-2" />
                      {profile?.is_verified_seller ? "Seller Dashboard" : "Be a Seller"}
                    </Link>
                  </Button>}

                <div className="border-t border-primary/20 pt-4 mt-4">
                  {user ? <Button variant="outline" className="w-full justify-start" onClick={async () => {
                  await signOut();
                  navigate("/");
                  setIsOpen(false);
                }}>
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </Button> : <Button className="w-full justify-start" onClick={() => {
                  navigate("/auth");
                  setIsOpen(false);
                }}>
                      <LogIn className="w-4 h-4 mr-2" />
                      Login
                    </Button>}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>;
};
export default Navigation;