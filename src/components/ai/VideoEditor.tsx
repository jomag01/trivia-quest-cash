import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Scissors, Type, Music, Image, Palette, Sparkles, Download,
  Undo, Redo, ZoomIn, ZoomOut, Layers, SlidersHorizontal,
  RotateCcw, Plus, Trash2, Settings, FileVideo, Film,
  Clock, Target, Users, Mic, ImagePlus, MonitorPlay, Upload,
  ChevronRight, Wand2, PlayCircle, Eye, Clapperboard, Video,
  Camera, Zap, Wind, Droplets, Sun, Moon, Star, Flame, CloudFog,
  Timer, Gauge, Volume1, Lightbulb, Shield, ToggleLeft, ToggleRight,
  Tv, MonitorSpeaker, CircleDot, Focus, Maximize2
} from "lucide-react";

interface VideoEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaUrl: string;
  mediaType: "video" | "image";
  onExport?: (exportedUrl: string) => void;
}

// Types for structured video editing
interface ProjectMetadata {
  projectName: string;
  primaryGoal: string;
  targetAudience: string;
  toneAndMood: string;
  targetDuration: string;
}

interface Asset {
  id: string;
  type: "video" | "audio" | "image" | "b-roll-request";
  source: string;
  description: string;
  name: string;
}

interface SceneInstruction {
  id: string;
  sceneNumber: number;
  startTime: string;
  endTime: string;
  visuals: string[];
  audio: string[];
  textGraphics: string[];
  transition: string;
}

interface AestheticDirectives {
  colorGradeStyle: string;
  textStyleDefault: string;
  transitionStyleDefault: string;
  filter: string;
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  // Cinematic Features
  genrePreset: string;
  vfxEffects: string[];
  cameraMotion: string;
  speedEffect: string;
  audioSync: string;
  filmGrain: number;
  vignette: number;
  highlightRolloff: number;
  shadowDepth: number;
  skinToneProtection: boolean;
  hdrBalance: boolean;
  depthOfField: boolean;
  motionBlur: boolean;
}

interface ExportSpec {
  format: string;
  resolution: string;
  frameRate: string;
  aspectRatio: string;
  audioCodec: string;
  videoCodec: string;
  bitrate: string;
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

// Preset configurations
const GOALS = [
  "Promote a new product",
  "Educational tutorial",
  "Cinematic travel vlog",
  "Brand awareness",
  "Social media content",
  "Product demonstration",
  "Event highlight reel",
  "Testimonial video",
  "Explainer video",
  "Documentary style"
];

const AUDIENCES = [
  "General audience",
  "Tech enthusiasts",
  "Young professionals (18-35)",
  "Families with children",
  "Business executives",
  "Creative professionals",
  "Students",
  "Seniors (55+)",
  "Gen Z (TikTok users)",
  "Millennials"
];

const TONES = [
  "Uplifting and energetic",
  "Serious and professional",
  "Nostalgic and dreamy",
  "Fast-paced and exciting",
  "Calm and relaxing",
  "Inspirational and motivating",
  "Humorous and playful",
  "Dramatic and cinematic",
  "Minimalist and clean",
  "Bold and edgy"
];

const COLOR_GRADES = [
  { id: "none", name: "None", css: "", category: "basic" },
  { id: "cinematic-teal-orange", name: "Cinematic Teal & Orange", css: "contrast(110%) saturate(120%)", category: "hollywood" },
  { id: "vintage-film", name: "Vintage Film", css: "sepia(30%) contrast(110%) brightness(95%)", category: "retro" },
  { id: "moody-dark", name: "Moody Dark", css: "contrast(120%) brightness(85%) saturate(90%)", category: "drama" },
  { id: "bright-pop", name: "Bright & Poppy", css: "brightness(110%) saturate(130%)", category: "commercial" },
  { id: "noir", name: "Film Noir", css: "grayscale(100%) contrast(130%)", category: "drama" },
  { id: "cool-blue", name: "Cool Blue", css: "hue-rotate(180deg) saturate(70%) brightness(105%)", category: "scifi" },
  { id: "warm-golden", name: "Warm Golden Hour", css: "sepia(40%) saturate(120%) brightness(105%)", category: "romance" },
  { id: "cyberpunk", name: "Cyberpunk Neon", css: "saturate(150%) hue-rotate(-10deg) contrast(120%)", category: "scifi" },
  { id: "muted-pastel", name: "Muted Pastel", css: "saturate(60%) brightness(110%) contrast(90%)", category: "indie" },
  // Hollywood Film Grade LUTs
  { id: "hollywood-blockbuster", name: "Hollywood Blockbuster", css: "contrast(115%) saturate(105%) brightness(102%)", category: "hollywood" },
  { id: "netflix-drama", name: "Netflix Drama", css: "contrast(108%) saturate(90%) brightness(95%)", category: "streaming" },
  { id: "apple-tv-premium", name: "Apple TV+ Premium", css: "contrast(105%) saturate(95%) brightness(100%)", category: "streaming" },
  { id: "anamorphic-cinema", name: "Anamorphic Cinema", css: "contrast(112%) saturate(88%) brightness(97%)", category: "hollywood" },
  { id: "arri-alexa", name: "ARRI Alexa Look", css: "contrast(104%) saturate(92%) brightness(101%)", category: "hollywood" },
  { id: "red-dragon", name: "RED Dragon Look", css: "contrast(110%) saturate(95%) brightness(99%)", category: "hollywood" },
  // Genre-specific grades
  { id: "horror-desaturated", name: "Horror Desaturated", css: "contrast(130%) saturate(40%) brightness(80%)", category: "horror" },
  { id: "action-high-contrast", name: "Action High Contrast", css: "contrast(140%) saturate(110%) brightness(95%)", category: "action" },
  { id: "romance-soft-glow", name: "Romance Soft Glow", css: "contrast(95%) saturate(85%) brightness(108%)", category: "romance" },
  { id: "scifi-cold-steel", name: "Sci-Fi Cold Steel", css: "contrast(115%) saturate(70%) brightness(95%) hue-rotate(10deg)", category: "scifi" },
  { id: "fantasy-ethereal", name: "Fantasy Ethereal", css: "contrast(105%) saturate(120%) brightness(105%)", category: "fantasy" },
  { id: "documentary-natural", name: "Documentary Natural", css: "contrast(102%) saturate(98%) brightness(100%)", category: "documentary" },
];

// Cinematic VFX Effects
const VFX_EFFECTS = [
  { id: "none", name: "No VFX", description: "Clean footage without effects", icon: "🎬" },
  { id: "anamorphic-flares", name: "Anamorphic Lens Flares", description: "Horizontal blue/orange light streaks", icon: "✨" },
  { id: "volumetric-light", name: "Volumetric God Rays", description: "Dramatic light beams through atmosphere", icon: "☀️" },
  { id: "atmospheric-fog", name: "Atmospheric Fog/Haze", description: "Subtle fog for depth and mood", icon: "🌫️" },
  { id: "dust-particles", name: "Dust Particles", description: "Floating particles in light", icon: "💫" },
  { id: "rain-overlay", name: "Rain Overlay", description: "Cinematic rain effect", icon: "🌧️" },
  { id: "snow-overlay", name: "Snow Overlay", description: "Gentle falling snow", icon: "❄️" },
  { id: "sparks-embers", name: "Sparks & Embers", description: "Floating fire particles", icon: "🔥" },
  { id: "smoke-wisps", name: "Smoke Wisps", description: "Subtle smoke trails", icon: "💨" },
  { id: "film-grain-35mm", name: "35mm Film Grain", description: "Authentic analog texture", icon: "🎞️" },
  { id: "chromatic-aberration", name: "Chromatic Aberration", description: "Lens color fringing", icon: "🌈" },
  { id: "vignette-cinematic", name: "Cinematic Vignette", description: "Edge darkening for focus", icon: "🔲" },
  { id: "light-leak", name: "Light Leaks", description: "Organic light bleeds", icon: "🌟" },
  { id: "bokeh-overlay", name: "Bokeh Overlay", description: "Out-of-focus light orbs", icon: "💡" },
];

// Camera Motion Effects
const CAMERA_MOTIONS = [
  { id: "none", name: "No Motion", description: "Static footage" },
  { id: "stabilize", name: "Stabilize", description: "Remove unwanted camera shake" },
  { id: "cinematic-shake", name: "Cinematic Shake", description: "Subtle organic handheld feel" },
  { id: "push-in", name: "Push In", description: "Slow zoom towards subject" },
  { id: "pull-out", name: "Pull Out", description: "Slow zoom away from subject" },
  { id: "dolly-simulation", name: "Dolly Simulation", description: "Horizontal tracking movement" },
  { id: "parallax-depth", name: "Parallax Depth", description: "3D depth separation effect" },
  { id: "whip-pan", name: "Whip Pan", description: "Fast directional blur transition" },
];

// Speed Effects
const SPEED_EFFECTS = [
  { id: "normal", name: "Normal Speed", multiplier: 1 },
  { id: "slow-25", name: "25% Slow Motion", multiplier: 0.25 },
  { id: "slow-50", name: "50% Slow Motion", multiplier: 0.5 },
  { id: "slow-75", name: "75% Slow Motion", multiplier: 0.75 },
  { id: "fast-150", name: "1.5x Speed", multiplier: 1.5 },
  { id: "fast-200", name: "2x Speed", multiplier: 2 },
  { id: "speed-ramp", name: "Speed Ramp", multiplier: 1 },
  { id: "reverse", name: "Reverse", multiplier: -1 },
];

// Genre Presets
const GENRE_PRESETS = [
  { 
    id: "action", 
    name: "Action/Thriller", 
    icon: "💥",
    colorGrade: "action-high-contrast",
    vfx: ["sparks-embers", "chromatic-aberration"],
    cameraMotion: "cinematic-shake",
    description: "High contrast, fast pacing, aggressive motion"
  },
  { 
    id: "drama", 
    name: "Drama", 
    icon: "🎭",
    colorGrade: "netflix-drama",
    vfx: ["vignette-cinematic", "film-grain-35mm"],
    cameraMotion: "stabilize",
    description: "Soft lighting, emotional tones, slower cuts"
  },
  { 
    id: "scifi", 
    name: "Sci-Fi/Fantasy", 
    icon: "🚀",
    colorGrade: "scifi-cold-steel",
    vfx: ["volumetric-light", "dust-particles", "chromatic-aberration"],
    cameraMotion: "parallax-depth",
    description: "Stylized lighting, atmospheric depth, glow accents"
  },
  { 
    id: "romance", 
    name: "Romance", 
    icon: "💕",
    colorGrade: "romance-soft-glow",
    vfx: ["light-leak", "bokeh-overlay"],
    cameraMotion: "push-in",
    description: "Warm tones, dreamy highlights, gentle transitions"
  },
  { 
    id: "horror", 
    name: "Horror/Thriller", 
    icon: "👻",
    colorGrade: "horror-desaturated",
    vfx: ["atmospheric-fog", "vignette-cinematic"],
    cameraMotion: "cinematic-shake",
    description: "Low-key lighting, desaturated, shadow dominance"
  },
  { 
    id: "documentary", 
    name: "Documentary", 
    icon: "📹",
    colorGrade: "documentary-natural",
    vfx: ["stabilize"],
    cameraMotion: "stabilize",
    description: "Natural realism, authentic look"
  },
  { 
    id: "trailer", 
    name: "Cinematic Trailer", 
    icon: "🎬",
    colorGrade: "hollywood-blockbuster",
    vfx: ["anamorphic-flares", "volumetric-light", "film-grain-35mm"],
    cameraMotion: "dolly-simulation",
    description: "Maximum impact, premium feel"
  },
  { 
    id: "commercial", 
    name: "High-End Commercial", 
    icon: "📺",
    colorGrade: "apple-tv-premium",
    vfx: ["vignette-cinematic"],
    cameraMotion: "push-in",
    description: "Clean, polished, product-focused"
  },
];

// Audio Sync Options
const AUDIO_SYNC_OPTIONS = [
  { id: "none", name: "No Audio Sync", description: "Manual timing only" },
  { id: "beat-sync", name: "Beat Sync", description: "Sync cuts to music beats" },
  { id: "peak-emphasis", name: "Peak Emphasis", description: "Visual effects on audio peaks" },
  { id: "fade-with-music", name: "Fade with Music", description: "Match visual fades to audio" },
];

const TRANSITIONS = [
  { id: "hard-cut", name: "Hard Cut" },
  { id: "cross-dissolve", name: "Cross Dissolve" },
  { id: "fade-to-black", name: "Fade to Black" },
  { id: "fade-from-white", name: "Fade from White" },
  { id: "wipe-left", name: "Wipe Left" },
  { id: "wipe-right", name: "Wipe Right" },
  { id: "zoom-in", name: "Zoom In" },
  { id: "zoom-out", name: "Zoom Out" },
  { id: "slide-up", name: "Slide Up" },
  { id: "glitch", name: "Glitch Effect" },
];

const TEXT_ANIMATIONS = [
  { id: "none", name: "None" },
  { id: "fade-in", name: "Fade In" },
  { id: "slide-up", name: "Slide Up" },
  { id: "typewriter", name: "Typewriter" },
  { id: "bounce", name: "Bounce" },
  { id: "zoom", name: "Zoom In" },
  { id: "glitch", name: "Glitch" },
];

const FONTS = [
  "Montserrat", "Lato", "Roboto", "Open Sans", "Poppins",
  "Playfair Display", "Oswald", "Bebas Neue", "Inter", "DM Sans"
];

const EXPORT_PRESETS = {
  youtube: { resolution: "1920x1080", frameRate: "30", bitrate: "12 Mbps", aspectRatio: "16:9" },
  tiktok: { resolution: "1080x1920", frameRate: "30", bitrate: "8 Mbps", aspectRatio: "9:16" },
  instagram: { resolution: "1080x1080", frameRate: "30", bitrate: "8 Mbps", aspectRatio: "1:1" },
  "4k-cinema": { resolution: "3840x2160", frameRate: "24", bitrate: "35 Mbps", aspectRatio: "16:9" },
  web: { resolution: "1280x720", frameRate: "30", bitrate: "5 Mbps", aspectRatio: "16:9" },
};

export function VideoEditor({ open, onOpenChange, mediaUrl, mediaType, onExport }: VideoEditorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Wizard step
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(10);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);

  // Project Metadata (Step 1)
  const [metadata, setMetadata] = useState<ProjectMetadata>({
    projectName: "Untitled Project",
    primaryGoal: GOALS[0],
    targetAudience: AUDIENCES[0],
    toneAndMood: TONES[0],
    targetDuration: "30 seconds"
  });

  // Assets (Step 2)
  const [assets, setAssets] = useState<Asset[]>([]);
  const [newAssetDescription, setNewAssetDescription] = useState("");

  // Timeline/Scenes (Step 3)
  const [scenes, setScenes] = useState<SceneInstruction[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);

  // Aesthetic Directives (Step 4)
  const [aesthetics, setAesthetics] = useState<AestheticDirectives>({
    colorGradeStyle: "cinematic-teal-orange",
    textStyleDefault: "Montserrat Bold, White, Drop Shadow",
    transitionStyleDefault: "cross-dissolve",
    filter: "none",
    brightness: 100,
    contrast: 100,
    saturation: 100,
    hue: 0,
    // Cinematic Features
    genrePreset: "trailer",
    vfxEffects: [],
    cameraMotion: "none",
    speedEffect: "normal",
    audioSync: "none",
    filmGrain: 15,
    vignette: 20,
    highlightRolloff: 50,
    shadowDepth: 50,
    skinToneProtection: true,
    hdrBalance: true,
    depthOfField: false,
    motionBlur: true,
  });

  // Export Specifications (Step 5)
  const [exportSpec, setExportSpec] = useState<ExportSpec>({
    format: "MP4",
    resolution: "1920x1080",
    frameRate: "30",
    aspectRatio: "16:9",
    audioCodec: "AAC",
    videoCodec: "H.264",
    bitrate: "12 Mbps"
  });

  // Text overlays
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [newTextContent, setNewTextContent] = useState("Your text here");
  const [newTextColor, setNewTextColor] = useState("#ffffff");
  const [newTextSize, setNewTextSize] = useState(48);
  const [newTextFont, setNewTextFont] = useState("Montserrat");
  const [newTextAnimation, setNewTextAnimation] = useState("fade-in");

  // Trim state
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(100);

  // History for undo/redo
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Initialize with main asset
  useEffect(() => {
    if (open && mediaUrl) {
      const mainAsset: Asset = {
        id: "main-asset",
        type: mediaType,
        source: mediaUrl,
        description: `Main ${mediaType} file`,
        name: `Main ${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)}`
      };
      setAssets([mainAsset]);
      
      // Create initial scene
      const initialScene: SceneInstruction = {
        id: "scene-1",
        sceneNumber: 1,
        startTime: "00:00",
        endTime: "00:10",
        visuals: [`Use [main-asset] from start to end`],
        audio: ["Original audio at 100% volume"],
        textGraphics: [],
        transition: "hard-cut"
      };
      setScenes([initialScene]);
    }
  }, [open, mediaUrl, mediaType]);

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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getFilterCSS = () => {
    const colorGrade = COLOR_GRADES.find(g => g.id === aesthetics.colorGradeStyle);
    let css = colorGrade?.css || "";
    
    const adjustments = [];
    if (aesthetics.brightness !== 100) adjustments.push(`brightness(${aesthetics.brightness}%)`);
    if (aesthetics.contrast !== 100) adjustments.push(`contrast(${aesthetics.contrast}%)`);
    if (aesthetics.saturation !== 100) adjustments.push(`saturate(${aesthetics.saturation}%)`);
    if (aesthetics.hue !== 0) adjustments.push(`hue-rotate(${aesthetics.hue}deg)`);
    
    return css + " " + adjustments.join(" ");
  };

  const addAsset = (type: Asset["type"]) => {
    const newAsset: Asset = {
      id: `asset-${Date.now()}`,
      type,
      source: "",
      description: newAssetDescription || `New ${type}`,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${assets.length + 1}`
    };
    setAssets([...assets, newAsset]);
    setNewAssetDescription("");
    toast.success("Asset added");
  };

  const removeAsset = (id: string) => {
    if (id === "main-asset") {
      toast.error("Cannot remove main asset");
      return;
    }
    setAssets(assets.filter(a => a.id !== id));
  };

  const addScene = () => {
    const lastScene = scenes[scenes.length - 1];
    const newScene: SceneInstruction = {
      id: `scene-${Date.now()}`,
      sceneNumber: scenes.length + 1,
      startTime: lastScene?.endTime || "00:00",
      endTime: formatTime(parseTimeToSeconds(lastScene?.endTime || "00:00") + 10),
      visuals: [],
      audio: [],
      textGraphics: [],
      transition: "cross-dissolve"
    };
    setScenes([...scenes, newScene]);
    setSelectedSceneId(newScene.id);
    toast.success("Scene added");
  };

  const parseTimeToSeconds = (time: string): number => {
    const parts = time.split(":");
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  };

  const removeScene = (id: string) => {
    if (scenes.length <= 1) {
      toast.error("Must have at least one scene");
      return;
    }
    setScenes(scenes.filter(s => s.id !== id));
  };

  const updateScene = (id: string, updates: Partial<SceneInstruction>) => {
    setScenes(scenes.map(s => s.id === id ? { ...s, ...updates } : s));
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

  const applyExportPreset = (preset: keyof typeof EXPORT_PRESETS) => {
    const config = EXPORT_PRESETS[preset];
    setExportSpec(prev => ({
      ...prev,
      ...config
    }));
    toast.success(`Applied ${preset} preset`);
  };

  const applyGenrePreset = (presetId: string) => {
    const preset = GENRE_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    
    setAesthetics(prev => ({
      ...prev,
      genrePreset: presetId,
      colorGradeStyle: preset.colorGrade,
      vfxEffects: preset.vfx,
      cameraMotion: preset.cameraMotion,
    }));
    toast.success(`Applied ${preset.name} cinematic preset`);
  };

  const toggleVfxEffect = (effectId: string) => {
    setAesthetics(prev => ({
      ...prev,
      vfxEffects: prev.vfxEffects.includes(effectId)
        ? prev.vfxEffects.filter(e => e !== effectId)
        : [...prev.vfxEffects, effectId]
    }));
  };

  const generatePromptJSON = () => {
    return {
      projectMetadata: metadata,
      assets: assets.map(a => ({
        id: `[${a.id.toUpperCase()}]`,
        type: a.type,
        source: a.source,
        description: a.description
      })),
      timeline: scenes.map(s => ({
        scene: s.sceneNumber,
        startTime: s.startTime,
        endTime: s.endTime,
        visuals: s.visuals,
        audio: s.audio,
        textGraphics: s.textGraphics,
        transition: s.transition
      })),
      aestheticDirectives: {
        colorGradeStyle: COLOR_GRADES.find(g => g.id === aesthetics.colorGradeStyle)?.name || "None",
        textStyleDefault: aesthetics.textStyleDefault,
        transitionStyleDefault: TRANSITIONS.find(t => t.id === aesthetics.transitionStyleDefault)?.name || "Hard Cut"
      },
      cinematicFeatures: {
        genrePreset: GENRE_PRESETS.find(p => p.id === aesthetics.genrePreset)?.name || "Custom",
        vfxEffects: aesthetics.vfxEffects.map(e => VFX_EFFECTS.find(v => v.id === e)?.name || e),
        cameraMotion: CAMERA_MOTIONS.find(m => m.id === aesthetics.cameraMotion)?.name || "None",
        speedEffect: SPEED_EFFECTS.find(s => s.id === aesthetics.speedEffect)?.name || "Normal",
        audioSync: AUDIO_SYNC_OPTIONS.find(a => a.id === aesthetics.audioSync)?.name || "None",
        filmGrain: aesthetics.filmGrain,
        vignette: aesthetics.vignette,
        highlightRolloff: aesthetics.highlightRolloff,
        shadowDepth: aesthetics.shadowDepth,
        skinToneProtection: aesthetics.skinToneProtection,
        hdrBalance: aesthetics.hdrBalance,
        depthOfField: aesthetics.depthOfField,
        motionBlur: aesthetics.motionBlur,
      },
      exportSpecifications: exportSpec,
      textOverlays: textOverlays
    };
  };

  const handleExport = async () => {
    toast.loading("Preparing export...");
    
    const promptJSON = generatePromptJSON();
    console.log("Video Edit Prompt JSON:", promptJSON);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    toast.dismiss();
    toast.success("Video exported successfully!");
    
    if (onExport) {
      onExport(mediaUrl);
    }
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
    }
  };

  const steps = [
    { number: 1, title: "Project Setup", icon: Settings, description: "Define your video's purpose and audience" },
    { number: 2, title: "Assets", icon: FileVideo, description: "Manage your media files" },
    { number: 3, title: "Timeline", icon: Film, description: "Arrange scenes and sequencing" },
    { number: 4, title: "Aesthetics", icon: Palette, description: "Visual style and effects" },
    { number: 5, title: "Export", icon: Download, description: "Final output settings" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[98vw] w-[1600px] h-[95vh] p-0 bg-background overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <DialogHeader className="px-4 py-3 border-b flex flex-row items-center justify-between bg-muted/30">
            <div className="flex items-center gap-3">
              <Film className="h-5 w-5 text-primary" />
              <DialogTitle className="text-lg font-bold">{metadata.projectName}</DialogTitle>
              <Badge variant="outline" className="text-xs">{metadata.targetDuration}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={undo} disabled={historyIndex <= 0}>
                <Undo className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={redo} disabled={historyIndex >= history.length - 1}>
                <Redo className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                const json = generatePromptJSON();
                navigator.clipboard.writeText(JSON.stringify(json, null, 2));
                toast.success("Prompt JSON copied to clipboard");
              }}>
                Copy JSON
              </Button>
              <Button onClick={handleExport} className="gap-2 bg-primary">
                <Download className="h-4 w-4" />
                Export Video
              </Button>
            </div>
          </DialogHeader>

          <div className="flex flex-1 overflow-hidden">
            {/* Step Navigation - Left Sidebar */}
            <div className="w-56 border-r bg-muted/20 p-3 flex flex-col">
              <div className="space-y-1">
                {steps.map((step) => (
                  <button
                    key={step.number}
                    onClick={() => setCurrentStep(step.number)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${
                      currentStep === step.number
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                      currentStep === step.number ? "bg-primary-foreground text-primary" : "bg-muted"
                    }`}>
                      {step.number}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{step.title}</div>
                      <div className="text-[10px] opacity-70 truncate">{step.description}</div>
                    </div>
                    {currentStep === step.number && <ChevronRight className="h-4 w-4" />}
                  </button>
                ))}
              </div>
              
              {/* Quick Preview Stats */}
              <div className="mt-auto pt-4 border-t space-y-2">
                <div className="text-xs text-muted-foreground">Quick Stats</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-muted/50 rounded p-2">
                    <div className="font-medium">{assets.length}</div>
                    <div className="text-muted-foreground">Assets</div>
                  </div>
                  <div className="bg-muted/50 rounded p-2">
                    <div className="font-medium">{scenes.length}</div>
                    <div className="text-muted-foreground">Scenes</div>
                  </div>
                  <div className="bg-muted/50 rounded p-2">
                    <div className="font-medium">{textOverlays.length}</div>
                    <div className="text-muted-foreground">Texts</div>
                  </div>
                  <div className="bg-muted/50 rounded p-2">
                    <div className="font-medium">{exportSpec.resolution}</div>
                    <div className="text-muted-foreground">Output</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Step Content */}
              <ScrollArea className="flex-1">
                <div className="p-6">
                  {/* Step 1: Project Setup */}
                  {currentStep === 1 && (
                    <div className="max-w-2xl mx-auto space-y-6">
                      <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold mb-2">Project Metadata</h2>
                        <p className="text-muted-foreground">Define the high-level information about your video</p>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium">Project Name</Label>
                          <Input
                            value={metadata.projectName}
                            onChange={(e) => setMetadata({ ...metadata, projectName: e.target.value })}
                            placeholder="Enter project name..."
                            className="mt-1.5"
                          />
                        </div>

                        <div>
                          <Label className="text-sm font-medium">Primary Goal</Label>
                          <Select 
                            value={metadata.primaryGoal} 
                            onValueChange={(v) => setMetadata({ ...metadata, primaryGoal: v })}
                          >
                            <SelectTrigger className="mt-1.5">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {GOALS.map(goal => (
                                <SelectItem key={goal} value={goal}>{goal}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-sm font-medium">Target Audience</Label>
                          <Select 
                            value={metadata.targetAudience} 
                            onValueChange={(v) => setMetadata({ ...metadata, targetAudience: v })}
                          >
                            <SelectTrigger className="mt-1.5">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {AUDIENCES.map(audience => (
                                <SelectItem key={audience} value={audience}>{audience}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-sm font-medium">Tone & Mood</Label>
                          <Select 
                            value={metadata.toneAndMood} 
                            onValueChange={(v) => setMetadata({ ...metadata, toneAndMood: v })}
                          >
                            <SelectTrigger className="mt-1.5">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TONES.map(tone => (
                                <SelectItem key={tone} value={tone}>{tone}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-sm font-medium">Target Duration</Label>
                          <Select 
                            value={metadata.targetDuration} 
                            onValueChange={(v) => setMetadata({ ...metadata, targetDuration: v })}
                          >
                            <SelectTrigger className="mt-1.5">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="15 seconds">15 seconds (TikTok/Reels)</SelectItem>
                              <SelectItem value="30 seconds">30 seconds (Ad/Short)</SelectItem>
                              <SelectItem value="1 minute">1 minute</SelectItem>
                              <SelectItem value="2 minutes">2 minutes</SelectItem>
                              <SelectItem value="5 minutes">5 minutes</SelectItem>
                              <SelectItem value="10 minutes">10+ minutes (Long-form)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="flex justify-end pt-4">
                        <Button onClick={() => setCurrentStep(2)} className="gap-2">
                          Continue to Assets <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Asset Management */}
                  {currentStep === 2 && (
                    <div className="space-y-6">
                      <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold mb-2">Asset Declaration</h2>
                        <p className="text-muted-foreground">Manage all your source files with unique identifiers</p>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {assets.map((asset) => (
                          <Card key={asset.id} className="relative overflow-hidden">
                            <CardHeader className="pb-2">
                              <div className="flex items-center justify-between">
                                <Badge variant={asset.type === "video" ? "default" : asset.type === "audio" ? "secondary" : "outline"}>
                                  {asset.type.toUpperCase()}
                                </Badge>
                                {asset.id !== "main-asset" && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6"
                                    onClick={() => removeAsset(asset.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                              <CardTitle className="text-sm font-medium">{asset.name}</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-xs text-muted-foreground mb-2">
                                ID: [{asset.id.toUpperCase()}]
                              </div>
                              <Textarea
                                value={asset.description}
                                onChange={(e) => {
                                  setAssets(assets.map(a => 
                                    a.id === asset.id ? { ...a, description: e.target.value } : a
                                  ));
                                }}
                                placeholder="Describe this asset..."
                                className="text-xs h-16 resize-none"
                              />
                            </CardContent>
                          </Card>
                        ))}

                        {/* Add Asset Card */}
                        <Card className="border-dashed flex flex-col items-center justify-center p-6 min-h-[180px]">
                          <div className="text-center space-y-3">
                            <div className="text-muted-foreground text-sm">Add New Asset</div>
                            <Input
                              value={newAssetDescription}
                              onChange={(e) => setNewAssetDescription(e.target.value)}
                              placeholder="Asset description..."
                              className="text-sm"
                            />
                            <div className="flex gap-2 flex-wrap justify-center">
                              <Button size="sm" variant="outline" onClick={() => addAsset("video")} className="gap-1">
                                <FileVideo className="h-3 w-3" /> Video
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => addAsset("audio")} className="gap-1">
                                <Music className="h-3 w-3" /> Audio
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => addAsset("image")} className="gap-1">
                                <ImagePlus className="h-3 w-3" /> Image
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => addAsset("b-roll-request")} className="gap-1">
                                <Wand2 className="h-3 w-3" /> B-Roll
                              </Button>
                            </div>
                          </div>
                        </Card>
                      </div>

                      <div className="flex justify-between pt-4">
                        <Button variant="outline" onClick={() => setCurrentStep(1)}>Back</Button>
                        <Button onClick={() => setCurrentStep(3)} className="gap-2">
                          Continue to Timeline <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Timeline & Sequencing */}
                  {currentStep === 3 && (
                    <div className="space-y-6">
                      <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold mb-2">Timeline & Sequencing</h2>
                        <p className="text-muted-foreground">Arrange your scenes and define the edit</p>
                      </div>

                      <div className="grid gap-4">
                        {scenes.map((scene, index) => (
                          <Card key={scene.id} className={`transition-all ${selectedSceneId === scene.id ? "ring-2 ring-primary" : ""}`}>
                            <CardHeader className="pb-3 cursor-pointer" onClick={() => setSelectedSceneId(scene.id)}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-sm">
                                    {scene.sceneNumber}
                                  </div>
                                  <div>
                                    <CardTitle className="text-sm">Scene {scene.sceneNumber}</CardTitle>
                                    <div className="text-xs text-muted-foreground">
                                      {scene.startTime} - {scene.endTime}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Select 
                                    value={scene.transition}
                                    onValueChange={(v) => updateScene(scene.id, { transition: v })}
                                  >
                                    <SelectTrigger className="w-32 h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {TRANSITIONS.map(t => (
                                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  {scenes.length > 1 && (
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={(e) => { e.stopPropagation(); removeScene(scene.id); }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </CardHeader>
                            {selectedSceneId === scene.id && (
                              <CardContent className="space-y-4 pt-0">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-xs">Start Time</Label>
                                    <Input
                                      value={scene.startTime}
                                      onChange={(e) => updateScene(scene.id, { startTime: e.target.value })}
                                      placeholder="00:00"
                                      className="mt-1 h-8 text-sm"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs">End Time</Label>
                                    <Input
                                      value={scene.endTime}
                                      onChange={(e) => updateScene(scene.id, { endTime: e.target.value })}
                                      placeholder="00:10"
                                      className="mt-1 h-8 text-sm"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <Label className="text-xs font-medium flex items-center gap-2">
                                    <Eye className="h-3 w-3" /> Visuals
                                  </Label>
                                  <Textarea
                                    value={scene.visuals.join("\n")}
                                    onChange={(e) => updateScene(scene.id, { visuals: e.target.value.split("\n").filter(v => v.trim()) })}
                                    placeholder="Describe visual instructions (one per line)..."
                                    className="mt-1 h-20 text-xs resize-none"
                                  />
                                </div>

                                <div>
                                  <Label className="text-xs font-medium flex items-center gap-2">
                                    <Volume2 className="h-3 w-3" /> Audio
                                  </Label>
                                  <Textarea
                                    value={scene.audio.join("\n")}
                                    onChange={(e) => updateScene(scene.id, { audio: e.target.value.split("\n").filter(a => a.trim()) })}
                                    placeholder="Describe audio instructions (one per line)..."
                                    className="mt-1 h-16 text-xs resize-none"
                                  />
                                </div>

                                <div>
                                  <Label className="text-xs font-medium flex items-center gap-2">
                                    <Type className="h-3 w-3" /> Text & Graphics
                                  </Label>
                                  <Textarea
                                    value={scene.textGraphics.join("\n")}
                                    onChange={(e) => updateScene(scene.id, { textGraphics: e.target.value.split("\n").filter(t => t.trim()) })}
                                    placeholder="On-screen text and graphics (one per line)..."
                                    className="mt-1 h-16 text-xs resize-none"
                                  />
                                </div>
                              </CardContent>
                            )}
                          </Card>
                        ))}

                        <Button variant="outline" onClick={addScene} className="w-full gap-2 border-dashed h-12">
                          <Plus className="h-4 w-4" /> Add Scene
                        </Button>
                      </div>

                      {/* Text Overlays Section */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <Type className="h-4 w-4" /> Text Overlays
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div>
                              <Label className="text-xs">Text</Label>
                              <Input
                                value={newTextContent}
                                onChange={(e) => setNewTextContent(e.target.value)}
                                placeholder="Enter text..."
                                className="mt-1 h-8 text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Font</Label>
                              <Select value={newTextFont} onValueChange={setNewTextFont}>
                                <SelectTrigger className="mt-1 h-8 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {FONTS.map(f => (
                                    <SelectItem key={f} value={f}>{f}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <Label className="text-xs">Color</Label>
                                <Input
                                  type="color"
                                  value={newTextColor}
                                  onChange={(e) => setNewTextColor(e.target.value)}
                                  className="mt-1 h-8"
                                />
                              </div>
                              <div className="flex-1">
                                <Label className="text-xs">Size</Label>
                                <Input
                                  type="number"
                                  value={newTextSize}
                                  onChange={(e) => setNewTextSize(Number(e.target.value))}
                                  className="mt-1 h-8 text-sm"
                                />
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs">Animation</Label>
                              <Select value={newTextAnimation} onValueChange={setNewTextAnimation}>
                                <SelectTrigger className="mt-1 h-8 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {TEXT_ANIMATIONS.map(a => (
                                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <Button onClick={addTextOverlay} size="sm" className="gap-2">
                            <Plus className="h-3 w-3" /> Add Text
                          </Button>

                          {textOverlays.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-2">
                              {textOverlays.map(text => (
                                <Badge
                                  key={text.id}
                                  variant="secondary"
                                  className="cursor-pointer hover:bg-destructive/20"
                                  onClick={() => removeTextOverlay(text.id)}
                                >
                                  {text.text} ({formatTime(text.startTime)})
                                  <Trash2 className="h-3 w-3 ml-1" />
                                </Badge>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      <div className="flex justify-between pt-4">
                        <Button variant="outline" onClick={() => setCurrentStep(2)}>Back</Button>
                        <Button onClick={() => setCurrentStep(4)} className="gap-2">
                          Continue to Aesthetics <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Step 4: Aesthetic Directives - Cinematic Edition */}
                  {currentStep === 4 && (
                    <div className="space-y-6">
                      <div className="text-center mb-8">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 border border-amber-500/30 mb-4">
                          <Clapperboard className="h-5 w-5 text-amber-500" />
                          <span className="text-sm font-medium bg-gradient-to-r from-amber-500 to-red-500 bg-clip-text text-transparent">
                            Professional Post-Production Studio
                          </span>
                        </div>
                        <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
                          Cinematic Aesthetic Directives
                        </h2>
                        <p className="text-muted-foreground">
                          Transform your footage into cinema-ready, film-grade visuals
                        </p>
                      </div>

                      {/* Genre Presets - Hollywood Style */}
                      <Card className="bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-red-500/5 border-amber-500/20">
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500">
                              <Film className="h-4 w-4 text-white" />
                            </div>
                            <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                              Genre Adaptation (Auto-Adjust Style)
                            </span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {GENRE_PRESETS.map(preset => (
                              <button
                                key={preset.id}
                                onClick={() => applyGenrePreset(preset.id)}
                                className={`p-4 rounded-xl border transition-all text-left group hover:scale-[1.02] ${
                                  aesthetics.genrePreset === preset.id
                                    ? "bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-500/50 shadow-lg shadow-amber-500/10"
                                    : "border-border hover:border-amber-500/30 hover:bg-amber-500/5"
                                }`}
                              >
                                <div className="text-2xl mb-2">{preset.icon}</div>
                                <div className="font-medium text-sm">{preset.name}</div>
                                <div className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                                  {preset.description}
                                </div>
                              </button>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      <div className="grid gap-6 md:grid-cols-2">
                        {/* Film-Grade Color Science */}
                        <Card className="bg-gradient-to-br from-purple-500/5 to-pink-500/5 border-purple-500/20">
                          <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                              <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500">
                                <Palette className="h-4 w-4 text-white" />
                              </div>
                              <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                                Film-Grade Color Science
                              </span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2">
                              {COLOR_GRADES.map(grade => (
                                <button
                                  key={grade.id}
                                  onClick={() => setAesthetics({ ...aesthetics, colorGradeStyle: grade.id })}
                                  className={`p-2.5 text-xs rounded-lg border text-center transition-all ${
                                    aesthetics.colorGradeStyle === grade.id
                                      ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/50 font-medium"
                                      : "border-border hover:border-purple-500/30"
                                  }`}
                                >
                                  {grade.name}
                                </button>
                              ))}
                            </div>
                            
                            {/* Cinematic Color Controls */}
                            <div className="space-y-3 pt-3 border-t border-purple-500/20">
                              <div>
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="flex items-center gap-1"><Sun className="h-3 w-3" /> Highlight Roll-off</span>
                                  <span className="text-purple-400">{aesthetics.highlightRolloff}%</span>
                                </div>
                                <Slider
                                  value={[aesthetics.highlightRolloff]}
                                  onValueChange={(v) => setAesthetics({ ...aesthetics, highlightRolloff: v[0] })}
                                  min={0} max={100}
                                  className="[&>span]:bg-gradient-to-r [&>span]:from-purple-500 [&>span]:to-pink-500"
                                />
                              </div>
                              <div>
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="flex items-center gap-1"><Moon className="h-3 w-3" /> Shadow Depth</span>
                                  <span className="text-purple-400">{aesthetics.shadowDepth}%</span>
                                </div>
                                <Slider
                                  value={[aesthetics.shadowDepth]}
                                  onValueChange={(v) => setAesthetics({ ...aesthetics, shadowDepth: v[0] })}
                                  min={0} max={100}
                                  className="[&>span]:bg-gradient-to-r [&>span]:from-purple-500 [&>span]:to-pink-500"
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* VFX Enhancements */}
                        <Card className="bg-gradient-to-br from-cyan-500/5 to-blue-500/5 border-cyan-500/20">
                          <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                              <div className="p-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500">
                                <Sparkles className="h-4 w-4 text-white" />
                              </div>
                              <span className="bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">
                                VFX Enhancements
                              </span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-2">
                              {VFX_EFFECTS.map(effect => (
                                <button
                                  key={effect.id}
                                  onClick={() => toggleVfxEffect(effect.id)}
                                  disabled={effect.id === "none"}
                                  className={`p-3 rounded-lg border text-left transition-all ${
                                    aesthetics.vfxEffects.includes(effect.id)
                                      ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-cyan-500/50"
                                      : effect.id === "none" 
                                        ? "opacity-50 cursor-not-allowed"
                                        : "border-border hover:border-cyan-500/30"
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg">{effect.icon}</span>
                                    <div>
                                      <div className="text-xs font-medium">{effect.name}</div>
                                      <div className="text-[10px] text-muted-foreground">{effect.description}</div>
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                            
                            {aesthetics.vfxEffects.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-cyan-500/20">
                                {aesthetics.vfxEffects.map(e => (
                                  <Badge key={e} className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border-cyan-500/30">
                                    {VFX_EFFECTS.find(v => v.id === e)?.icon} {VFX_EFFECTS.find(v => v.id === e)?.name}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>

                        {/* Camera & Motion Processing */}
                        <Card className="bg-gradient-to-br from-green-500/5 to-emerald-500/5 border-green-500/20">
                          <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                              <div className="p-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500">
                                <Camera className="h-4 w-4 text-white" />
                              </div>
                              <span className="bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">
                                Camera & Motion Processing
                              </span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div>
                              <Label className="text-xs text-muted-foreground">Camera Motion</Label>
                              <Select value={aesthetics.cameraMotion} onValueChange={(v) => setAesthetics({ ...aesthetics, cameraMotion: v })}>
                                <SelectTrigger className="mt-1 border-green-500/30 focus:ring-green-500/50">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {CAMERA_MOTIONS.map(m => (
                                    <SelectItem key={m.id} value={m.id}>
                                      <div>
                                        <div className="font-medium">{m.name}</div>
                                        <div className="text-xs text-muted-foreground">{m.description}</div>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div>
                              <Label className="text-xs text-muted-foreground">Speed Effect</Label>
                              <Select value={aesthetics.speedEffect} onValueChange={(v) => setAesthetics({ ...aesthetics, speedEffect: v })}>
                                <SelectTrigger className="mt-1 border-green-500/30 focus:ring-green-500/50">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {SPEED_EFFECTS.map(s => (
                                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            {/* Toggle Switches */}
                            <div className="grid grid-cols-2 gap-2 pt-2">
                              <button
                                onClick={() => setAesthetics({ ...aesthetics, depthOfField: !aesthetics.depthOfField })}
                                className={`p-3 rounded-lg border text-left transition-all flex items-center gap-2 ${
                                  aesthetics.depthOfField 
                                    ? "bg-green-500/20 border-green-500/50" 
                                    : "border-border hover:border-green-500/30"
                                }`}
                              >
                                <Focus className="h-4 w-4" />
                                <div>
                                  <div className="text-xs font-medium">Depth of Field</div>
                                  <div className="text-[10px] text-muted-foreground">Bokeh simulation</div>
                                </div>
                              </button>
                              <button
                                onClick={() => setAesthetics({ ...aesthetics, motionBlur: !aesthetics.motionBlur })}
                                className={`p-3 rounded-lg border text-left transition-all flex items-center gap-2 ${
                                  aesthetics.motionBlur 
                                    ? "bg-green-500/20 border-green-500/50" 
                                    : "border-border hover:border-green-500/30"
                                }`}
                              >
                                <Zap className="h-4 w-4" />
                                <div>
                                  <div className="text-xs font-medium">Motion Blur</div>
                                  <div className="text-[10px] text-muted-foreground">Cinematic shutter</div>
                                </div>
                              </button>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Audio-Visual Sync */}
                        <Card className="bg-gradient-to-br from-rose-500/5 to-red-500/5 border-rose-500/20">
                          <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                              <div className="p-2 rounded-lg bg-gradient-to-r from-rose-500 to-red-500">
                                <Volume1 className="h-4 w-4 text-white" />
                              </div>
                              <span className="bg-gradient-to-r from-rose-500 to-red-500 bg-clip-text text-transparent">
                                Audio-Visual Sync
                              </span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div>
                              <Label className="text-xs text-muted-foreground">Sync Mode</Label>
                              <Select value={aesthetics.audioSync} onValueChange={(v) => setAesthetics({ ...aesthetics, audioSync: v })}>
                                <SelectTrigger className="mt-1 border-rose-500/30 focus:ring-rose-500/50">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {AUDIO_SYNC_OPTIONS.map(a => (
                                    <SelectItem key={a.id} value={a.id}>
                                      <div>
                                        <div className="font-medium">{a.name}</div>
                                        <div className="text-xs text-muted-foreground">{a.description}</div>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="text-xs text-muted-foreground p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
                              <div className="flex items-center gap-2 mb-1">
                                <Music className="h-3 w-3 text-rose-400" />
                                <span className="font-medium text-rose-400">Pro Tip</span>
                              </div>
                              Sync cuts and effects with music beats. Enhance emotional peaks visually with light pulses or subtle flashes for maximum impact.
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Fine Tuning Controls */}
                      <Card className="bg-gradient-to-br from-slate-500/5 to-zinc-500/5 border-slate-500/20">
                        <CardHeader>
                          <CardTitle className="text-base flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="p-2 rounded-lg bg-gradient-to-r from-slate-500 to-zinc-600">
                                <SlidersHorizontal className="h-4 w-4 text-white" />
                              </div>
                              <span>Fine-Tuning & Quality Controls</span>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setAesthetics({
                              ...aesthetics,
                              brightness: 100,
                              contrast: 100,
                              saturation: 100,
                              hue: 0,
                              filmGrain: 15,
                              vignette: 20
                            })}>
                              <RotateCcw className="h-3 w-3 mr-1" /> Reset All
                            </Button>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid md:grid-cols-3 gap-6">
                            {/* Basic Adjustments */}
                            <div className="space-y-4">
                              <div className="text-xs font-medium text-muted-foreground mb-2">Basic Adjustments</div>
                              <div>
                                <div className="flex justify-between text-xs mb-1">
                                  <span>Brightness</span><span>{aesthetics.brightness}%</span>
                                </div>
                                <Slider value={[aesthetics.brightness]} onValueChange={(v) => setAesthetics({ ...aesthetics, brightness: v[0] })} min={0} max={200} />
                              </div>
                              <div>
                                <div className="flex justify-between text-xs mb-1">
                                  <span>Contrast</span><span>{aesthetics.contrast}%</span>
                                </div>
                                <Slider value={[aesthetics.contrast]} onValueChange={(v) => setAesthetics({ ...aesthetics, contrast: v[0] })} min={0} max={200} />
                              </div>
                              <div>
                                <div className="flex justify-between text-xs mb-1">
                                  <span>Saturation</span><span>{aesthetics.saturation}%</span>
                                </div>
                                <Slider value={[aesthetics.saturation]} onValueChange={(v) => setAesthetics({ ...aesthetics, saturation: v[0] })} min={0} max={200} />
                              </div>
                              <div>
                                <div className="flex justify-between text-xs mb-1">
                                  <span>Hue Rotation</span><span>{aesthetics.hue}°</span>
                                </div>
                                <Slider value={[aesthetics.hue]} onValueChange={(v) => setAesthetics({ ...aesthetics, hue: v[0] })} min={-180} max={180} />
                              </div>
                            </div>

                            {/* Film Texture */}
                            <div className="space-y-4">
                              <div className="text-xs font-medium text-muted-foreground mb-2">Film Texture</div>
                              <div>
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="flex items-center gap-1">🎞️ 35mm Film Grain</span>
                                  <span>{aesthetics.filmGrain}%</span>
                                </div>
                                <Slider value={[aesthetics.filmGrain]} onValueChange={(v) => setAesthetics({ ...aesthetics, filmGrain: v[0] })} min={0} max={100} />
                              </div>
                              <div>
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="flex items-center gap-1">🔲 Cinematic Vignette</span>
                                  <span>{aesthetics.vignette}%</span>
                                </div>
                                <Slider value={[aesthetics.vignette]} onValueChange={(v) => setAesthetics({ ...aesthetics, vignette: v[0] })} min={0} max={100} />
                              </div>
                            </div>

                            {/* Quality Protection */}
                            <div className="space-y-4">
                              <div className="text-xs font-medium text-muted-foreground mb-2">Quality Protection</div>
                              <button
                                onClick={() => setAesthetics({ ...aesthetics, skinToneProtection: !aesthetics.skinToneProtection })}
                                className={`w-full p-3 rounded-lg border text-left transition-all flex items-center justify-between ${
                                  aesthetics.skinToneProtection ? "bg-primary/10 border-primary/50" : "border-border"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <Shield className="h-4 w-4" />
                                  <div>
                                    <div className="text-xs font-medium">Skin Tone Protection</div>
                                    <div className="text-[10px] text-muted-foreground">Preserve natural skin tones</div>
                                  </div>
                                </div>
                                {aesthetics.skinToneProtection ? <ToggleRight className="h-5 w-5 text-primary" /> : <ToggleLeft className="h-5 w-5" />}
                              </button>
                              <button
                                onClick={() => setAesthetics({ ...aesthetics, hdrBalance: !aesthetics.hdrBalance })}
                                className={`w-full p-3 rounded-lg border text-left transition-all flex items-center justify-between ${
                                  aesthetics.hdrBalance ? "bg-primary/10 border-primary/50" : "border-border"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <Lightbulb className="h-4 w-4" />
                                  <div>
                                    <div className="text-xs font-medium">HDR Balance</div>
                                    <div className="text-[10px] text-muted-foreground">HDR-balanced exposure</div>
                                  </div>
                                </div>
                                {aesthetics.hdrBalance ? <ToggleRight className="h-5 w-5 text-primary" /> : <ToggleLeft className="h-5 w-5" />}
                              </button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Text & Transition Defaults */}
                      <div className="grid gap-6 md:grid-cols-2">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                              <Type className="h-4 w-4" /> Default Text Style
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <Input
                              value={aesthetics.textStyleDefault}
                              onChange={(e) => setAesthetics({ ...aesthetics, textStyleDefault: e.target.value })}
                              placeholder="Font, Color, Effects..."
                            />
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                              <Layers className="h-4 w-4" /> Default Transition
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <Select 
                              value={aesthetics.transitionStyleDefault}
                              onValueChange={(v) => setAesthetics({ ...aesthetics, transitionStyleDefault: v })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {TRANSITIONS.map(t => (
                                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Quality Assurance Notice */}
                      <Card className="bg-gradient-to-r from-emerald-500/10 via-green-500/10 to-teal-500/10 border-emerald-500/30">
                        <CardContent className="py-4">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500">
                              <Star className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <div className="font-medium text-emerald-400 mb-1">Cinema-Ready Quality Assurance</div>
                              <div className="text-xs text-muted-foreground space-y-1">
                                <p>✓ Every VFX element serves the story • ✓ Prioritizes realism and cinematic authenticity</p>
                                <p>✓ Clean export with professional finishing • ✓ 4K resolution with upscaling if needed</p>
                                <p className="text-emerald-400/80 font-medium mt-2">
                                  Your video will look suitable for Movies, Netflix/Prime/Apple TV content, and high-end trailers.
                                </p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <div className="flex justify-between pt-4">
                        <Button variant="outline" onClick={() => setCurrentStep(3)}>Back</Button>
                        <Button onClick={() => setCurrentStep(5)} className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
                          Continue to Export <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Step 5: Export Specifications */}
                  {currentStep === 5 && (
                    <div className="space-y-6">
                      <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold mb-2">Export Specifications</h2>
                        <p className="text-muted-foreground">Configure the final output format</p>
                      </div>

                      {/* Quick Presets */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Quick Presets</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => applyExportPreset("youtube")}
                              className="gap-2"
                            >
                              <MonitorPlay className="h-4 w-4" /> YouTube (1080p)
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => applyExportPreset("tiktok")}
                              className="gap-2"
                            >
                              <PlayCircle className="h-4 w-4" /> TikTok/Reels
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => applyExportPreset("instagram")}
                              className="gap-2"
                            >
                              <Image className="h-4 w-4" /> Instagram Square
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => applyExportPreset("4k-cinema")}
                              className="gap-2"
                            >
                              <Film className="h-4 w-4" /> 4K Cinema
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => applyExportPreset("web")}
                              className="gap-2"
                            >
                              <Layers className="h-4 w-4" /> Web (720p)
                            </Button>
                          </div>
                        </CardContent>
                      </Card>

                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Format</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <Select value={exportSpec.format} onValueChange={(v) => setExportSpec({ ...exportSpec, format: v })}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="MP4">MP4</SelectItem>
                                <SelectItem value="MOV">MOV</SelectItem>
                                <SelectItem value="WebM">WebM</SelectItem>
                                <SelectItem value="AVI">AVI</SelectItem>
                              </SelectContent>
                            </Select>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Resolution</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <Select value={exportSpec.resolution} onValueChange={(v) => setExportSpec({ ...exportSpec, resolution: v })}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="3840x2160">4K (3840x2160)</SelectItem>
                                <SelectItem value="2560x1440">1440p (2560x1440)</SelectItem>
                                <SelectItem value="1920x1080">1080p (1920x1080)</SelectItem>
                                <SelectItem value="1280x720">720p (1280x720)</SelectItem>
                                <SelectItem value="1080x1920">1080x1920 (Vertical)</SelectItem>
                                <SelectItem value="1080x1080">1080x1080 (Square)</SelectItem>
                              </SelectContent>
                            </Select>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Frame Rate</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <Select value={exportSpec.frameRate} onValueChange={(v) => setExportSpec({ ...exportSpec, frameRate: v })}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="24">24 fps (Cinema)</SelectItem>
                                <SelectItem value="25">25 fps (PAL)</SelectItem>
                                <SelectItem value="30">30 fps (Standard)</SelectItem>
                                <SelectItem value="60">60 fps (Smooth)</SelectItem>
                              </SelectContent>
                            </Select>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Video Codec</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <Select value={exportSpec.videoCodec} onValueChange={(v) => setExportSpec({ ...exportSpec, videoCodec: v })}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="H.264">H.264 (Best Compatibility)</SelectItem>
                                <SelectItem value="H.265">H.265 (HEVC)</SelectItem>
                                <SelectItem value="VP9">VP9 (Web)</SelectItem>
                                <SelectItem value="ProRes">ProRes (Professional)</SelectItem>
                              </SelectContent>
                            </Select>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Audio Codec</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <Select value={exportSpec.audioCodec} onValueChange={(v) => setExportSpec({ ...exportSpec, audioCodec: v })}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="AAC">AAC</SelectItem>
                                <SelectItem value="MP3">MP3</SelectItem>
                                <SelectItem value="WAV">WAV (Lossless)</SelectItem>
                              </SelectContent>
                            </Select>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Bitrate</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <Select value={exportSpec.bitrate} onValueChange={(v) => setExportSpec({ ...exportSpec, bitrate: v })}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="5 Mbps">5 Mbps (Web)</SelectItem>
                                <SelectItem value="8 Mbps">8 Mbps (Good)</SelectItem>
                                <SelectItem value="12 Mbps">12 Mbps (High)</SelectItem>
                                <SelectItem value="20 Mbps">20 Mbps (Very High)</SelectItem>
                                <SelectItem value="35 Mbps">35 Mbps (4K)</SelectItem>
                              </SelectContent>
                            </Select>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Summary Card */}
                      <Card className="bg-primary/5 border-primary/20">
                        <CardHeader>
                          <CardTitle className="text-base">Export Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <div className="text-muted-foreground text-xs">Project</div>
                              <div className="font-medium">{metadata.projectName}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground text-xs">Duration</div>
                              <div className="font-medium">{metadata.targetDuration}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground text-xs">Output</div>
                              <div className="font-medium">{exportSpec.resolution} @ {exportSpec.frameRate}fps</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground text-xs">Format</div>
                              <div className="font-medium">{exportSpec.format} ({exportSpec.videoCodec})</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <div className="flex justify-between pt-4">
                        <Button variant="outline" onClick={() => setCurrentStep(4)}>Back</Button>
                        <Button onClick={handleExport} size="lg" className="gap-2 bg-primary">
                          <Download className="h-5 w-5" /> Export Video
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Preview Area - Fixed at bottom */}
              <div className="border-t bg-black/90">
                <div className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Mini Preview */}
                    <div className="relative w-48 h-28 bg-black rounded overflow-hidden flex-shrink-0">
                      {mediaType === "video" ? (
                        <video
                          ref={videoRef}
                          src={mediaUrl}
                          className="w-full h-full object-contain"
                          style={{ filter: getFilterCSS() }}
                          muted={isMuted}
                        />
                      ) : (
                        <img
                          src={mediaUrl}
                          alt="Preview"
                          className="w-full h-full object-contain"
                          style={{ filter: getFilterCSS() }}
                        />
                      )}
                      
                      {/* Text overlays in preview */}
                      {textOverlays.map(text => (
                        currentTime >= text.startTime && currentTime <= text.startTime + text.duration && (
                          <div
                            key={text.id}
                            className="absolute"
                            style={{
                              left: `${text.x}%`,
                              top: `${text.y}%`,
                              transform: "translate(-50%, -50%)",
                              fontSize: `${text.fontSize / 4}px`,
                              color: text.color,
                              fontFamily: text.fontFamily,
                              textShadow: "1px 1px 2px rgba(0,0,0,0.8)",
                            }}
                          >
                            {text.text}
                          </div>
                        )
                      ))}
                    </div>

                    {/* Controls */}
                    <div className="flex-1 flex items-center gap-3">
                      <Button variant="ghost" size="icon" onClick={() => seek(0)} className="text-white h-8 w-8">
                        <SkipBack className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={togglePlay} className="text-white h-10 w-10">
                        {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => seek(duration)} className="text-white h-8 w-8">
                        <SkipForward className="h-4 w-4" />
                      </Button>

                      <span className="text-white text-xs font-mono w-20">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>

                      <div className="flex-1 max-w-md">
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
                          onClick={() => setIsMuted(!isMuted)}
                          className="text-white h-8 w-8"
                        >
                          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                        </Button>
                        <div className="w-20">
                          <Slider
                            value={[isMuted ? 0 : volume]}
                            onValueChange={(v) => {
                              setVolume(v[0]);
                              if (videoRef.current) videoRef.current.volume = v[0] / 100;
                              if (v[0] > 0) setIsMuted(false);
                            }}
                            max={100}
                            step={1}
                          />
                        </div>
                      </div>
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
