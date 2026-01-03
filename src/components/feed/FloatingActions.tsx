import { useState, useEffect } from "react";
import { ArrowUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import CreatePostFAB from "./CreatePostFAB";

interface FloatingActionsProps {
  showScrollTop?: boolean;
  onPostCreated?: () => void;
}

export default function FloatingActions({ showScrollTop = true, onPostCreated }: FloatingActionsProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showTopButton, setShowTopButton] = useState(false);

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
          className="fixed bottom-24 left-4 z-40 h-12 w-12 rounded-full shadow-lg bg-zinc-800 text-white hover:bg-zinc-700 animate-fade-in border border-zinc-700"
          size="icon"
        >
          <ArrowUp className="w-5 h-5" />
        </Button>
      )}

      {/* X-style Create Post FAB */}
      {user && <CreatePostFAB onPostCreated={onPostCreated} />}

      {/* AI Hub button */}
      {user && (
        <Button
          onClick={() => navigate('/ai-hub')}
          variant="secondary"
          size="icon"
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 h-12 w-12 rounded-full shadow-lg bg-gradient-to-r from-amber-500 to-orange-500 text-black hover:from-amber-600 hover:to-orange-600"
        >
          <Sparkles className="w-5 h-5" />
        </Button>
      )}
    </>
  );
}
