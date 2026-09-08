import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Image as ImageIcon, Loader2, Sparkles, Download, Printer, Plus, X, Wand2 } from "lucide-react";

interface TeachingImageMakerProps {
  userCredits: number;
  onCreditsChange: () => void;
}

const CREDIT_COST = 8;

const MATERIAL_TYPES = [
  "Workbook / Module Cover",
  "Poster",
  "Flashcard",
  "Worksheet Header",
  "Story Illustration",
  "Coloring Page",
  "Classroom Rules Chart",
  "Alphabet / Number Chart",
  "Bulletin Board Display",
  "Certificate / Award",
];

const GRADE_LEVELS = [
  "Kindergarten", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6",
  "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12", "ALS",
];

const SUBJECTS = [
  "English", "Filipino", "Mathematics", "Science", "Araling Panlipunan", "MAPEH",
  "ESP / Values", "TLE / EPP", "Reading", "Mother Tongue", "Homeroom",
];

const STYLES = [
  "Cute caricature cartoon",
  "Bold comic caricature",
  "Watercolor storybook",
  "Flat vector cartoon",
  "Chalkboard doodle",
  "Black & white line art (for coloring)",
  "3D clay characters",
];

const PALETTES = [
  "Bright rainbow", "Pastel soft", "Primary bold (red-blue-yellow)",
  "Green nature", "Ocean blue", "Warm sunshine", "Black & white",
];

const LANGUAGES = ["English", "Filipino", "Taglish", "Cebuano", "Ilocano", "Hiligaynon", "Bicol", "Waray"];

const ORIENTATIONS = ["A4 Portrait", "A4 Landscape", "Square", "Long Bond Portrait", "Long Bond Landscape"];

export default function TeachingImageMaker({ userCredits, onCreditsChange }: TeachingImageMakerProps) {
  const [materialType, setMaterialType] = useState(MATERIAL_TYPES[0]);
  const [gradeLevel, setGradeLevel] = useState("Grade 1");
  const [subject, setSubject] = useState("English");
  const [topic, setTopic] = useState("");
  const [language, setLanguage] = useState("English");
  const [style, setStyle] = useState(STYLES[0]);
  const [palette, setPalette] = useState(PALETTES[0]);
  const [orientation, setOrientation] = useState(ORIENTATIONS[0]);
  const [heading, setHeading] = useState("");
  const [subheading, setSubheading] = useState("");
  const [lines, setLines] = useState<string[]>([""]);
  const [footerName, setFooterName] = useState("");
  const [instructions, setInstructions] = useState("");
  const [editInstruction, setEditInstruction] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  const updateLine = (i: number, value: string) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? value : l)));

  const addLine = () => setLines((prev) => (prev.length >= 6 ? prev : [...prev, ""]));
  const removeLine = (i: number) => setLines((prev) => prev.filter((_, idx) => idx !== i));

  const generate = async () => {
    if (!topic.trim() && !heading.trim()) {
      toast.error("Add a topic or a title for the image.");
      return;
    }
    if (userCredits < CREDIT_COST) {
      toast.error(`Not enough credits. You need ${CREDIT_COST} credits to create an image.`);
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("teaching-image", {
        body: {
          materialType, gradeLevel, subject, topic, language, style, palette,
          orientation, heading, subheading, lines, footerName, instructions,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.imageUrl) throw new Error("No image was returned.");

      setImage(data.imageUrl);
      setHistory((prev) => [data.imageUrl, ...prev].slice(0, 8));
      toast.success("Teaching image ready!");
      onCreditsChange();
    } catch (err) {
      console.error("Teaching image error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to create the image");
    } finally {
      setIsGenerating(false);
    }
  };

  const applyEdit = async () => {
    if (!image) return;
    if (!editInstruction.trim()) {
      toast.error("Describe the change you want, e.g. 'change the title to Reading Tracker'.");
      return;
    }
    if (userCredits < CREDIT_COST) {
      toast.error(`Not enough credits. You need ${CREDIT_COST} credits for each change.`);
      return;
    }

    setIsEditing(true);
    try {
      const { data, error } = await supabase.functions.invoke("teaching-image", {
        body: { baseImage: image, editInstruction, language, gradeLevel, orientation },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.imageUrl) throw new Error("No image was returned.");

      setImage(data.imageUrl);
      setHistory((prev) => [data.imageUrl, ...prev].slice(0, 8));
      setEditInstruction("");
      toast.success("Change applied!");
      onCreditsChange();
    } catch (err) {
      console.error("Teaching image edit error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to apply the change");
    } finally {
      setIsEditing(false);
    }
  };

  const fileName = `${materialType}-${subject}-${gradeLevel}`.replace(/[^\w]+/g, "-").toLowerCase();

  const download = () => {
    if (!image) return;
    const a = document.createElement("a");
    a.href = image;
    a.download = `${fileName}.png`;
    a.click();
    toast.success("Image downloaded");
  };

  const print = () => {
    if (!image) return;
    const landscape = orientation.toLowerCase().includes("landscape");
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${heading || topic || "Teaching Material"}</title>
      <style>
        @page { size: A4 ${landscape ? "landscape" : "portrait"}; margin: 8mm; }
        body { margin: 0; display: flex; align-items: center; justify-content: center; }
        img { max-width: 100%; max-height: 100vh; object-fit: contain; }
      </style></head>
      <body><img src="${image}" onload="window.focus();window.print();" /></body></html>`);
    w.document.close();
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-primary" />
            Teaching Image Maker
            <Badge variant="secondary" className="ml-auto">{CREDIT_COST} credits</Badge>
          </CardTitle>
          <CardDescription>
            Create colorful caricature learning materials with your own text — ready to print for the classroom.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Material Type</Label>
              <Select value={materialType} onValueChange={setMaterialType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {MATERIAL_TYPES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Grade Level</Label>
              <Select value={gradeLevel} onValueChange={setGradeLevel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {GRADE_LEVELS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Learning Area</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Language of Text</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {LANGUAGES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Topic / Lesson</Label>
            <Input
              placeholder="e.g. CVC Short Vowel Words, Parts of a Plant, Multiplication Table"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Title on the Image</Label>
              <Input
                placeholder="e.g. Reading Tracker"
                value={heading}
                onChange={(e) => setHeading(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Subtitle (optional)</Label>
              <Input
                placeholder="e.g. in English — CVC"
                value={subheading}
                onChange={(e) => setSubheading(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Text Banners / Lesson Points (optional)</Label>
            <div className="space-y-2">
              {lines.map((line, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    placeholder={`e.g. Short Vowel Words`}
                    value={line}
                    onChange={(e) => updateLine(i, e.target.value)}
                  />
                  {lines.length > 1 && (
                    <Button variant="outline" size="icon" onClick={() => removeLine(i)} title="Remove line">
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {lines.length < 6 && (
              <Button variant="outline" size="sm" onClick={addLine}>
                <Plus className="w-4 h-4 mr-1" /> Add line
              </Button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Art Style</Label>
              <Select value={style} onValueChange={setStyle}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {STYLES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Colors</Label>
              <Select value={palette} onValueChange={setPalette}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {PALETTES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Paper</Label>
              <Select value={orientation} onValueChange={setOrientation}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {ORIENTATIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Teacher / School Name Badge (optional)</Label>
              <Input
                placeholder="e.g. Teacher Keith"
                value={footerName}
                onChange={(e) => setFooterName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Extra Instructions (optional)</Label>
              <Textarea
                placeholder="e.g. include a boy and a girl reading books, add a rainbow border"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <Button onClick={generate} disabled={isGenerating} className="w-full" size="lg">
            {isGenerating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating image…</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" /> Create Teaching Image ({CREDIT_COST} credits)</>
            )}
          </Button>
        </CardContent>
      </Card>

      {image && (
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
            <div>
              <CardTitle className="text-lg">{heading || topic || materialType}</CardTitle>
              <CardDescription>{materialType} · {gradeLevel} · {orientation}</CardDescription>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={download} title="Download image">
                <Download className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={print} title="Print">
                <Printer className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-lg border border-border bg-muted/30 p-3 sm:p-5">
              <img
                src={image}
                alt={`${materialType} for ${gradeLevel} ${subject}${topic ? ` about ${topic}` : ""}`}
                className="mx-auto max-h-[70vh] w-auto rounded-md shadow-sm"
                loading="lazy"
              />
            </div>

            <div className="space-y-2">
              <Label>Change something in the image</Label>
              <Textarea
                placeholder="e.g. change the title to 'Reading Tracker', make the letters bigger, add a smiling star, remove the rainbow, translate the banners to Filipino"
                value={editInstruction}
                onChange={(e) => setEditInstruction(e.target.value)}
                rows={2}
              />
              <Button onClick={applyEdit} disabled={isEditing} className="w-full">
                {isEditing ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Applying change…</>
                ) : (
                  <><Wand2 className="w-4 h-4 mr-2" /> Apply Change ({CREDIT_COST} credits)</>
                )}
              </Button>
            </div>

            {history.length > 1 && (
              <div className="space-y-2">
                <Label>Previous versions</Label>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {history.map((h, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setImage(h)}
                      className={`shrink-0 rounded-md border-2 p-0.5 ${h === image ? "border-primary" : "border-border"}`}
                      title={i === 0 ? "Latest" : `Version ${history.length - i}`}
                    >
                      <img src={h} alt={`Version ${history.length - i}`} className="h-20 w-auto rounded" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
