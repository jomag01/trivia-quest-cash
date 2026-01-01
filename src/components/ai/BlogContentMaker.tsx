import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Search, 
  FileText, 
  Upload, 
  Loader2, 
  Sparkles, 
  Lock, 
  ShoppingCart,
  Copy,
  Download,
  RefreshCw,
  Globe,
  Newspaper,
  PenTool,
  Send,
  CheckCircle,
  BookOpen,
  Hash,
  Image,
  List,
  Wand2
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface BlogContentMakerProps {
  userCredits: number;
  onCreditsChange: () => void;
}

const CREDIT_COST = 15;

const BLOG_STYLES = [
  { value: 'informative', label: 'Informative', description: 'Educational and fact-based content' },
  { value: 'conversational', label: 'Conversational', description: 'Friendly and engaging tone' },
  { value: 'professional', label: 'Professional', description: 'Formal business writing' },
  { value: 'storytelling', label: 'Storytelling', description: 'Narrative-driven content' },
  { value: 'listicle', label: 'Listicle', description: 'List-based articles' },
  { value: 'how-to', label: 'How-To Guide', description: 'Step-by-step tutorials' },
];

const BLOG_LENGTHS = [
  { value: 'short', label: 'Short (500-800 words)', words: 650 },
  { value: 'medium', label: 'Medium (1000-1500 words)', words: 1250 },
  { value: 'long', label: 'Long (2000-3000 words)', words: 2500 },
  { value: 'comprehensive', label: 'Comprehensive (3500+ words)', words: 4000 },
];

const BlogContentMaker = ({ userCredits, onCreditsChange }: BlogContentMakerProps) => {
  const { user } = useAuth();
  const [activeStep, setActiveStep] = useState<'search' | 'script' | 'publish'>('search');
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<any>(null);
  
  // Script state
  const [blogStyle, setBlogStyle] = useState('informative');
  const [blogLength, setBlogLength] = useState('medium');
  const [targetKeywords, setTargetKeywords] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<{
    title: string;
    metaDescription: string;
    content: string;
    tags: string[];
    outline: string[];
  } | null>(null);
  
  // Publish state
  const [blogUrl, setBlogUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [platform, setPlatform] = useState<'wordpress' | 'blogger' | 'medium' | 'custom'>('wordpress');
  const [isPublishing, setIsPublishing] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a topic to search');
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('content-creator', {
        body: {
          action: 'research-topic',
          topic: searchQuery
        }
      });

      if (error) throw error;

      // Parse research results into topic suggestions
      const topics = [
        {
          title: searchQuery,
          description: data.research?.substring(0, 200) || 'Main topic based on your search',
          trending: true,
          keywords: data.hashtags || []
        },
        ...(data.viralIdeas || []).slice(0, 4).map((idea: string, i: number) => ({
          title: idea,
          description: `Trending angle #${i + 1}`,
          trending: i < 2,
          keywords: data.hashtags?.slice(0, 3) || []
        }))
      ];

      setSearchResults(topics);
      toast.success('Found topic ideas!');
    } catch (error) {
      console.error('Search error:', error);
      // Generate fallback suggestions
      setSearchResults([
        { title: searchQuery, description: 'Your original topic', trending: false, keywords: [] },
        { title: `Complete Guide to ${searchQuery}`, description: 'Comprehensive overview', trending: true, keywords: [] },
        { title: `${searchQuery} Tips and Best Practices`, description: 'Actionable advice', trending: true, keywords: [] },
        { title: `${searchQuery} for Beginners`, description: 'Introduction guide', trending: false, keywords: [] },
      ]);
    } finally {
      setIsSearching(false);
    }
  };

  const selectTopic = (topic: any) => {
    setSelectedTopic(topic);
    setActiveStep('script');
    toast.success('Topic selected! Now customize your blog post.');
  };

  const generateBlogContent = async () => {
    if (!selectedTopic) {
      toast.error('Please select a topic first');
      return;
    }

    if (userCredits < CREDIT_COST) {
      toast.error(`Insufficient credits. You need ${CREDIT_COST} credits.`);
      return;
    }

    setIsGenerating(true);
    try {
      // Deduct credits
      const { error: creditError } = await supabase
        .from('profiles')
        .update({ credits: userCredits - CREDIT_COST })
        .eq('id', user?.id);

      if (creditError) throw creditError;
      onCreditsChange();

      const targetWords = BLOG_LENGTHS.find(l => l.value === blogLength)?.words || 1250;
      const styleInfo = BLOG_STYLES.find(s => s.value === blogStyle);

      const { data, error } = await supabase.functions.invoke('content-creator', {
        body: {
          action: 'generate-script',
          topic: selectedTopic.title,
          targetAudience: 'blog readers',
          style: blogStyle,
          scenes: Math.ceil(targetWords / 200), // Approximate paragraphs
          additionalContext: `
            Writing Style: ${styleInfo?.label} - ${styleInfo?.description}
            Target Length: ${targetWords} words
            Target Keywords: ${targetKeywords || 'none specified'}
            Custom Instructions: ${customInstructions || 'none'}
            
            Generate a complete blog post with:
            1. Compelling title (SEO optimized)
            2. Meta description (150-160 characters)
            3. Full article content with proper headings (H2, H3)
            4. Suggested tags/categories
            5. Brief outline of sections
          `
        }
      });

      if (error) throw error;

      // Parse the generated content
      const content = data.script || data.content || '';
      
      setGeneratedContent({
        title: selectedTopic.title,
        metaDescription: `Discover everything about ${selectedTopic.title}. ${styleInfo?.description || 'Read more to learn!'}`,
        content: content,
        tags: targetKeywords.split(',').map((k: string) => k.trim()).filter(Boolean),
        outline: ['Introduction', 'Main Content', 'Key Takeaways', 'Conclusion']
      });

      toast.success('Blog content generated successfully!');
    } catch (error) {
      console.error('Generation error:', error);
      toast.error('Failed to generate content. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const downloadAsMarkdown = () => {
    if (!generatedContent) return;
    
    const markdown = `# ${generatedContent.title}\n\n${generatedContent.metaDescription}\n\n---\n\n${generatedContent.content}\n\n---\n\nTags: ${generatedContent.tags.join(', ')}`;
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${generatedContent.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded as Markdown!');
  };

  const publishToBlog = async () => {
    if (!generatedContent) {
      toast.error('No content to publish');
      return;
    }

    if (!blogUrl.trim()) {
      toast.error('Please enter your blog URL');
      return;
    }

    setIsPublishing(true);
    try {
      // Simulate publishing - in real implementation, this would call the respective APIs
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success(`Content ready for ${platform}! Copy and paste to your blog.`);
      setActiveStep('publish');
    } catch (error) {
      console.error('Publish error:', error);
      toast.error('Publishing failed. Please try manual copy.');
    } finally {
      setIsPublishing(false);
    }
  };

  if (userCredits < CREDIT_COST) {
    return (
      <Card className="border-2 border-dashed border-orange-300 dark:border-orange-700">
        <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="p-4 rounded-full bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30">
            <Lock className="h-10 w-10 text-orange-500" />
          </div>
          <h3 className="text-xl font-semibold text-center">Blog Content Maker - Premium Service</h3>
          <p className="text-muted-foreground text-center max-w-md">
            Create SEO-optimized blog posts with AI. Requires {CREDIT_COST} credits per generation.
          </p>
          <Badge variant="outline" className="gap-2 text-orange-600 border-orange-400">
            <ShoppingCart className="h-3 w-3" />
            You have {userCredits} credits
          </Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 p-6 text-white">
        <div className="absolute inset-0 opacity-10 bg-white/5" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Newspaper className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Blog Content Maker</h2>
              <p className="text-white/80 text-sm">Create SEO-optimized blog posts with AI</p>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-4">
            <Badge className="bg-white/20 hover:bg-white/30 text-white border-0">
              <Sparkles className="h-3 w-3 mr-1" />
              {CREDIT_COST} credits per post
            </Badge>
            <Badge className="bg-white/20 hover:bg-white/30 text-white border-0">
              Credits: {userCredits}
            </Badge>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2 md:gap-4 px-4">
        {[
          { id: 'search', label: 'Search Topic', icon: Search },
          { id: 'script', label: 'Generate Content', icon: PenTool },
          { id: 'publish', label: 'Publish', icon: Upload },
        ].map((step, i) => (
          <React.Fragment key={step.id}>
            <button
              onClick={() => setActiveStep(step.id as any)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                activeStep === step.id
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg'
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground'
              }`}
            >
              <step.icon className="h-4 w-4" />
              <span className="hidden sm:inline text-sm font-medium">{step.label}</span>
            </button>
            {i < 2 && <div className="w-8 h-0.5 bg-muted" />}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Search Topic */}
      {activeStep === 'search' && (
        <Card className="border-orange-200 dark:border-orange-800">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30">
            <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
              <Search className="h-5 w-5" />
              Search & Discover Topics
            </CardTitle>
            <CardDescription>
              Find trending topics and get AI-powered suggestions for your blog
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="flex gap-3">
              <Input
                placeholder="Enter a topic, niche, or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1 border-orange-200 focus:border-orange-400"
              />
              <Button
                onClick={handleSearch}
                disabled={isSearching}
                className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
              >
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                <span className="ml-2 hidden sm:inline">Search</span>
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="grid gap-3">
                <Label className="text-sm font-medium text-muted-foreground">Topic Suggestions</Label>
                {searchResults.map((topic, i) => (
                  <button
                    key={i}
                    onClick={() => selectTopic(topic)}
                    className={`p-4 rounded-xl border-2 text-left transition-all hover:border-orange-400 hover:shadow-md ${
                      selectedTopic?.title === topic.title
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30'
                        : 'border-border'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{topic.title}</span>
                          {topic.trending && (
                            <Badge className="bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs">
                              Trending
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{topic.description}</p>
                      </div>
                      <Sparkles className="h-5 w-5 text-orange-400 flex-shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Generate Content */}
      {activeStep === 'script' && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Configuration */}
          <Card className="border-amber-200 dark:border-amber-800">
            <CardHeader className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30">
              <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <PenTool className="h-5 w-5" />
                Configure Your Blog Post
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              {selectedTopic && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <Label className="text-xs text-amber-600 dark:text-amber-400">Selected Topic</Label>
                  <p className="font-medium">{selectedTopic.title}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-amber-500" />
                  Writing Style
                </Label>
                <Select value={blogStyle} onValueChange={setBlogStyle}>
                  <SelectTrigger className="border-amber-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BLOG_STYLES.map(style => (
                      <SelectItem key={style.value} value={style.value}>
                        <div>
                          <span className="font-medium">{style.label}</span>
                          <span className="text-xs text-muted-foreground ml-2">{style.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <List className="h-4 w-4 text-amber-500" />
                  Article Length
                </Label>
                <Select value={blogLength} onValueChange={setBlogLength}>
                  <SelectTrigger className="border-amber-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BLOG_LENGTHS.map(length => (
                      <SelectItem key={length.value} value={length.value}>
                        {length.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-amber-500" />
                  Target Keywords (comma separated)
                </Label>
                <Input
                  placeholder="SEO, blogging, content marketing..."
                  value={targetKeywords}
                  onChange={(e) => setTargetKeywords(e.target.value)}
                  className="border-amber-200"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-amber-500" />
                  Custom Instructions (optional)
                </Label>
                <Textarea
                  placeholder="Add any specific requirements, tone, or focus areas..."
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  rows={3}
                  className="border-amber-200"
                />
              </div>

              <Button
                onClick={generateBlogContent}
                disabled={isGenerating || !selectedTopic}
                className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Blog Post ({CREDIT_COST} credits)
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card className="border-yellow-200 dark:border-yellow-800">
            <CardHeader className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30">
              <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
                <FileText className="h-5 w-5" />
                Generated Content
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {generatedContent ? (
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Title</Label>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg flex-1">{generatedContent.title}</h3>
                        <Button size="icon" variant="ghost" onClick={() => copyToClipboard(generatedContent.title)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Meta Description</Label>
                      <p className="text-sm text-muted-foreground">{generatedContent.metaDescription}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {generatedContent.tags.map((tag, i) => (
                        <Badge key={i} variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                          #{tag}
                        </Badge>
                      ))}
                    </div>

                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <div className="whitespace-pre-wrap text-sm">{generatedContent.content}</div>
                    </div>

                    <div className="flex gap-2 pt-4 border-t">
                      <Button variant="outline" size="sm" onClick={() => copyToClipboard(generatedContent.content)} className="flex-1">
                        <Copy className="h-4 w-4 mr-2" />
                        Copy All
                      </Button>
                      <Button variant="outline" size="sm" onClick={downloadAsMarkdown} className="flex-1">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => setActiveStep('publish')}
                        className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Publish
                      </Button>
                    </div>
                  </div>
                </ScrollArea>
              ) : (
                <div className="h-[400px] flex flex-col items-center justify-center text-center space-y-4">
                  <div className="p-4 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                    <FileText className="h-10 w-10 text-yellow-500" />
                  </div>
                  <p className="text-muted-foreground">
                    Configure your settings and click "Generate" to create your blog post
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 3: Publish */}
      {activeStep === 'publish' && (
        <Card className="border-green-200 dark:border-green-800">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
              <Upload className="h-5 w-5" />
              Publish to Your Blog
            </CardTitle>
            <CardDescription>
              Connect your blog platform and publish directly, or copy the content
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Blog Platform</Label>
                <Select value={platform} onValueChange={(v: any) => setPlatform(v)}>
                  <SelectTrigger className="border-green-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wordpress">WordPress</SelectItem>
                    <SelectItem value="blogger">Blogger</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="custom">Custom API</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Blog URL</Label>
                <Input
                  placeholder="https://yourblog.com"
                  value={blogUrl}
                  onChange={(e) => setBlogUrl(e.target.value)}
                  className="border-green-200"
                />
              </div>
            </div>

            {platform !== 'medium' && (
              <div className="space-y-2">
                <Label>API Key (optional for auto-publish)</Label>
                <Input
                  type="password"
                  placeholder="Your blog API key..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="border-green-200"
                />
                <p className="text-xs text-muted-foreground">
                  For WordPress: Use Application Password. For Blogger: Use OAuth token.
                </p>
              </div>
            )}

            {generatedContent && (
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-medium text-green-700 dark:text-green-300">Content Ready</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  "{generatedContent.title}" - {generatedContent.content.length} characters
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => generatedContent && copyToClipboard(generatedContent.content)}
                disabled={!generatedContent}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Content
              </Button>
              <Button
                onClick={publishToBlog}
                disabled={isPublishing || !generatedContent}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Globe className="h-4 w-4 mr-2" />
                    Publish Now
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BlogContentMaker;
