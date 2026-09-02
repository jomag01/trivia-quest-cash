import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GraduationCap, Loader2, Copy, Download, Printer, Sparkles } from "lucide-react";

interface LessonPlanGeneratorProps {
  userCredits: number;
  onCreditsChange: () => void;
}

const CREDIT_COST = 10;

const GRADE_LEVELS = [
  "Kindergarten", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6",
  "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12", "ALS",
];

const SUBJECTS = [
  "Filipino", "English", "Mathematics", "Science", "Araling Panlipunan",
  "Edukasyon sa Pagpapakatao (ESP)", "MAPEH", "Music", "Arts", "Physical Education", "Health",
  "TLE / TVL", "Mother Tongue (MTB-MLE)", "Makabansa", "Good Manners and Right Conduct (GMRC)",
  "Reading and Literacy", "Homeroom Guidance", "Media and Information Literacy",
  "Earth and Life Science", "General Mathematics", "Statistics and Probability",
  "Practical Research", "Empowerment Technologies", "Personal Development",
];

const QUARTERS = ["1st Quarter", "2nd Quarter", "3rd Quarter", "4th Quarter"];

const STRATEGIES = [
  "4As (Activity, Analysis, Abstraction, Application)",
  "7Es (Elicit, Engage, Explore, Explain, Elaborate, Evaluate, Extend)",
  "5Es (Engage, Explore, Explain, Elaborate, Evaluate)",
  "Inquiry-Based Learning",
  "Collaborative / Cooperative Learning",
  "Differentiated Instruction",
  "Problem-Based Learning",
  "Gamified Lesson",
];

const LANGUAGES = ["English", "Filipino", "Taglish", "Cebuano/Bisaya", "Ilocano", "Hiligaynon", "Bicolano", "Waray", "Kapampangan", "Pangasinense"];

const DURATIONS = ["30 minutes", "40 minutes", "50 minutes", "60 minutes", "80 minutes", "90 minutes", "Whole week (5 days)"];

const CORE_VALUES = [
  "Maka-Diyos", "Makatao", "Makakalikasan", "Makabansa",
  "Integrity", "Excellence", "Bayanihan", "Resilience", "Respect",
];

export default function LessonPlanGenerator({ userCredits, onCreditsChange }: LessonPlanGeneratorProps) {
  const [format, setFormat] = useState("ILAW");
  const [gradeLevel, setGradeLevel] = useState("Grade 7");
  const [subject, setSubject] = useState("English");
  const [quarter, setQuarter] = useState("1st Quarter");
  const [topic, setTopic] = useState("");
  const [competency, setCompetency] = useState("");
  const [duration, setDuration] = useState("60 minutes");
  const [strategy, setStrategy] = useState(STRATEGIES[0]);
  const [language, setLanguage] = useState("English");
  const [values, setValues] = useState("Makatao");
  const [learners, setLearners] = useState("");
  const [materials, setMaterials] = useState("");
  const [includeIMs, setIncludeIMs] = useState(true);
  const [includeDifferentiation, setIncludeDifferentiation] = useState(true);
  const [includeAssessment, setIncludeAssessment] = useState(true);
  const [includeHomework, setIncludeHomework] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lessonPlan, setLessonPlan] = useState("");

  const generate = async () => {
    if (!topic.trim() && !competency.trim()) {
      toast.error("Enter a topic or a learning competency (MELC).");
      return;
    }
    if (userCredits < CREDIT_COST) {
      toast.error(`Not enough credits. You need ${CREDIT_COST} credits to generate a lesson plan.`);
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("lesson-plan-generator", {
        body: {
          format, gradeLevel, subject, quarter, topic, competency, duration,
          strategy, language, values, learners, materials,
          includeIMs, includeDifferentiation, includeAssessment, includeHomework,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.lessonPlan) {
        setLessonPlan(data.lessonPlan);
        toast.success("Lesson plan ready!");
        onCreditsChange();
      } else {
        throw new Error("No lesson plan was returned.");
      }
    } catch (err) {
      console.error("Lesson plan error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to generate lesson plan");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyPlan = () => {
    navigator.clipboard.writeText(lessonPlan);
    toast.success("Lesson plan copied");
  };

  const downloadPlan = () => {
    const blob = new Blob([lessonPlan], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${format}-${subject}-${gradeLevel}`.replace(/\s+/g, "-").toLowerCase() + ".md";
    a.click();
    URL.revokeObjectURL(url);
  };

  const printPlan = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(
      `<html><head><title>${format} - ${subject} - ${gradeLevel}</title>
      <style>body{font-family:Georgia,serif;padding:32px;line-height:1.6;white-space:pre-wrap;}</style>
      </head><body>${lessonPlan.replace(/[<>]/g, (c) => (c === "<" ? "&lt;" : "&gt;"))}</body></html>`
    );
    w.document.close();
    w.print();
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-emerald-500" />
            Teacher's Lesson Plan Generator
            <Badge variant="secondary">MATATAG · ILAW Ready</Badge>
          </CardTitle>
          <CardDescription>
            Generate lesson plans aligned with the ILAW Framework (Intentions, Learning Experience, Assessing
            Learning, Ways Forward) under DepEd Order No. 016, s. 2026 — with MATATAG curriculum codes, values
            integration, differentiated activities, assessments and rubrics. Legacy DLP/DLL formats are also
            available (allowed until end of Term 1, SY 2026–2027).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Plan Format</Label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ILAW">ILAW Lesson Plan (MATATAG · DO 016, s. 2026)</SelectItem>
                  <SelectItem value="ILAW-WEEKLY">ILAW — Weekly (5 sessions)</SelectItem>
                  <SelectItem value="DLP">Legacy: Detailed Lesson Plan (DLP)</SelectItem>
                  <SelectItem value="DLL">Legacy: Daily Lesson Log (DLL)</SelectItem>
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
              <Label>Quarter</Label>
              <Select value={quarter} onValueChange={setQuarter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {QUARTERS.map((q) => <SelectItem key={q} value={q}>{q}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Lesson Topic</Label>
            <Input
              placeholder="e.g. Pagsulat ng Talumpati, Photosynthesis, Quadratic Equations"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Learning Competency / MATATAG Code (optional)</Label>
            <Textarea
              placeholder="e.g. EN7RC-I-1: Use predictive and anticipatory devices to activate prior knowledge…"
              value={competency}
              onChange={(e) => setCompetency(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Teaching Strategy</Label>
              <Select value={strategy} onValueChange={setStrategy}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {STRATEGIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Class Duration</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DURATIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Language of Instruction</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {LANGUAGES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Values Integration</Label>
              <Select value={values} onValueChange={setValues}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {CORE_VALUES.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Class Profile (optional)</Label>
              <Textarea
                placeholder="e.g. 48 learners, mixed abilities, 6 struggling readers, no projector"
                value={learners}
                onChange={(e) => setLearners(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Available Materials (optional)</Label>
              <Textarea
                placeholder="e.g. chalkboard, manila paper, cartolina, printed handouts, TV"
                value={materials}
                onChange={(e) => setMaterials(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: "Improvised instructional materials", value: includeIMs, set: setIncludeIMs },
              { label: "Differentiated instruction", value: includeDifferentiation, set: setIncludeDifferentiation },
              { label: "Assessment + answer key & rubric", value: includeAssessment, set: setIncludeAssessment },
              { label: "Assignment / Agreement", value: includeHomework, set: setIncludeHomework },
            ].map((opt) => (
              <div key={opt.label} className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                <Label className="text-sm font-normal">{opt.label}</Label>
                <Switch checked={opt.value} onCheckedChange={opt.set} />
              </div>
            ))}
          </div>

          <Button onClick={generate} disabled={isGenerating} className="w-full" size="lg">
            {isGenerating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating lesson plan…</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" /> Generate Lesson Plan ({CREDIT_COST} credits)</>
            )}
          </Button>
        </CardContent>
      </Card>

      {lessonPlan && (
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-lg">
              {format} — {subject}, {gradeLevel}
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copyPlan}><Copy className="w-4 h-4" /></Button>
              <Button variant="outline" size="sm" onClick={downloadPlan}><Download className="w-4 h-4" /></Button>
              <Button variant="outline" size="sm" onClick={printPlan}><Printer className="w-4 h-4" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap break-words text-sm leading-relaxed font-sans">
              {lessonPlan}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
