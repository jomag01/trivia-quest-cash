import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  Send, 
  Bot, 
  User, 
  Mail, 
  Loader2, 
  MessageSquare, 
  CheckCircle,
  Sparkles,
  HelpCircle
} from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const ContactUsAssistant = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "👋 Hello! I'm your AI assistant. I'm here to help answer your questions about our platform, services, and features. How can I assist you today?",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [visitorEmail, setVisitorEmail] = useState("");
  const [visitorName, setVisitorName] = useState("");
  const [additionalMessage, setAdditionalMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [needsAdminHelp, setNeedsAdminHelp] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const { data, error } = await supabase.functions.invoke("contact-assistant", {
        body: {
          action: "chat",
          message: userMessage.content,
          conversationHistory
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: "assistant",
        content: data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Check if AI flagged this as needing admin help
      if (data.needsAdmin) {
        setNeedsAdminHelp(true);
        setShowEmailForm(true);
      } else if (messages.length >= 4 && !showEmailForm) {
        // Show email form after a few exchanges
        setTimeout(() => setShowEmailForm(true), 1000);
      }

    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Failed to get response. Please try again.");
      
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "I apologize, but I'm having trouble responding right now. Would you like to leave your email so our team can get back to you?",
        timestamp: new Date()
      }]);
      setNeedsAdminHelp(true);
      setShowEmailForm(true);
    } finally {
      setIsLoading(false);
    }
  };

  const submitInquiry = async () => {
    if (!visitorEmail.trim()) {
      toast.error("Please enter your email address");
      return;
    }

    if (needsAdminHelp && !additionalMessage.trim()) {
      toast.error("Please describe your question or concern for our team");
      return;
    }

    setIsSubmitting(true);

    try {
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      // Include additional message in the conversation if provided
      if (additionalMessage.trim()) {
        conversationHistory.push({
          role: "user",
          content: `[Additional Message for Admin]: ${additionalMessage.trim()}`
        });
      }

      const { data, error } = await supabase.functions.invoke("contact-assistant", {
        body: {
          action: "submit",
          visitorEmail: visitorEmail.trim(),
          visitorName: visitorName.trim() || null,
          message: additionalMessage.trim() || messages.find(m => m.role === "user")?.content || "General inquiry",
          conversationHistory
        }
      });

      if (error) throw error;

      setIsSubmitted(true);
      toast.success("Thank you! We'll respond to your email soon.");

    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Failed to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (isSubmitted) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <Card className="max-w-md w-full bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/20">
          <CardContent className="pt-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-xl font-bold mb-2">Message Submitted!</h3>
            <p className="text-muted-foreground mb-4">
              Thank you for reaching out. We've received your inquiry and will respond to <strong>{visitorEmail}</strong> as soon as possible.
            </p>
            <Button 
              onClick={() => {
                setIsSubmitted(false);
                setShowEmailForm(false);
                setNeedsAdminHelp(false);
                setAdditionalMessage("");
                setMessages([{
                  role: "assistant",
                  content: "👋 Hello! I'm your AI assistant. How can I help you today?",
                  timestamp: new Date()
                }]);
                setVisitorEmail("");
                setVisitorName("");
              }}
              className="bg-gradient-to-r from-green-500 to-emerald-500"
            >
              Start New Conversation
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col max-h-[calc(100vh-200px)]">
      {/* Header */}
      <Card className="mb-4 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 border-blue-500/20">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500">
              <HelpCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                Contact Us
              </CardTitle>
              <CardDescription>
                Chat with our AI assistant or leave a message for our team
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* Chat Area */}
        <Card className="flex-1 flex flex-col min-h-0">
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <Avatar className={`h-8 w-8 ${message.role === "assistant" ? "bg-gradient-to-br from-blue-500 to-purple-500" : "bg-gradient-to-br from-green-500 to-teal-500"}`}>
                    <AvatarFallback>
                      {message.role === "assistant" ? <Bot className="w-4 h-4 text-white" /> : <User className="w-4 h-4 text-white" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`max-w-[80%] ${message.role === "user" ? "text-right" : ""}`}>
                    <div
                      className={`rounded-lg p-3 ${
                        message.role === "user"
                          ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8 bg-gradient-to-br from-blue-500 to-purple-500">
                    <AvatarFallback>
                      <Bot className="w-4 h-4 text-white" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button 
                onClick={sendMessage} 
                disabled={isLoading || !inputValue.trim()}
                className="bg-gradient-to-r from-blue-500 to-purple-500"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </Card>

        {/* Email Form Sidebar */}
        {showEmailForm && (
          <Card className={`w-80 border-purple-500/20 ${needsAdminHelp ? 'bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/30' : 'bg-gradient-to-br from-purple-500/5 to-pink-500/5'}`}>
            <CardHeader>
              <div className="flex items-center gap-2">
                {needsAdminHelp ? (
                  <MessageSquare className="w-5 h-5 text-amber-500" />
                ) : (
                  <Mail className="w-5 h-5 text-purple-500" />
                )}
                <CardTitle className="text-lg">
                  {needsAdminHelp ? "Message Our Team" : "Get a Response"}
                </CardTitle>
              </div>
              <CardDescription>
                {needsAdminHelp 
                  ? "I couldn't fully answer your question. Please describe your concern and our team will help you."
                  : "Leave your email and we'll follow up personally"
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {needsAdminHelp && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-start gap-2">
                    <HelpCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      The AI assistant needs human support to answer your question. Please provide details below.
                    </p>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label>Your Name (optional)</Label>
                <Input
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label>Email Address *</Label>
                <Input
                  type="email"
                  value={visitorEmail}
                  onChange={(e) => setVisitorEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
              {needsAdminHelp && (
                <div className="space-y-2">
                  <Label>Your Question or Concern *</Label>
                  <Textarea
                    value={additionalMessage}
                    onChange={(e) => setAdditionalMessage(e.target.value)}
                    placeholder="Please describe what you need help with..."
                    rows={4}
                    required
                  />
                </div>
              )}
              <Button 
                onClick={submitInquiry}
                disabled={isSubmitting || !visitorEmail.trim() || (needsAdminHelp && !additionalMessage.trim())}
                className={`w-full ${needsAdminHelp ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-purple-500 to-pink-500'}`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    {needsAdminHelp ? "Send to Admin" : "Submit Inquiry"}
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                We typically respond within 24 hours
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ContactUsAssistant;
