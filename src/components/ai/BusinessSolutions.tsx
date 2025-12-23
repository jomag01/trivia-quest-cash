import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import pptxgen from 'pptxgenjs';
import { 
  FileText, 
  Upload, 
  Loader2, 
  Download, 
  Presentation, 
  FileSpreadsheet, 
  Search,
  Sparkles,
  BarChart3,
  ClipboardList,
  TrendingUp,
  PieChart,
  Table,
  FileCheck,
  Wand2,
  Layout,
  User,
  Briefcase,
  FileSignature,
  GraduationCap,
  Building2,
  ScrollText
} from 'lucide-react';

interface BusinessSolutionsProps {
  userCredits: number;
  onCreditsChange: () => void;
}

const PRESENTATION_DESIGNS = [
  { id: 'professional', name: 'Professional', description: 'Clean corporate style', color: 'bg-blue-500' },
  { id: 'creative', name: 'Creative', description: 'Bold and colorful', color: 'bg-purple-500' },
  { id: 'minimal', name: 'Minimal', description: 'Simple and elegant', color: 'bg-gray-500' },
  { id: 'modern', name: 'Modern', description: 'Contemporary design', color: 'bg-teal-500' },
  { id: 'dark', name: 'Dark Theme', description: 'Dark background style', color: 'bg-slate-800' },
  { id: 'gradient', name: 'Gradient', description: 'Beautiful gradients', color: 'bg-gradient-to-r from-pink-500 to-violet-500' },
];

const EXCEL_OPERATIONS = [
  { id: 'report', name: 'Generate Report', description: 'Create detailed reports from data', icon: ClipboardList },
  { id: 'analysis', name: 'Data Analysis', description: 'Analyze trends and patterns', icon: TrendingUp },
  { id: 'charts', name: 'Create Charts', description: 'Visualize data with charts', icon: PieChart },
  { id: 'summary', name: 'Executive Summary', description: 'High-level data overview', icon: FileCheck },
  { id: 'forecast', name: 'Forecasting', description: 'Predict future trends', icon: BarChart3 },
  { id: 'comparison', name: 'Comparison Report', description: 'Compare data periods', icon: Table },
];

const DOCUMENT_SERVICES = [
  { id: 'resume', name: 'Resume Maker', description: 'Create professional resumes and CVs', icon: User },
  { id: 'pitch', name: 'Product/Company Pitch', description: 'Craft compelling pitch documents', icon: Briefcase },
  { id: 'resolution', name: 'Resolution Paper', description: 'Professional resolution documents', icon: FileSignature },
  { id: 'proposal', name: 'Business Proposal', description: 'Create winning business proposals', icon: Building2 },
  { id: 'cover-letter', name: 'Cover Letter', description: 'Write impactful cover letters', icon: ScrollText },
  { id: 'academic', name: 'Academic Paper', description: 'Structure academic documents', icon: GraduationCap },
];

const BusinessSolutions: React.FC<BusinessSolutionsProps> = ({ userCredits, onCreditsChange }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('powerpoint');
  
  // PowerPoint states
  const [pptMode, setPptMode] = useState<'document' | 'topic'>('topic');
  const [uploadedDocument, setUploadedDocument] = useState<string | null>(null);
  const [documentName, setDocumentName] = useState<string>('');
  const [presentationTopic, setPresentationTopic] = useState('');
  const [slideCount, setSlideCount] = useState('10');
  const [selectedDesign, setSelectedDesign] = useState('professional');
  const [isGeneratingPPT, setIsGeneratingPPT] = useState(false);
  const [generatedPPT, setGeneratedPPT] = useState<any>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  
  // Excel automation states
  const [uploadedExcel, setUploadedExcel] = useState<string | null>(null);
  const [excelName, setExcelName] = useState<string>('');
  const [selectedOperation, setSelectedOperation] = useState('report');
  const [customInstructions, setCustomInstructions] = useState('');
  const [isProcessingExcel, setIsProcessingExcel] = useState(false);
  const [excelResult, setExcelResult] = useState<any>(null);
  
  // Document generator states
  const [selectedDocService, setSelectedDocService] = useState('resume');
  const [docContent, setDocContent] = useState('');
  const [docInstructions, setDocInstructions] = useState('');
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);
  const [generatedDocument, setGeneratedDocument] = useState<string | null>(null);
  
  const PPT_CREDIT_COST = 5;
  const EXCEL_CREDIT_COST = 3;
  const DOC_CREDIT_COST = 4;

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/pdf',
      'text/plain'
    ];
    
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a Word document (.docx, .doc), PDF, or text file');
      return;
    }
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadedDocument(reader.result as string);
      setDocumentName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload an Excel file (.xlsx, .xls) or CSV');
      return;
    }
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadedExcel(reader.result as string);
      setExcelName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const deductCredits = async (amount: number) => {
    if (!user) return false;
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
      return false;
    }
  };

  const handleGeneratePPT = async () => {
    if (!user) {
      toast.error('Please login to generate presentations');
      return;
    }
    
    if (pptMode === 'document' && !uploadedDocument) {
      toast.error('Please upload a document first');
      return;
    }
    
    if (pptMode === 'topic' && !presentationTopic.trim()) {
      toast.error('Please enter a topic for your presentation');
      return;
    }
    
    if (userCredits < PPT_CREDIT_COST) {
      toast.error(`You need at least ${PPT_CREDIT_COST} credits to generate a presentation`);
      return;
    }

    setIsGeneratingPPT(true);
    setGeneratedPPT(null);
    setGenerationProgress(0);

    try {
      const deducted = await deductCredits(PPT_CREDIT_COST);
      if (!deducted) {
        toast.error('Failed to deduct credits');
        return;
      }

      // Simulate progress
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const { data, error } = await supabase.functions.invoke('business-solutions', {
        body: {
          type: 'generate-powerpoint',
          mode: pptMode,
          document: pptMode === 'document' ? uploadedDocument : null,
          topic: pptMode === 'topic' ? presentationTopic : null,
          slideCount: parseInt(slideCount),
          design: selectedDesign
        }
      });

      clearInterval(progressInterval);
      setGenerationProgress(100);

      if (error) throw error;
      
      if (data?.presentation) {
        setGeneratedPPT(data.presentation);
        toast.success('Presentation generated successfully!');
      } else {
        throw new Error('No presentation data returned');
      }
    } catch (error: any) {
      console.error('PPT generation error:', error);
      toast.error(error.message || 'Failed to generate presentation');
    } finally {
      setIsGeneratingPPT(false);
    }
  };

  const handleProcessExcel = async () => {
    if (!user) {
      toast.error('Please login to process Excel files');
      return;
    }
    
    if (!uploadedExcel) {
      toast.error('Please upload an Excel file first');
      return;
    }
    
    if (userCredits < EXCEL_CREDIT_COST) {
      toast.error(`You need at least ${EXCEL_CREDIT_COST} credits to process Excel files`);
      return;
    }

    setIsProcessingExcel(true);
    setExcelResult(null);

    try {
      const deducted = await deductCredits(EXCEL_CREDIT_COST);
      if (!deducted) {
        toast.error('Failed to deduct credits');
        return;
      }

      const { data, error } = await supabase.functions.invoke('business-solutions', {
        body: {
          type: 'process-excel',
          excelData: uploadedExcel,
          operation: selectedOperation,
          customInstructions: customInstructions
        }
      });

      if (error) throw error;
      
      if (data?.result) {
        setExcelResult(data.result);
        toast.success('Excel processed successfully!');
      } else {
        throw new Error('No result returned');
      }
    } catch (error: any) {
      console.error('Excel processing error:', error);
      toast.error(error.message || 'Failed to process Excel file');
    } finally {
      setIsProcessingExcel(false);
    }
  };

  const handleGenerateDocument = async () => {
    if (!user) {
      toast.error('Please login to generate documents');
      return;
    }
    
    if (!docContent.trim()) {
      toast.error('Please provide the content/information for your document');
      return;
    }
    
    if (userCredits < DOC_CREDIT_COST) {
      toast.error(`You need at least ${DOC_CREDIT_COST} credits to generate documents`);
      return;
    }

    setIsGeneratingDoc(true);
    setGeneratedDocument(null);

    try {
      const deducted = await deductCredits(DOC_CREDIT_COST);
      if (!deducted) {
        toast.error('Failed to deduct credits');
        return;
      }

      const selectedService = DOCUMENT_SERVICES.find(s => s.id === selectedDocService);
      
      const { data, error } = await supabase.functions.invoke('business-solutions', {
        body: {
          type: 'generate-document',
          serviceType: selectedDocService,
          serviceName: selectedService?.name || 'Document',
          content: docContent,
          instructions: docInstructions
        }
      });

      if (error) throw error;
      
      if (data?.document) {
        setGeneratedDocument(data.document);
        toast.success('Document generated successfully!');
      } else {
        throw new Error('No document returned');
      }
    } catch (error: any) {
      console.error('Document generation error:', error);
      toast.error(error.message || 'Failed to generate document');
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  const downloadDocument = () => {
    if (!generatedDocument) return;
    
    const selectedService = DOCUMENT_SERVICES.find(s => s.id === selectedDocService);
    const blob = new Blob([generatedDocument], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedService?.name.toLowerCase().replace(/\s+/g, '-') || 'document'}-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadPPT = async () => {
    if (!generatedPPT) return;
    
    try {
      toast.loading('Creating PowerPoint file with images...');
      
      const pptx = new pptxgen();
      pptx.title = generatedPPT.title || 'Presentation';
      pptx.author = 'TriviaBees AI Hub';
      
      // Design configurations
      const designConfigs: Record<string, {
        background: string;
        titleColor: string;
        textColor: string;
        accentColor: string;
      }> = {
        professional: { background: 'FFFFFF', titleColor: '1e40af', textColor: '1f2937', accentColor: '3b82f6' },
        creative: { background: 'faf5ff', titleColor: '7c3aed', textColor: '4c1d95', accentColor: 'a855f7' },
        minimal: { background: 'FFFFFF', titleColor: '111827', textColor: '374151', accentColor: '6b7280' },
        modern: { background: 'f0fdfa', titleColor: '0d9488', textColor: '134e4a', accentColor: '14b8a6' },
        dark: { background: '1e293b', titleColor: 'f8fafc', textColor: 'e2e8f0', accentColor: '38bdf8' },
        gradient: { background: 'fdf2f8', titleColor: 'be185d', textColor: '831843', accentColor: 'ec4899' },
      };
      
      const config = designConfigs[selectedDesign] || designConfigs.professional;
      
      // Process each slide
      for (let i = 0; i < generatedPPT.slides?.length; i++) {
        const slideData = generatedPPT.slides[i];
        const slide = pptx.addSlide();
        
        // Set background
        slide.background = { color: config.background };
        
        // Add title
        slide.addText(slideData.title || `Slide ${i + 1}`, {
          x: 0.5,
          y: 0.3,
          w: '90%',
          h: 0.8,
          fontSize: slideData.type === 'title' ? 36 : 28,
          bold: true,
          color: config.titleColor,
          fontFace: 'Arial',
        });
        
        // Handle different slide types
        if (slideData.type === 'title') {
          // Title slide with subtitle
          if (slideData.content) {
            slide.addText(slideData.content, {
              x: 0.5,
              y: 2.5,
              w: '90%',
              h: 1,
              fontSize: 20,
              color: config.textColor,
              fontFace: 'Arial',
            });
          }
        } else if (slideData.bulletPoints && slideData.bulletPoints.length > 0) {
          // Bullet points slide
          const bulletText = slideData.bulletPoints.map((point: string) => ({
            text: point,
            options: { bullet: true, fontSize: 18, color: config.textColor }
          }));
          
          slide.addText(bulletText, {
            x: 0.5,
            y: 1.5,
            w: slideData.imageUrl ? '45%' : '90%',
            h: 3.5,
            fontFace: 'Arial',
            valign: 'top',
          });
        } else if (slideData.content) {
          // Content slide
          slide.addText(slideData.content, {
            x: 0.5,
            y: 1.5,
            w: slideData.imageUrl ? '45%' : '90%',
            h: 3.5,
            fontSize: 16,
            color: config.textColor,
            fontFace: 'Arial',
            valign: 'top',
          });
        }
        
        // Add AI-generated image if available
        if (slideData.imageUrl && slideData.imageUrl.startsWith('data:image')) {
          try {
            slide.addImage({
              data: slideData.imageUrl,
              x: 5.2,
              y: 1.5,
              w: 4,
              h: 3,
              sizing: { type: 'contain', w: 4, h: 3 },
            });
          } catch (imgError) {
            console.error('Failed to add image:', imgError);
          }
        }
        
        // Add accent bar
        slide.addShape(pptx.ShapeType.rect, {
          x: 0,
          y: 5.1,
          w: '100%',
          h: 0.15,
          fill: { color: config.accentColor },
        });
        
        // Add slide number
        slide.addText(`${i + 1}`, {
          x: 9,
          y: 5.1,
          w: 0.5,
          h: 0.3,
          fontSize: 10,
          color: config.accentColor,
        });
        
        // Add speaker notes if available
        if (slideData.speakerNotes) {
          slide.addNotes(slideData.speakerNotes);
        }
      }
      
      // Generate and download the file
      await pptx.writeFile({ fileName: `presentation-${Date.now()}.pptx` });
      toast.dismiss();
      toast.success('PowerPoint presentation downloaded!');
      
    } catch (error) {
      console.error('PPT generation error:', error);
      toast.dismiss();
      toast.error('Failed to create PowerPoint file');
    }
  };

  const downloadExcelResult = () => {
    if (!excelResult) return;
    
    const content = typeof excelResult === 'string' ? excelResult : JSON.stringify(excelResult, null, 2);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `report-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white border-0 overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
        <CardHeader className="relative z-10">
          <CardTitle className="flex items-center gap-3 text-2xl">
            <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm">
              <Sparkles className="h-6 w-6" />
            </div>
            Business Solutions Hub
          </CardTitle>
          <CardDescription className="text-white/80">
            AI-powered tools for everyday business tasks. Generate presentations, automate reports, and streamline your workflow.
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-1">
          <TabsTrigger value="powerpoint" className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white">
            <Presentation className="h-4 w-4" />
            <span className="hidden sm:inline">PowerPoint</span>
            <span className="sm:hidden">PPT</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Documents</span>
            <span className="sm:hidden">Docs</span>
          </TabsTrigger>
          <TabsTrigger value="excel" className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white">
            <FileSpreadsheet className="h-4 w-4" />
            <span className="hidden sm:inline">Excel</span>
            <span className="sm:hidden">Excel</span>
          </TabsTrigger>
        </TabsList>

        {/* PowerPoint Generator */}
        <TabsContent value="powerpoint" className="space-y-4">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500/5 via-red-500/5 to-pink-500/5 overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500" />
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 text-white">
                  <Presentation className="h-5 w-5" />
                </div>
                <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent font-bold">
                  AI PowerPoint Generator
                </span>
              </CardTitle>
              <CardDescription>
                Create professional presentations from documents or topics in seconds
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Mode Selection */}
              <div className="space-y-2">
                <Label>Generation Mode</Label>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    type="button"
                    variant={pptMode === 'topic' ? 'default' : 'outline'}
                    className="h-auto py-4 flex flex-col gap-2"
                    onClick={() => setPptMode('topic')}
                  >
                    <Search className="h-5 w-5" />
                    <span className="text-sm">From Topic</span>
                    <span className="text-xs text-muted-foreground">Enter a topic and let AI create slides</span>
                  </Button>
                  <Button
                    type="button"
                    variant={pptMode === 'document' ? 'default' : 'outline'}
                    className="h-auto py-4 flex flex-col gap-2"
                    onClick={() => setPptMode('document')}
                  >
                    <FileText className="h-5 w-5" />
                    <span className="text-sm">From Document</span>
                    <span className="text-xs text-muted-foreground">Upload Word/PDF to transform</span>
                  </Button>
                </div>
              </div>

              {/* Topic Input */}
              {pptMode === 'topic' && (
                <div className="space-y-2">
                  <Label htmlFor="topic">Presentation Topic</Label>
                  <Textarea
                    id="topic"
                    placeholder="e.g., Q4 2024 Sales Performance Review, Introduction to Machine Learning, Marketing Strategy for 2025..."
                    value={presentationTopic}
                    onChange={(e) => setPresentationTopic(e.target.value)}
                    rows={3}
                  />
                </div>
              )}

              {/* Document Upload */}
              {pptMode === 'document' && (
                <div className="space-y-2">
                  <Label>Upload Document</Label>
                  <div className="border-2 border-dashed rounded-lg p-6 text-center space-y-4">
                    {uploadedDocument ? (
                      <div className="flex items-center justify-center gap-2 text-green-600">
                        <FileCheck className="h-8 w-8" />
                        <div>
                          <p className="font-medium">{documentName}</p>
                          <p className="text-sm text-muted-foreground">Document ready for conversion</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Upload Word (.docx), PDF, or Text file
                        </p>
                      </>
                    )}
                    <Input
                      type="file"
                      accept=".docx,.doc,.pdf,.txt"
                      onChange={handleDocumentUpload}
                      className="max-w-xs mx-auto"
                    />
                  </div>
                </div>
              )}

              {/* Slide Count */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="slideCount">Number of Slides</Label>
                  <Select value={slideCount} onValueChange={setSlideCount}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 slides</SelectItem>
                      <SelectItem value="10">10 slides</SelectItem>
                      <SelectItem value="15">15 slides</SelectItem>
                      <SelectItem value="20">20 slides</SelectItem>
                      <SelectItem value="30">30 slides</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Credits Required</Label>
                  <div className="flex items-center gap-2 h-10 px-3 rounded-md border bg-muted">
                    <Badge variant="secondary">{PPT_CREDIT_COST} credits</Badge>
                    <span className="text-sm text-muted-foreground">per presentation</span>
                  </div>
                </div>
              </div>

              {/* Design Selection */}
              <div className="space-y-2">
                <Label>Presentation Design</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {PRESENTATION_DESIGNS.map((design) => (
                    <button
                      key={design.id}
                      type="button"
                      onClick={() => setSelectedDesign(design.id)}
                      className={`p-3 rounded-lg border-2 transition-all text-left ${
                        selectedDesign === design.id 
                          ? 'border-primary ring-2 ring-primary/20' 
                          : 'border-muted hover:border-muted-foreground/50'
                      }`}
                    >
                      <div className={`h-8 w-full rounded mb-2 ${design.color}`} />
                      <p className="font-medium text-sm">{design.name}</p>
                      <p className="text-xs text-muted-foreground">{design.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Progress */}
              {isGeneratingPPT && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Generating presentation...</span>
                    <span>{generationProgress}%</span>
                  </div>
                  <Progress value={generationProgress} />
                </div>
              )}

              {/* Generate Button */}
              <Button
                onClick={handleGeneratePPT}
                disabled={isGeneratingPPT || (pptMode === 'topic' && !presentationTopic.trim()) || (pptMode === 'document' && !uploadedDocument)}
                className="w-full gap-2"
                size="lg"
              >
                {isGeneratingPPT ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Generating Presentation...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-5 w-5" />
                    Generate PowerPoint
                  </>
                )}
              </Button>

              {/* Generated Result */}
              {generatedPPT && (
                <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <Sparkles className="h-5 w-5" />
                      <span className="font-medium">Presentation Generated!</span>
                    </div>
                    
                    <div className="space-y-3">
                      <h4 className="font-medium">{generatedPPT.title}</h4>
                      <p className="text-sm text-muted-foreground">{generatedPPT.slides?.length || 0} slides created</p>
                      
                      {/* Slide Preview */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                        {generatedPPT.slides?.slice(0, 8).map((slide: any, idx: number) => (
                          <div key={idx} className="p-2 bg-white dark:bg-gray-800 rounded border text-xs">
                            <p className="font-medium truncate">{slide.title || `Slide ${idx + 1}`}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Button onClick={downloadPPT} className="w-full gap-2">
                      <Download className="h-4 w-4" />
                      Download Presentation Data
                    </Button>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Document Generator */}
        <TabsContent value="documents" className="space-y-4">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500/5 via-indigo-500/5 to-violet-500/5 overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white">
                  <FileText className="h-5 w-5" />
                </div>
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent font-bold">
                  Professional Document Generator
                </span>
              </CardTitle>
              <CardDescription>
                Create professional documents for your career and business needs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Service Selection Dropdown */}
              <div className="space-y-2">
                <Label>Select Document Type</Label>
                <Select value={selectedDocService} onValueChange={setSelectedDocService}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a document type" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_SERVICES.map((service) => {
                      const IconComponent = service.icon;
                      return (
                        <SelectItem key={service.id} value={service.id}>
                          <div className="flex items-center gap-2">
                            <IconComponent className="h-4 w-4 text-blue-600" />
                            <div>
                              <span className="font-medium">{service.name}</span>
                              <span className="text-muted-foreground text-xs ml-2">- {service.description}</span>
                            </div>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Service Cards Preview */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {DOCUMENT_SERVICES.map((service) => {
                  const IconComponent = service.icon;
                  const isSelected = selectedDocService === service.id;
                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => setSelectedDocService(service.id)}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/20' 
                          : 'border-border hover:border-blue-300 hover:bg-blue-500/5'
                      }`}
                    >
                      <IconComponent className={`h-5 w-5 mb-2 ${isSelected ? 'text-blue-600' : 'text-muted-foreground'}`} />
                      <p className={`text-sm font-medium ${isSelected ? 'text-blue-600' : ''}`}>{service.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{service.description}</p>
                    </button>
                  );
                })}
              </div>

              {/* Content Input */}
              <div className="space-y-2">
                <Label>
                  {selectedDocService === 'resume' && 'Your Experience & Skills'}
                  {selectedDocService === 'pitch' && 'Product/Company Details'}
                  {selectedDocService === 'resolution' && 'Resolution Details'}
                  {selectedDocService === 'proposal' && 'Proposal Details'}
                  {selectedDocService === 'cover-letter' && 'Job & Your Background'}
                  {selectedDocService === 'academic' && 'Paper Topic & Research'}
                </Label>
                <Textarea
                  placeholder={
                    selectedDocService === 'resume' 
                      ? 'Enter your work experience, education, skills, and achievements...'
                      : selectedDocService === 'pitch'
                      ? 'Describe your product/company, target market, value proposition...'
                      : selectedDocService === 'resolution'
                      ? 'Enter the resolution topic, parties involved, terms, and conditions...'
                      : selectedDocService === 'proposal'
                      ? 'Describe the project, objectives, timeline, budget, and deliverables...'
                      : selectedDocService === 'cover-letter'
                      ? 'Enter the job title, company, and your relevant experience...'
                      : 'Enter your research topic, thesis statement, and key points...'
                  }
                  value={docContent}
                  onChange={(e) => setDocContent(e.target.value)}
                  rows={6}
                  className="resize-none"
                />
              </div>

              {/* Additional Instructions */}
              <div className="space-y-2">
                <Label>Additional Instructions (Optional)</Label>
                <Textarea
                  placeholder="Any specific requirements, tone, format preferences, or details to include..."
                  value={docInstructions}
                  onChange={(e) => setDocInstructions(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>

              {/* Generate Button */}
              <div className="flex items-center justify-between bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">
                    {DOC_CREDIT_COST} Credits
                  </Badge>
                  <span className="text-sm text-muted-foreground">per document</span>
                </div>
                <Button
                  onClick={handleGenerateDocument}
                  disabled={isGeneratingDoc || !docContent.trim() || userCredits < DOC_CREDIT_COST}
                  className="gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
                >
                  {isGeneratingDoc ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4" />
                      Generate Document
                    </>
                  )}
                </Button>
              </div>

              {/* Generated Document Result */}
              {generatedDocument && (
                <Card className="border-green-500/50 bg-green-500/5">
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <Sparkles className="h-5 w-5" />
                      <span className="font-medium">Document Generated!</span>
                    </div>
                    
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto border">
                      <pre className="whitespace-pre-wrap text-sm font-sans">{generatedDocument}</pre>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={downloadDocument} className="flex-1 gap-2">
                        <Download className="h-4 w-4" />
                        Download Document
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          navigator.clipboard.writeText(generatedDocument);
                          toast.success('Copied to clipboard!');
                        }}
                        className="gap-2"
                      >
                        Copy
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Excel Automation */}
        <TabsContent value="excel" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-green-600" />
                Excel Automation & Reporting
              </CardTitle>
              <CardDescription>
                Transform your Excel data into actionable insights, reports, and visualizations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Excel Upload */}
              <div className="space-y-2">
                <Label>Upload Excel File</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center space-y-4">
                  {uploadedExcel ? (
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <FileCheck className="h-8 w-8" />
                      <div>
                        <p className="font-medium">{excelName}</p>
                        <p className="text-sm text-muted-foreground">File ready for processing</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Upload Excel (.xlsx, .xls) or CSV file
                      </p>
                    </>
                  )}
                  <Input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleExcelUpload}
                    className="max-w-xs mx-auto"
                  />
                </div>
              </div>

              {/* Operation Selection */}
              <div className="space-y-2">
                <Label>Select Operation</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {EXCEL_OPERATIONS.map((op) => {
                    const Icon = op.icon;
                    return (
                      <button
                        key={op.id}
                        type="button"
                        onClick={() => setSelectedOperation(op.id)}
                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                          selectedOperation === op.id 
                            ? 'border-primary ring-2 ring-primary/20 bg-primary/5' 
                            : 'border-muted hover:border-muted-foreground/50'
                        }`}
                      >
                        <Icon className={`h-6 w-6 mb-2 ${selectedOperation === op.id ? 'text-primary' : 'text-muted-foreground'}`} />
                        <p className="font-medium text-sm">{op.name}</p>
                        <p className="text-xs text-muted-foreground">{op.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Instructions */}
              <div className="space-y-2">
                <Label htmlFor="instructions">Additional Instructions (Optional)</Label>
                <Textarea
                  id="instructions"
                  placeholder="e.g., Focus on Q4 data, compare with last year, highlight top 10 performers..."
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Credits Info */}
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Badge variant="secondary">{EXCEL_CREDIT_COST} credits</Badge>
                <span className="text-sm text-muted-foreground">per operation</span>
              </div>

              {/* Process Button */}
              <Button
                onClick={handleProcessExcel}
                disabled={isProcessingExcel || !uploadedExcel}
                className="w-full gap-2"
                size="lg"
              >
                {isProcessingExcel ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Processing Excel...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-5 w-5" />
                    Process & Generate
                  </>
                )}
              </Button>

              {/* Excel Result */}
              {excelResult && (
                <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <Sparkles className="h-5 w-5" />
                      <span className="font-medium">Report Generated!</span>
                    </div>
                    
                    <div className="space-y-3">
                      {excelResult.summary && (
                        <div className="p-3 bg-white dark:bg-gray-800 rounded border">
                          <h4 className="font-medium mb-2">Executive Summary</h4>
                          <p className="text-sm text-muted-foreground">{excelResult.summary}</p>
                        </div>
                      )}
                      
                      {excelResult.insights && (
                        <div className="p-3 bg-white dark:bg-gray-800 rounded border">
                          <h4 className="font-medium mb-2">Key Insights</h4>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {excelResult.insights.map((insight: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-primary">•</span>
                                {insight}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {excelResult.recommendations && (
                        <div className="p-3 bg-white dark:bg-gray-800 rounded border">
                          <h4 className="font-medium mb-2">Recommendations</h4>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {excelResult.recommendations.map((rec: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-green-500">✓</span>
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <Button onClick={downloadExcelResult} className="w-full gap-2">
                      <Download className="h-4 w-4" />
                      Download Full Report
                    </Button>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BusinessSolutions;
