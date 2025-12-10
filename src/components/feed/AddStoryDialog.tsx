import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Camera, Upload, X, Loader2, Type, Smile, Music, 
  Plus, Minus, Bold, Italic, AlignLeft, AlignCenter, AlignRight,
  Palette
} from "lucide-react";
import imageCompression from "browser-image-compression";
import { uploadToStorage } from "@/lib/storage";

interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontWeight: string;
  fontStyle: string;
  textAlign: string;
  isDragging: boolean;
}

interface AddStoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStoryAdded?: () => void;
}

const EMOJI_LIST = [
  "😀", "😂", "🥰", "😎", "🤩", "😍", "🥳", "😭", "😱", "🤔",
  "👍", "👎", "❤️", "🔥", "💯", "✨", "🎉", "🎊", "💪", "🙏",
  "🌟", "⭐", "🌈", "☀️", "🌙", "💖", "💕", "💗", "🫶", "👏"
];

const TEXT_COLORS = [
  "#FFFFFF", "#000000", "#FF0000", "#00FF00", "#0000FF", 
  "#FFFF00", "#FF00FF", "#00FFFF", "#FFA500", "#800080"
];

const MUSIC_TRACKS = [
  { id: "1", name: "Happy Vibes", artist: "Lovable Music", duration: "0:15" },
  { id: "2", name: "Chill Beats", artist: "Lovable Music", duration: "0:15" },
  { id: "3", name: "Party Time", artist: "Lovable Music", duration: "0:15" },
  { id: "4", name: "Emotional", artist: "Lovable Music", duration: "0:15" },
  { id: "5", name: "Upbeat Energy", artist: "Lovable Music", duration: "0:15" },
];

export default function AddStoryDialog({ open, onOpenChange, onStoryAdded }: AddStoryDialogProps) {
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<"media" | "text" | "emoji" | "music">("media");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  
  // Text overlays
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [newText, setNewText] = useState("");
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [fontSize, setFontSize] = useState(24);
  const [fontWeight, setFontWeight] = useState("normal");
  const [fontStyle, setFontStyle] = useState("normal");
  const [textAlign, setTextAlign] = useState("center");
  
  // Emoji overlays
  const [emojiOverlays, setEmojiOverlays] = useState<{ id: string; emoji: string; x: number; y: number; size: number }[]>([]);
  
  // Music
  const [selectedMusic, setSelectedMusic] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      toast.error("Please select an image or video file");
      return;
    }

    let processedFile = file;
    if (file.type.startsWith("image/")) {
      try {
        processedFile = await imageCompression(file, {
          maxSizeMB: 2,
          maxWidthOrHeight: 1080,
          useWebWorker: true
        });
      } catch (err) {
        console.error("Compression failed:", err);
      }
    }

    setSelectedFile(processedFile);
    setPreview(URL.createObjectURL(processedFile));
    setActiveTab("media");
  };

  const addTextOverlay = () => {
    if (!newText.trim()) return;
    
    const newOverlay: TextOverlay = {
      id: Date.now().toString(),
      text: newText,
      x: 50,
      y: 50,
      fontSize,
      color: textColor,
      fontWeight,
      fontStyle,
      textAlign,
      isDragging: false
    };
    
    setTextOverlays([...textOverlays, newOverlay]);
    setNewText("");
    setSelectedTextId(newOverlay.id);
  };

  const addEmojiOverlay = (emoji: string) => {
    const newEmoji = {
      id: Date.now().toString(),
      emoji,
      x: 50,
      y: 50,
      size: 48
    };
    setEmojiOverlays([...emojiOverlays, newEmoji]);
  };

  const removeTextOverlay = (id: string) => {
    setTextOverlays(textOverlays.filter(t => t.id !== id));
    if (selectedTextId === id) setSelectedTextId(null);
  };

  const removeEmojiOverlay = (id: string) => {
    setEmojiOverlays(emojiOverlays.filter(e => e.id !== id));
  };

  const handleDrag = useCallback((
    e: React.MouseEvent | React.TouchEvent,
    type: "text" | "emoji",
    id: string
  ) => {
    if (!previewRef.current) return;
    
    const rect = previewRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    
    if (type === "text") {
      setTextOverlays(overlays => 
        overlays.map(t => t.id === id ? { ...t, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) } : t)
      );
    } else {
      setEmojiOverlays(overlays =>
        overlays.map(e => e.id === id ? { ...e, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) } : e)
      );
    }
  }, []);

  const handleUpload = async () => {
    if (!selectedFile || !user) return;

    setUploading(true);
    try {
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Use the Edge Function workaround for storage upload
      const { data: uploadData, error: uploadError } = await uploadToStorage(
        "stories",
        fileName,
        selectedFile,
        { contentType: selectedFile.type }
      );

      if (uploadError) throw uploadError;

      const mediaUrl = uploadData?.publicUrl || uploadData?.path;

      if (!mediaUrl) throw new Error("Failed to get upload URL");

      // Create story metadata including overlays
      const storyMetadata = {
        textOverlays: textOverlays.map(t => ({
          text: t.text,
          x: t.x,
          y: t.y,
          fontSize: t.fontSize,
          color: t.color,
          fontWeight: t.fontWeight,
          fontStyle: t.fontStyle,
          textAlign: t.textAlign
        })),
        emojiOverlays: emojiOverlays.map(e => ({
          emoji: e.emoji,
          x: e.x,
          y: e.y,
          size: e.size
        })),
        musicTrack: selectedMusic
      };

      const { error: insertError } = await supabase
        .from("stories")
        .insert({
          user_id: user.id,
          media_url: mediaUrl,
          media_type: selectedFile.type.startsWith("video/") ? "video" : "image",
          metadata: storyMetadata
        });

      if (insertError) throw insertError;

      toast.success("Story added!");
      onStoryAdded?.();
      handleClose();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Failed to upload story");
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreview(null);
    setTextOverlays([]);
    setEmojiOverlays([]);
    setSelectedMusic(null);
    setActiveTab("media");
    setNewText("");
    onOpenChange(false);
  };

  const selectedText = textOverlays.find(t => t.id === selectedTextId);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Create Story</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {!preview ? (
            <div className="p-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-xl p-12 text-center cursor-pointer hover:border-primary transition-colors"
              >
                <Camera className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Click to select an image or video</p>
                <p className="text-xs text-muted-foreground mt-1">Stories expire after 24 hours</p>
              </div>
            </div>
          ) : (
            <>
              {/* Preview with overlays */}
              <div 
                ref={previewRef}
                className="relative aspect-[9/16] bg-black max-h-[400px] mx-auto"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 z-30 bg-background/80"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreview(null);
                    setTextOverlays([]);
                    setEmojiOverlays([]);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
                
                {selectedFile?.type.startsWith("video/") ? (
                  <video src={preview} className="w-full h-full object-cover" controls muted />
                ) : (
                  <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                )}

                {/* Text overlays */}
                {textOverlays.map((overlay) => (
                  <div
                    key={overlay.id}
                    className={`absolute cursor-move select-none ${selectedTextId === overlay.id ? 'ring-2 ring-primary' : ''}`}
                    style={{
                      left: `${overlay.x}%`,
                      top: `${overlay.y}%`,
                      transform: 'translate(-50%, -50%)',
                      fontSize: `${overlay.fontSize}px`,
                      color: overlay.color,
                      fontWeight: overlay.fontWeight,
                      fontStyle: overlay.fontStyle,
                      textAlign: overlay.textAlign as any,
                      textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                      zIndex: 20
                    }}
                    onClick={() => setSelectedTextId(overlay.id)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const handleMove = (ev: MouseEvent) => handleDrag(ev as any, "text", overlay.id);
                      const handleUp = () => {
                        document.removeEventListener("mousemove", handleMove);
                        document.removeEventListener("mouseup", handleUp);
                      };
                      document.addEventListener("mousemove", handleMove);
                      document.addEventListener("mouseup", handleUp);
                    }}
                    onTouchStart={(e) => {
                      const handleMove = (ev: TouchEvent) => handleDrag(ev as any, "text", overlay.id);
                      const handleEnd = () => {
                        document.removeEventListener("touchmove", handleMove);
                        document.removeEventListener("touchend", handleEnd);
                      };
                      document.addEventListener("touchmove", handleMove);
                      document.addEventListener("touchend", handleEnd);
                    }}
                  >
                    {overlay.text}
                    <button
                      className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs"
                      onClick={(e) => { e.stopPropagation(); removeTextOverlay(overlay.id); }}
                    >
                      ×
                    </button>
                  </div>
                ))}

                {/* Emoji overlays */}
                {emojiOverlays.map((overlay) => (
                  <div
                    key={overlay.id}
                    className="absolute cursor-move select-none"
                    style={{
                      left: `${overlay.x}%`,
                      top: `${overlay.y}%`,
                      transform: 'translate(-50%, -50%)',
                      fontSize: `${overlay.size}px`,
                      zIndex: 20
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const handleMove = (ev: MouseEvent) => handleDrag(ev as any, "emoji", overlay.id);
                      const handleUp = () => {
                        document.removeEventListener("mousemove", handleMove);
                        document.removeEventListener("mouseup", handleUp);
                      };
                      document.addEventListener("mousemove", handleMove);
                      document.addEventListener("mouseup", handleUp);
                    }}
                    onTouchStart={(e) => {
                      const handleMove = (ev: TouchEvent) => handleDrag(ev as any, "emoji", overlay.id);
                      const handleEnd = () => {
                        document.removeEventListener("touchmove", handleMove);
                        document.removeEventListener("touchend", handleEnd);
                      };
                      document.addEventListener("touchmove", handleMove);
                      document.addEventListener("touchend", handleEnd);
                    }}
                  >
                    {overlay.emoji}
                    <button
                      className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-[10px]"
                      onClick={(e) => { e.stopPropagation(); removeEmojiOverlay(overlay.id); }}
                    >
                      ×
                    </button>
                  </div>
                ))}

                {/* Music indicator */}
                {selectedMusic && (
                  <div className="absolute bottom-4 left-4 right-4 bg-background/80 rounded-lg p-2 flex items-center gap-2 z-20">
                    <Music className="w-4 h-4 text-primary animate-pulse" />
                    <span className="text-xs truncate">
                      {MUSIC_TRACKS.find(m => m.id === selectedMusic)?.name}
                    </span>
                    <button
                      className="ml-auto"
                      onClick={() => setSelectedMusic(null)}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Editing tabs */}
              <div className="border-t">
                <div className="flex border-b">
                  {[
                    { id: "text", icon: Type, label: "Text" },
                    { id: "emoji", icon: Smile, label: "Emoji" },
                    { id: "music", icon: Music, label: "Music" }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm transition-colors ${
                        activeTab === tab.id ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'
                      }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="p-4 space-y-4 max-h-[200px] overflow-y-auto">
                  {activeTab === "text" && (
                    <>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter text..."
                          value={newText}
                          onChange={(e) => setNewText(e.target.value)}
                          className="flex-1"
                        />
                        <Button onClick={addTextOverlay} size="icon">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Text styling options */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-16">Color:</span>
                          <div className="flex gap-1 flex-wrap">
                            {TEXT_COLORS.map(color => (
                              <button
                                key={color}
                                onClick={() => setTextColor(color)}
                                className={`w-6 h-6 rounded-full border-2 ${textColor === color ? 'border-primary' : 'border-transparent'}`}
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-16">Size:</span>
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setFontSize(Math.max(12, fontSize - 4))}>
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="text-sm w-8 text-center">{fontSize}</span>
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setFontSize(Math.min(72, fontSize + 4))}>
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-16">Style:</span>
                          <Button
                            variant={fontWeight === "bold" ? "default" : "outline"}
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setFontWeight(fontWeight === "bold" ? "normal" : "bold")}
                          >
                            <Bold className="w-3 h-3" />
                          </Button>
                          <Button
                            variant={fontStyle === "italic" ? "default" : "outline"}
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setFontStyle(fontStyle === "italic" ? "normal" : "italic")}
                          >
                            <Italic className="w-3 h-3" />
                          </Button>
                          <div className="border-l pl-2 flex gap-1">
                            <Button
                              variant={textAlign === "left" ? "default" : "outline"}
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setTextAlign("left")}
                            >
                              <AlignLeft className="w-3 h-3" />
                            </Button>
                            <Button
                              variant={textAlign === "center" ? "default" : "outline"}
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setTextAlign("center")}
                            >
                              <AlignCenter className="w-3 h-3" />
                            </Button>
                            <Button
                              variant={textAlign === "right" ? "default" : "outline"}
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setTextAlign("right")}
                            >
                              <AlignRight className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {selectedText && (
                        <div className="p-2 bg-muted rounded-lg text-xs">
                          <p className="font-medium mb-1">Selected: "{selectedText.text}"</p>
                          <p className="text-muted-foreground">Drag to reposition • Tap × to remove</p>
                        </div>
                      )}
                    </>
                  )}

                  {activeTab === "emoji" && (
                    <div className="grid grid-cols-10 gap-2">
                      {EMOJI_LIST.map((emoji, idx) => (
                        <button
                          key={idx}
                          onClick={() => addEmojiOverlay(emoji)}
                          className="text-2xl hover:scale-125 transition-transform"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}

                  {activeTab === "music" && (
                    <div className="space-y-2">
                      {MUSIC_TRACKS.map((track) => (
                        <button
                          key={track.id}
                          onClick={() => setSelectedMusic(track.id === selectedMusic ? null : track.id)}
                          className={`w-full p-3 rounded-lg flex items-center gap-3 transition-colors ${
                            selectedMusic === track.id ? 'bg-primary/20 border border-primary' : 'bg-muted hover:bg-muted/80'
                          }`}
                        >
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center">
                            <Music className="w-5 h-5 text-primary-foreground" />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="font-medium text-sm">{track.name}</p>
                            <p className="text-xs text-muted-foreground">{track.artist} • {track.duration}</p>
                          </div>
                          {selectedMusic === track.id && (
                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                          )}
                        </button>
                      ))}
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        Music will play when viewers watch your story
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        {preview && (
          <div className="p-4 border-t">
            <Button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Share Story
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
