import { useState, useEffect } from "react";
import { Plus, ArrowUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { CreatePost } from "@/components/social/CreatePost";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface FloatingActionsProps {
  showScrollTop?: boolean;
}

export default function FloatingActions({ showScrollTop = true }: FloatingActionsProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showTopButton, setShowTopButton] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowTopButton(window.scrollY > 500);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      {/* Scroll to top button */}
      {showScrollTop && showTopButton && (
        <Button
          onClick={scrollToTop}
          className="fixed bottom-24 right-4 z-40 h-12 w-12 rounded-full shadow-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 animate-fade-in"
          size="icon"
        >
          <ArrowUp className="w-5 h-5" />
        </Button>
      )}

      {/* Create button - centered */}
      {user && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2">
          {/* Create Post button */}
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="h-14 w-14 rounded-full gradient-accent text-white shadow-xl hover:opacity-90 transition-opacity"
                size="icon"
              >
                <Plus className="w-7 h-7" strokeWidth={3} />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
              <CreatePost onPostCreated={() => setCreateDialogOpen(false)} />
            </DialogContent>
          </Dialog>

          {/* AI Hub button */}
          <Button
            onClick={() => navigate('/ai-hub')}
            variant="secondary"
            size="icon"
            className="h-12 w-12 rounded-full shadow-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600"
          >
            <Sparkles className="w-5 h-5" />
          </Button>
        </div>
      )}
    </>
  );
}
