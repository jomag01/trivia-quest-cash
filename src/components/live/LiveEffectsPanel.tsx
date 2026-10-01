import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Upload, X, Trash2, Loader2 } from "lucide-react";
import { uploadToAWS } from "@/lib/awsMedia";
import type { EffectSettings, Sticker } from "@/lib/live/effectsPipeline";
import { hexToRgb01 } from "@/lib/live/effectsPipeline";
import type { LivePlan } from "@/hooks/useLivePlans";

const COLORS = ["#ffffff", "#f5e6c8", "#ffd54f", "#ff8a80", "#80d8ff", "#b9f6ca", "#1a1a1a"];
const EMOJIS = ["🔥", "💥", "⭐", "❤️", "🎉", "🛒", "💯", "🏷️", "🆕", "⚡", "👍", "😍", "🐝", "🎁", "💸", "✅"];

interface MediaItem { type: "image" | "video"; url: string }

interface Props {
  userId: string;
  features: LivePlan["features"];
  settings: EffectSettings;
  onChange: (p: Partial<EffectSettings>) => void;
  onClose: () => void;
}

const libKey = (uid: string) => `live-bg-library-${uid}`;
const loadLib = (uid: string): MediaItem[] => { try { return JSON.parse(localStorage.getItem(libKey(uid)) || "[]"); } catch { return []; } };

export default function LiveEffectsPanel({ userId, features, settings, onChange, onClose }: Props) {
  const [library, setLibrary] = useState<MediaItem[]>(() => loadLib(userId));
  const [uploading, setUploading] = useState(false);
  const bgInput = useRef<HTMLInputElement>(null);
  const stickerInput = useRef<HTMLInputElement>(null);
  const [keyHex, setKeyHex] = useState("#00ff00");

  const saveLib = (items: MediaItem[]) => { setLibrary(items); localStorage.setItem(libKey(userId), JSON.stringify(items.slice(0, 24))); };

  const onBgFile = async (file?: File) => {
    if (!file) return;
    const type = file.type.startsWith("video") ? "video" : file.type.startsWith("image") ? "image" : null;
    if (!type) return toast.error("Choose an image or video");
    if (file.size > 50 * 1024 * 1024) return toast.error("File must be under 50 MB");
    onChange({ background: { type, value: URL.createObjectURL(file) } });
    if (settings.mode === "none") onChange({ mode: features.auto_bg_removal ? "segment" : "chroma" });
    setUploading(true);
    const res = await uploadToAWS(file, `live-backgrounds/${userId}`);
    setUploading(false);
    if (res?.cdnUrl) saveLib([{ type, url: res.cdnUrl }, ...library]);
  };

  const addSticker = (s: Omit<Sticker, "id" | "x" | "y" | "size">) => {
    if (settings.stickers.length >= 12) return toast.error("Up to 12 stickers");
    onChange({ stickers: [...settings.stickers, { ...s, id: crypto.randomUUID(), x: 0.5, y: 0.3, size: 0.18 }] });
    toast.success("Sticker added — drag it on your video");
  };

  const onStickerFile = async (file?: File) => {
    if (!file?.type.startsWith("image")) return;
    addSticker({ kind: "image", value: URL.createObjectURL(file) });
  };

  const patchSticker = (id: string, p: Partial<Sticker>) => onChange({ stickers: settings.stickers.map((s) => (s.id === id ? { ...s, ...p } : s)) });

  const modes = [
    { id: "none", label: "Off", ok: true },
    { id: "chroma", label: "Green screen", ok: !!features.chroma_key },
    { id: "segment", label: "Auto remove", ok: !!features.auto_bg_removal },
  ] as const;

  return (
    <div className="absolute inset-x-0 bottom-0 z-30 max-h-[60%] overflow-y-auto rounded-t-2xl bg-background p-4 text-foreground shadow-2xl">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-bold">Camera & Effects</h3>
        <Button size="icon" variant="ghost" onClick={onClose} aria-label="Close effects"><X className="h-4 w-4" /></Button>
      </div>
      <Tabs defaultValue="bg">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="bg">Background</TabsTrigger>
          <TabsTrigger value="stickers" disabled={!features.stickers}>Stickers</TabsTrigger>
        </TabsList>

        <TabsContent value="bg" className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {modes.map((m) => (
              <Button key={m.id} size="sm" variant={settings.mode === m.id ? "default" : "outline"} disabled={!m.ok}
                onClick={() => onChange({ mode: m.id })}>{m.label}</Button>
            ))}
          </div>
          {settings.mode === "chroma" && (
            <div className="space-y-3 rounded-lg border border-border p-3 text-sm">
              <div className="flex items-center justify-between">
                <span>Screen color</span>
                <div className="flex gap-2">
                  {["#00ff00", "#0047ff"].map((c) => (
                    <button key={c} aria-label={`Key ${c}`} className={`h-7 w-7 rounded-full border-2 ${keyHex === c ? "border-primary" : "border-border"}`} style={{ background: c }}
                      onClick={() => { setKeyHex(c); onChange({ keyColor: hexToRgb01(c) }); }} />
                  ))}
                  <input type="color" value={keyHex} aria-label="Custom key color" className="h-7 w-9 rounded bg-transparent"
                    onChange={(e) => { setKeyHex(e.target.value); onChange({ keyColor: hexToRgb01(e.target.value) }); }} />
                </div>
              </div>
              <div><span>Strength</span><Slider value={[settings.similarity * 100]} max={100} onValueChange={([v]) => onChange({ similarity: v / 100 })} /></div>
              <div><span>Edge softness</span><Slider value={[settings.smoothness * 100]} max={100} onValueChange={([v]) => onChange({ smoothness: v / 100 })} /></div>
            </div>
          )}
          {settings.mode === "segment" && <p className="text-xs text-muted-foreground">No green screen needed. Works best with good lighting; may use more battery.</p>}

          {settings.mode !== "none" && features.custom_background && (
            <div className="space-y-2">
              <p className="text-sm font-medium">New background</p>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button key={c} aria-label={`Color ${c}`} className="h-10 w-10 rounded-lg border border-border" style={{ background: c }}
                    onClick={() => onChange({ background: { type: "color", value: c } })} />
                ))}
                <button className="flex h-10 w-10 items-center justify-center rounded-lg border border-dashed border-border" aria-label="Upload background"
                  onClick={() => bgInput.current?.click()}>{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}</button>
              </div>
              {library.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {library.map((m) => (
                    <div key={m.url} className="relative">
                      <button className="block aspect-[9/16] w-full overflow-hidden rounded-lg border border-border" onClick={() => onChange({ background: { type: m.type, value: m.url } })}>
                        {m.type === "image" ? <img src={m.url} alt="Background" className="h-full w-full object-cover" /> : <video src={m.url} muted className="h-full w-full object-cover" />}
                      </button>
                      <button aria-label="Remove background" className="absolute right-1 top-1 rounded-full bg-background/80 p-0.5" onClick={() => saveLib(library.filter((x) => x.url !== m.url))}>
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <input ref={bgInput} type="file" accept="image/*,video/*" hidden onChange={(e) => { void onBgFile(e.target.files?.[0]); e.target.value = ""; }} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="stickers" className="space-y-3">
          <div className="grid grid-cols-8 gap-1">
            {EMOJIS.map((e) => <button key={e} className="rounded p-1 text-2xl hover:bg-muted" onClick={() => addSticker({ kind: "emoji", value: e })}>{e}</button>)}
          </div>
          <Button size="sm" variant="outline" onClick={() => stickerInput.current?.click()}><Upload className="mr-1 h-4 w-4" /> Upload sticker / logo (PNG)</Button>
          <input ref={stickerInput} type="file" accept="image/*" hidden onChange={(e) => { void onStickerFile(e.target.files?.[0]); e.target.value = ""; }} />
          {settings.stickers.map((s) => (
            <div key={s.id} className="flex items-center gap-2">
              {s.kind === "emoji" ? <span className="text-xl">{s.value}</span> : <img src={s.value} alt="Sticker" className="h-7 w-7 object-contain" />}
              <Slider className="flex-1" value={[s.size * 100]} min={5} max={60} onValueChange={([v]) => patchSticker(s.id, { size: v / 100 })} />
              <Button size="icon" variant="ghost" aria-label="Remove sticker" onClick={() => onChange({ stickers: settings.stickers.filter((x) => x.id !== s.id) })}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          {settings.stickers.length > 0 && <p className="text-xs text-muted-foreground">Drag stickers on your video to move them.</p>}
        </TabsContent>
      </Tabs>
    </div>
  );
}
