import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { X, Eye, Maximize2 } from "lucide-react";

interface FloatingStream {
  id: string;
  user_id: string;
  title: string;
  thumbnail_url: string | null;
  viewer_count: number | null;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface FloatingLiveStreamProps {
  stream: FloatingStream;
  onExpand: () => void;
  onClose: () => void;
}

export default function FloatingLiveStream({ stream, onExpand, onClose }: FloatingLiveStreamProps) {
  return (
    <div 
      className="fixed bottom-20 right-4 z-50 w-40 md:w-48 rounded-xl overflow-hidden shadow-2xl border-2 border-red-500/50 animate-in slide-in-from-right-5 duration-300"
      style={{ aspectRatio: '9/16', maxHeight: '240px' }}
    >
      {/* Video/Thumbnail area */}
      <div 
        className="relative w-full h-full bg-gradient-to-b from-purple-900 to-black cursor-pointer group"
        onClick={onExpand}
      >
        {/* Thumbnail or placeholder */}
        {stream.thumbnail_url ? (
          <img 
            src={stream.thumbnail_url} 
            alt={stream.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl">📺</span>
          </div>
        )}

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/50" />

        {/* LIVE badge */}
        <Badge 
          variant="destructive" 
          className="absolute top-2 left-2 text-[10px] px-1.5 py-0.5 animate-pulse"
        >
          ● LIVE
        </Badge>

        {/* Viewer count */}
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/50 rounded px-1.5 py-0.5">
          <Eye className="w-3 h-3 text-white" />
          <span className="text-white text-[10px]">{stream.viewer_count || 0}</span>
        </div>

        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 w-5 h-5 text-white bg-black/50 hover:bg-black/70 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          <X className="w-3 h-3" />
        </Button>

        {/* Expand icon on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
          <Maximize2 className="w-8 h-8 text-white" />
        </div>

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-2">
          <div className="flex items-center gap-2">
            <Avatar className="h-5 w-5 border border-pink-500">
              <AvatarImage src={stream.profiles?.avatar_url || ""} />
              <AvatarFallback className="text-[8px]">
                {stream.profiles?.full_name?.[0] || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-white text-[10px] font-medium truncate">
                {stream.profiles?.full_name || "Streamer"}
              </p>
              <p className="text-white/70 text-[8px] truncate">
                {stream.title}
              </p>
            </div>
          </div>
        </div>

        {/* Pulsing border effect */}
        <div className="absolute inset-0 border-2 border-red-500 rounded-xl animate-pulse pointer-events-none" />
      </div>
    </div>
  );
}
