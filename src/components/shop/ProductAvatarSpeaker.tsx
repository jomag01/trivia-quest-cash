import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, Loader2, ShoppingCart, Sparkles, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface ProductAvatarSpeakerProps {
  product: {
    id: string;
    name: string;
    description?: string | null;
    price: number;
    category?: string | null;
  };
  onAddToCart?: () => void;
  isInCart?: boolean;
}

// Language code mapping for common languages
const getLanguageName = (langCode: string): string => {
  const languageMap: Record<string, string> = {
    'en': 'English',
    'fil': 'Tagalog',
    'tl': 'Tagalog',
    'sv': 'Swedish',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese',
    'ar': 'Arabic',
    'hi': 'Hindi',
    'ru': 'Russian',
    'th': 'Thai',
    'vi': 'Vietnamese',
    'id': 'Indonesian',
    'ms': 'Malay',
    'nl': 'Dutch',
    'pl': 'Polish',
    'tr': 'Turkish',
  };
  const baseLang = langCode.split('-')[0].toLowerCase();
  return languageMap[baseLang] || 'English';
};

const ProductAvatarSpeaker: React.FC<ProductAvatarSpeakerProps> = ({
  product,
  onAddToCart,
  isInCart
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [salesPitch, setSalesPitch] = useState<string | null>(null);
  const [hasSpoken, setHasSpoken] = useState(false);
  const [isMale, setIsMale] = useState(false);
  const [userLanguage, setUserLanguage] = useState('en');
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Detect user language on mount
  useEffect(() => {
    const browserLang = navigator.language || 'en';
    setUserLanguage(browserLang);
  }, []);

  // Auto-generate and speak when component mounts
  useEffect(() => {
    if (!hasSpoken && userLanguage) {
      generateAndSpeak();
    }
    
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [product.id, userLanguage]);

  const generateSalesPitch = async (): Promise<string> => {
    const languageName = getLanguageName(userLanguage);
    
    // If product has a good description, still send to AI for translation
    const { data, error } = await supabase.functions.invoke('product-avatar-pitch', {
      body: {
        productName: product.name,
        productDescription: product.description || '',
        productPrice: product.price,
        productCategory: product.category || '',
        targetLanguage: languageName
      }
    });

    if (error) throw error;
    return data.pitch;
  };

  const findVoice = (voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null => {
    const langPrefix = userLanguage.split('-')[0].toLowerCase();
    
    // Filter voices by language
    const languageVoices = voices.filter(v => 
      v.lang.toLowerCase().startsWith(langPrefix)
    );
    
    if (languageVoices.length === 0) {
      // Fallback to English if no matching language
      const englishVoices = voices.filter(v => v.lang.startsWith('en'));
      return englishVoices[0] || voices[0];
    }

    // Try to find male or female voice based on preference
    const genderKeywords = isMale 
      ? ['male', 'david', 'james', 'john', 'mark', 'daniel', 'guy', 'thomas']
      : ['female', 'samantha', 'victoria', 'karen', 'moira', 'zira', 'susan', 'linda', 'sarah'];
    
    const genderVoice = languageVoices.find(v => 
      genderKeywords.some(keyword => v.name.toLowerCase().includes(keyword))
    );
    
    return genderVoice || languageVoices[0];
  };

  const generateAndSpeak = async () => {
    if (isGenerating || isSpeaking) return;
    
    // Check if Web Speech API is supported
    if (!window.speechSynthesis) {
      toast.error('Speech not supported in this browser');
      return;
    }
    
    setIsGenerating(true);
    try {
      // Generate sales pitch in user's language
      const pitch = await generateSalesPitch();
      setSalesPitch(pitch);
      
      // Use free browser TTS
      const utterance = new SpeechSynthesisUtterance(pitch);
      speechRef.current = utterance;
      
      // Configure voice settings
      utterance.rate = 1.0;
      utterance.pitch = isMale ? 0.9 : 1.1;
      utterance.volume = 1.0;
      utterance.lang = userLanguage;
      
      // Wait for voices to load
      let voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) {
        await new Promise<void>(resolve => {
          window.speechSynthesis.onvoiceschanged = () => {
            voices = window.speechSynthesis.getVoices();
            resolve();
          };
          // Timeout fallback
          setTimeout(resolve, 1000);
        });
      }
      
      const selectedVoice = findVoice(voices);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        setHasSpoken(true);
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        toast.error('Speech failed');
      };
      
      window.speechSynthesis.speak(utterance);
    } catch (error: any) {
      console.error('Avatar error:', error);
      toast.error('Avatar unavailable');
    } finally {
      setIsGenerating(false);
    }
  };

  const stopSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const toggleGender = () => {
    setIsMale(!isMale);
    setSalesPitch(null); // Reset pitch to regenerate
    setHasSpoken(false);
  };

  return (
    <div className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 rounded-xl p-4 border border-primary/20">
      <div className="flex items-start gap-4">
        {/* Animated Avatar */}
        <div className="relative">
          <motion.div
            className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg ${
              isMale 
                ? 'bg-gradient-to-br from-blue-500 to-blue-700' 
                : 'bg-gradient-to-br from-pink-500 to-purple-600'
            }`}
            animate={isSpeaking ? {
              scale: [1, 1.05, 1],
              boxShadow: [
                '0 0 0 0 rgba(var(--primary), 0.4)',
                '0 0 0 10px rgba(var(--primary), 0)',
                '0 0 0 0 rgba(var(--primary), 0)'
              ]
            } : {}}
            transition={{ duration: 1.5, repeat: isSpeaking ? Infinity : 0 }}
          >
            <Sparkles className="w-8 h-8 text-white" />
          </motion.div>
          
          {/* Speaking indicator */}
          <AnimatePresence>
            {isSpeaking && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center"
              >
                <Volume2 className="w-3 h-3 text-white" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold text-foreground">
              AI Assistant {isMale ? '♂' : '♀'}
            </span>
            <span className="text-xs text-muted-foreground">
              ({getLanguageName(userLanguage)})
            </span>
            {isGenerating && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Preparing...
              </span>
            )}
            {isSpeaking && (
              <span className="text-xs text-green-500 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Speaking
              </span>
            )}
          </div>

          {/* Speech bubble with text */}
          {salesPitch && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card/80 backdrop-blur-sm rounded-lg p-3 text-sm text-muted-foreground mb-3 max-h-24 overflow-y-auto"
            >
              {salesPitch}
            </motion.div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {/* Gender toggle */}
            <Button
              size="sm"
              variant="outline"
              onClick={toggleGender}
              disabled={isGenerating || isSpeaking}
              className="gap-1"
              title={isMale ? 'Switch to female voice' : 'Switch to male voice'}
            >
              <User className="w-4 h-4" />
              {isMale ? '♂→♀' : '♀→♂'}
            </Button>

            {isSpeaking ? (
              <Button
                size="sm"
                variant="outline"
                onClick={stopSpeaking}
                className="gap-1"
              >
                <VolumeX className="w-4 h-4" />
                Stop
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={generateAndSpeak}
                disabled={isGenerating}
                className="gap-1"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
                {hasSpoken ? 'Replay' : 'Listen'}
              </Button>
            )}

            {onAddToCart && !isInCart && (
              <Button
                size="sm"
                onClick={onAddToCart}
                className="gap-1 bg-primary hover:bg-primary/90"
              >
                <ShoppingCart className="w-4 h-4" />
                Add to Cart
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductAvatarSpeaker;
