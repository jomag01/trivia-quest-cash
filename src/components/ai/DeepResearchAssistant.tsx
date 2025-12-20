import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Search, 
  Sparkles, 
  Loader2, 
  Copy, 
  Send, 
  Brain, 
  Lightbulb,
  Zap,
  Bot,
  User,
  RefreshCw,
  Video,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  timestamp: Date;
}

interface DeepResearchAssistantProps {
  compact?: boolean;
  onCreateVideo?: (researchContent: string, topic: string) => void;
  initialQuery?: string;
}

const DeepResearchAssistant: React.FC<DeepResearchAssistantProps> = ({ compact = false, onCreateVideo, initialQuery }) => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isResearching, setIsResearching] = useState(false);
  const [selectedModel, setSelectedModel] = useState<'gemini-pro' | 'gpt-5'>('gemini-pro');
  const scrollRef = useRef<HTMLDivElement>(null);
  const initialQueryProcessed = useRef(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle initial query from props
  useEffect(() => {
    if (initialQuery && !initialQueryProcessed.current && user) {
      initialQueryProcessed.current = true;
      // Directly trigger research with the initial query
      const runInitialResearch = async () => {
        const userMessage: Message = {
          id: Date.now().toString(),
          role: 'user',
          content: initialQuery.trim(),
          timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setIsResearching(true);

        try {
          const { data, error } = await supabase.functions.invoke('deep-research', {
            body: {
              query: initialQuery.trim(),
              model: selectedModel,
              conversationHistory: []
            }
          });

          if (error) throw error;

          if (data?.result) {
            const assistantMessage: Message = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: data.result,
              model: data.model,
              timestamp: new Date()
            };
            setMessages(prev => [...prev, assistantMessage]);
            toast.success('Research completed!');
          } else if (data?.error) {
            throw new Error(data.error);
          }
        } catch (error: any) {
          console.error('Research error:', error);
          toast.error(error.message || 'Research failed');
          setMessages(prev => prev.filter(m => m.id !== userMessage.id));
        } finally {
          setIsResearching(false);
        }
      };

      runInitialResearch();
    }
  }, [initialQuery, user, selectedModel]);

  const handleResearch = async () => {
    if (!query.trim()) {
      toast.error('Please enter a research query');
      return;
    }

    if (!user) {
      toast.error('Please login to use research assistant');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: query.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsResearching(true);
    setQuery('');

    try {
      const { data, error } = await supabase.functions.invoke('deep-research', {
        body: {
          query: userMessage.content,
          model: selectedModel,
          conversationHistory: messages.slice(-6)
        }
      });

      if (error) throw error;

      if (data?.result) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.result,
          model: data.model,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
        toast.success('Research completed!');
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Research error:', error);
      toast.error(error.message || 'Research failed');
      // Remove the user message if research failed
      setMessages(prev => prev.filter(m => m.id !== userMessage.id));
    } finally {
      setIsResearching(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const clearConversation = () => {
    setMessages([]);
    toast.success('Conversation cleared');
  };

  const formatContent = (content: string) => {
    // Simple markdown-like formatting
    return content
      .split('\n')
      .map((line, i) => {
        if (line.startsWith('**') && line.endsWith('**')) {
          return <h3 key={i} className="font-bold text-lg mt-4 mb-2 text-primary">{line.replace(/\*\*/g, '')}</h3>;
        }
        if (line.startsWith('- ')) {
          return <li key={i} className="ml-4">{line.substring(2)}</li>;
        }
        if (line.match(/^\d+\./)) {
          return <p key={i} className="ml-4 mb-1">{line}</p>;
        }
        if (line.trim() === '') {
          return <br key={i} />;
        }
        return <p key={i} className="mb-2">{line}</p>;
      });
  };

  return (
    <Card className={cn("border-0 shadow-xl bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-indigo-500/10 overflow-hidden relative", compact ? "h-full" : "")}>
      {/* Colorful header gradient */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500" />
      
      <CardHeader className="pb-3 bg-gradient-to-r from-cyan-500/5 to-blue-500/5">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white">
              <Brain className="w-5 h-5" />
            </div>
            <span className="bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent font-bold">
              Deep Research Assistant
            </span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={selectedModel} onValueChange={(v) => setSelectedModel(v as 'gemini-pro' | 'gpt-5')}>
              <SelectTrigger className="w-[140px] h-8 border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 to-blue-500/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gemini-pro">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3 h-3 text-cyan-500" />
                    Gemini Pro
                  </div>
                </SelectItem>
                <SelectItem value="gpt-5">
                  <div className="flex items-center gap-2">
                    <Zap className="w-3 h-3 text-yellow-500" />
                    GPT-5
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            {messages.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearConversation}
                className="h-8 hover:bg-cyan-500/10"
              >
                <RefreshCw className="w-4 h-4 text-cyan-500" />
              </Button>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Advanced multi-step analysis powered by {selectedModel === 'gpt-5' ? 'GPT-5' : 'Gemini Pro'}
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Quick Research Topics */}
        {messages.length === 0 && (
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: Lightbulb, label: 'Business Strategy', query: 'Analyze modern business strategies for startups in 2024', color: 'from-amber-500 to-orange-500' },
              { icon: Search, label: 'Market Research', query: 'Conduct market research on the AI industry trends', color: 'from-cyan-500 to-blue-500' },
              { icon: Brain, label: 'Technical Analysis', query: 'Explain the architecture of modern AI systems', color: 'from-purple-500 to-pink-500' },
              { icon: Zap, label: 'Trend Analysis', query: 'What are the emerging technology trends for 2025?', color: 'from-green-500 to-emerald-500' },
            ].map((item, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                className={cn(
                  "justify-start gap-2 h-auto py-3 px-3 text-left border-0",
                  `bg-gradient-to-r ${item.color} bg-opacity-10 hover:opacity-90 transition-opacity`
                )}
                style={{ background: `linear-gradient(135deg, hsl(var(--${item.color.split('-')[1]}-500) / 0.1), hsl(var(--${item.color.split('-')[3]}-500) / 0.1))` }}
                onClick={() => setQuery(item.query)}
              >
                <div className={cn("p-1.5 rounded-lg bg-gradient-to-br", item.color, "text-white")}>
                  <item.icon className="w-3 h-3 shrink-0" />
                </div>
                <span className="text-xs font-medium">{item.label}</span>
              </Button>
            ))}
          </div>
        )}

        {/* Messages */}
        <ScrollArea 
          ref={scrollRef}
          className={cn(
            "rounded-xl p-4 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 border border-cyan-500/20",
            compact ? "h-[300px]" : "h-[400px]"
          )}
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <div className="p-4 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 mb-4">
                <Brain className="w-12 h-12 text-cyan-500" />
              </div>
              <p className="font-medium text-cyan-600">Start your research by asking a question</p>
              <p className="text-xs mt-2">Powered by advanced AI reasoning</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "p-3 rounded-xl transition-all",
                    msg.role === 'user' 
                      ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 ml-8 border border-cyan-500/30" 
                      : "bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 mr-8"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {msg.role === 'user' ? (
                        <div className="p-1 rounded-full bg-cyan-500/20">
                          <User className="w-3 h-3 text-cyan-600" />
                        </div>
                      ) : (
                        <div className="p-1 rounded-full bg-indigo-500/20">
                          <Bot className="w-3 h-3 text-indigo-600" />
                        </div>
                      )}
                      <span className="text-xs font-medium bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                        {msg.role === 'user' ? 'You' : 'Research Assistant'}
                      </span>
                      {msg.model && (
                        <Badge className="text-xs h-5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-0">
                          {msg.model.includes('gpt') ? 'GPT-5' : 'Gemini Pro'}
                        </Badge>
                      )}
                    </div>
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0"
                          onClick={() => copyToClipboard(msg.content)}
                          title="Copy to clipboard"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        {onCreateVideo && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 px-2 gap-1 text-primary"
                            onClick={() => {
                              const lastUserMessage = messages.slice(0, messages.indexOf(msg)).reverse().find(m => m.role === 'user');
                              onCreateVideo(msg.content, lastUserMessage?.content || 'Research Topic');
                            }}
                            title="Create video from this research"
                          >
                            <Video className="w-3 h-3" />
                            <span className="text-xs">Create Video</span>
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-sm">
                    {msg.role === 'assistant' ? formatContent(msg.content) : msg.content}
                  </div>
                </div>
              ))}
              {isResearching && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 mr-8">
                  <Loader2 className="w-5 h-5 animate-spin text-cyan-500" />
                  <div>
                    <p className="text-sm font-medium text-cyan-600">Researching...</p>
                    <p className="text-xs text-muted-foreground">Analyzing and gathering insights</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="flex gap-2">
          <Textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask anything... I'll provide deep, comprehensive research"
            className="min-h-[60px] resize-none border-cyan-500/30 focus:border-cyan-500 focus:ring-cyan-500/20"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleResearch();
              }
            }}
          />
          <Button 
            onClick={handleResearch} 
            disabled={isResearching || !query.trim()}
            className="h-auto px-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
            data-research-submit
          >
            {isResearching ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DeepResearchAssistant;
