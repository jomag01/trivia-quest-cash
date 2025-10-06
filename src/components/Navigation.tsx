import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  Menu, Home, Gamepad2, ShoppingBag, 
  LayoutDashboard, LogIn, LogOut, Trophy 
} from "lucide-react";

const Navigation = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const isAuthenticated = true; // This will be replaced with actual auth logic

  const navLinks = [
    { to: "/", label: "Home", icon: Home },
    { to: "/game", label: "Play Game", icon: Gamepad2 },
    { to: "/shop", label: "Shop", icon: ShoppingBag },
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-primary/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-smooth">
            <Trophy className="w-8 h-8 text-primary" />
            <span className="text-xl font-bold text-gradient-gold">GameWin</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Button
                  key={link.to}
                  variant={isActive(link.to) ? "default" : "ghost"}
                  asChild
                  className="transition-smooth"
                >
                  <Link to={link.to}>
                    <Icon className="w-4 h-4 mr-2" />
                    {link.label}
                  </Link>
                </Button>
              );
            })}

            {isAuthenticated ? (
              <Button variant="outline" className="ml-2">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            ) : (
              <Button className="ml-2">
                <LogIn className="w-4 h-4 mr-2" />
                Login
              </Button>
            )}
          </div>

          {/* Mobile Navigation */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="outline" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64 gradient-accent border-primary/20">
              <div className="flex flex-col gap-4 mt-8">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Button
                      key={link.to}
                      variant={isActive(link.to) ? "default" : "ghost"}
                      asChild
                      className="justify-start transition-smooth"
                      onClick={() => setIsOpen(false)}
                    >
                      <Link to={link.to}>
                        <Icon className="w-4 h-4 mr-2" />
                        {link.label}
                      </Link>
                    </Button>
                  );
                })}

                <div className="border-t border-primary/20 pt-4 mt-4">
                  {isAuthenticated ? (
                    <Button variant="outline" className="w-full justify-start">
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </Button>
                  ) : (
                    <Button className="w-full justify-start">
                      <LogIn className="w-4 h-4 mr-2" />
                      Login
                    </Button>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;