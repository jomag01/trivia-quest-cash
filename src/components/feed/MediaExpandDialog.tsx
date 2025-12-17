import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Download, ZoomIn, ZoomOut } from "lucide-react";
import { useState } from "react";

interface MediaExpandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaUrl: string;
  mediaType: "image" | "video" | "audio";
}

export default function MediaExpandDialog({ 
  open, 
  onOpenChange, 
  mediaUrl, 
  mediaType 
}: MediaExpandDialogProps) {
  const [zoom, setZoom] = useState(1);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));

  const handleDownload = async () => {
    try {
      const response = await fetch(mediaUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `media-${Date.now()}.${mediaType === 'image' ? 'jpg' : mediaType === 'video' ? 'mp4' : 'mp3'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none">
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Close and controls */}
          <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
            {mediaType === "image" && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleZoomOut}
                  className="h-10 w-10 bg-black/50 hover:bg-black/70 text-white"
                >
                  <ZoomOut className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleZoomIn}
                  className="h-10 w-10 bg-black/50 hover:bg-black/70 text-white"
                >
                  <ZoomIn className="h-5 w-5" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              className="h-10 w-10 bg-black/50 hover:bg-black/70 text-white"
            >
              <Download className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-10 w-10 bg-black/50 hover:bg-black/70 text-white"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Media content */}
          <div 
            className="w-full h-full flex items-center justify-center overflow-auto p-4"
            onClick={() => onOpenChange(false)}
          >
            {mediaType === "image" ? (
              <img
                src={mediaUrl}
                alt="Expanded media"
                className="max-w-full max-h-[85vh] object-contain transition-transform duration-200"
                style={{ transform: `scale(${zoom})` }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : mediaType === "video" ? (
              <video
                src={mediaUrl}
                controls
                autoPlay
                className="max-w-full max-h-[85vh]"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <div className="p-8 bg-card rounded-xl" onClick={(e) => e.stopPropagation()}>
                <audio src={mediaUrl} controls autoPlay className="w-full min-w-[300px]" />
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}