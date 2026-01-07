import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bot, Sparkles, MessageCircle, Lightbulb, ArrowRight,
  Copy, RefreshCw, ThumbsUp, ThumbsDown, Wand2
} from "lucide-react";

interface Suggestion {
  id: string;
  type: "icebreaker" | "continue" | "topic_change" | "deepen";
  text: string;
  wasUsed?: boolean;
}

const SUGGESTION_TYPES = [
  { id: "icebreaker", label: "Start Chat", icon: MessageCircle, color: "text-blue-500" },
  { id: "continue", label: "Continue", icon: ArrowRight, color: "text-green-500" },
  { id: "topic_change", label: "New Topic", icon: RefreshCw, color: "text-purple-500" },
  { id: "deepen", label: "Go Deeper", icon: Lightbulb, color: "text-orange-500" },
];

interface ChatMateAICoachProps {
  roomId?: string;
  matchInterests?: string[];
  matchName?: string;
}

export function ChatMateAICoach({ roomId, matchInterests = [], matchName }: ChatMateAICoachProps) {
  const { user } = useAuth();
  const [context, setContext] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("icebreaker");

  const generateSuggestions = async () => {
    if (!user) return;

    setLoading(true);
    setSuggestions([]);

    try {
      const { data, error } = await supabase.functions.invoke("chatmate-icebreaker", {
        body: {
          userInterests: matchInterests,
          matchInterests: matchInterests,
          userName: "",
          matchName: matchName || "your chat mate",
          suggestionType: selectedType,
          context: context
        }
      });

      if (error) throw error;

      // Generate multiple suggestions
      const generatedSuggestions: Suggestion[] = [];
      
      // Primary suggestion from API
      if (data?.icebreaker) {
        generatedSuggestions.push({
          id: "1",
          type: selectedType as Suggestion["type"],
          text: data.icebreaker
        });
      }

      // Add fallback suggestions based on type
      const fallbacks = getFallbackSuggestions(selectedType, matchInterests);
      fallbacks.forEach((text, i) => {
        generatedSuggestions.push({
          id: (i + 2).toString(),
          type: selectedType as Suggestion["type"],
          text
        });
      });

      setSuggestions(generatedSuggestions.slice(0, 3));

      // Save to database for analytics
      if (roomId) {
        await supabase.from("chatmate_coach_suggestions").insert(
          generatedSuggestions.map(s => ({
            user_id: user.id,
            room_id: roomId,
            suggestion_type: s.type,
            suggestion_text: s.text
          }))
        );
      }
    } catch (error) {
      console.error("Error generating suggestions:", error);
      // Use fallback suggestions
      setSuggestions(getFallbackSuggestions(selectedType, matchInterests).map((text, i) => ({
        id: i.toString(),
        type: selectedType as Suggestion["type"],
        text
      })));
    } finally {
      setLoading(false);
    }
  };

  const getFallbackSuggestions = (type: string, interests: string[]): string[] => {
    const hasInterests = interests.length > 0;
    
    switch (type) {
      case "icebreaker":
        return hasInterests ? [
          `I noticed you're into ${interests[0]}! What got you interested in that?`,
          `Hey! Your profile caught my eye. What's been keeping you busy lately?`,
          `Hi there! I'd love to hear your thoughts on ${interests[0] || "your interests"}.`
        ] : [
          "Hey! I'd love to get to know you. What are you passionate about?",
          "Hi! What's the most interesting thing you've learned recently?",
          "Hello! What brings you to Chat Mates?"
        ];
      case "continue":
        return [
          "That's really interesting! Can you tell me more about that?",
          "I love how you explained that. What inspired you to start?",
          "That resonates with me! Have you always felt that way?"
        ];
      case "topic_change":
        return [
          "By the way, I'm curious - what do you do for fun outside of work?",
          "Switching gears a bit - have you watched anything good lately?",
          "I'd love to know - what's on your bucket list?"
        ];
      case "deepen":
        return [
          "What's been the most meaningful experience you've had with that?",
          "How has that shaped who you are today?",
          "If you could change one thing about it, what would it be?"
        ];
      default:
        return [];
    }
  };

  const copySuggestion = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const markAsUsed = async (suggestionId: string) => {
    setSuggestions(prev => prev.map(s => 
      s.id === suggestionId ? { ...s, wasUsed: true } : s
    ));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20 border-violet-200/50 dark:border-violet-800/30">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg">AI Conversation Coach</h3>
              <p className="text-sm text-muted-foreground">
                Get smart suggestions for better conversations
              </p>
            </div>
          </div>

          {/* Suggestion Type Selector */}
          <div className="flex flex-wrap gap-2 mb-4">
            {SUGGESTION_TYPES.map((type) => {
              const Icon = type.icon;
              return (
                <Button
                  key={type.id}
                  variant={selectedType === type.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedType(type.id)}
                  className={`gap-2 ${selectedType === type.id ? "bg-gradient-to-r from-violet-500 to-purple-600" : ""}`}
                >
                  <Icon className={`w-4 h-4 ${selectedType !== type.id ? type.color : ""}`} />
                  {type.label}
                </Button>
              );
            })}
          </div>

          {/* Context Input */}
          <div className="space-y-2">
            <Textarea
              placeholder="Add context about your conversation (optional)... e.g., 'We were talking about travel plans'"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              className="min-h-[80px] bg-background"
            />
            <Button
              onClick={generateSuggestions}
              disabled={loading}
              className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Generate Suggestions
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Suggestions */}
      <AnimatePresence mode="popLayout">
        {suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-3"
          >
            <h4 className="font-semibold flex items-center gap-2 text-sm">
              <Sparkles className="w-4 h-4 text-violet-500" />
              Suggestions for you
            </h4>

            {suggestions.map((suggestion, index) => (
              <motion.div
                key={suggestion.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`hover:shadow-md transition-shadow ${
                  suggestion.wasUsed ? "border-green-500 bg-green-50/50 dark:bg-green-950/20" : ""
                }`}>
                  <CardContent className="p-4">
                    <p className="text-sm mb-3 leading-relaxed">
                      "{suggestion.text}"
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copySuggestion(suggestion.text)}
                          className="h-8 gap-1 text-xs"
                        >
                          <Copy className="w-3 h-3" />
                          Copy
                        </Button>
                        {!suggestion.wasUsed && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => markAsUsed(suggestion.id)}
                            className="h-8 gap-1 text-xs text-green-600"
                          >
                            <ThumbsUp className="w-3 h-3" />
                            Used
                          </Button>
                        )}
                      </div>
                      {suggestion.wasUsed && (
                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          ✓ Marked as used
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tips */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <h4 className="font-semibold flex items-center gap-2 text-sm mb-2">
            <Lightbulb className="w-4 h-4 text-yellow-500" />
            Conversation Tips
          </h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Ask open-ended questions that invite detailed responses</li>
            <li>• Share your own experiences to build connection</li>
            <li>• Listen actively and reference things they've shared</li>
            <li>• Keep the conversation balanced - don't dominate</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}