import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Globe, 
  Loader2, 
  Search, 
  Code2, 
  Palette, 
  Layout, 
  Image as ImageIcon,
  FileText,
  Copy,
  ExternalLink,
  Sparkles,
  Wand2,
  Lock,
  Crown
} from 'lucide-react';

interface ScrapedData {
  url: string;
  title: string;
  description: string;
  markdown: string;
  html?: string;
  links: string[];
  images: string[];
  metadata: any;
  branding?: any;
}

interface AIAnalysis {
  designAnalysis: string;
  techStack: string[];
  colorPalette: string[];
  layoutStructure: string;
  features: string[];
  cloneInstructions: string;
}

interface WebsiteScraperProps {
  userCredits: number;
  onCreditsChange: () => void;
}

const WebsiteScraper: React.FC<WebsiteScraperProps> = ({ userCredits, onCreditsChange }) => {
  const { user } = useAuth();
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scrapedData, setScrapedData] = useState<ScrapedData | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [scraperCreditCost, setScraperCreditCost] = useState(5);
  const [analysisCreditCost, setAnalysisCreditCost] = useState(10);

  useEffect(() => {
    fetchPricing();
  }, []);

  const fetchPricing = async () => {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['ai_scraper_credit_cost', 'ai_scraper_analysis_cost']);
      
      data?.forEach(setting => {
        if (setting.key === 'ai_scraper_credit_cost') {
          setScraperCreditCost(parseInt(setting.value || '5'));
        } else if (setting.key === 'ai_scraper_analysis_cost') {
          setAnalysisCreditCost(parseInt(setting.value || '10'));
        }
      });
    } catch (error) {
      console.error('Error fetching pricing:', error);
    }
  };

  const deductCredits = async (amount: number): Promise<boolean> => {
    if (!user) return false;
    if (userCredits < amount) {
      toast.error(`Insufficient credits. You need ${amount} credits.`);
      return false;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ credits: userCredits - amount })
        .eq('id', user.id);

      if (error) throw error;
      onCreditsChange();
      return true;
    } catch (error) {
      console.error('Error deducting credits:', error);
      toast.error('Failed to deduct credits');
      return false;
    }
  };

  const handleScrape = async () => {
    if (!url.trim()) {
      toast.error('Please enter a URL');
      return;
    }

    if (!user) {
      toast.error('Please login to use the scraper');
      return;
    }

    if (userCredits < scraperCreditCost) {
      toast.error(`You need ${scraperCreditCost} credits to scrape a website`);
      return;
    }

    const deducted = await deductCredits(scraperCreditCost);
    if (!deducted) return;

    setIsLoading(true);
    setScrapedData(null);
    setAiAnalysis(null);

    try {
      const { data, error } = await supabase.functions.invoke('scrape-website', {
        body: { url: url.trim() }
      });

      if (error) throw error;

      if (data?.success) {
        setScrapedData(data.data);
        toast.success('Website scraped successfully!');
      } else {
        throw new Error(data?.error || 'Failed to scrape website');
      }
    } catch (error: any) {
      console.error('Scrape error:', error);
      toast.error(error.message || 'Failed to scrape website');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAIAnalysis = async () => {
    if (!scrapedData) {
      toast.error('Please scrape a website first');
      return;
    }

    if (userCredits < analysisCreditCost) {
      toast.error(`You need ${analysisCreditCost} credits for AI analysis`);
      return;
    }

    const deducted = await deductCredits(analysisCreditCost);
    if (!deducted) return;

    setIsAnalyzing(true);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-website', {
        body: { 
          url: scrapedData.url,
          title: scrapedData.title,
          description: scrapedData.description,
          markdown: scrapedData.markdown?.substring(0, 10000),
          branding: scrapedData.branding,
          images: scrapedData.images?.slice(0, 10)
        }
      });

      if (error) throw error;

      if (data?.analysis) {
        setAiAnalysis(data.analysis);
        toast.success('AI analysis complete!');
      } else {
        throw new Error('No analysis returned');
      }
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast.error(error.message || 'Failed to analyze website');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const canScrape = userCredits >= scraperCreditCost;
  const canAnalyze = userCredits >= analysisCreditCost;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="h-5 w-5 text-primary" />
            Website Scraper & AI Cloner
            <Badge variant="secondary" className="ml-2 gap-1">
              <Crown className="h-3 w-3" />
              Premium
            </Badge>
          </CardTitle>
          <CardDescription>
            Scrape any website to get content ideas, analyze design, and get AI-powered instructions to clone it
          </CardDescription>
          <div className="flex gap-2 text-xs text-muted-foreground mt-2">
            <Badge variant="outline">{scraperCreditCost} credits/scrape</Badge>
            <Badge variant="outline">{analysisCreditCost} credits/AI analysis</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!canScrape ? (
            <div className="text-center py-8 space-y-4">
              <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">You need at least {scraperCreditCost} credits to use this feature</p>
              <p className="text-sm text-muted-foreground">Current balance: {userCredits} credits</p>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="Enter website URL (e.g., https://example.com)"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
                  />
                </div>
                <Button onClick={handleScrape} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Scraping...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Scrape ({scraperCreditCost}c)
                    </>
                  )}
                </Button>
              </div>

              {scrapedData && (
                <Button 
                  onClick={handleAIAnalysis} 
                  disabled={isAnalyzing || !canAnalyze}
                  variant="secondary"
                  className="w-full"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing with AI...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Analyze with AI & Get Clone Instructions ({analysisCreditCost}c)
                    </>
                  )}
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {scrapedData && (
        <Card>
          <CardContent className="pt-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger value="overview" className="text-xs">
                  <Globe className="h-3 w-3 mr-1" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="content" className="text-xs">
                  <FileText className="h-3 w-3 mr-1" />
                  Content
                </TabsTrigger>
                <TabsTrigger value="images" className="text-xs">
                  <ImageIcon className="h-3 w-3 mr-1" />
                  Images
                </TabsTrigger>
                <TabsTrigger value="links" className="text-xs">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Links
                </TabsTrigger>
                <TabsTrigger value="ai-analysis" className="text-xs">
                  <Sparkles className="h-3 w-3 mr-1" />
                  AI Clone
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-4 space-y-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Title</Label>
                  <p className="font-medium">{scrapedData.title || 'No title'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Description</Label>
                  <p className="text-sm">{scrapedData.description || 'No description'}</p>
                </div>
                <div className="flex gap-4 text-sm">
                  <Badge variant="secondary">
                    <ImageIcon className="h-3 w-3 mr-1" />
                    {scrapedData.images?.length || 0} images
                  </Badge>
                  <Badge variant="secondary">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    {scrapedData.links?.length || 0} links
                  </Badge>
                </div>
                {scrapedData.branding && (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">Brand Colors</Label>
                    <div className="flex gap-2 flex-wrap">
                      {Object.entries(scrapedData.branding.colors || {}).map(([name, color]) => (
                        <div 
                          key={name}
                          className="flex items-center gap-2 p-2 rounded border"
                        >
                          <div 
                            className="w-6 h-6 rounded"
                            style={{ backgroundColor: color as string }}
                          />
                          <span className="text-xs">{name}: {color as string}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="content" className="mt-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Page Content (Markdown)</Label>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => copyToClipboard(scrapedData.markdown || '', 'Content')}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                  </div>
                  <ScrollArea className="h-[300px] rounded border p-3">
                    <pre className="text-xs whitespace-pre-wrap font-mono">
                      {scrapedData.markdown || 'No content extracted'}
                    </pre>
                  </ScrollArea>
                </div>
              </TabsContent>

              <TabsContent value="images" className="mt-4">
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                  {scrapedData.images?.slice(0, 20).map((img, idx) => (
                    <div key={idx} className="relative group aspect-square rounded border overflow-hidden">
                      <img 
                        src={img} 
                        alt={`Image ${idx + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button 
                          size="icon" 
                          variant="ghost"
                          className="h-8 w-8 text-white"
                          onClick={() => window.open(img, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost"
                          className="h-8 w-8 text-white"
                          onClick={() => copyToClipboard(img, 'Image URL')}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                {(!scrapedData.images || scrapedData.images.length === 0) && (
                  <p className="text-center text-muted-foreground py-8">No images found</p>
                )}
              </TabsContent>

              <TabsContent value="links" className="mt-4">
                <ScrollArea className="h-[300px]">
                  <div className="space-y-1">
                    {scrapedData.links?.slice(0, 50).map((link, idx) => (
                      <div 
                        key={idx} 
                        className="flex items-center justify-between p-2 rounded hover:bg-muted/50 group"
                      >
                        <a 
                          href={link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline truncate flex-1"
                        >
                          {link}
                        </a>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100"
                          onClick={() => copyToClipboard(link, 'Link')}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="ai-analysis" className="mt-4">
                {aiAnalysis ? (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-muted-foreground text-xs flex items-center gap-1">
                        <Palette className="h-3 w-3" />
                        Design Analysis
                      </Label>
                      <p className="text-sm mt-1">{aiAnalysis.designAnalysis}</p>
                    </div>

                    <div>
                      <Label className="text-muted-foreground text-xs flex items-center gap-1">
                        <Code2 className="h-3 w-3" />
                        Detected Tech Stack
                      </Label>
                      <div className="flex gap-1 flex-wrap mt-1">
                        {aiAnalysis.techStack?.map((tech, idx) => (
                          <Badge key={idx} variant="outline">{tech}</Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="text-muted-foreground text-xs flex items-center gap-1">
                        <Palette className="h-3 w-3" />
                        Color Palette
                      </Label>
                      <div className="flex gap-2 mt-1">
                        {aiAnalysis.colorPalette?.map((color, idx) => (
                          <div 
                            key={idx}
                            className="w-8 h-8 rounded border cursor-pointer"
                            style={{ backgroundColor: color }}
                            title={color}
                            onClick={() => copyToClipboard(color, 'Color')}
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="text-muted-foreground text-xs flex items-center gap-1">
                        <Layout className="h-3 w-3" />
                        Layout Structure
                      </Label>
                      <p className="text-sm mt-1">{aiAnalysis.layoutStructure}</p>
                    </div>

                    <div>
                      <Label className="text-muted-foreground text-xs">Key Features Detected</Label>
                      <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                        {aiAnalysis.features?.map((feature, idx) => (
                          <li key={idx}>{feature}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <div className="flex justify-between items-center">
                        <Label className="text-muted-foreground text-xs flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          How to Clone This Website
                        </Label>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => copyToClipboard(aiAnalysis.cloneInstructions, 'Instructions')}
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Copy
                        </Button>
                      </div>
                      <ScrollArea className="h-[200px] rounded border p-3 mt-1">
                        <pre className="text-xs whitespace-pre-wrap">
                          {aiAnalysis.cloneInstructions}
                        </pre>
                      </ScrollArea>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Click "Analyze with AI" to get design insights and clone instructions</p>
                    <p className="text-xs mt-1">Cost: {analysisCreditCost} credits</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WebsiteScraper;