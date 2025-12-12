import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, Loader2, ShoppingCart, Sparkles } from 'lucide-react';
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

const ProductAvatarSpeaker: React.FC<ProductAvatarSpeakerProps> = ({
  product,
  onAddToCart,
  isInCart
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [salesPitch, setSalesPitch] = useState<string | null>(null);
  const [hasSpoken, setHasSpoken] = useState(false);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Auto-generate and speak when component mounts
  useEffect(() => {
    if (!hasSpoken) {
      generateAndSpeak();
    }
    
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [product.id]);

  const generateSalesPitch = async (): Promise<string> => {
    // If product has a good description, use it; otherwise generate one
    if (product.description && product.description.length > 50) {
      return `Hello! Let me tell you about ${product.name}. ${product.description}. At just ${product.price} pesos, this is an amazing deal! Would you like to add it to your cart?`;
    }

    // Use AI to generate a sales pitch
    const { data, error } = await supabase.functions.invoke('product-avatar-pitch', {
      body: {
        productName: product.name,
        productDescription: product.description || '',
        productPrice: product.price,
        productCategory: product.category || ''
      }
    });

    if (error) throw error;
    return data.pitch;
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
      // Generate or use existing sales pitch
      const pitch = salesPitch || await generateSalesPitch();
      setSalesPitch(pitch);
      
      // Use free browser TTS
      const utterance = new SpeechSynthesisUtterance(pitch);
      speechRef.current = utterance;
      
      // Configure voice settings
      utterance.rate = 1.0;
      utterance.pitch = 1.1;
      utterance.volume = 1.0;
      
      // Try to use a female voice if available
      const voices = window.speechSynthesis.getVoices();
      const femaleVoice = voices.find(v => 
        v.name.toLowerCase().includes('female') || 
        v.name.toLowerCase().includes('samantha') ||
        v.name.toLowerCase().includes('victoria') ||
        v.name.toLowerCase().includes('karen') ||
        v.name.toLowerCase().includes('moira')
      ) || voices.find(v => v.lang.startsWith('en')) || voices[0];
      
      if (femaleVoice) {
        utterance.voice = femaleVoice;
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

  return (
    <div className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 rounded-xl p-4 border border-primary/20">
      <div className="flex items-start gap-4">
        {/* Animated Avatar */}
        <div className="relative">
          <motion.div
            className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg"
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
            <Sparkles className="w-8 h-8 text-primary-foreground" />
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
            <span className="font-semibold text-foreground">AI Assistant</span>
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
