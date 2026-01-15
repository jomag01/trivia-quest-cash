import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sparkles,
  Download,
  RefreshCw,
  Loader2,
  Palette,
  Type,
  Image as ImageIcon,
  Check,
  Copy,
  Wand2,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BrandGeneratorProps {
  userCredits: number;
  onCreditsChange: () => void;
}

interface GeneratedBrand {
  name: string;
  tagline: string;
  description: string;
  colorPalette: string[];
  style: string;
}

interface GeneratedLogo {
  imageUrl: string;
  prompt: string;
}

const INDUSTRY_OPTIONS = [
  "Technology",
  "Healthcare",
  "Finance",
  "Education",
  "Retail",
  "Food & Beverage",
  "Real Estate",
  "Travel",
  "Fashion",
  "Entertainment",
  "Sports & Fitness",
  "Beauty & Wellness",
  "Automotive",
  "Agriculture",
  "Manufacturing",
];

const STYLE_OPTIONS = [
  { id: "modern", label: "Modern & Minimal", description: "Clean, sleek, and contemporary" },
  { id: "playful", label: "Playful & Fun", description: "Colorful and energetic vibes" },
  { id: "luxury", label: "Luxury & Elegant", description: "Premium, sophisticated feel" },
  { id: "tech", label: "Tech & Futuristic", description: "Innovative and cutting-edge" },
  { id: "organic", label: "Organic & Natural", description: "Earthy, eco-friendly aesthetics" },
  { id: "vintage", label: "Vintage & Classic", description: "Timeless, nostalgic charm" },
];

export const BrandGenerator = ({ userCredits, onCreditsChange }: BrandGeneratorProps) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("name");
  
  // Brand name generator states
  const [businessDescription, setBusinessDescription] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState("");
  const [keywords, setKeywords] = useState("");
  const [isGeneratingNames, setIsGeneratingNames] = useState(false);
  const [generatedBrands, setGeneratedBrands] = useState<GeneratedBrand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<GeneratedBrand | null>(null);
  
  // Logo generator states
  const [logoStyle, setLogoStyle] = useState("modern");
  const [logoColors, setLogoColors] = useState("");
  const [isGeneratingLogo, setIsGeneratingLogo] = useState(false);
  const [generatedLogos, setGeneratedLogos] = useState<GeneratedLogo[]>([]);
  const [copiedName, setCopiedName] = useState<string | null>(null);

  const generateBrandNames = async () => {
    if (!businessDescription.trim()) {
      toast.error("Please describe your business");
      return;
    }

    if (userCredits < 5) {
      toast.error("Not enough credits. You need 5 credits.");
      return;
    }

    setIsGeneratingNames(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-brand-generator", {
        body: {
          type: "names",
          description: businessDescription,
          industry: selectedIndustry,
          keywords: keywords,
        },
      });

      if (error) throw error;

      if (data?.brands) {
        setGeneratedBrands(data.brands);
        toast.success(`Generated ${data.brands.length} brand name ideas!`);
        onCreditsChange();
      }
    } catch (error: any) {
      console.error("Brand generation error:", error);
      toast.error(error.message || "Failed to generate brand names");
    } finally {
      setIsGeneratingNames(false);
    }
  };

  const generateLogo = async () => {
    if (!selectedBrand) {
      toast.error("Please select a brand name first");
      return;
    }

    if (userCredits < 10) {
      toast.error("Not enough credits. You need 10 credits for logo generation.");
      return;
    }

    setIsGeneratingLogo(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-brand-generator", {
        body: {
          type: "logo",
          brandName: selectedBrand.name,
          tagline: selectedBrand.tagline,
          style: logoStyle,
          colors: logoColors || selectedBrand.colorPalette.join(", "),
          industry: selectedIndustry,
        },
      });

      if (error) throw error;

      if (data?.logos) {
        setGeneratedLogos(data.logos);
        toast.success("Logo designs generated!");
        onCreditsChange();
      }
    } catch (error: any) {
      console.error("Logo generation error:", error);
      toast.error(error.message || "Failed to generate logos");
    } finally {
      setIsGeneratingLogo(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedName(text);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedName(null), 2000);
  };

  const downloadLogo = async (imageUrl: string, brandName: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${brandName.toLowerCase().replace(/\s+/g, "-")}-logo.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("Logo downloaded!");
    } catch (error) {
      toast.error("Failed to download logo");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          Brand Identity Generator
        </h2>
        <p className="text-muted-foreground">
          Create professional brand names and logos with AI
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="name" className="flex items-center gap-2">
            <Type className="w-4 h-4" />
            Brand Name
          </TabsTrigger>
          <TabsTrigger value="logo" className="flex items-center gap-2" disabled={!selectedBrand}>
            <ImageIcon className="w-4 h-4" />
            Logo Design
          </TabsTrigger>
        </TabsList>

        {/* Brand Name Generator */}
        <TabsContent value="name" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-primary" />
                Generate Brand Names
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Describe Your Business *</Label>
                <Textarea
                  placeholder="E.g., An eco-friendly meal delivery service for busy professionals..."
                  value={businessDescription}
                  onChange={(e) => setBusinessDescription(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Industry</Label>
                  <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRY_OPTIONS.map((industry) => (
                        <SelectItem key={industry} value={industry.toLowerCase()}>
                          {industry}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Keywords (optional)</Label>
                  <Input
                    placeholder="E.g., fresh, quick, healthy"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                  />
                </div>
              </div>

              <Button
                onClick={generateBrandNames}
                disabled={isGeneratingNames || !businessDescription}
                className="w-full"
              >
                {isGeneratingNames ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Brand Names (5 credits)
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Generated Brands */}
          {generatedBrands.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold">Generated Brand Ideas</h3>
              <div className="grid gap-3">
                {generatedBrands.map((brand, index) => (
                  <Card
                    key={index}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedBrand?.name === brand.name
                        ? "ring-2 ring-primary bg-primary/5"
                        : ""
                    }`}
                    onClick={() => setSelectedBrand(brand)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-lg font-bold">{brand.name}</h4>
                            {selectedBrand?.name === brand.name && (
                              <Badge variant="default" className="text-xs">
                                <Check className="w-3 h-3 mr-1" />
                                Selected
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-primary italic">{brand.tagline}</p>
                          <p className="text-sm text-muted-foreground mt-2">
                            {brand.description}
                          </p>
                          <div className="flex items-center gap-2 mt-3">
                            <span className="text-xs text-muted-foreground">Colors:</span>
                            <div className="flex gap-1">
                              {brand.colorPalette.map((color, i) => (
                                <div
                                  key={i}
                                  className="w-5 h-5 rounded-full border"
                                  style={{ backgroundColor: color }}
                                  title={color}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(brand.name);
                          }}
                        >
                          {copiedName === brand.name ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {selectedBrand && (
                <Button
                  onClick={() => setActiveTab("logo")}
                  className="w-full bg-gradient-to-r from-primary to-primary/80"
                >
                  <Palette className="w-4 h-4 mr-2" />
                  Continue to Logo Design
                </Button>
              )}
            </div>
          )}
        </TabsContent>

        {/* Logo Generator */}
        <TabsContent value="logo" className="space-y-4 mt-4">
          {selectedBrand && (
            <>
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Selected Brand</p>
                      <h3 className="text-xl font-bold">{selectedBrand.name}</h3>
                      <p className="text-sm text-primary">{selectedBrand.tagline}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setActiveTab("name")}>
                      Change
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Palette className="w-5 h-5 text-primary" />
                    Logo Style Options
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Logo Style</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                      {STYLE_OPTIONS.map((style) => (
                        <Card
                          key={style.id}
                          className={`cursor-pointer p-3 transition-all ${
                            logoStyle === style.id
                              ? "ring-2 ring-primary bg-primary/5"
                              : "hover:bg-muted/50"
                          }`}
                          onClick={() => setLogoStyle(style.id)}
                        >
                          <p className="font-medium text-sm">{style.label}</p>
                          <p className="text-xs text-muted-foreground">{style.description}</p>
                        </Card>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Custom Colors (optional)</Label>
                    <Input
                      placeholder="E.g., blue, gold, white or leave empty to use suggested colors"
                      value={logoColors}
                      onChange={(e) => setLogoColors(e.target.value)}
                    />
                  </div>

                  <Button
                    onClick={generateLogo}
                    disabled={isGeneratingLogo}
                    className="w-full"
                  >
                    {isGeneratingLogo ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating Logo Designs...
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-4 h-4 mr-2" />
                        Generate Logo Designs (10 credits)
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Generated Logos */}
              {generatedLogos.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Generated Logo Designs
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {generatedLogos.map((logo, index) => (
                      <Card key={index} className="overflow-hidden">
                        <div className="aspect-square bg-muted relative">
                          <img
                            src={logo.imageUrl}
                            alt={`Logo option ${index + 1}`}
                            className="w-full h-full object-contain p-4"
                          />
                        </div>
                        <CardContent className="p-3">
                          <div className="flex gap-2">
                            <Button
                              variant="default"
                              size="sm"
                              className="flex-1"
                              onClick={() => downloadLogo(logo.imageUrl, selectedBrand.name)}
                            >
                              <Download className="w-3 h-3 mr-1" />
                              Download
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    onClick={generateLogo}
                    disabled={isGeneratingLogo}
                    className="w-full"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Generate More Variations
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
