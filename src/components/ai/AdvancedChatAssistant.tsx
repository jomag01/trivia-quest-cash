import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  MessageSquare, 
  Loader2, 
  Send, 
  Bot,
  User,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AdvancedChatAssistantProps {
  compact?: boolean;
  title?: string;
}

const AdvancedChatAssistant: React.FC<AdvancedChatAssistantProps> = ({ 
  compact = false,
  title = "GPT-5 Assistant"
}) => {
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    if (!user) {
      toast.error('Please login to chat');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setInput('');

    try {
      const { data, error } = await supabase.functions.invoke('deep-research', {
        body: {
          query: userMessage.content,
          model: 'gpt-5',
          conversationHistory: messages.slice(-8)
        }
      });

      if (error) throw error;

      if (data?.result) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.result,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      toast.error(error.message || 'Failed to get response');
      setMessages(prev => prev.filter(m => m.id !== userMessage.id));
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    toast.success('Chat cleared');
  };

  return (
    <Card className={cn("border-0 shadow-xl bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-fuchsia-500/10 overflow-hidden", compact ? "h-full" : "")}>
      {/* Colorful header gradient */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />
      
      <CardHeader className="pb-3 bg-gradient-to-r from-violet-500/5 to-purple-500/5">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent font-bold">
              {title}
            </span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className="gap-1 bg-gradient-to-r from-violet-500 to-purple-500 text-white border-0">
              <Sparkles className="w-3 h-3" />
              GPT-5
            </Badge>
            {messages.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearChat}
                className="h-8 hover:bg-violet-500/10"
              >
                <RefreshCw className="w-4 h-4 text-violet-500" />
              </Button>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Powered by the most advanced GPT-5 model
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Messages */}
        <ScrollArea 
          ref={scrollRef}
          className={cn(
            "rounded-xl p-4 bg-gradient-to-br from-violet-500/5 to-purple-500/5 border border-violet-500/20",
            compact ? "h-[250px]" : "h-[350px]"
          )}
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <div className="p-4 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-500/20 mb-4">
                <MessageSquare className="w-12 h-12 text-violet-500" />
              </div>
              <p className="font-medium text-violet-600">Start a conversation with GPT-5</p>
              <p className="text-xs mt-2">Ask anything - coding, analysis, creative writing</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "p-3 rounded-xl transition-all",
                    msg.role === 'user' 
                      ? "bg-gradient-to-r from-violet-500/20 to-purple-500/20 ml-8 border border-violet-500/30" 
                      : "bg-gradient-to-r from-fuchsia-500/10 to-pink-500/10 border border-fuchsia-500/20 mr-8"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {msg.role === 'user' ? (
                      <div className="p-1 rounded-full bg-violet-500/20">
                        <User className="w-3 h-3 text-violet-600" />
                      </div>
                    ) : (
                      <div className="p-1 rounded-full bg-fuchsia-500/20">
                        <Bot className="w-3 h-3 text-fuchsia-600" />
                      </div>
                    )}
                    <span className="text-xs font-medium bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                      {msg.role === 'user' ? 'You' : 'GPT-5'}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              ))}
              {isLoading && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20 mr-8">
                  <Loader2 className="w-5 h-5 animate-spin text-violet-500" />
                  <span className="text-sm text-violet-600 font-medium">Thinking...</span>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="border-violet-500/30 focus:border-violet-500 focus:ring-violet-500/20"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button 
            onClick={handleSend} 
            disabled={isLoading || !input.trim()}
            size="icon"
            className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdvancedChatAssistant;
