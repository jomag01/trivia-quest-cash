import { useState } from "react";
import { Plus, X, Feather, Image, Video, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import XPostComposer from "./XPostComposer";
import GoLiveDialog from "@/components/live/GoLiveDialog";

interface CreatePostFABProps {
  onPostCreated?: () => void;
}

export default function CreatePostFAB({ onPostCreated }: CreatePostFABProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [composerMode, setComposerMode] = useState<"text" | "image" | "video">("text");
  const [showGoLive, setShowGoLive] = useState(false);

  if (!user) return null;

  const handleOpenComposer = (mode: "text" | "image" | "video") => {
    setComposerMode(mode);
    setShowComposer(true);
    setIsOpen(false);
  };

  const handleGoLive = () => {
    setShowGoLive(true);
    setIsOpen(false);
  };

  const menuItems = [
    { label: "Go Live", icon: Radio, action: handleGoLive, color: "text-red-400" },
    { label: "Photos", icon: Image, action: () => handleOpenComposer("image"), color: "text-green-400" },
    { label: "Post", icon: Feather, action: () => handleOpenComposer("text"), color: "text-blue-400" },
  ];

  return (
    <>
      {/* FAB Menu */}
      <div className="fixed bottom-24 right-4 z-50">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute bottom-16 right-0 flex flex-col gap-3 items-end"
            >
              {menuItems.map((item, index) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-3"
                >
                  <span className="text-white text-sm font-medium bg-zinc-800 px-3 py-1.5 rounded-full">
                    {item.label}
                  </span>
                  <Button
                    onClick={item.action}
                    size="icon"
                    className="h-12 w-12 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white shadow-lg"
                  >
                    <item.icon className={`w-5 h-5 ${item.color}`} />
                  </Button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main FAB */}
        <Button
          onClick={() => setIsOpen(!isOpen)}
          size="icon"
          className={`h-14 w-14 rounded-full shadow-xl transition-all duration-200 ${
            isOpen 
              ? "bg-zinc-700 hover:bg-zinc-600" 
              : "bg-[#1d9bf0] hover:bg-[#1a8cd8]"
          }`}
        >
          {isOpen ? (
            <X className="w-6 h-6 text-white" />
          ) : (
            <Plus className="w-7 h-7 text-white" strokeWidth={2.5} />
          )}
        </Button>
      </div>

      {/* Full-screen Post Composer */}
      <AnimatePresence>
        {showComposer && (
          <XPostComposer
            mode={composerMode}
            onClose={() => setShowComposer(false)}
            onPostCreated={() => {
              setShowComposer(false);
              onPostCreated?.();
            }}
          />
        )}
      </AnimatePresence>

      {/* Go Live Dialog */}
      <GoLiveDialog
        open={showGoLive}
        onOpenChange={setShowGoLive}
        onGoLive={(streamId) => {
          navigate(`/feed?stream=${streamId}`);
        }}
      />
    </>
  );
}