import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ShoppingBag, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PurchaseNotification {
  id: string;
  type: 'shop' | 'ai';
  message: string;
}

interface NotificationSettings {
  is_enabled: boolean;
  show_interval_seconds: number;
  pause_duration_seconds: number;
  notifications_per_cycle: number;
  show_fake_notifications: boolean;
  fake_product_names: string[];
  fake_ai_packages: string[];
}

const defaultSettings: NotificationSettings = {
  is_enabled: true,
  show_interval_seconds: 15,
  pause_duration_seconds: 60,
  notifications_per_cycle: 5,
  show_fake_notifications: true,
  fake_product_names: ['Premium Headphones', 'Wireless Earbuds', 'Smart Watch', 'Phone Case', 'Bluetooth Speaker'],
  fake_ai_packages: ['AI Starter Pack', 'AI Pro Bundle', 'AI Credits Package', 'AI Premium Tier']
};

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
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [currentNotification, setCurrentNotification] = useState<PurchaseNotification | null>(null);
  const [realNotifications, setRealNotifications] = useState<PurchaseNotification[]>([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Fetch settings
  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from('purchase_notification_settings')
        .select('*')
        .limit(1)
        .single();
      
      if (data) {
        setSettings(data as NotificationSettings);
      }
    };
    fetchSettings();
  }, []);

  // Generate fake notification
  const generateFakeNotification = useCallback((): PurchaseNotification => {
    const isShop = Math.random() > 0.3;
    const location = getRandomLocation();
    
    if (isShop) {
      const product = settings.fake_product_names[Math.floor(Math.random() * settings.fake_product_names.length)];
      return {
        id: `fake-${Date.now()}`,
        type: 'shop',
        message: `Someone from ${location} just bought ${product}`
      };
    } else {
      const aiPackage = settings.fake_ai_packages[Math.floor(Math.random() * settings.fake_ai_packages.length)];
      return {
        id: `fake-${Date.now()}`,
        type: 'ai',
        message: `Someone from ${location} just purchased ${aiPackage}`
      };
    }
  }, [settings.fake_product_names, settings.fake_ai_packages]);

  // Listen for real purchases
  useEffect(() => {
    if (!settings.is_enabled) return;

    const ordersChannel = supabase
      .channel('purchase-notifications-orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' },
        async (payload) => {
          const { data: orderItems } = await supabase
            .from('order_items')
            .select('products(name)')
            .eq('order_id', payload.new.id)
            .limit(1);

          const productName = orderItems?.[0]?.products?.name || 'a product';
          setRealNotifications(prev => [...prev, {
            id: payload.new.id,
            type: 'shop',
            message: `Someone from ${getRandomLocation()} just bought ${productName}`
          }]);
        }
      )
      .subscribe();

    const aiChannel = supabase
      .channel('purchase-notifications-ai')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'binary_ai_purchases' },
        (payload) => {
          setRealNotifications(prev => [...prev, {
            id: payload.new.id,
            type: 'ai',
            message: `Someone from ${getRandomLocation()} just bought an AI Package`
          }]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(aiChannel);
    };
  }, [settings.is_enabled]);

  // Main loop for showing notifications
  useEffect(() => {
    if (!settings.is_enabled || isPaused) return;

    const showNotification = () => {
      // Prioritize real notifications
      if (realNotifications.length > 0) {
        const [next, ...rest] = realNotifications;
        setCurrentNotification(next);
        setRealNotifications(rest);
      } else if (settings.show_fake_notifications) {
        setCurrentNotification(generateFakeNotification());
      }

      setNotificationCount(prev => prev + 1);

      // Hide after 4 seconds
      setTimeout(() => {
        setCurrentNotification(null);
      }, 4000);
    };

    // Check if we need to pause
    if (notificationCount >= settings.notifications_per_cycle) {
      setIsPaused(true);
      setNotificationCount(0);
      
      const pauseTimer = setTimeout(() => {
        setIsPaused(false);
      }, settings.pause_duration_seconds * 1000);

      return () => clearTimeout(pauseTimer);
    }

    // Show notification at interval
    const intervalTimer = setInterval(showNotification, settings.show_interval_seconds * 1000);

    // Show first one after a short delay
    const initialTimer = setTimeout(showNotification, 3000);

    return () => {
      clearInterval(intervalTimer);
      clearTimeout(initialTimer);
    };
  }, [settings, isPaused, notificationCount, realNotifications, generateFakeNotification]);

  if (!settings.is_enabled) return null;

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
          <div className="bg-card/95 backdrop-blur-lg border border-border/50 rounded-xl shadow-lg px-4 py-3">
            <div className="flex items-center gap-3">
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
            <p className="text-[9px] text-muted-foreground/70 mt-2 leading-tight border-t border-border/30 pt-2">
              This is a sales-based referral rewards program. Earnings are not guaranteed and depend on individual effort, team performance, and compliance with company rules.
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
