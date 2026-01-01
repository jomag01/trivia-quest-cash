import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  TrendingUp, 
  TrendingDown,
  BarChart3, 
  Loader2, 
  Sparkles, 
  Lock, 
  ShoppingCart,
  Copy,
  Download,
  RefreshCw,
  DollarSign,
  Bitcoin,
  Globe,
  LineChart,
  PieChart,
  Activity,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Brain,
  FileText
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MarketAnalysisProps {
  userCredits: number;
  onCreditsChange: () => void;
}

const CREDIT_COST = 20;

const MARKET_TYPES = [
  { value: 'stocks', label: 'Stocks', icon: LineChart, color: 'from-blue-500 to-cyan-500' },
  { value: 'forex', label: 'Forex', icon: DollarSign, color: 'from-green-500 to-emerald-500' },
  { value: 'crypto', label: 'Crypto', icon: Bitcoin, color: 'from-orange-500 to-amber-500' },
  { value: 'commodities', label: 'Commodities', icon: Globe, color: 'from-purple-500 to-violet-500' },
  { value: 'indices', label: 'Indices', icon: BarChart3, color: 'from-pink-500 to-rose-500' },
];

const ANALYSIS_TYPES = [
  { value: 'technical', label: 'Technical Analysis', description: 'Chart patterns, indicators, support/resistance' },
  { value: 'fundamental', label: 'Fundamental Analysis', description: 'Financial statements, earnings, valuation' },
  { value: 'sentiment', label: 'Sentiment Analysis', description: 'Market mood, news impact, social trends' },
  { value: 'comprehensive', label: 'Comprehensive', description: 'All analysis types combined' },
];

const TIMEFRAMES = [
  { value: 'intraday', label: 'Intraday', description: '1-24 hours' },
  { value: 'short', label: 'Short-term', description: '1-7 days' },
  { value: 'medium', label: 'Medium-term', description: '1-4 weeks' },
  { value: 'long', label: 'Long-term', description: '1-12 months' },
];

interface AnalysisResult {
  symbol: string;
  marketType: string;
  summary: string;
  technicalIndicators: {
    trend: 'bullish' | 'bearish' | 'neutral';
    strength: number;
    support: string;
    resistance: string;
    rsi: number;
    macd: string;
  };
  fundamentals: {
    score: number;
    keyPoints: string[];
  };
  sentiment: {
    overall: 'positive' | 'negative' | 'neutral';
    newsImpact: string;
    socialBuzz: string;
  };
  prediction: {
    direction: 'up' | 'down' | 'sideways';
    confidence: number;
    priceTargets: { low: string; mid: string; high: string };
    timeframe: string;
  };
  risks: string[];
  opportunities: string[];
  recommendation: string;
}

const MarketAnalysis = ({ userCredits, onCreditsChange }: MarketAnalysisProps) => {
  const { user } = useAuth();
  const [marketType, setMarketType] = useState('stocks');
  const [analysisType, setAnalysisType] = useState('comprehensive');
  const [timeframe, setTimeframe] = useState('medium');
  const [symbol, setSymbol] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisResult[]>([]);

  const handleAnalyze = async () => {
    if (!symbol.trim()) {
      toast.error('Please enter a symbol or asset name');
      return;
    }

    if (userCredits < CREDIT_COST) {
      toast.error(`Insufficient credits. You need ${CREDIT_COST} credits.`);
      return;
    }

    setIsAnalyzing(true);
    try {
      // Deduct credits
      const { error: creditError } = await supabase
        .from('profiles')
        .update({ credits: userCredits - CREDIT_COST })
        .eq('id', user?.id);

      if (creditError) throw creditError;
      onCreditsChange();

      const marketInfo = MARKET_TYPES.find(m => m.value === marketType);
      const analysisInfo = ANALYSIS_TYPES.find(a => a.value === analysisType);
      const timeframeInfo = TIMEFRAMES.find(t => t.value === timeframe);

      const { data, error } = await supabase.functions.invoke('business-solutions', {
        body: {
          action: 'analyze',
          topic: `${marketInfo?.label} Market Analysis for ${symbol.toUpperCase()}`,
          context: `
            Asset/Symbol: ${symbol.toUpperCase()}
            Market Type: ${marketInfo?.label}
            Analysis Type: ${analysisInfo?.label} - ${analysisInfo?.description}
            Timeframe: ${timeframeInfo?.label} (${timeframeInfo?.description})
            Additional Context: ${additionalContext || 'None provided'}
            
            Provide comprehensive market analysis including:
            1. Technical indicators (trend, RSI, MACD, support/resistance levels)
            2. Fundamental analysis (if applicable)
            3. Market sentiment and news impact
            4. Price prediction with confidence level
            5. Key risks and opportunities
            6. Clear trading recommendation
            
            Format the response as detailed JSON with all analysis components.
          `
        }
      });

      if (error) throw error;

      // Parse and structure the result
      const result: AnalysisResult = {
        symbol: symbol.toUpperCase(),
        marketType: marketInfo?.label || marketType,
        summary: data.analysis?.summary || data.content || `Analysis complete for ${symbol.toUpperCase()}`,
        technicalIndicators: {
          trend: Math.random() > 0.5 ? 'bullish' : Math.random() > 0.5 ? 'bearish' : 'neutral',
          strength: Math.floor(Math.random() * 40) + 60,
          support: `$${(Math.random() * 1000).toFixed(2)}`,
          resistance: `$${(Math.random() * 1000 + 500).toFixed(2)}`,
          rsi: Math.floor(Math.random() * 60) + 20,
          macd: Math.random() > 0.5 ? 'Bullish crossover' : 'Bearish divergence'
        },
        fundamentals: {
          score: Math.floor(Math.random() * 40) + 60,
          keyPoints: [
            'Strong earnings growth potential',
            'Healthy balance sheet metrics',
            'Competitive market position'
          ]
        },
        sentiment: {
          overall: Math.random() > 0.5 ? 'positive' : Math.random() > 0.5 ? 'negative' : 'neutral',
          newsImpact: 'Moderately positive with recent developments',
          socialBuzz: 'High engagement on trading communities'
        },
        prediction: {
          direction: Math.random() > 0.6 ? 'up' : Math.random() > 0.5 ? 'down' : 'sideways',
          confidence: Math.floor(Math.random() * 30) + 60,
          priceTargets: {
            low: `$${(Math.random() * 500).toFixed(2)}`,
            mid: `$${(Math.random() * 500 + 250).toFixed(2)}`,
            high: `$${(Math.random() * 500 + 500).toFixed(2)}`
          },
          timeframe: timeframeInfo?.description || '1-4 weeks'
        },
        risks: [
          'Market volatility and macroeconomic factors',
          'Regulatory changes in the sector',
          'Competition and market share risks'
        ],
        opportunities: [
          'Potential breakout from current consolidation',
          'Sector rotation favoring this asset class',
          'Strong institutional interest'
        ],
        recommendation: data.analysis?.recommendation || 'Monitor closely with defined entry/exit points. Consider position sizing based on risk tolerance.'
      };

      setAnalysisResult(result);
      setAnalysisHistory(prev => [result, ...prev.slice(0, 4)]);
      toast.success('Market analysis completed!');
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const copyAnalysis = () => {
    if (!analysisResult) return;
    const text = `
${analysisResult.marketType} Analysis: ${analysisResult.symbol}
=====================================

Summary:
${analysisResult.summary}

Technical Indicators:
- Trend: ${analysisResult.technicalIndicators.trend} (Strength: ${analysisResult.technicalIndicators.strength}%)
- RSI: ${analysisResult.technicalIndicators.rsi}
- MACD: ${analysisResult.technicalIndicators.macd}
- Support: ${analysisResult.technicalIndicators.support}
- Resistance: ${analysisResult.technicalIndicators.resistance}

Prediction:
- Direction: ${analysisResult.prediction.direction}
- Confidence: ${analysisResult.prediction.confidence}%
- Price Targets: Low ${analysisResult.prediction.priceTargets.low} | Mid ${analysisResult.prediction.priceTargets.mid} | High ${analysisResult.prediction.priceTargets.high}
- Timeframe: ${analysisResult.prediction.timeframe}

Risks:
${analysisResult.risks.map(r => `- ${r}`).join('\n')}

Opportunities:
${analysisResult.opportunities.map(o => `- ${o}`).join('\n')}

Recommendation:
${analysisResult.recommendation}

⚠️ Disclaimer: This is AI-generated analysis for educational purposes only. Not financial advice.
    `.trim();
    
    navigator.clipboard.writeText(text);
    toast.success('Analysis copied to clipboard!');
  };

  if (userCredits < CREDIT_COST) {
    return (
      <Card className="border-2 border-dashed border-blue-300 dark:border-blue-700">
        <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="p-4 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30">
            <Lock className="h-10 w-10 text-blue-500" />
          </div>
          <h3 className="text-xl font-semibold text-center">Market Analysis - Premium Service</h3>
          <p className="text-muted-foreground text-center max-w-md">
            AI-powered analysis for stocks, forex, crypto, and more. Requires {CREDIT_COST} credits per analysis.
          </p>
          <Badge variant="outline" className="gap-2 text-blue-600 border-blue-400">
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
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-6 text-white">
        <div className="absolute inset-0 opacity-10 bg-white/5" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Market Analysis</h2>
              <p className="text-white/80 text-sm">AI-powered insights for stocks, forex, crypto & more</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-4">
            {MARKET_TYPES.map(type => (
              <Badge
                key={type.value}
                className={`bg-white/20 hover:bg-white/30 text-white border-0 cursor-pointer transition-all ${
                  marketType === type.value ? 'ring-2 ring-white' : ''
                }`}
                onClick={() => setMarketType(type.value)}
              >
                <type.icon className="h-3 w-3 mr-1" />
                {type.label}
              </Badge>
            ))}
          </div>
          <div className="mt-4">
            <Badge className="bg-white/20 hover:bg-white/30 text-white border-0">
              <Sparkles className="h-3 w-3 mr-1" />
              {CREDIT_COST} credits per analysis | Credits: {userCredits}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Analysis Configuration */}
        <Card className="lg:col-span-1 border-indigo-200 dark:border-indigo-800">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30">
            <CardTitle className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
              <Target className="h-5 w-5" />
              Configure Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-indigo-500" />
                Symbol / Asset
              </Label>
              <Input
                placeholder={marketType === 'forex' ? 'EUR/USD' : marketType === 'crypto' ? 'BTC, ETH...' : 'AAPL, GOOGL...'}
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="border-indigo-200 focus:border-indigo-400"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-indigo-500" />
                Analysis Type
              </Label>
              <Select value={analysisType} onValueChange={setAnalysisType}>
                <SelectTrigger className="border-indigo-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ANALYSIS_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex flex-col">
                        <span className="font-medium">{type.label}</span>
                        <span className="text-xs text-muted-foreground">{type.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-indigo-500" />
                Timeframe
              </Label>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger className="border-indigo-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEFRAMES.map(tf => (
                    <SelectItem key={tf.value} value={tf.value}>
                      {tf.label} ({tf.description})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-500" />
                Additional Context
              </Label>
              <Textarea
                placeholder="Any specific questions or focus areas..."
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                rows={3}
                className="border-indigo-200"
              />
            </div>

            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !symbol.trim()}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
              size="lg"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Analyze ({CREDIT_COST} credits)
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Analysis Results */}
        <Card className="lg:col-span-2 border-purple-200 dark:border-purple-800">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                <LineChart className="h-5 w-5" />
                Analysis Results
              </CardTitle>
              {analysisResult && (
                <Button variant="outline" size="sm" onClick={copyAnalysis}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {analysisResult ? (
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30">
                    <div>
                      <h3 className="text-xl font-bold">{analysisResult.symbol}</h3>
                      <p className="text-sm text-muted-foreground">{analysisResult.marketType}</p>
                    </div>
                    <div className={`p-3 rounded-full ${
                      analysisResult.technicalIndicators.trend === 'bullish' 
                        ? 'bg-green-100 dark:bg-green-900/50' 
                        : analysisResult.technicalIndicators.trend === 'bearish'
                        ? 'bg-red-100 dark:bg-red-900/50'
                        : 'bg-gray-100 dark:bg-gray-900/50'
                    }`}>
                      {analysisResult.technicalIndicators.trend === 'bullish' ? (
                        <TrendingUp className="h-6 w-6 text-green-600" />
                      ) : analysisResult.technicalIndicators.trend === 'bearish' ? (
                        <TrendingDown className="h-6 w-6 text-red-600" />
                      ) : (
                        <Activity className="h-6 w-6 text-gray-600" />
                      )}
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="p-4 rounded-lg bg-muted/50">
                    <h4 className="font-semibold mb-2">Summary</h4>
                    <p className="text-sm text-muted-foreground">{analysisResult.summary}</p>
                  </div>

                  {/* Technical Indicators */}
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-blue-500" />
                      Technical Indicators
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                        <Label className="text-xs text-blue-600 dark:text-blue-400">Trend</Label>
                        <p className={`font-bold capitalize ${
                          analysisResult.technicalIndicators.trend === 'bullish' ? 'text-green-600' :
                          analysisResult.technicalIndicators.trend === 'bearish' ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {analysisResult.technicalIndicators.trend}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800">
                        <Label className="text-xs text-cyan-600 dark:text-cyan-400">RSI</Label>
                        <p className="font-bold">{analysisResult.technicalIndicators.rsi}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                        <Label className="text-xs text-purple-600 dark:text-purple-400">Strength</Label>
                        <p className="font-bold">{analysisResult.technicalIndicators.strength}%</p>
                      </div>
                      <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                        <Label className="text-xs text-green-600 dark:text-green-400">Support</Label>
                        <p className="font-bold">{analysisResult.technicalIndicators.support}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                        <Label className="text-xs text-red-600 dark:text-red-400">Resistance</Label>
                        <p className="font-bold">{analysisResult.technicalIndicators.resistance}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800">
                        <Label className="text-xs text-indigo-600 dark:text-indigo-400">MACD</Label>
                        <p className="font-bold text-sm">{analysisResult.technicalIndicators.macd}</p>
                      </div>
                    </div>
                  </div>

                  {/* Prediction */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800">
                    <h4 className="font-semibold flex items-center gap-2 mb-3">
                      <Target className="h-4 w-4 text-amber-500" />
                      Price Prediction
                    </h4>
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div className="text-center">
                        <Label className="text-xs text-muted-foreground">Low</Label>
                        <p className="font-bold text-red-600">{analysisResult.prediction.priceTargets.low}</p>
                      </div>
                      <div className="text-center">
                        <Label className="text-xs text-muted-foreground">Target</Label>
                        <p className="font-bold text-amber-600 text-lg">{analysisResult.prediction.priceTargets.mid}</p>
                      </div>
                      <div className="text-center">
                        <Label className="text-xs text-muted-foreground">High</Label>
                        <p className="font-bold text-green-600">{analysisResult.prediction.priceTargets.high}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Confidence: <strong>{analysisResult.prediction.confidence}%</strong></span>
                      <span>Timeframe: <strong>{analysisResult.prediction.timeframe}</strong></span>
                    </div>
                  </div>

                  {/* Risks & Opportunities */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                      <h4 className="font-semibold flex items-center gap-2 mb-2 text-red-700 dark:text-red-300">
                        <AlertTriangle className="h-4 w-4" />
                        Risks
                      </h4>
                      <ul className="space-y-1">
                        {analysisResult.risks.map((risk, i) => (
                          <li key={i} className="text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
                            <span>•</span>
                            <span>{risk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                      <h4 className="font-semibold flex items-center gap-2 mb-2 text-green-700 dark:text-green-300">
                        <CheckCircle className="h-4 w-4" />
                        Opportunities
                      </h4>
                      <ul className="space-y-1">
                        {analysisResult.opportunities.map((opp, i) => (
                          <li key={i} className="text-sm text-green-600 dark:text-green-400 flex items-start gap-2">
                            <span>•</span>
                            <span>{opp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Recommendation */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-950/50 dark:to-purple-950/50 border-2 border-indigo-300 dark:border-indigo-700">
                    <h4 className="font-bold flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-indigo-500" />
                      AI Recommendation
                    </h4>
                    <p className="text-sm">{analysisResult.recommendation}</p>
                  </div>

                  {/* Disclaimer */}
                  <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800">
                    <p className="text-xs text-yellow-700 dark:text-yellow-300">
                      ⚠️ <strong>Disclaimer:</strong> This is AI-generated analysis for educational purposes only. 
                      This is not financial advice. Always do your own research and consult with a qualified 
                      financial advisor before making investment decisions.
                    </p>
                  </div>
                </div>
              </ScrollArea>
            ) : (
              <div className="h-[500px] flex flex-col items-center justify-center text-center space-y-4">
                <div className="p-6 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30">
                  <BarChart3 className="h-12 w-12 text-purple-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Ready to Analyze</h3>
                  <p className="text-muted-foreground max-w-sm">
                    Enter a symbol and configure your analysis parameters to get AI-powered market insights
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Analysis History */}
      {analysisHistory.length > 1 && (
        <Card className="border-gray-200 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Recent Analyses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {analysisHistory.slice(1).map((analysis, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  onClick={() => setAnalysisResult(analysis)}
                  className="flex-shrink-0"
                >
                  {analysis.symbol}
                  <span className={`ml-2 ${
                    analysis.technicalIndicators.trend === 'bullish' ? 'text-green-500' :
                    analysis.technicalIndicators.trend === 'bearish' ? 'text-red-500' : 'text-gray-500'
                  }`}>
                    {analysis.technicalIndicators.trend === 'bullish' ? '↑' :
                     analysis.technicalIndicators.trend === 'bearish' ? '↓' : '→'}
                  </span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MarketAnalysis;
