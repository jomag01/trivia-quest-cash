import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Globe, 
  Sparkles, 
  Loader2, 
  Code, 
  Palette, 
  Layout, 
  Eye, 
  Download, 
  Copy, 
  Wand2,
  ShoppingCart,
  Briefcase,
  Camera,
  Utensils,
  GraduationCap,
  Heart,
  Music,
  Dumbbell,
  Home,
  Car,
  Plane,
  BookOpen,
  Lightbulb,
  RefreshCw,
  Smartphone,
  Monitor,
  Tablet,
  ExternalLink,
  FileCode,
  Layers,
  Image
} from "lucide-react";

interface WebsiteBuilderProps {
  userCredits: number;
  onCreditsChange: () => void;
}

const WEBSITE_TEMPLATES = [
  { id: "landing", label: "Landing Page", icon: Lightbulb, description: "Single page with hero, features, CTA" },
  { id: "portfolio", label: "Portfolio", icon: Camera, description: "Showcase your work beautifully" },
  { id: "business", label: "Business", icon: Briefcase, description: "Professional company website" },
  { id: "ecommerce", label: "E-Commerce", icon: ShoppingCart, description: "Online store with products" },
  { id: "restaurant", label: "Restaurant", icon: Utensils, description: "Menu, location, reservations" },
  { id: "education", label: "Education", icon: GraduationCap, description: "Courses and learning platform" },
  { id: "health", label: "Healthcare", icon: Heart, description: "Medical practice or wellness" },
  { id: "fitness", label: "Fitness", icon: Dumbbell, description: "Gym or personal trainer" },
  { id: "realestate", label: "Real Estate", icon: Home, description: "Property listings showcase" },
  { id: "travel", label: "Travel", icon: Plane, description: "Travel agency or blog" },
  { id: "music", label: "Music/Band", icon: Music, description: "Artist or band website" },
  { id: "blog", label: "Blog", icon: BookOpen, description: "Personal or company blog" },
];

const COLOR_SCHEMES = [
  { id: "modern-blue", label: "Modern Blue", colors: ["#3B82F6", "#1E40AF", "#DBEAFE"] },
  { id: "elegant-purple", label: "Elegant Purple", colors: ["#8B5CF6", "#5B21B6", "#EDE9FE"] },
  { id: "fresh-green", label: "Fresh Green", colors: ["#10B981", "#047857", "#D1FAE5"] },
  { id: "warm-orange", label: "Warm Orange", colors: ["#F97316", "#C2410C", "#FFEDD5"] },
  { id: "bold-red", label: "Bold Red", colors: ["#EF4444", "#B91C1C", "#FEE2E2"] },
  { id: "ocean-teal", label: "Ocean Teal", colors: ["#14B8A6", "#0F766E", "#CCFBF1"] },
  { id: "sunset-pink", label: "Sunset Pink", colors: ["#EC4899", "#BE185D", "#FCE7F3"] },
  { id: "midnight-dark", label: "Midnight Dark", colors: ["#1F2937", "#111827", "#F9FAFB"] },
  { id: "forest-sage", label: "Forest Sage", colors: ["#84CC16", "#3F6212", "#ECFCCB"] },
  { id: "royal-indigo", label: "Royal Indigo", colors: ["#6366F1", "#3730A3", "#E0E7FF"] },
];

const STYLE_PRESETS = [
  { id: "minimal", label: "Minimal", description: "Clean, lots of whitespace" },
  { id: "bold", label: "Bold", description: "Strong colors, big typography" },
  { id: "elegant", label: "Elegant", description: "Refined, sophisticated look" },
  { id: "playful", label: "Playful", description: "Fun, vibrant, animated" },
  { id: "corporate", label: "Corporate", description: "Professional, trustworthy" },
  { id: "creative", label: "Creative", description: "Artistic, unique layouts" },
];

export default function WebsiteBuilder({ userCredits, onCreditsChange }: WebsiteBuilderProps) {
  const { user } = useAuth();
  const [activeStep, setActiveStep] = useState<"describe" | "customize" | "preview">("describe");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  
  // Form states
  const [websiteDescription, setWebsiteDescription] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [selectedColorScheme, setSelectedColorScheme] = useState("modern-blue");
  const [selectedStyle, setSelectedStyle] = useState("minimal");
  const [additionalSections, setAdditionalSections] = useState<string[]>([]);
  
  // Generated content
  const [generatedCode, setGeneratedCode] = useState<{html: string; css: string; js: string} | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const creditCost = 10;

  const handleGenerate = async () => {
    if (!websiteDescription.trim()) {
      toast.error("Please describe your website");
      return;
    }
    if (!businessName.trim()) {
      toast.error("Please enter your business/website name");
      return;
    }
    if (userCredits < creditCost) {
      toast.error(`You need at least ${creditCost} credits to generate a website`);
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => Math.min(prev + Math.random() * 15, 90));
      }, 500);

      const colorScheme = COLOR_SCHEMES.find(c => c.id === selectedColorScheme);
      const template = WEBSITE_TEMPLATES.find(t => t.id === selectedTemplate);
      const style = STYLE_PRESETS.find(s => s.id === selectedStyle);

      const prompt = `Create a complete, modern, responsive website with the following specifications:

Business/Website Name: ${businessName}
Description: ${websiteDescription}
Template Type: ${template?.label || "Custom"} - ${template?.description || ""}
Color Scheme: ${colorScheme?.label} with colors ${colorScheme?.colors.join(", ")}
Style: ${style?.label} - ${style?.description}
Additional Sections: ${additionalSections.join(", ") || "Standard sections"}

Requirements:
1. Generate clean, semantic HTML5
2. Create modern CSS with variables for colors
3. Include smooth animations and transitions
4. Make it fully responsive (mobile-first)
5. Add appropriate placeholder content
6. Include a navigation bar, hero section, features/services, about section, and footer
7. Use modern design patterns like cards, gradients, shadows
8. Include hover effects and micro-interactions

Return the code in this exact JSON format:
{
  "html": "complete HTML code",
  "css": "complete CSS code",
  "js": "JavaScript for interactions"
}`;

      const { data, error } = await supabase.functions.invoke('ai-generate', {
        body: {
          type: 'website-builder',
          prompt: prompt,
          businessName,
          template: selectedTemplate,
          colorScheme: selectedColorScheme,
          style: selectedStyle
        }
      });

      clearInterval(progressInterval);

      if (error) throw error;

      if (data?.code) {
        setGeneratedCode(data.code);
        setGenerationProgress(100);
        
        // Create preview blob URL
        const fullHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${businessName}</title>
  <style>${data.code.css}</style>
</head>
<body>
  ${data.code.html}
  <script>${data.code.js}</script>
</body>
</html>`;
        const blob = new Blob([fullHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        
        setActiveStep("preview");
        onCreditsChange();
        toast.success("Website generated successfully!");
      } else {
        throw new Error("No code returned from AI");
      }
    } catch (error: any) {
      console.error("Generation error:", error);
      toast.error(error.message || "Failed to generate website");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyCode = (type: "html" | "css" | "js") => {
    if (!generatedCode) return;
    navigator.clipboard.writeText(generatedCode[type]);
    toast.success(`${type.toUpperCase()} code copied!`);
  };

  const downloadWebsite = () => {
    if (!generatedCode) return;
    
    const fullHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${businessName}</title>
  <style>
${generatedCode.css}
  </style>
</head>
<body>
${generatedCode.html}
  <script>
${generatedCode.js}
  </script>
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${businessName.toLowerCase().replace(/\s+/g, '-')}-website.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Website downloaded!");
  };

  const regenerate = () => {
    setGeneratedCode(null);
    setPreviewUrl(null);
    setActiveStep("describe");
    setGenerationProgress(0);
  };

  const getPreviewWidth = () => {
    switch (previewDevice) {
      case "mobile": return "375px";
      case "tablet": return "768px";
      default: return "100%";
    }
  };

  return (
    <div className="space-y-6">
      {/* Colorful Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 p-6 shadow-xl">
        <div className="absolute inset-0 opacity-20" style={{backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")"}}></div>
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg">
              <Globe className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                AI Website Builder
              </h1>
              <p className="text-white/80 mt-1">
                Create stunning websites with AI in minutes
              </p>
            </div>
          </div>
          <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 gap-2 px-4 py-2 self-start">
            <Sparkles className="h-4 w-4" />
            {creditCost} credits per website
          </Badge>
        </div>
      </div>

      {/* Colorful Progress Steps */}
      <div className="flex items-center gap-2 p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 border border-emerald-500/20">
        {["describe", "customize", "preview"].map((step, index) => (
          <div key={step} className="flex items-center gap-2 flex-1">
            <div 
              className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold transition-all shadow-lg ${
                activeStep === step 
                  ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white scale-110" 
                  : index < ["describe", "customize", "preview"].indexOf(activeStep)
                    ? "bg-gradient-to-br from-green-500 to-emerald-600 text-white"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {index + 1}
            </div>
            <span className={`text-sm capitalize hidden sm:block ${activeStep === step ? "font-bold text-emerald-600" : "text-muted-foreground"}`}>
              {step}
            </span>
            {index < 2 && <div className={`flex-1 h-1 rounded-full mx-2 ${
              index < ["describe", "customize", "preview"].indexOf(activeStep)
                ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                : "bg-muted"
            }`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Describe */}
      {activeStep === "describe" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="bg-gradient-to-br from-card to-emerald-500/5 border-emerald-500/20 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
                  <Wand2 className="h-5 w-5 text-white" />
                </div>
                <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  Describe Your Website
                </span>
              </CardTitle>
              <CardDescription>
                Tell AI what kind of website you want to create
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-emerald-600 font-semibold">Business/Website Name *</Label>
                <Input 
                  value={businessName}
                  onChange={e => setBusinessName(e.target.value)}
                  placeholder="e.g., TechStart Solutions"
                  className="border-emerald-500/30 focus:border-emerald-500 focus:ring-emerald-500/20"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-emerald-600 font-semibold">Describe Your Website *</Label>
                <Textarea 
                  value={websiteDescription}
                  onChange={e => setWebsiteDescription(e.target.value)}
                  placeholder="Describe what your website is about, what products/services you offer, your target audience, and any specific features you want..."
                  rows={5}
                  className="border-emerald-500/30 focus:border-emerald-500 focus:ring-emerald-500/20"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-emerald-600 font-semibold">Template Type</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger className="border-emerald-500/30">
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {WEBSITE_TEMPLATES.map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex items-center gap-2">
                          <template.icon className="h-4 w-4" />
                          <span>{template.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card to-teal-500/5 border-teal-500/20 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600">
                  <Layout className="h-5 w-5 text-white" />
                </div>
                <span className="bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                  Choose Template
                </span>
              </CardTitle>
              <CardDescription>
                Select a template that matches your needs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {WEBSITE_TEMPLATES.map((template, idx) => {
                  const gradients = [
                    'from-emerald-500 to-teal-500',
                    'from-teal-500 to-cyan-500',
                    'from-cyan-500 to-blue-500',
                    'from-blue-500 to-indigo-500',
                    'from-indigo-500 to-purple-500',
                    'from-purple-500 to-pink-500',
                    'from-pink-500 to-rose-500',
                    'from-rose-500 to-red-500',
                    'from-red-500 to-orange-500',
                    'from-orange-500 to-amber-500',
                    'from-amber-500 to-yellow-500',
                    'from-yellow-500 to-lime-500',
                  ];
                  const gradient = gradients[idx % gradients.length];
                  
                  return (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template.id)}
                      className={`p-3 rounded-xl border-2 transition-all text-left hover:scale-105 ${
                        selectedTemplate === template.id
                          ? `border-transparent bg-gradient-to-br ${gradient} text-white shadow-lg`
                          : "border-border hover:border-primary/50 bg-card"
                      }`}
                    >
                      <template.icon className={`h-6 w-6 mb-2 ${
                        selectedTemplate === template.id ? "text-white" : "text-muted-foreground"
                      }`} />
                      <p className={`font-medium text-sm ${selectedTemplate === template.id ? "text-white" : ""}`}>
                        {template.label}
                      </p>
                      <p className={`text-xs mt-0.5 ${selectedTemplate === template.id ? "text-white/80" : "text-muted-foreground"}`}>
                        {template.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2: Customize */}
      {activeStep === "customize" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                Color Scheme
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {COLOR_SCHEMES.map(scheme => (
                  <button
                    key={scheme.id}
                    onClick={() => setSelectedColorScheme(scheme.id)}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      selectedColorScheme === scheme.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex gap-1 mb-2">
                      {scheme.colors.map((color, i) => (
                        <div 
                          key={i}
                          className="w-6 h-6 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <p className="text-sm font-medium">{scheme.label}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                Design Style
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {STYLE_PRESETS.map(style => (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyle(style.id)}
                    className={`p-3 rounded-xl border-2 transition-all text-left ${
                      selectedStyle === style.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <p className="font-medium">{style.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{style.description}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 3: Preview */}
      {activeStep === "preview" && generatedCode && (
        <div className="space-y-4">
          {/* Preview Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant={previewDevice === "desktop" ? "default" : "outline"}
                size="sm"
                onClick={() => setPreviewDevice("desktop")}
              >
                <Monitor className="h-4 w-4" />
              </Button>
              <Button
                variant={previewDevice === "tablet" ? "default" : "outline"}
                size="sm"
                onClick={() => setPreviewDevice("tablet")}
              >
                <Tablet className="h-4 w-4" />
              </Button>
              <Button
                variant={previewDevice === "mobile" ? "default" : "outline"}
                size="sm"
                onClick={() => setPreviewDevice("mobile")}
              >
                <Smartphone className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={regenerate}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate
              </Button>
              <Button onClick={downloadWebsite}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>

          {/* Preview Frame */}
          <Card className="overflow-hidden">
            <div className="bg-muted p-2 border-b flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <div className="flex-1 mx-4">
                <div className="bg-background rounded px-3 py-1 text-xs text-muted-foreground flex items-center gap-2">
                  <Globe className="h-3 w-3" />
                  {businessName.toLowerCase().replace(/\s+/g, '-')}.com
                </div>
              </div>
            </div>
            <div className="flex justify-center bg-muted/50 p-4 min-h-[500px]">
              {previewUrl && (
                <iframe
                  src={previewUrl}
                  className="bg-white rounded-lg shadow-lg transition-all duration-300"
                  style={{ 
                    width: getPreviewWidth(), 
                    height: "600px",
                    maxWidth: "100%"
                  }}
                  title="Website Preview"
                />
              )}
            </div>
          </Card>

          {/* Code Tabs */}
          <Tabs defaultValue="html">
            <TabsList>
              <TabsTrigger value="html" className="gap-2">
                <FileCode className="h-4 w-4" />
                HTML
              </TabsTrigger>
              <TabsTrigger value="css" className="gap-2">
                <Palette className="h-4 w-4" />
                CSS
              </TabsTrigger>
              <TabsTrigger value="js" className="gap-2">
                <Code className="h-4 w-4" />
                JavaScript
              </TabsTrigger>
            </TabsList>
            {["html", "css", "js"].map(type => (
              <TabsContent key={type} value={type}>
                <Card>
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between p-3 border-b">
                      <span className="text-sm font-medium">{type.toUpperCase()}</span>
                      <Button variant="ghost" size="sm" onClick={() => copyCode(type as "html" | "css" | "js")}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </Button>
                    </div>
                    <pre className="p-4 overflow-x-auto text-xs bg-muted/50 max-h-64">
                      <code>{generatedCode[type as keyof typeof generatedCode]}</code>
                    </pre>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-4">
        <Button
          variant="outline"
          onClick={() => {
            if (activeStep === "customize") setActiveStep("describe");
            else if (activeStep === "preview") setActiveStep("customize");
          }}
          disabled={activeStep === "describe" || isGenerating}
        >
          Back
        </Button>
        
        {activeStep === "describe" && (
          <Button onClick={() => setActiveStep("customize")} disabled={!websiteDescription.trim() || !businessName.trim()}>
            Continue to Customize
          </Button>
        )}
        
        {activeStep === "customize" && (
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating ({Math.round(generationProgress)}%)
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Website ({creditCost} credits)
              </>
            )}
          </Button>
        )}
      </div>

      {/* Progress Bar during generation */}
      {isGenerating && (
        <div className="space-y-2">
          <Progress value={generationProgress} className="h-2" />
          <p className="text-sm text-center text-muted-foreground">
            AI is building your website... This may take a moment.
          </p>
        </div>
      )}
    </div>
  );
}
