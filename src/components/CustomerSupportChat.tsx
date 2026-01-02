import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { MessageCircle, X, Send, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export const CustomerSupportChat = () => {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm your AI bee assistant 🐝 How can I help you today?",
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToTop = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const streamChat = async (userMessage: string) => {
    const chatUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/customer-support`;
    
    try {
      const response = await fetch(chatUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: userMessage }],
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to get response");
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";
      let textBuffer = "";

      // Add empty assistant message that we'll update
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            
            if (content) {
              assistantMessage += content;
              setMessages((prev) => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = {
                  role: "assistant",
                  content: assistantMessage,
                };
                return newMessages;
              });
            }
          } catch (e) {
            // Ignore parse errors for incomplete JSON
            continue;
          }
        }
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      toast.error(error.message || "Failed to send message");
      // Remove the empty assistant message on error
      setMessages((prev) => prev.slice(0, -1));
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    await streamChat(userMessage);
    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Floating Chat Button - Animated Bee Icon */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl z-50 bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-600 hover:from-amber-500 hover:via-yellow-500 hover:to-amber-700 border-2 border-amber-300 animate-bounce-slow group overflow-hidden"
          size="icon"
        >
          <div className="relative">
            <span className="text-2xl group-hover:scale-110 transition-transform duration-200 inline-block animate-wiggle">🐝</span>
            {/* Sparkle effect */}
            <span className="absolute -top-1 -right-1 text-xs animate-pulse">✨</span>
          </div>
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <Card className={`fixed shadow-2xl z-50 flex flex-col border-2 border-amber-500/30 overflow-hidden ${
          isMobile 
            ? "inset-2 sm:inset-4 w-auto h-auto max-h-[90vh]" 
            : "bottom-6 right-6 w-full max-w-md h-[600px] max-h-[80vh]"
        }`}>
          {/* Header with Bee Theme */}
          <div className="flex items-center justify-between p-3 sm:p-4 border-b bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 text-white rounded-t-lg shrink-0">
            <div className="flex items-center gap-2">
              <div className="relative">
                <span className="text-lg sm:text-xl animate-wiggle inline-block">🐝</span>
                <span className="absolute -top-1 -right-1 text-[8px] animate-pulse">✨</span>
              </div>
              <div>
                <h3 className="font-semibold text-sm sm:text-base">AI Bee Assistant</h3>
                <p className="text-[10px] opacity-80">Buzz! Ready to help 🍯</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 text-white hover:bg-white/20 hover:text-white"
              aria-label="Close chat"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 relative min-h-0">
            <ScrollArea className="h-full p-3 sm:p-4">
              <div ref={scrollRef} className="space-y-3 sm:space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[80%] rounded-lg p-2.5 sm:p-3 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">{message.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg p-2.5 sm:p-3">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
              </div>
            </ScrollArea>
            
            {/* Scroll Navigation Buttons */}
            <div className="absolute right-2 sm:right-4 bottom-2 sm:bottom-4 flex flex-col gap-1.5 sm:gap-2">
              <Button
                onClick={scrollToTop}
                size="icon"
                variant="outline"
                className="h-7 w-7 sm:h-8 sm:w-8 rounded-full shadow-lg bg-background"
                aria-label="Scroll to top"
              >
                <ArrowUp className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
              <Button
                onClick={scrollToBottom}
                size="icon"
                variant="outline"
                className="h-7 w-7 sm:h-8 sm:w-8 rounded-full shadow-lg bg-background"
                aria-label="Scroll to bottom"
              >
                <ArrowDown className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </div>

          {/* Input with Bee Theme */}
          <div className="p-3 sm:p-4 border-t border-amber-500/20 bg-gradient-to-r from-amber-50/50 to-yellow-50/50 dark:from-amber-950/50 dark:to-yellow-950/50 shrink-0">
            <div className="flex gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="🐝 Ask me anything..."
                disabled={isLoading}
                className="flex-1 text-sm border-amber-500/30 focus:border-amber-500"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                size="icon"
                className="shrink-0 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}
    </>
  );
};
