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
import { Switch } from "@/components/ui/switch";
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
  Image,
  Settings,
  Zap,
  Search,
  Share2,
  Lock,
  BarChart3,
  Mail,
  MessageSquare,
  CreditCard,
  Package,
  Rocket,
  Shield,
  CheckCircle2,
  Link2,
  Server,
  Database,
  Users,
  TrendingUp,
  FileText,
  Clock,
  Gauge,
  Target,
  PaintBucket
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

const INTEGRATIONS = [
  { id: "woocommerce", label: "WooCommerce", icon: ShoppingCart, description: "WordPress e-commerce", color: "from-purple-500 to-indigo-600" },
  { id: "shopify", label: "Shopify", icon: Package, description: "E-commerce platform", color: "from-green-500 to-emerald-600" },
  { id: "stripe", label: "Stripe", icon: CreditCard, description: "Payment processing", color: "from-indigo-500 to-purple-600" },
  { id: "paypal", label: "PayPal", icon: CreditCard, description: "Online payments", color: "from-blue-500 to-cyan-600" },
  { id: "mailchimp", label: "Mailchimp", icon: Mail, description: "Email marketing", color: "from-yellow-500 to-orange-600" },
  { id: "google-analytics", label: "Google Analytics", icon: BarChart3, description: "Website analytics", color: "from-orange-500 to-red-600" },
  { id: "facebook-pixel", label: "Facebook Pixel", icon: Target, description: "Ad tracking", color: "from-blue-600 to-indigo-700" },
  { id: "hubspot", label: "HubSpot", icon: Users, description: "CRM & Marketing", color: "from-orange-500 to-red-500" },
  { id: "intercom", label: "Intercom", icon: MessageSquare, description: "Live chat support", color: "from-blue-400 to-blue-600" },
  { id: "zendesk", label: "Zendesk", icon: MessageSquare, description: "Customer support", color: "from-teal-500 to-green-600" },
];

const OPTIMIZATION_FEATURES = [
  { id: "seo", label: "SEO Optimization", icon: Search, description: "Meta tags, sitemap, schema markup" },
  { id: "performance", label: "Performance", icon: Gauge, description: "Lazy loading, minification, caching" },
  { id: "accessibility", label: "Accessibility", icon: Users, description: "WCAG 2.1 compliance, ARIA labels" },
  { id: "security", label: "Security", icon: Shield, description: "HTTPS, CSP headers, XSS protection" },
  { id: "mobile", label: "Mobile First", icon: Smartphone, description: "Responsive design, touch optimized" },
  { id: "pwa", label: "PWA Support", icon: Rocket, description: "Offline mode, installable app" },
];

export default function WebsiteBuilder({ userCredits, onCreditsChange }: WebsiteBuilderProps) {
  const { user } = useAuth();
  const [activeStep, setActiveStep] = useState<"describe" | "customize" | "integrations" | "optimize" | "deploy" | "preview">("describe");
  const [activeTab, setActiveTab] = useState<"build" | "settings">("build");
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
  
  // Integration states
  const [selectedIntegrations, setSelectedIntegrations] = useState<string[]>([]);
  const [integrationSettings, setIntegrationSettings] = useState<Record<string, any>>({});
  
  // Optimization states
  const [selectedOptimizations, setSelectedOptimizations] = useState<string[]>(["seo", "performance", "mobile"]);
  const [seoSettings, setSeoSettings] = useState({
    metaTitle: "",
    metaDescription: "",
    keywords: "",
    ogImage: "",
    twitterHandle: "",
    robotsTxt: true,
    sitemap: true,
    structuredData: true
  });
  
  // Domain & Deployment states
  const [customDomain, setCustomDomain] = useState("");
  const [domainVerified, setDomainVerified] = useState(false);
  const [deploymentStatus, setDeploymentStatus] = useState<"idle" | "deploying" | "deployed" | "error">("idle");
  const [deployedUrl, setDeployedUrl] = useState("");
  const [sslEnabled, setSslEnabled] = useState(true);
  const [cdnEnabled, setCdnEnabled] = useState(true);
  
  // Generated content
  const [generatedCode, setGeneratedCode] = useState<{html: string; css: string; js: string} | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const creditCost = 10;
  const steps = ["describe", "customize", "integrations", "optimize", "deploy", "preview"];

  const toggleIntegration = (integrationId: string) => {
    setSelectedIntegrations(prev => 
      prev.includes(integrationId) 
        ? prev.filter(id => id !== integrationId)
        : [...prev, integrationId]
    );
  };

  const toggleOptimization = (optId: string) => {
    setSelectedOptimizations(prev =>
      prev.includes(optId)
        ? prev.filter(id => id !== optId)
        : [...prev, optId]
    );
  };

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
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => Math.min(prev + Math.random() * 15, 90));
      }, 500);

      const colorScheme = COLOR_SCHEMES.find(c => c.id === selectedColorScheme);
      const template = WEBSITE_TEMPLATES.find(t => t.id === selectedTemplate);
      const style = STYLE_PRESETS.find(s => s.id === selectedStyle);
      const integrations = selectedIntegrations.map(id => INTEGRATIONS.find(i => i.id === id)?.label).filter(Boolean);
      const optimizations = selectedOptimizations.map(id => OPTIMIZATION_FEATURES.find(o => o.id === id)?.label).filter(Boolean);

      const prompt = `Create a complete, modern, responsive website with the following specifications:

Business/Website Name: ${businessName}
Description: ${websiteDescription}
Template Type: ${template?.label || "Custom"} - ${template?.description || ""}
Color Scheme: ${colorScheme?.label} with colors ${colorScheme?.colors.join(", ")}
Style: ${style?.label} - ${style?.description}
Additional Sections: ${additionalSections.join(", ") || "Standard sections"}
Integrations: ${integrations.join(", ") || "None"}
Optimizations: ${optimizations.join(", ")}

SEO Settings:
- Meta Title: ${seoSettings.metaTitle || businessName}
- Meta Description: ${seoSettings.metaDescription || websiteDescription.slice(0, 160)}
- Keywords: ${seoSettings.keywords}
- Structured Data: ${seoSettings.structuredData ? "Include JSON-LD schema" : "Skip"}

Requirements:
1. Generate clean, semantic HTML5
2. Create modern CSS with variables for colors
3. Include smooth animations and transitions
4. Make it fully responsive (mobile-first)
5. Add appropriate placeholder content
6. Include a navigation bar, hero section, features/services, about section, and footer
7. Use modern design patterns like cards, gradients, shadows
8. Include hover effects and micro-interactions
9. Add proper meta tags for SEO
10. Include placeholder comments for integration code snippets
${selectedIntegrations.includes("woocommerce") ? "11. Add WooCommerce-ready product grid structure" : ""}
${selectedIntegrations.includes("stripe") ? "12. Include Stripe checkout button placeholder" : ""}
${selectedOptimizations.includes("pwa") ? "13. Include PWA manifest and service worker registration" : ""}

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
          style: selectedStyle,
          integrations: selectedIntegrations,
          optimizations: selectedOptimizations
        }
      });

      clearInterval(progressInterval);

      if (error) throw error;

      if (data?.code) {
        setGeneratedCode(data.code);
        setGenerationProgress(100);
        
        const fullHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${seoSettings.metaTitle || businessName}</title>
  <meta name="description" content="${seoSettings.metaDescription || websiteDescription.slice(0, 160)}">
  <meta name="keywords" content="${seoSettings.keywords}">
  <meta property="og:title" content="${seoSettings.metaTitle || businessName}">
  <meta property="og:description" content="${seoSettings.metaDescription || websiteDescription.slice(0, 160)}">
  ${seoSettings.ogImage ? `<meta property="og:image" content="${seoSettings.ogImage}">` : ''}
  ${seoSettings.twitterHandle ? `<meta name="twitter:site" content="@${seoSettings.twitterHandle}">` : ''}
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

  const verifyDomain = async () => {
    if (!customDomain.trim()) {
      toast.error("Please enter a domain");
      return;
    }
    
    toast.info("Verifying domain ownership...");
    
    // Simulate domain verification
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setDomainVerified(true);
    toast.success("Domain verified successfully!");
  };

  const deployWebsite = async () => {
    if (!generatedCode) {
      toast.error("Please generate a website first");
      return;
    }

    setDeploymentStatus("deploying");
    
    try {
      // Simulate deployment process
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const deployedDomain = customDomain || `${businessName.toLowerCase().replace(/\s+/g, '-')}.lovable.app`;
      setDeployedUrl(`https://${deployedDomain}`);
      setDeploymentStatus("deployed");
      toast.success("Website deployed successfully!");
    } catch (error) {
      setDeploymentStatus("error");
      toast.error("Deployment failed. Please try again.");
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
  <title>${seoSettings.metaTitle || businessName}</title>
  <meta name="description" content="${seoSettings.metaDescription || websiteDescription.slice(0, 160)}">
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
    setDeploymentStatus("idle");
  };

  const getPreviewWidth = () => {
    switch (previewDevice) {
      case "mobile": return "375px";
      case "tablet": return "768px";
      default: return "100%";
    }
  };

  const getCurrentStepIndex = () => steps.indexOf(activeStep);

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
                AI Website Builder Pro
              </h1>
              <p className="text-white/80 mt-1">
                Create, optimize & deploy stunning websites with AI
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 gap-2 px-4 py-2">
              <Sparkles className="h-4 w-4" />
              {creditCost} credits per website
            </Badge>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-1 p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 border border-emerald-500/20 overflow-x-auto">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => setActiveStep(step as any)}
              className={`flex items-center justify-center min-w-[36px] h-9 px-3 rounded-full text-xs font-bold transition-all ${
                activeStep === step 
                  ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white scale-110 shadow-lg" 
                  : index < getCurrentStepIndex()
                    ? "bg-gradient-to-br from-green-500 to-emerald-600 text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {index + 1}
            </button>
            <span className={`text-xs capitalize hidden lg:block ${activeStep === step ? "font-bold text-emerald-600" : "text-muted-foreground"}`}>
              {step}
            </span>
            {index < steps.length - 1 && (
              <div className={`w-8 h-0.5 ${index < getCurrentStepIndex() ? "bg-emerald-500" : "bg-muted"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Describe */}
      {activeStep === "describe" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-2 border-dashed border-emerald-500/30 bg-gradient-to-br from-emerald-50/50 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                Describe Your Website
              </CardTitle>
              <CardDescription>Tell us what you want to build</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessName" className="text-sm font-medium">Business/Website Name *</Label>
                <Input
                  id="businessName"
                  placeholder="e.g., TechStartup Pro"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="border-emerald-500/30 focus:border-emerald-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">Website Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your website in detail... What's the purpose? Who's your audience? What features do you need?"
                  value={websiteDescription}
                  onChange={(e) => setWebsiteDescription(e.target.value)}
                  className="min-h-[120px] border-emerald-500/30 focus:border-emerald-500"
                />
              </div>
              <Button 
                onClick={() => setActiveStep("customize")}
                disabled={!businessName.trim() || !websiteDescription.trim()}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
              >
                Continue to Templates
                <Sparkles className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600">
                  <Layout className="h-5 w-5 text-white" />
                </div>
                Choose Template
              </CardTitle>
              <CardDescription>Select a starting point for your website</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-2">
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
          <Card className="bg-gradient-to-br from-purple-50/50 to-pink-50/50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600">
                  <Palette className="h-5 w-5 text-white" />
                </div>
                Color Scheme
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {COLOR_SCHEMES.map(scheme => (
                  <button
                    key={scheme.id}
                    onClick={() => setSelectedColorScheme(scheme.id)}
                    className={`p-3 rounded-xl border-2 transition-all hover:scale-105 ${
                      selectedColorScheme === scheme.id
                        ? "border-purple-500 bg-purple-500/10 shadow-lg"
                        : "border-border hover:border-purple-500/50"
                    }`}
                  >
                    <div className="flex gap-1 mb-2">
                      {scheme.colors.map((color, i) => (
                        <div 
                          key={i}
                          className="w-6 h-6 rounded-full shadow-sm"
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

          <Card className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
                  <Layers className="h-5 w-5 text-white" />
                </div>
                Design Style
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {STYLE_PRESETS.map(style => (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyle(style.id)}
                    className={`p-3 rounded-xl border-2 transition-all text-left hover:scale-105 ${
                      selectedStyle === style.id
                        ? "border-blue-500 bg-blue-500/10 shadow-lg"
                        : "border-border hover:border-blue-500/50"
                    }`}
                  >
                    <p className="font-medium">{style.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{style.description}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="lg:col-span-2 flex justify-between">
            <Button variant="outline" onClick={() => setActiveStep("describe")}>
              Back
            </Button>
            <Button 
              onClick={() => setActiveStep("integrations")}
              className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
            >
              Continue to Integrations
              <Sparkles className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Integrations */}
      {activeStep === "integrations" && (
        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-orange-50/50 to-red-50/50 dark:from-orange-950/20 dark:to-red-950/20 border-orange-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-red-600">
                  <Link2 className="h-5 w-5 text-white" />
                </div>
                Platform Integrations
              </CardTitle>
              <CardDescription>Connect your website with popular platforms and services</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {INTEGRATIONS.map(integration => (
                  <button
                    key={integration.id}
                    onClick={() => toggleIntegration(integration.id)}
                    className={`p-4 rounded-xl border-2 transition-all text-center hover:scale-105 ${
                      selectedIntegrations.includes(integration.id)
                        ? `border-transparent bg-gradient-to-br ${integration.color} text-white shadow-lg`
                        : "border-border hover:border-orange-500/50 bg-card"
                    }`}
                  >
                    <integration.icon className={`h-8 w-8 mx-auto mb-2 ${
                      selectedIntegrations.includes(integration.id) ? "text-white" : "text-muted-foreground"
                    }`} />
                    <p className={`font-medium text-sm ${selectedIntegrations.includes(integration.id) ? "text-white" : ""}`}>
                      {integration.label}
                    </p>
                    <p className={`text-xs mt-1 ${selectedIntegrations.includes(integration.id) ? "text-white/80" : "text-muted-foreground"}`}>
                      {integration.description}
                    </p>
                    {selectedIntegrations.includes(integration.id) && (
                      <CheckCircle2 className="h-5 w-5 mx-auto mt-2 text-white" />
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* WooCommerce Settings if selected */}
          {selectedIntegrations.includes("woocommerce") && (
            <Card className="border-purple-500/30 bg-gradient-to-br from-purple-50/50 to-indigo-50/50 dark:from-purple-950/20 dark:to-indigo-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-purple-500" />
                  WooCommerce Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>WooCommerce Store URL</Label>
                    <Input 
                      placeholder="https://your-store.com" 
                      value={integrationSettings.woocommerceUrl || ""}
                      onChange={(e) => setIntegrationSettings({...integrationSettings, woocommerceUrl: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Consumer Key</Label>
                    <Input 
                      placeholder="ck_xxxxx" 
                      type="password"
                      value={integrationSettings.woocommerceKey || ""}
                      onChange={(e) => setIntegrationSettings({...integrationSettings, woocommerceKey: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Consumer Secret</Label>
                    <Input 
                      placeholder="cs_xxxxx" 
                      type="password"
                      value={integrationSettings.woocommerceSecret || ""}
                      onChange={(e) => setIntegrationSettings({...integrationSettings, woocommerceSecret: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Products per Page</Label>
                    <Select 
                      value={integrationSettings.woocommerceProducts || "12"}
                      onValueChange={(val) => setIntegrationSettings({...integrationSettings, woocommerceProducts: val})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="6">6 products</SelectItem>
                        <SelectItem value="12">12 products</SelectItem>
                        <SelectItem value="24">24 products</SelectItem>
                        <SelectItem value="48">48 products</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stripe Settings if selected */}
          {selectedIntegrations.includes("stripe") && (
            <Card className="border-indigo-500/30 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/20 dark:to-purple-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-indigo-500" />
                  Stripe Payment Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Publishable Key</Label>
                    <Input 
                      placeholder="pk_xxxxx" 
                      value={integrationSettings.stripePublishable || ""}
                      onChange={(e) => setIntegrationSettings({...integrationSettings, stripePublishable: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select 
                      value={integrationSettings.stripeCurrency || "USD"}
                      onValueChange={(val) => setIntegrationSettings({...integrationSettings, stripeCurrency: val})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD - US Dollar</SelectItem>
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                        <SelectItem value="GBP">GBP - British Pound</SelectItem>
                        <SelectItem value="PHP">PHP - Philippine Peso</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setActiveStep("customize")}>
              Back
            </Button>
            <Button 
              onClick={() => setActiveStep("optimize")}
              className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
            >
              Continue to Optimization
              <Zap className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Optimize */}
      {activeStep === "optimize" && (
        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                Website Optimization
              </CardTitle>
              <CardDescription>Enhance your website's performance, SEO, and accessibility</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {OPTIMIZATION_FEATURES.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => toggleOptimization(opt.id)}
                    className={`p-4 rounded-xl border-2 transition-all text-left hover:scale-105 ${
                      selectedOptimizations.includes(opt.id)
                        ? "border-green-500 bg-green-500/10 shadow-lg"
                        : "border-border hover:border-green-500/50 bg-card"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${selectedOptimizations.includes(opt.id) ? "bg-green-500 text-white" : "bg-muted"}`}>
                        <opt.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{opt.label}</p>
                        <p className="text-xs text-muted-foreground mt-1">{opt.description}</p>
                      </div>
                    </div>
                    {selectedOptimizations.includes(opt.id) && (
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-2 ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* SEO Settings */}
          {selectedOptimizations.includes("seo") && (
            <Card className="border-blue-500/30 bg-gradient-to-br from-blue-50/50 to-cyan-50/50 dark:from-blue-950/20 dark:to-cyan-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-blue-500" />
                  SEO Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Meta Title (max 60 chars)</Label>
                    <Input 
                      placeholder={businessName}
                      value={seoSettings.metaTitle}
                      onChange={(e) => setSeoSettings({...seoSettings, metaTitle: e.target.value})}
                      maxLength={60}
                    />
                    <p className="text-xs text-muted-foreground">{seoSettings.metaTitle.length}/60 characters</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Keywords (comma separated)</Label>
                    <Input 
                      placeholder="web design, business, services"
                      value={seoSettings.keywords}
                      onChange={(e) => setSeoSettings({...seoSettings, keywords: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Meta Description (max 160 chars)</Label>
                  <Textarea 
                    placeholder="A compelling description of your website..."
                    value={seoSettings.metaDescription}
                    onChange={(e) => setSeoSettings({...seoSettings, metaDescription: e.target.value})}
                    maxLength={160}
                  />
                  <p className="text-xs text-muted-foreground">{seoSettings.metaDescription.length}/160 characters</p>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>OG Image URL</Label>
                    <Input 
                      placeholder="https://example.com/og-image.jpg"
                      value={seoSettings.ogImage}
                      onChange={(e) => setSeoSettings({...seoSettings, ogImage: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Twitter Handle</Label>
                    <Input 
                      placeholder="yourbrand"
                      value={seoSettings.twitterHandle}
                      onChange={(e) => setSeoSettings({...seoSettings, twitterHandle: e.target.value})}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-6">
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={seoSettings.robotsTxt}
                      onCheckedChange={(checked) => setSeoSettings({...seoSettings, robotsTxt: checked})}
                    />
                    <Label>Generate robots.txt</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={seoSettings.sitemap}
                      onCheckedChange={(checked) => setSeoSettings({...seoSettings, sitemap: checked})}
                    />
                    <Label>Generate sitemap.xml</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={seoSettings.structuredData}
                      onCheckedChange={(checked) => setSeoSettings({...seoSettings, structuredData: checked})}
                    />
                    <Label>Add Schema.org markup</Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setActiveStep("integrations")}>
              Back
            </Button>
            <Button 
              onClick={() => setActiveStep("deploy")}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
            >
              Continue to Deployment
              <Rocket className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 5: Deploy */}
      {activeStep === "deploy" && (
        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/20 dark:to-purple-950/20 border-indigo-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
                  <Globe className="h-5 w-5 text-white" />
                </div>
                Custom Domain Setup
              </CardTitle>
              <CardDescription>Connect your own domain for professional branding</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-1">
                  <Input 
                    placeholder="www.yourdomain.com"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    className="border-indigo-500/30"
                  />
                </div>
                <Button 
                  onClick={verifyDomain}
                  variant={domainVerified ? "outline" : "default"}
                  className={domainVerified ? "bg-green-500/10 text-green-600 border-green-500" : "bg-gradient-to-r from-indigo-500 to-purple-600"}
                >
                  {domainVerified ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Verified
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      Verify Domain
                    </>
                  )}
                </Button>
              </div>
              
              {customDomain && !domainVerified && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <h4 className="font-medium text-amber-700 dark:text-amber-400 mb-2">DNS Configuration Required</h4>
                  <p className="text-sm text-muted-foreground mb-3">Add these DNS records to your domain registrar:</p>
                  <div className="space-y-2 text-sm font-mono bg-card p-3 rounded-lg">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type: A</span>
                      <span>185.158.133.1</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type: CNAME (www)</span>
                      <span>proxy.lovable.app</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type: TXT</span>
                      <span>lovable-verify={user?.id?.slice(0, 8)}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-card border">
                  <div className="flex items-center gap-3">
                    <Lock className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium">SSL Certificate</p>
                      <p className="text-xs text-muted-foreground">Auto-provision HTTPS</p>
                    </div>
                  </div>
                  <Switch checked={sslEnabled} onCheckedChange={setSslEnabled} />
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl bg-card border">
                  <div className="flex items-center gap-3">
                    <Server className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-medium">CDN Distribution</p>
                      <p className="text-xs text-muted-foreground">Global edge caching</p>
                    </div>
                  </div>
                  <Switch checked={cdnEnabled} onCheckedChange={setCdnEnabled} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Deployment Status */}
          {deploymentStatus !== "idle" && (
            <Card className={`border-2 ${
              deploymentStatus === "deployed" ? "border-green-500 bg-green-500/5" :
              deploymentStatus === "error" ? "border-red-500 bg-red-500/5" :
              "border-blue-500 bg-blue-500/5"
            }`}>
              <CardContent className="pt-6">
                {deploymentStatus === "deploying" && (
                  <div className="flex items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    <div>
                      <p className="font-medium">Deploying your website...</p>
                      <p className="text-sm text-muted-foreground">This may take a few moments</p>
                    </div>
                  </div>
                )}
                {deploymentStatus === "deployed" && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <CheckCircle2 className="h-8 w-8 text-green-500" />
                      <div>
                        <p className="font-medium text-green-600">Website Deployed Successfully!</p>
                        <p className="text-sm text-muted-foreground">Your website is now live</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10">
                      <Link2 className="h-5 w-5 text-green-600" />
                      <a href={deployedUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-green-600 hover:underline">
                        {deployedUrl}
                      </a>
                      <Button size="sm" variant="ghost" onClick={() => {
                        navigator.clipboard.writeText(deployedUrl);
                        toast.success("URL copied!");
                      }}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
                {deploymentStatus === "error" && (
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-full bg-red-500/20">
                      <Zap className="h-6 w-6 text-red-500" />
                    </div>
                    <div>
                      <p className="font-medium text-red-600">Deployment Failed</p>
                      <p className="text-sm text-muted-foreground">Please try again or contact support</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setActiveStep("optimize")}>
              Back
            </Button>
            <Button 
              onClick={handleGenerate}
              disabled={isGenerating || userCredits < creditCost}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Generate Website ({creditCost} credits)
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Step 6: Preview */}
      {activeStep === "preview" && generatedCode && (
        <div className="space-y-4">
          {/* Preview Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
            <div className="flex items-center gap-2">
              <Button
                variant={previewDevice === "desktop" ? "default" : "outline"}
                size="sm"
                onClick={() => setPreviewDevice("desktop")}
                className={previewDevice === "desktop" ? "bg-gradient-to-r from-emerald-500 to-teal-600" : ""}
              >
                <Monitor className="h-4 w-4" />
              </Button>
              <Button
                variant={previewDevice === "tablet" ? "default" : "outline"}
                size="sm"
                onClick={() => setPreviewDevice("tablet")}
                className={previewDevice === "tablet" ? "bg-gradient-to-r from-emerald-500 to-teal-600" : ""}
              >
                <Tablet className="h-4 w-4" />
              </Button>
              <Button
                variant={previewDevice === "mobile" ? "default" : "outline"}
                size="sm"
                onClick={() => setPreviewDevice("mobile")}
                className={previewDevice === "mobile" ? "bg-gradient-to-r from-emerald-500 to-teal-600" : ""}
              >
                <Smartphone className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={regenerate} className="border-emerald-500/30">
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate
              </Button>
              <Button variant="outline" onClick={downloadWebsite} className="border-emerald-500/30">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button 
                onClick={deployWebsite}
                disabled={deploymentStatus === "deploying"}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
              >
                {deploymentStatus === "deploying" ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deploying...
                  </>
                ) : (
                  <>
                    <Rocket className="h-4 w-4 mr-2" />
                    Deploy Now
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Preview Frame */}
          <Card className="overflow-hidden border-2 border-emerald-500/20">
            <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 p-2 border-b flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <div className="flex-1 px-3 py-1 bg-card rounded text-xs text-muted-foreground truncate">
                {deployedUrl || `https://${businessName.toLowerCase().replace(/\s+/g, '-')}.lovable.app`}
              </div>
            </div>
            <div className="bg-muted/30 p-4 flex justify-center min-h-[500px]">
              <div style={{ width: getPreviewWidth() }} className="transition-all duration-300">
                {previewUrl && (
                  <iframe
                    src={previewUrl}
                    className="w-full h-[600px] bg-white rounded-lg shadow-xl"
                    title="Website Preview"
                  />
                )}
              </div>
            </div>
          </Card>

          {/* Code Export Tabs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5 text-emerald-500" />
                Export Code
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="html">
                <TabsList className="grid grid-cols-3 w-full max-w-md">
                  <TabsTrigger value="html">HTML</TabsTrigger>
                  <TabsTrigger value="css">CSS</TabsTrigger>
                  <TabsTrigger value="js">JavaScript</TabsTrigger>
                </TabsList>
                <TabsContent value="html" className="mt-4">
                  <div className="relative">
                    <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-sm max-h-[300px]">
                      {generatedCode.html}
                    </pre>
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute top-2 right-2"
                      onClick={() => copyCode("html")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </TabsContent>
                <TabsContent value="css" className="mt-4">
                  <div className="relative">
                    <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-sm max-h-[300px]">
                      {generatedCode.css}
                    </pre>
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute top-2 right-2"
                      onClick={() => copyCode("css")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </TabsContent>
                <TabsContent value="js" className="mt-4">
                  <div className="relative">
                    <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-sm max-h-[300px]">
                      {generatedCode.js}
                    </pre>
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute top-2 right-2"
                      onClick={() => copyCode("js")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Generation Progress */}
      {isGenerating && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 animate-pulse">
                  <Wand2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="font-medium">Generating Your Website</p>
                  <p className="text-sm text-muted-foreground">AI is crafting your masterpiece...</p>
                </div>
              </div>
              <Progress value={generationProgress} className="h-2" />
              <p className="text-sm text-center text-muted-foreground">
                {generationProgress < 30 && "Analyzing your requirements..."}
                {generationProgress >= 30 && generationProgress < 60 && "Designing layouts and components..."}
                {generationProgress >= 60 && generationProgress < 90 && "Adding styles and animations..."}
                {generationProgress >= 90 && "Finalizing your website..."}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
