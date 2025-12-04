import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { 
  Heart, MessageCircle, Gift, ShoppingBag, 
  X, Users, Eye, Send, UserPlus, UserMinus, Sparkles,
  ExternalLink, Diamond, Star, Flame, Minimize2
} from "lucide-react";
import { LiveStreamShareButton } from "./LiveStreamShareButton";

interface LiveStream {
  id: string;
  user_id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  status: string;
  viewer_count: number;
  profiles?: {
    full_name: string;
    avatar_url: string;
  };
}

interface Product {
  id: string;
  name: string;
  final_price: number;
  image_url: string;
  seller_id?: string | null;
  diamond_reward?: number | null;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles?: {
    full_name: string;
    avatar_url: string;
  };
}

interface GiftNotification {
  id: string;
  gift_type: string;
  diamond_amount: number;
  sender_name: string;
}

interface LiveStreamViewerProps {
  stream: LiveStream;
  onClose: () => void;
  onMinimize?: (stream: LiveStream) => void;
}

const GIFT_OPTIONS = [
  { type: "❤️", name: "Heart", diamonds: 1, icon: Heart, color: "text-red-500" },
  { type: "⭐", name: "Star", diamonds: 5, icon: Star, color: "text-yellow-500" },
  { type: "🔥", name: "Fire", diamonds: 10, icon: Flame, color: "text-orange-500" },
  { type: "💎", name: "Diamond", diamonds: 50, icon: Diamond, color: "text-cyan-500" },
  { type: "🎁", name: "Gift Box", diamonds: 100, icon: Gift, color: "text-purple-500" },
  { type: "✨", name: "Sparkle", diamonds: 500, icon: Sparkles, color: "text-pink-500" },
];

export default function LiveStreamViewer({ stream, onClose, onMinimize }: LiveStreamViewerProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [comments, setComments] = useState<Comment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isFollowing, setIsFollowing] = useState(false);
  const [viewerCount, setViewerCount] = useState(stream.viewer_count || 0);
  const [showProducts, setShowProducts] = useState(false);
  const [showGiftPanel, setShowGiftPanel] = useState(false);
  const [giftNotifications, setGiftNotifications] = useState<GiftNotification[]>([]);
  const [userDiamonds, setUserDiamonds] = useState(0);
  const [reactions, setReactions] = useState<{ id: string; emoji: string; x: number }[]>([]);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchComments();
    fetchProducts();
    checkFollowStatus();
    incrementViewCount();
    fetchUserDiamonds();

    // Subscribe to realtime comments
    const commentsChannel = supabase
      .channel(`stream-comments-${stream.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_stream_comments',
          filter: `stream_id=eq.${stream.id}`
        },
        async (payload) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', payload.new.user_id)
            .single();
          
          setComments(prev => [...prev, {
            ...payload.new as Comment,
            profiles: profile
          }]);
        }
      )
      .subscribe();

    // Subscribe to stream updates
    const streamChannel = supabase
      .channel(`stream-${stream.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_streams',
          filter: `id=eq.${stream.id}`
        },
        (payload) => {
          setViewerCount(payload.new.viewer_count || 0);
        }
      )
      .subscribe();

    // Subscribe to gifts for animations
    const giftsChannel = supabase
      .channel(`stream-gifts-${stream.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_stream_gifts',
          filter: `stream_id=eq.${stream.id}`
        },
        async (payload) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', payload.new.sender_id)
            .single();
          
          const notification: GiftNotification = {
            id: payload.new.id,
            gift_type: payload.new.gift_type,
            diamond_amount: payload.new.diamond_amount,
            sender_name: profile?.full_name || 'Someone'
          };
          
          setGiftNotifications(prev => [...prev, notification]);
          
          // Remove notification after 4 seconds
          setTimeout(() => {
            setGiftNotifications(prev => prev.filter(g => g.id !== notification.id));
          }, 4000);
        }
      )
      .subscribe();

    // Subscribe to user's diamond balance (for real-time updates)
    let diamondsChannel: any = null;
    if (user) {
      diamondsChannel = supabase
        .channel(`user-diamonds-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'treasure_wallet',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            if (payload.new && 'diamonds' in payload.new) {
              setUserDiamonds(payload.new.diamonds || 0);
            }
          }
        )
        .subscribe();
    }

    return () => {
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(streamChannel);
      supabase.removeChannel(giftsChannel);
      if (diamondsChannel) {
        supabase.removeChannel(diamondsChannel);
      }
    };
  }, [stream.id, user]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const fetchUserDiamonds = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('treasure_wallet')
      .select('diamonds')
      .eq('user_id', user.id)
      .single();
    
    if (data) setUserDiamonds(data.diamonds || 0);
  };

  const fetchComments = async () => {
    const { data } = await supabase
      .from('live_stream_comments')
      .select('*')
      .eq('stream_id', stream.id)
      .order('created_at', { ascending: true })
      .limit(100);
    
    if (data) {
      const userIds = [...new Set(data.map(c => c.user_id))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);
        
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        setComments(data.map(c => ({
          ...c,
          profiles: profileMap.get(c.user_id)
        })));
      } else {
        setComments(data);
      }
    }
  };

  const fetchProducts = async () => {
    console.log("Fetching products for stream:", stream.id);
    
    // First get the live_stream_products
    const { data: streamProducts, error: streamError } = await supabase
      .from('live_stream_products')
      .select('product_id, display_order')
      .eq('stream_id', stream.id)
      .order('display_order');
    
    console.log("Stream products:", streamProducts, "Error:", streamError);
    
    if (streamProducts && streamProducts.length > 0) {
      const productIds = streamProducts.map(sp => sp.product_id);
      
      // Then fetch the actual products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name, final_price, image_url, seller_id, diamond_reward')
        .in('id', productIds)
        .eq('is_active', true);
      
      console.log("Products data:", productsData, "Error:", productsError);
      
      if (productsData) {
        // Sort by display order
        const productMap = new Map(productsData.map(p => [p.id, p]));
        const sortedProducts = streamProducts
          .map(sp => productMap.get(sp.product_id))
          .filter(Boolean) as Product[];
        setProducts(sortedProducts);
      }
    }
  };

  const handleBuyProduct = async (product: Product) => {
    if (!user) {
      toast.error("Please login to purchase");
      return;
    }

    const { data: existingItem } = await supabase
      .from('cart')
      .select('id, quantity')
      .eq('user_id', user.id)
      .eq('product_id', product.id)
      .maybeSingle();

    if (existingItem) {
      await supabase
        .from('cart')
        .update({ quantity: existingItem.quantity + 1 })
        .eq('id', existingItem.id);
    } else {
      await supabase
        .from('cart')
        .insert({
          user_id: user.id,
          product_id: product.id,
          quantity: 1
        });
    }

    // Store live stream referrer info
    const liveStreamReferrer = {
      stream_id: stream.id,
      streamer_id: stream.user_id,
      product_id: product.id
    };
    
    const existingReferrers = JSON.parse(localStorage.getItem('live_stream_referrers') || '[]');
    const updatedReferrers = existingReferrers.filter((r: any) => r.product_id !== product.id);
    updatedReferrers.push(liveStreamReferrer);
    localStorage.setItem('live_stream_referrers', JSON.stringify(updatedReferrers));

    toast.success(`${product.name} added to cart!`);
  };

  const handleViewProduct = (productId: string) => {
    // Minimize live stream if possible, otherwise close
    if (onMinimize) {
      onMinimize(stream);
    }
    navigate(`/shop?product=${productId}`);
  };

  const checkFollowStatus = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('live_stream_followers')
      .select('id')
      .eq('streamer_id', stream.user_id)
      .eq('follower_id', user.id)
      .single();
    
    setIsFollowing(!!data);
  };

  const incrementViewCount = async () => {
    await supabase
      .from('live_streams')
      .update({ viewer_count: (viewerCount || 0) + 1 })
      .eq('id', stream.id);
  };

  const handleSendComment = async () => {
    if (!user) {
      toast.error("Please login to comment");
      return;
    }
    if (!newComment.trim()) return;
    
    const { error } = await supabase
      .from('live_stream_comments')
      .insert({
        stream_id: stream.id,
        user_id: user.id,
        content: newComment.trim()
      });
    
    if (error) {
      toast.error("Failed to send comment");
    } else {
      setNewComment("");
    }
  };

  const handleFollow = async () => {
    if (!user) {
      toast.error("Please login to follow");
      return;
    }

    if (isFollowing) {
      await supabase
        .from('live_stream_followers')
        .delete()
        .eq('streamer_id', stream.user_id)
        .eq('follower_id', user.id);
      setIsFollowing(false);
      toast.success("Unfollowed");
    } else {
      await supabase
        .from('live_stream_followers')
        .insert({
          streamer_id: stream.user_id,
          follower_id: user.id
        });
      setIsFollowing(true);
      toast.success("Following!");
    }
  };

  const handleSendGift = async (giftType: string, diamonds: number) => {
    if (!user) {
      toast.error("Please login to send gifts");
      return;
    }

    if (userDiamonds < diamonds) {
      toast.error(`Insufficient diamonds. You have ${userDiamonds} 💎`);
      return;
    }

    try {
      // Deduct diamonds from sender
      const { error: deductError } = await supabase
        .from('treasure_wallet')
        .update({ diamonds: userDiamonds - diamonds })
        .eq('user_id', user.id);

      if (deductError) throw deductError;

      // Add diamonds to streamer's wallet
      const { data: streamerWallet } = await supabase
        .from('treasure_wallet')
        .select('diamonds')
        .eq('user_id', stream.user_id)
        .single();

      if (streamerWallet) {
        await supabase
          .from('treasure_wallet')
          .update({ diamonds: (streamerWallet.diamonds || 0) + diamonds })
          .eq('user_id', stream.user_id);
      } else {
        // Create wallet for streamer if doesn't exist
        await supabase
          .from('treasure_wallet')
          .insert({ user_id: stream.user_id, diamonds: diamonds, gems: 0 });
      }

      // Record the gift
      await supabase
        .from('live_stream_gifts')
        .insert({
          stream_id: stream.id,
          sender_id: user.id,
          gift_type: giftType,
          diamond_amount: diamonds
        });

      setUserDiamonds(prev => prev - diamonds);
      setShowGiftPanel(false);
      toast.success(`Sent ${giftType} (${diamonds} 💎) to ${stream.profiles?.full_name || 'Streamer'}!`);
    } catch (error) {
      toast.error("Failed to send gift");
    }
  };

  const handleReaction = (emoji: string) => {
    const id = Math.random().toString(36);
    const x = Math.random() * 80 + 10;
    setReactions(prev => [...prev, { id, emoji, x }]);
    
    // Remove reaction after animation
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== id));
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Video/Stream Area */}
      <div className="relative flex-1 bg-gradient-to-b from-purple-900 to-black flex items-center justify-center overflow-hidden">
        {/* Stream video/thumbnail */}
        {stream.thumbnail_url ? (
          <img 
            src={stream.thumbnail_url} 
            alt={stream.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-center text-white">
            <div className="text-6xl mb-4">📺</div>
            <h2 className="text-xl md:text-2xl font-bold px-4">{stream.title}</h2>
            <p className="text-gray-300 mt-2">Live Stream</p>
          </div>
        )}

        {/* Floating reactions */}
        {reactions.map((reaction) => (
          <div
            key={reaction.id}
            className="absolute bottom-20 text-3xl md:text-4xl animate-bounce pointer-events-none"
            style={{
              left: `${reaction.x}%`,
              animation: 'float-up 2s ease-out forwards'
            }}
          >
            {reaction.emoji}
          </div>
        ))}

        {/* Gift notifications */}
        <div className="absolute top-16 md:top-20 left-2 md:left-4 space-y-2 z-10 max-w-[70%]">
          {giftNotifications.map((gift) => (
            <div 
              key={gift.id}
              className="bg-gradient-to-r from-pink-500/90 to-purple-500/90 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-full animate-pulse backdrop-blur-sm text-sm md:text-base"
            >
              <span className="font-medium">{gift.sender_name}</span> sent {gift.gift_type}
              <span className="ml-1 md:ml-2 text-yellow-300">💎{gift.diamond_amount}</span>
            </div>
          ))}
        </div>

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 p-2 md:p-4 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent">
          <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
            <Avatar className="h-8 w-8 md:h-10 md:w-10 border-2 border-pink-500 flex-shrink-0">
              <AvatarImage src={stream.profiles?.avatar_url || ""} />
              <AvatarFallback>{stream.profiles?.full_name?.[0] || "?"}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-white font-semibold text-xs md:text-sm truncate">{stream.profiles?.full_name || "Streamer"}</p>
              <div className="flex items-center gap-1 md:gap-2">
                <Badge variant="destructive" className="text-[10px] md:text-xs animate-pulse px-1 md:px-2">● LIVE</Badge>
                <span className="text-white/80 text-[10px] md:text-xs flex items-center gap-1">
                  <Eye className="w-3 h-3" /> {viewerCount}
                </span>
              </div>
            </div>
            <Button
              size="sm"
              variant={isFollowing ? "secondary" : "default"}
              onClick={handleFollow}
              className="ml-1 md:ml-2 h-7 md:h-8 px-2 md:px-3 flex-shrink-0"
            >
              {isFollowing ? <UserMinus className="w-3 h-3 md:w-4 md:h-4" /> : <UserPlus className="w-3 h-3 md:w-4 md:h-4" />}
            </Button>
          </div>
          <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
            {user && (
              <Badge variant="outline" className="text-white border-white/50 text-[10px] md:text-xs px-1.5 md:px-2">
                💎 {userDiamonds.toLocaleString()}
              </Badge>
            )}
            <Button variant="ghost" size="icon" onClick={onClose} className="text-white h-8 w-8 md:h-10 md:w-10">
              <X className="w-5 h-5 md:w-6 md:h-6" />
            </Button>
          </div>
        </div>

        {/* Products showcase button */}
        <Button
          className="absolute bottom-16 left-2 md:bottom-20 md:left-4 bg-orange-500 hover:bg-orange-600 h-8 md:h-10 text-xs md:text-sm px-2 md:px-4 z-10"
          onClick={() => { setShowProducts(!showProducts); setShowGiftPanel(false); }}
        >
          <ShoppingBag className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
          Products ({products.length})
        </Button>

        {/* Products panel - mobile optimized */}
        {showProducts && (
          <div className="absolute bottom-28 left-2 right-2 md:bottom-32 md:left-4 md:right-20 max-h-48 md:max-h-52 z-30 bg-black/80 backdrop-blur-md rounded-xl p-2">
            <ScrollArea className="h-full">
              {products.length > 0 ? (
                <div className="flex gap-2 pb-2 overflow-x-auto">
                  {products.map((product) => (
                    <Card 
                      key={product.id} 
                      className="flex-shrink-0 w-28 md:w-40 p-2 bg-white/10 backdrop-blur border-white/20 cursor-pointer"
                      onClick={() => handleViewProduct(product.id)}
                    >
                      <img
                        src={product.image_url || "/placeholder.svg"}
                        alt={product.name}
                        className="w-full h-16 md:h-24 object-cover rounded mb-1 md:mb-2"
                      />
                      <p className="text-white text-[10px] md:text-xs truncate font-medium">{product.name}</p>
                      <p className="text-orange-400 font-bold text-xs md:text-sm">₱{product.final_price?.toLocaleString()}</p>
                      {product.diamond_reward && (
                        <p className="text-cyan-400 text-[10px] md:text-xs">+{product.diamond_reward} 💎</p>
                      )}
                      <div className="flex gap-1 mt-1 md:mt-2">
                        <Button 
                          size="sm" 
                          className="flex-1 bg-orange-500 hover:bg-orange-600 text-[10px] md:text-xs h-6 md:h-7"
                          onClick={(e) => { e.stopPropagation(); handleBuyProduct(product); }}
                        >
                          <ShoppingBag className="w-3 h-3 mr-1" />
                          Buy
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="h-6 md:h-7 px-1.5 md:px-2 border-white/30 text-white hover:bg-white/10"
                          onClick={(e) => { e.stopPropagation(); handleViewProduct(product.id); }}
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-white/60 text-center py-6 text-sm">
                  No products in this stream
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        {/* Gift panel - mobile optimized - full width on mobile */}
        {showGiftPanel && (
          <div className="absolute bottom-28 left-2 right-2 md:bottom-32 md:right-4 md:left-auto md:w-auto bg-black/90 backdrop-blur-md rounded-xl p-3 z-30">
            <div className="flex items-center justify-between mb-2">
              <p className="text-white text-xs md:text-sm font-medium">Send a gift</p>
              <Badge variant="outline" className="text-white border-white/50 text-[10px] md:text-xs">
                💎 {userDiamonds.toLocaleString()}
              </Badge>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-3 gap-2">
              {GIFT_OPTIONS.map((gift) => (
                <Button
                  key={gift.type}
                  variant="ghost"
                  className={`flex flex-col items-center p-2 h-auto hover:bg-white/10 ${gift.color} ${userDiamonds < gift.diamonds ? 'opacity-50' : ''}`}
                  onClick={() => handleSendGift(gift.type, gift.diamonds)}
                  disabled={userDiamonds < gift.diamonds}
                >
                  <span className="text-2xl md:text-2xl">{gift.type}</span>
                  <span className="text-[9px] md:text-[10px] text-white/80">{gift.name}</span>
                  <span className="text-[9px] md:text-[10px] text-yellow-400">💎{gift.diamonds}</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Side actions - positioned above comments */}
        <div className="absolute right-2 md:right-4 bottom-16 md:bottom-32 flex flex-col gap-2 md:gap-3 z-20">
          {/* Quick reactions */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/10 h-10 w-10 bg-black/30 rounded-full"
            onClick={() => handleReaction("❤️")}
          >
            <Heart className="w-5 h-5 text-red-500" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/10 h-10 w-10 bg-black/30 rounded-full"
            onClick={() => handleReaction("🔥")}
          >
            <Flame className="w-5 h-5 text-orange-500" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/10 h-10 w-10 relative bg-black/30 rounded-full"
            onClick={() => { setShowGiftPanel(!showGiftPanel); setShowProducts(false); }}
          >
            <Gift className="w-5 h-5 text-purple-500" />
            {showGiftPanel && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
            )}
          </Button>
          <LiveStreamShareButton
            streamId={stream.id}
            streamTitle={stream.title}
            streamerName={stream.profiles?.full_name || undefined}
            className="text-white hover:bg-white/10 h-10 w-10 bg-black/30 rounded-full"
          />
          {onMinimize && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-white/10 h-10 w-10 bg-black/30 rounded-full"
              onClick={() => onMinimize(stream)}
            >
              <Minimize2 className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Comments section - fixed at bottom above input */}
      <div className="bg-black/80 max-h-32 md:max-h-40 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="space-y-1.5 p-2">
            {comments.slice(-10).map((comment) => (
              <div key={comment.id} className="flex items-start gap-2">
                <Avatar className="h-6 w-6 flex-shrink-0">
                  <AvatarImage src={comment.profiles?.avatar_url || ""} />
                  <AvatarFallback className="text-[10px]">{comment.profiles?.full_name?.[0] || "?"}</AvatarFallback>
                </Avatar>
                <div className="bg-white/10 rounded-lg px-2 py-1 max-w-[85%]">
                  <span className="text-pink-400 text-xs font-medium">{comment.profiles?.full_name || "User"}</span>
                  <span className="text-white text-sm ml-2">{comment.content}</span>
                </div>
              </div>
            ))}
            <div ref={commentsEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Comment input */}
      <div className="bg-black p-2 md:p-4 flex items-center gap-2 safe-area-inset-bottom">
        <Input
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={user ? "Say something..." : "Login to comment"}
          className="flex-1 bg-white/10 border-0 text-white placeholder:text-gray-400 h-10 text-sm"
          onKeyPress={(e) => e.key === 'Enter' && handleSendComment()}
          disabled={!user}
        />
        <Button onClick={handleSendComment} size="icon" disabled={!user || !newComment.trim()} className="h-10 w-10">
          <Send className="w-5 h-5" />
        </Button>
      </div>

      {/* CSS for floating animation */}
      <style>{`
        @keyframes float-up {
          0% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-200px) scale(1.5);
          }
        }
      `}</style>
    </div>
  );
}
