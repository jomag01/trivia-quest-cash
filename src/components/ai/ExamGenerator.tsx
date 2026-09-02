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
import { ClipboardList, Loader2, Copy, Download, Printer, Sparkles } from "lucide-react";

interface ExamGeneratorProps {
  userCredits: number;
  onCreditsChange: () => void;
}

const CREDIT_COST = 12;

const TERMS = ["1st Term", "2nd Term", "3rd Term"];

const EXAM_TYPES = [
  "Term Examination (Summative)",
  "Midterm Examination",
  "Diagnostic / Pre-Test",
  "Periodical Test",
  "Unit / Chapter Test",
  "Quiz (Short Formative)",
];

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

const ITEM_TYPES = [
  "Multiple Choice",
  "True or False",
  "Matching Type",
  "Identification",
  "Fill in the Blanks",
  "Enumeration",
  "Problem Solving (show solution)",
  "Essay",
  "Situational / Case Analysis",
];

const ITEM_COUNTS = ["20", "25", "30", "40", "50", "60", "75", "100"];

const LANGUAGES = ["English", "Filipino", "Taglish", "Cebuano/Bisaya", "Ilocano", "Hiligaynon", "Bicolano", "Waray", "Kapampangan", "Pangasinense"];

const DISTRIBUTIONS = [
  { label: "Balanced (DepEd typical)", value: "Remembering 15%, Understanding 20%, Applying 25%, Analyzing 20%, Evaluating 10%, Creating 10%" },
  { label: "Lower-order focused (Primary)", value: "Remembering 30%, Understanding 30%, Applying 25%, Analyzing 10%, Evaluating 3%, Creating 2%" },
  { label: "Higher-order focused (SHS)", value: "Remembering 10%, Understanding 15%, Applying 20%, Analyzing 25%, Evaluating 15%, Creating 15%" },
];

export default function ExamGenerator({ userCredits, onCreditsChange }: ExamGeneratorProps) {
  const [term, setTerm] = useState("1st Term");
  const [examType, setExamType] = useState(EXAM_TYPES[0]);
  const [gradeLevel, setGradeLevel] = useState("Grade 7");
  const [subject, setSubject] = useState("English");
  const [topics, setTopics] = useState("");
  const [competencies, setCompetencies] = useState("");
  const [totalItems, setTotalItems] = useState("50");
  const [language, setLanguage] = useState("English");
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["Multiple Choice"]);
  const [bloomsDistribution, setBloomsDistribution] = useState(DISTRIBUTIONS[0].value);
  const [schoolName, setSchoolName] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [includeTOS, setIncludeTOS] = useState(true);
  const [includeAnswerKey, setIncludeAnswerKey] = useState(true);
  const [includeRubric, setIncludeRubric] = useState(true);
  const [includeItemAnalysisSheet, setIncludeItemAnalysisSheet] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [exam, setExam] = useState("");

  const toggleType = (t: string) => {
    setSelectedTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const generate = async () => {
    if (!topics.trim() && !competencies.trim()) {
      toast.error("Enter the topics covered or the learning competencies.");
      return;
    }
    if (selectedTypes.length === 0) {
      toast.error("Select at least one item type.");
      return;
    }
    if (userCredits < CREDIT_COST) {
      toast.error(`Not enough credits. You need ${CREDIT_COST} credits to generate an exam.`);
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("exam-generator", {
        body: {
          term, examType, gradeLevel, subject, topics, competencies,
          totalItems: Number(totalItems), language, itemTypes: selectedTypes,
          bloomsDistribution, includeTOS, includeAnswerKey, includeRubric,
          includeItemAnalysisSheet, schoolName, teacherName,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.exam) {
        setExam(data.exam);
        toast.success("Exam and Table of Specification ready!");
        onCreditsChange();
      } else {
        throw new Error("No exam was returned.");
      }
    } catch (err) {
      console.error("Exam generator error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to generate the exam");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyExam = () => {
    navigator.clipboard.writeText(exam);
    toast.success("Exam copied");
  };

  const downloadExam = () => {
    const blob = new Blob([exam], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${term}-${subject}-${gradeLevel}-exam`.replace(/\s+/g, "-").toLowerCase() + ".md";
    a.click();
    URL.revokeObjectURL(url);
  };

  const printExam = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(
      `<html><head><title>${term} - ${subject} - ${gradeLevel}</title>
      <style>body{font-family:Georgia,serif;padding:32px;line-height:1.6;white-space:pre-wrap;}</style>
      </head><body>${exam.replace(/[<>]/g, (c) => (c === "<" ? "&lt;" : "&gt;"))}</body></html>`
    );
    w.document.close();
    w.print();
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-emerald-500" />
            Exam Generator
            <Badge variant="secondary">3 Terms · with TOS</Badge>
          </CardTitle>
          <CardDescription>
            Generate a complete MATATAG-aligned examination for the 1st, 2nd or 3rd Term — with a Table of
            Specification (content, competency codes, Bloom's cognitive levels, weights and item placement),
            exam items, rubric, answer key and an optional item analysis sheet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Term</Label>
              <Select value={term} onValueChange={setTerm}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TERMS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Exam Type</Label>
              <Select value={examType} onValueChange={setExamType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {EXAM_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
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
          </div>

          <div className="space-y-2">
            <Label>Topics Covered This Term</Label>
            <Textarea
              placeholder="e.g. Parts of Speech, Reading Comprehension Strategies, Types of Sentences, Persuasive Writing"
              value={topics}
              onChange={(e) => setTopics(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Learning Competencies / MATATAG Codes (optional)</Label>
            <Textarea
              placeholder="e.g. EN7LC-I-1, EN7RC-I-2 — one per line or comma separated"
              value={competencies}
              onChange={(e) => setCompetencies(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Total Number of Items</Label>
              <Select value={totalItems} onValueChange={setTotalItems}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ITEM_COUNTS.map((c) => <SelectItem key={c} value={c}>{c} items</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cognitive Level Distribution</Label>
              <Select value={bloomsDistribution} onValueChange={setBloomsDistribution}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DISTRIBUTIONS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {LANGUAGES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>School Name (optional)</Label>
              <Input
                placeholder="e.g. San Isidro National High School"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Teacher Name (optional)</Label>
              <Input
                placeholder="e.g. Ms. Maria Santos"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Item Types</Label>
            <div className="flex flex-wrap gap-2">
              {ITEM_TYPES.map((t) => (
                <Badge
                  key={t}
                  variant={selectedTypes.includes(t) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleType(t)}
                >
                  {t}
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: "Table of Specification (TOS)", value: includeTOS, set: setIncludeTOS },
              { label: "Answer key", value: includeAnswerKey, set: setIncludeAnswerKey },
              { label: "Rubric for essay / performance items", value: includeRubric, set: setIncludeRubric },
              { label: "Item analysis sheet", value: includeItemAnalysisSheet, set: setIncludeItemAnalysisSheet },
            ].map((opt) => (
              <div key={opt.label} className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                <Label className="text-sm font-normal">{opt.label}</Label>
                <Switch checked={opt.value} onCheckedChange={opt.set} />
              </div>
            ))}
          </div>

          <Button onClick={generate} disabled={isGenerating} className="w-full" size="lg">
            {isGenerating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating exam & TOS…</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" /> Generate Exam ({CREDIT_COST} credits)</>
            )}
          </Button>
        </CardContent>
      </Card>

      {exam && (
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-lg">
              {term} {examType} — {subject}, {gradeLevel}
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copyExam}><Copy className="w-4 h-4" /></Button>
              <Button variant="outline" size="sm" onClick={downloadExam}><Download className="w-4 h-4" /></Button>
              <Button variant="outline" size="sm" onClick={printExam}><Printer className="w-4 h-4" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap break-words text-sm leading-relaxed font-sans">
              {exam}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
