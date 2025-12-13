import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Scissors, Type, Music, Image, Palette, Sparkles, Download,
  Undo, Redo, ZoomIn, ZoomOut, Layers, SlidersHorizontal,
  RotateCcw, FlipHorizontal, FlipVertical, Maximize, Minimize,
  Plus, Trash2, Copy, Move, ChevronLeft, ChevronRight
} from "lucide-react";

interface VideoEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaUrl: string;
  mediaType: "video" | "image";
  onExport?: (exportedUrl: string) => void;
}

interface TimelineClip {
  id: string;
  type: "video" | "audio" | "text" | "image";
  startTime: number;
  duration: number;
  content: string;
  track: number;
  muted?: boolean;
  volume?: number;
  effects?: ClipEffect[];
}

interface ClipEffect {
  type: string;
  value: number | string;
}

interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontFamily: string;
  startTime: number;
  duration: number;
  animation?: string;
}

const FILTERS = [
  { id: "none", name: "None", css: "" },
  { id: "grayscale", name: "Grayscale", css: "grayscale(100%)" },
  { id: "sepia", name: "Sepia", css: "sepia(100%)" },
  { id: "vintage", name: "Vintage", css: "sepia(50%) contrast(90%) brightness(90%)" },
  { id: "warm", name: "Warm", css: "sepia(30%) saturate(140%)" },
  { id: "cool", name: "Cool", css: "hue-rotate(180deg) saturate(80%)" },
  { id: "dramatic", name: "Dramatic", css: "contrast(150%) brightness(90%)" },
  { id: "fade", name: "Fade", css: "contrast(80%) brightness(110%) saturate(80%)" },
  { id: "noir", name: "Noir", css: "grayscale(100%) contrast(120%)" },
  { id: "vivid", name: "Vivid", css: "saturate(150%) contrast(110%)" },
  { id: "muted", name: "Muted", css: "saturate(50%) brightness(105%)" },
  { id: "cinematic", name: "Cinematic", css: "contrast(110%) saturate(90%) brightness(95%)" },
];

const TRANSITIONS = [
  { id: "none", name: "None" },
  { id: "fade", name: "Fade" },
  { id: "dissolve", name: "Dissolve" },
  { id: "wipe-left", name: "Wipe Left" },
  { id: "wipe-right", name: "Wipe Right" },
  { id: "zoom-in", name: "Zoom In" },
  { id: "zoom-out", name: "Zoom Out" },
  { id: "slide-left", name: "Slide Left" },
  { id: "slide-right", name: "Slide Right" },
];

const TEXT_ANIMATIONS = [
  { id: "none", name: "None" },
  { id: "fade-in", name: "Fade In" },
  { id: "slide-up", name: "Slide Up" },
  { id: "slide-down", name: "Slide Down" },
  { id: "typewriter", name: "Typewriter" },
  { id: "bounce", name: "Bounce" },
  { id: "zoom", name: "Zoom" },
];

const FONTS = [
  "Arial", "Helvetica", "Times New Roman", "Georgia", "Verdana",
  "Comic Sans MS", "Impact", "Trebuchet MS", "Courier New", "Lucida Console"
];

export function VideoEditor({ open, onOpenChange, mediaUrl, mediaType, onExport }: VideoEditorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(10);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [zoom, setZoom] = useState(100);

  // Timeline state
  const [clips, setClips] = useState<TimelineClip[]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);

  // Effects state
  const [activeFilter, setActiveFilter] = useState("none");
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [hue, setHue] = useState(0);
  const [blur, setBlur] = useState(0);
  const [transition, setTransition] = useState("none");

  // Trim state
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(100);

  // Split state
  const [splitPoints, setSplitPoints] = useState<number[]>([]);

  // Audio state
  const [audioTracks, setAudioTracks] = useState<{ id: string; url: string; volume: number; muted: boolean }[]>([]);

  // History for undo/redo
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Active tab
  const [activeTab, setActiveTab] = useState("trim");

  // Text overlay editing
  const [newTextContent, setNewTextContent] = useState("Your text here");
  const [newTextColor, setNewTextColor] = useState("#ffffff");
  const [newTextSize, setNewTextSize] = useState(32);
  const [newTextFont, setNewTextFont] = useState("Arial");
  const [newTextAnimation, setNewTextAnimation] = useState("none");

  // Initialize clips when media loads
  useEffect(() => {
    if (open && mediaUrl) {
      const initialClip: TimelineClip = {
        id: "main-clip",
        type: mediaType,
        startTime: 0,
        duration: duration,
        content: mediaUrl,
        track: 0,
        muted: false,
        volume: 100,
      };
      setClips([initialClip]);
      setSelectedClipId("main-clip");
    }
  }, [open, mediaUrl, mediaType, duration]);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setTrimEnd(100);
    };
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("ended", handleEnded);
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const seek = (time: number) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const vol = value[0];
    setVolume(vol);
    if (videoRef.current) {
      videoRef.current.volume = vol / 100;
    }
    if (vol > 0) setIsMuted(false);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
  };

  const getFilterCSS = () => {
    const filter = FILTERS.find(f => f.id === activeFilter);
    let css = filter?.css || "";
    
    const adjustments = [];
    if (brightness !== 100) adjustments.push(`brightness(${brightness}%)`);
    if (contrast !== 100) adjustments.push(`contrast(${contrast}%)`);
    if (saturation !== 100) adjustments.push(`saturate(${saturation}%)`);
    if (hue !== 0) adjustments.push(`hue-rotate(${hue}deg)`);
    if (blur > 0) adjustments.push(`blur(${blur}px)`);
    
    return css + " " + adjustments.join(" ");
  };

  const splitAtCurrentTime = () => {
    const newSplitPoints = [...splitPoints, currentTime].sort((a, b) => a - b);
    setSplitPoints(newSplitPoints);
    toast.success(`Split added at ${formatTime(currentTime)}`);
  };

  const addTextOverlay = () => {
    const newText: TextOverlay = {
      id: `text-${Date.now()}`,
      text: newTextContent,
      x: 50,
      y: 50,
      fontSize: newTextSize,
      color: newTextColor,
      fontFamily: newTextFont,
      startTime: currentTime,
      duration: 3,
      animation: newTextAnimation,
    };
    setTextOverlays([...textOverlays, newText]);
    setSelectedTextId(newText.id);
    toast.success("Text overlay added");
  };

  const removeTextOverlay = (id: string) => {
    setTextOverlays(textOverlays.filter(t => t.id !== id));
    if (selectedTextId === id) setSelectedTextId(null);
  };

  const updateTextOverlay = (id: string, updates: Partial<TextOverlay>) => {
    setTextOverlays(textOverlays.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const resetColorGrading = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setHue(0);
    setBlur(0);
  };

  const handleExport = async () => {
    toast.loading("Preparing export...");
    
    // In a real implementation, this would render the video with all effects
    // For now, we'll simulate the export process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    toast.dismiss();
    toast.success("Video exported successfully!");
    
    if (onExport) {
      onExport(mediaUrl);
    }
  };

  const addUndo = (state: any) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(state);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      // Apply previous state
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      // Apply next state
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1400px] h-[90vh] p-0 bg-background">
        <div className="flex flex-col h-full">
          {/* Header */}
          <DialogHeader className="px-4 py-3 border-b flex flex-row items-center justify-between">
            <DialogTitle className="text-lg font-semibold">Video Editor</DialogTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={undo} disabled={historyIndex <= 0}>
                <Undo className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={redo} disabled={historyIndex >= history.length - 1}>
                <Redo className="h-4 w-4" />
              </Button>
              <Button onClick={handleExport} className="gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </DialogHeader>

          {/* Main Content */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left Panel - Tools */}
            <div className="w-72 border-r bg-muted/30 overflow-hidden flex flex-col">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                <TabsList className="grid grid-cols-5 mx-2 mt-2">
                  <TabsTrigger value="trim" className="text-xs px-2">
                    <Scissors className="h-3.5 w-3.5" />
                  </TabsTrigger>
                  <TabsTrigger value="text" className="text-xs px-2">
                    <Type className="h-3.5 w-3.5" />
                  </TabsTrigger>
                  <TabsTrigger value="audio" className="text-xs px-2">
                    <Music className="h-3.5 w-3.5" />
                  </TabsTrigger>
                  <TabsTrigger value="filters" className="text-xs px-2">
                    <Sparkles className="h-3.5 w-3.5" />
                  </TabsTrigger>
                  <TabsTrigger value="color" className="text-xs px-2">
                    <Palette className="h-3.5 w-3.5" />
                  </TabsTrigger>
                </TabsList>

                <ScrollArea className="flex-1 p-3">
                  {/* Trim & Split Tab */}
                  <TabsContent value="trim" className="m-0 space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Trim</Label>
                      <div className="mt-2 space-y-3">
                        <div>
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Start: {formatTime(trimStart * duration / 100)}</span>
                            <span>End: {formatTime(trimEnd * duration / 100)}</span>
                          </div>
                          <div className="h-8 bg-muted rounded relative">
                            <div
                              className="absolute h-full bg-primary/30 rounded"
                              style={{
                                left: `${trimStart}%`,
                                width: `${trimEnd - trimStart}%`
                              }}
                            />
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={trimStart}
                              onChange={(e) => setTrimStart(Math.min(Number(e.target.value), trimEnd - 1))}
                              className="absolute w-full h-full opacity-0 cursor-pointer"
                            />
                          </div>
                          <div className="flex gap-2 mt-2">
                            <div className="flex-1">
                              <Label className="text-xs">Start %</Label>
                              <Input
                                type="number"
                                min={0}
                                max={trimEnd - 1}
                                value={trimStart}
                                onChange={(e) => setTrimStart(Number(e.target.value))}
                                className="h-8"
                              />
                            </div>
                            <div className="flex-1">
                              <Label className="text-xs">End %</Label>
                              <Input
                                type="number"
                                min={trimStart + 1}
                                max={100}
                                value={trimEnd}
                                onChange={(e) => setTrimEnd(Number(e.target.value))}
                                className="h-8"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Split</Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Split at current position: {formatTime(currentTime)}
                      </p>
                      <Button onClick={splitAtCurrentTime} className="w-full mt-2 gap-2" size="sm">
                        <Scissors className="h-4 w-4" />
                        Split Here
                      </Button>
                      {splitPoints.length > 0 && (
                        <div className="mt-3 space-y-1">
                          <Label className="text-xs">Split Points:</Label>
                          {splitPoints.map((point, i) => (
                            <div key={i} className="flex items-center justify-between bg-muted rounded px-2 py-1 text-xs">
                              <span>{formatTime(point)}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5"
                                onClick={() => setSplitPoints(splitPoints.filter((_, idx) => idx !== i))}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Transitions</Label>
                      <Select value={transition} onValueChange={setTransition}>
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TRANSITIONS.map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TabsContent>

                  {/* Text Tab */}
                  <TabsContent value="text" className="m-0 space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Add Text Overlay</Label>
                      <div className="mt-2 space-y-3">
                        <div>
                          <Label className="text-xs">Text</Label>
                          <Input
                            value={newTextContent}
                            onChange={(e) => setNewTextContent(e.target.value)}
                            placeholder="Enter text..."
                            className="mt-1"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Color</Label>
                            <Input
                              type="color"
                              value={newTextColor}
                              onChange={(e) => setNewTextColor(e.target.value)}
                              className="h-8 mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Size</Label>
                            <Input
                              type="number"
                              value={newTextSize}
                              onChange={(e) => setNewTextSize(Number(e.target.value))}
                              min={8}
                              max={200}
                              className="h-8 mt-1"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Font</Label>
                          <Select value={newTextFont} onValueChange={setNewTextFont}>
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {FONTS.map(f => (
                                <SelectItem key={f} value={f}>{f}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Animation</Label>
                          <Select value={newTextAnimation} onValueChange={setNewTextAnimation}>
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TEXT_ANIMATIONS.map(a => (
                                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button onClick={addTextOverlay} className="w-full gap-2" size="sm">
                          <Plus className="h-4 w-4" />
                          Add Text
                        </Button>
                      </div>
                    </div>

                    {textOverlays.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium">Text Overlays</Label>
                        <div className="mt-2 space-y-2">
                          {textOverlays.map(text => (
                            <div
                              key={text.id}
                              className={`p-2 rounded border cursor-pointer ${selectedTextId === text.id ? "border-primary" : "border-border"}`}
                              onClick={() => setSelectedTextId(text.id)}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-sm truncate flex-1">{text.text}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeTextOverlay(text.id);
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {formatTime(text.startTime)} - {formatTime(text.startTime + text.duration)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* Audio Tab */}
                  <TabsContent value="audio" className="m-0 space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Original Audio</Label>
                      <div className="mt-2 flex items-center gap-2">
                        <Button
                          variant={isMuted ? "secondary" : "outline"}
                          size="icon"
                          className="h-8 w-8"
                          onClick={toggleMute}
                        >
                          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                        </Button>
                        <Slider
                          value={[isMuted ? 0 : volume]}
                          onValueChange={handleVolumeChange}
                          max={100}
                          step={1}
                          className="flex-1"
                        />
                        <span className="text-xs w-8 text-right">{volume}%</span>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Background Music</Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Add music tracks to your video
                      </p>
                      <Button variant="outline" className="w-full mt-2 gap-2" size="sm">
                        <Plus className="h-4 w-4" />
                        Add Audio Track
                      </Button>
                    </div>

                    {audioTracks.length > 0 && (
                      <div className="space-y-2">
                        {audioTracks.map(track => (
                          <div key={track.id} className="p-2 border rounded">
                            <div className="flex items-center gap-2">
                              <Button
                                variant={track.muted ? "secondary" : "outline"}
                                size="icon"
                                className="h-6 w-6"
                              >
                                {track.muted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                              </Button>
                              <Slider
                                value={[track.volume]}
                                max={100}
                                className="flex-1"
                              />
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* Filters Tab */}
                  <TabsContent value="filters" className="m-0 space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Filters</Label>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {FILTERS.map(filter => (
                          <button
                            key={filter.id}
                            onClick={() => setActiveFilter(filter.id)}
                            className={`p-2 text-xs rounded border text-center transition-colors ${
                              activeFilter === filter.id
                                ? "border-primary bg-primary/10"
                                : "border-border hover:border-primary/50"
                            }`}
                          >
                            {filter.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  {/* Color Grading Tab */}
                  <TabsContent value="color" className="m-0 space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Color Grading</Label>
                      <Button variant="ghost" size="sm" onClick={resetColorGrading}>
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Reset
                      </Button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Brightness</span>
                          <span>{brightness}%</span>
                        </div>
                        <Slider
                          value={[brightness]}
                          onValueChange={(v) => setBrightness(v[0])}
                          min={0}
                          max={200}
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Contrast</span>
                          <span>{contrast}%</span>
                        </div>
                        <Slider
                          value={[contrast]}
                          onValueChange={(v) => setContrast(v[0])}
                          min={0}
                          max={200}
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Saturation</span>
                          <span>{saturation}%</span>
                        </div>
                        <Slider
                          value={[saturation]}
                          onValueChange={(v) => setSaturation(v[0])}
                          min={0}
                          max={200}
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Hue Rotation</span>
                          <span>{hue}°</span>
                        </div>
                        <Slider
                          value={[hue]}
                          onValueChange={(v) => setHue(v[0])}
                          min={-180}
                          max={180}
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Blur</span>
                          <span>{blur}px</span>
                        </div>
                        <Slider
                          value={[blur]}
                          onValueChange={(v) => setBlur(v[0])}
                          min={0}
                          max={20}
                        />
                      </div>
                    </div>
                  </TabsContent>
                </ScrollArea>
              </Tabs>
            </div>

            {/* Center - Preview */}
            <div className="flex-1 flex flex-col bg-black/90">
              {/* Preview Area */}
              <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
                <div className="relative max-w-full max-h-full">
                  {mediaType === "video" ? (
                    <video
                      ref={videoRef}
                      src={mediaUrl}
                      className="max-h-[50vh] max-w-full rounded"
                      style={{ filter: getFilterCSS() }}
                      muted={isMuted}
                    />
                  ) : (
                    <img
                      src={mediaUrl}
                      alt="Preview"
                      className="max-h-[50vh] max-w-full rounded object-contain"
                      style={{ filter: getFilterCSS() }}
                    />
                  )}

                  {/* Text Overlays Preview */}
                  {textOverlays.map(text => (
                    currentTime >= text.startTime && currentTime <= text.startTime + text.duration && (
                      <div
                        key={text.id}
                        className={`absolute cursor-move ${selectedTextId === text.id ? "ring-2 ring-primary" : ""}`}
                        style={{
                          left: `${text.x}%`,
                          top: `${text.y}%`,
                          transform: "translate(-50%, -50%)",
                          fontSize: `${text.fontSize}px`,
                          color: text.color,
                          fontFamily: text.fontFamily,
                          textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
                        }}
                        onClick={() => setSelectedTextId(text.id)}
                      >
                        {text.text}
                      </div>
                    )
                  ))}
                </div>
              </div>

              {/* Controls */}
              <div className="p-4 border-t border-white/10">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="icon" onClick={() => seek(0)} className="text-white">
                    <SkipBack className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={togglePlay} className="text-white">
                    {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => seek(duration)} className="text-white">
                    <SkipForward className="h-4 w-4" />
                  </Button>

                  <span className="text-white text-sm font-mono">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>

                  <div className="flex-1">
                    <Slider
                      value={[currentTime]}
                      onValueChange={(v) => seek(v[0])}
                      max={duration}
                      step={0.01}
                      className="cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setZoom(Math.max(50, zoom - 10))}
                      className="text-white"
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-white text-xs w-12 text-center">{zoom}%</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setZoom(Math.min(200, zoom + 10))}
                      className="text-white"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="h-32 bg-muted/50 border-t border-white/10 p-2 overflow-hidden">
                <div className="h-full flex flex-col">
                  {/* Time ruler */}
                  <div className="h-6 flex items-end border-b border-white/20 relative">
                    {Array.from({ length: Math.ceil(duration) + 1 }).map((_, i) => (
                      <div
                        key={i}
                        className="absolute text-[10px] text-white/60"
                        style={{ left: `${(i / duration) * 100}%` }}
                      >
                        {formatTime(i)}
                      </div>
                    ))}
                    {/* Playhead */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-primary z-10"
                      style={{ left: `${(currentTime / duration) * 100}%` }}
                    >
                      <div className="w-3 h-3 bg-primary rounded-full -ml-[5px] -mt-1" />
                    </div>
                  </div>

                  {/* Tracks */}
                  <div className="flex-1 relative mt-1">
                    {/* Video Track */}
                    <div className="h-8 bg-blue-500/30 rounded mx-1 relative overflow-hidden">
                      <div
                        className="absolute h-full bg-blue-500/50"
                        style={{
                          left: `${trimStart}%`,
                          width: `${trimEnd - trimStart}%`
                        }}
                      />
                      {splitPoints.map((point, i) => (
                        <div
                          key={i}
                          className="absolute top-0 bottom-0 w-0.5 bg-yellow-400"
                          style={{ left: `${(point / duration) * 100}%` }}
                        />
                      ))}
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-white font-medium">
                        Video
                      </span>
                    </div>

                    {/* Audio Track */}
                    <div className="h-6 bg-green-500/30 rounded mx-1 mt-1 relative">
                      <div
                        className="absolute h-full bg-green-500/50"
                        style={{
                          left: `${trimStart}%`,
                          width: `${trimEnd - trimStart}%`
                        }}
                      />
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-white font-medium">
                        Audio
                      </span>
                    </div>

                    {/* Text Overlay Track */}
                    <div className="h-6 bg-purple-500/20 rounded mx-1 mt-1 relative">
                      {textOverlays.map(text => (
                        <div
                          key={text.id}
                          className={`absolute h-full bg-purple-500/60 rounded cursor-pointer ${
                            selectedTextId === text.id ? "ring-2 ring-white" : ""
                          }`}
                          style={{
                            left: `${(text.startTime / duration) * 100}%`,
                            width: `${(text.duration / duration) * 100}%`
                          }}
                          onClick={() => setSelectedTextId(text.id)}
                        >
                          <span className="text-[8px] text-white px-1 truncate block">
                            {text.text}
                          </span>
                        </div>
                      ))}
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-white/60 font-medium pointer-events-none">
                        Text
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
