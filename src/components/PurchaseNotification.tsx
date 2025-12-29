import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ShoppingBag, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PurchaseNotification {
  id: string;
  type: 'shop' | 'ai';
  message: string;
  location?: string;
}

const locations = [
  'Manila', 'Cebu', 'Davao', 'Quezon City', 'Makati', 
  'Pasig', 'Taguig', 'Caloocan', 'Zamboanga', 'Antipolo',
  'Pasay', 'Las Piñas', 'Parañaque', 'Muntinlupa', 'Marikina'
];

const getRandomLocation = () => locations[Math.floor(Math.random() * locations.length)];

const getTimeAgo = () => {
  const minutes = Math.floor(Math.random() * 10) + 1;
  return `${minutes} min ago`;
};

export const PurchaseNotification = () => {
  const [notifications, setNotifications] = useState<PurchaseNotification[]>([]);
  const [currentNotification, setCurrentNotification] = useState<PurchaseNotification | null>(null);

  useEffect(() => {
    // Listen for new shop orders
    const ordersChannel = supabase
      .channel('purchase-notifications-orders')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders'
        },
        async (payload) => {
          // Get product info from order items
          const { data: orderItems } = await supabase
            .from('order_items')
            .select('products(name)')
            .eq('order_id', payload.new.id)
            .limit(1);

          const productName = orderItems?.[0]?.products?.name || 'a product';
          
          const notification: PurchaseNotification = {
            id: payload.new.id,
            type: 'shop',
            message: `Someone from ${getRandomLocation()} just bought ${productName}`,
            location: getRandomLocation()
          };
          
          setNotifications(prev => [...prev, notification]);
        }
      )
      .subscribe();

    // Listen for new AI credit purchases
    const aiPurchasesChannel = supabase
      .channel('purchase-notifications-ai')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'binary_ai_purchases'
        },
        (payload) => {
          const amount = payload.new.amount;
          const notification: PurchaseNotification = {
            id: payload.new.id,
            type: 'ai',
            message: `Someone from ${getRandomLocation()} just bought an AI Package`,
            location: getRandomLocation()
          };
          
          setNotifications(prev => [...prev, notification]);
        }
      )
      .subscribe();

    // Also listen for regular AI credit purchases
    const creditPurchasesChannel = supabase
      .channel('purchase-notifications-credits')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_credit_purchases'
        },
        (payload) => {
          const notification: PurchaseNotification = {
            id: payload.new.id,
            type: 'ai',
            message: `Someone from ${getRandomLocation()} just purchased AI Credits`,
            location: getRandomLocation()
          };
          
          setNotifications(prev => [...prev, notification]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(aiPurchasesChannel);
      supabase.removeChannel(creditPurchasesChannel);
    };
  }, []);

  // Process notifications queue
  useEffect(() => {
    if (notifications.length > 0 && !currentNotification) {
      const [next, ...rest] = notifications;
      setCurrentNotification(next);
      setNotifications(rest);

      // Auto-hide after 4 seconds
      setTimeout(() => {
        setCurrentNotification(null);
      }, 4000);
    }
  }, [notifications, currentNotification]);

  return (
    <AnimatePresence>
      {currentNotification && (
        <motion.div
          initial={{ opacity: 0, y: 100, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 100, x: '-50%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-20 left-1/2 z-50 max-w-[90vw] sm:max-w-md"
        >
          <div className="bg-card/95 backdrop-blur-lg border border-border/50 rounded-xl shadow-lg px-4 py-3 flex items-center gap-3">
            <div className={`p-2 rounded-full ${
              currentNotification.type === 'shop' 
                ? 'bg-primary/10 text-primary' 
                : 'bg-purple-500/10 text-purple-500'
            }`}>
              {currentNotification.type === 'shop' ? (
                <ShoppingBag className="w-4 h-4" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground truncate">
                {currentNotification.message}
              </p>
              <p className="text-xs text-muted-foreground">
                {getTimeAgo()}
              </p>
            </div>
            <button
              onClick={() => setCurrentNotification(null)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              ×
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
