import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircle, 
  Send, 
  X, 
  HelpCircle, 
  Star, 
  ShoppingCart,
  Users,
  Sparkles,
  ChevronUp,
  ChevronDown
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface Message {
  role: "user" | "assistant";
  content: string;
  products?: RecommendedProduct[];
}

interface RecommendedProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  total_sold: number;
  avg_rating: number;
  review_count: number;
}

export default function AIHealthConsultant({ 
  onAddToCart,
  onCartUpdated
}: { 
  onAddToCart: (productId: string) => Promise<void>;
  onCartUpdated?: () => void;
}) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm your AI Product Assistant. I'm here to help you find products that suit your needs. Ask me anything about our products, and I'll recommend the best options from our shop based on sales data and customer reviews."
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await supabase.functions.invoke("health-consultant", {
        body: { 
          messages: [...messages, { role: "user", content: userMessage }].map(m => ({
            role: m.role,
            content: m.content
          }))
        }
      });

      if (response.error) throw response.error;

      const data = response.data;
      
      setMessages(prev => [...prev, {
        role: "assistant",
        content: data.message,
        products: data.products
      }]);
    } catch (error: any) {
      console.error("Health consultant error:", error);
      toast.error("Failed to get response. Please try again.");
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "I apologize, but I'm having trouble processing your request. Please try again."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-3 h-3 ${
              star <= rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-4 z-50 h-14 w-14 rounded-full shadow-2xl bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-600 hover:from-amber-500 hover:via-yellow-500 hover:to-amber-700 border-2 border-amber-300 animate-bounce-slow group overflow-hidden"
      >
        <div className="relative">
          <span className="text-2xl group-hover:scale-110 transition-transform duration-200 inline-block animate-wiggle">🐝</span>
          <span className="absolute -top-1 -right-1 text-xs animate-pulse">✨</span>
        </div>
      </Button>
    );
  }

  return (
    <Card className={`fixed z-50 shadow-2xl border-0 bg-background transition-all duration-300 ${
      isMinimized 
        ? "bottom-24 right-4 w-72 h-14" 
        : "bottom-24 right-4 w-[90vw] max-w-md h-[70vh] max-h-[600px] md:w-96"
    }`}>
      {/* Header - Bee Theme */}
      <div className="flex items-center justify-between p-3 border-b bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 text-white rounded-t-lg">
        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="text-xl animate-wiggle inline-block">🐝</span>
            <span className="absolute -top-1 -right-1 text-[8px] animate-pulse">✨</span>
          </div>
          <div>
            <h3 className="font-semibold text-sm">AI Bee Assistant</h3>
            {!isMinimized && (
              <p className="text-xs opacity-80">Buzz! Product recommendations 🍯</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={() => setIsOpen(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <ScrollArea className="flex-1 h-[calc(100%-120px)] p-3" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] ${message.role === "user" ? "order-1" : ""}`}>
                    <div className={`rounded-2xl px-4 py-2.5 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                    
                    {/* Product Recommendations */}
                    {message.products && message.products.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Sparkles className="w-3 h-3" />
                          <span>Recommended Products</span>
                        </div>
                        {message.products.map((product) => (
                          <Card key={product.id} className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
                            <div className="flex gap-3">
                              <img
                                src={product.image_url || "/placeholder.svg"}
                                alt={product.name}
                                className="w-16 h-16 rounded-lg object-cover"
                              />
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-sm truncate">{product.name}</h4>
                                <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>
                                
                                <div className="flex items-center gap-2 mt-1">
                                  {renderStars(product.avg_rating)}
                                  <span className="text-xs text-muted-foreground">
                                    ({product.review_count} reviews)
                                  </span>
                                </div>
                                
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="secondary" className="text-xs">
                                    <Users className="w-3 h-3 mr-1" />
                                    {product.total_sold} sold
                                  </Badge>
                                  <span className="text-sm font-bold text-green-600">
                                    ₱{product.price.toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              className="w-full mt-2 bg-primary hover:bg-primary/90"
                              onClick={async () => {
                                await onAddToCart(product.id);
                                onCartUpdated?.();
                              }}
                            >
                              <ShoppingCart className="w-3 h-3 mr-1" />
                              Add to Cart
                            </Button>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce delay-100" />
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce delay-200" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-3 border-t bg-background">
            <div className="flex gap-2">
              <Input
                placeholder="Ask about any product..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
