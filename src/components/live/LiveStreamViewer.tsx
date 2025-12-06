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
  X, Eye, Send, UserPlus, UserMinus, Sparkles,
  Diamond, Star, Flame, Minimize2, ArrowDown, ThumbsUp, ThumbsDown, Reply, Radio, Loader2
} from "lucide-react";
import { LiveStreamShareButton } from "./LiveStreamShareButton";
import { ViewerConnection } from "@/lib/webrtc";

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
  const [showComments, setShowComments] = useState(false);
  const [giftNotifications, setGiftNotifications] = useState<GiftNotification[]>([]);
  const [userDiamonds, setUserDiamonds] = useState(0);
  const [reactions, setReactions] = useState<{ id: string; emoji: string; x: number }[]>([]);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [hasVideo, setHasVideo] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('Connecting...');
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const viewerConnectionRef = useRef<ViewerConnection | null>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchComments();
    fetchProducts();
    checkFollowStatus();
    incrementViewCount();
    fetchUserDiamonds();
    connectToStream();

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
          if (payload.new.status === 'ended') {
            toast.info("Stream has ended");
            onClose();
          }
        }
      )
      .subscribe();

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
          
          setTimeout(() => {
            setGiftNotifications(prev => prev.filter(g => g.id !== notification.id));
          }, 4000);
        }
      )
      .subscribe();

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
      if (viewerConnectionRef.current) {
        viewerConnectionRef.current.disconnect();
      }
    };
  }, [stream.id, user]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const connectToStream = async () => {
    if (!user) {
      setIsConnecting(false);
      setConnectionStatus('Login to view stream');
      return;
    }

    setIsConnecting(true);
    setConnectionStatus('Connecting to stream...');
    
    // Clear any existing timeout
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
    }
    
    try {
      viewerConnectionRef.current = new ViewerConnection(
        stream.id,
        user.id,
        stream.user_id,
        (remoteStream) => {
          console.log('Received remote stream');
          if (videoRef.current) {
            videoRef.current.srcObject = remoteStream;
            setHasVideo(true);
          }
          setIsConnecting(false);
          setConnectionStatus('Connected');
        },
        (state) => {
          console.log('Connection state changed:', state);
          switch (state) {
            case 'connecting':
              setConnectionStatus('Connecting...');
              break;
            case 'connected':
              setConnectionStatus('Connected');
              setIsConnecting(false);
              break;
            case 'disconnected':
              setConnectionStatus('Reconnecting...');
              break;
            case 'failed':
              setConnectionStatus('Connection failed');
              setIsConnecting(false);
              break;
          }
        }
      );
      
      await viewerConnectionRef.current.connect();
      
      // Set timeout for connection - use ref to get current state
      connectionTimeoutRef.current = setTimeout(() => {
        setIsConnecting(false);
        if (!hasVideo) {
          setConnectionStatus('Waiting for streamer video...');
        }
      }, 8000);
    } catch (error) {
      console.error('Failed to connect to stream:', error);
      setIsConnecting(false);
      setConnectionStatus('Failed to connect');
    }
  };

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
    const { data: streamProducts } = await supabase
      .from('live_stream_products')
      .select('product_id, display_order')
      .eq('stream_id', stream.id)
      .order('display_order');
    
    if (streamProducts && streamProducts.length > 0) {
      const productIds = streamProducts.map(sp => sp.product_id);
      
      const { data: productsData } = await supabase
        .from('products')
        .select('id, name, final_price, image_url, seller_id, diamond_reward')
        .in('id', productIds)
        .eq('is_active', true);
      
      if (productsData) {
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
    
    const commentContent = replyingTo 
      ? `@${replyingTo.profiles?.full_name || 'User'} ${newComment.trim()}`
      : newComment.trim();
    
    const { error } = await supabase
      .from('live_stream_comments')
      .insert({
        stream_id: stream.id,
        user_id: user.id,
        content: commentContent
      });
    
    if (error) {
      toast.error("Failed to send comment");
    } else {
      setNewComment("");
      setReplyingTo(null);
    }
  };

  const handleReplyToComment = (comment: Comment) => {
    setReplyingTo(comment);
    setShowComments(true);
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setNewComment("");
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
      const { error: deductError } = await supabase
        .from('treasure_wallet')
        .update({ diamonds: userDiamonds - diamonds })
        .eq('user_id', user.id);

      if (deductError) throw deductError;

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
        await supabase
          .from('treasure_wallet')
          .insert({ user_id: stream.user_id, diamonds: diamonds, gems: 0 });
      }

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
    
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== id));
    }, 2000);
  };

  const toggleComments = () => {
    setShowComments(!showComments);
    setShowGiftPanel(false);
    setShowProducts(false);
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Video/Stream Area */}
      <div className={`relative bg-black flex items-center justify-center overflow-hidden transition-all duration-300 ${showComments ? 'h-[35%] min-h-[200px]' : 'flex-1'}`}>
        {/* Video element for WebRTC stream */}
        <video 
          ref={videoRef}
          autoPlay
          playsInline
          className={`absolute inset-0 w-full h-full object-cover ${hasVideo ? 'block' : 'hidden'}`}
        />
        
        {/* Fallback/Loading when no video */}
        {!hasVideo && (
          <div className="absolute inset-0 w-full h-full">
            <div className="w-full h-full bg-gradient-to-b from-purple-900/80 to-black flex items-center justify-center">
              {isConnecting ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="w-12 h-12 animate-spin text-white mb-4" />
                  <p className="text-white text-sm">{connectionStatus}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <Avatar className="w-24 h-24 md:w-32 md:h-32 border-4 border-pink-500 shadow-lg shadow-pink-500/50">
                      <AvatarImage src={stream.profiles?.avatar_url || ""} />
                      <AvatarFallback className="text-3xl md:text-4xl bg-gradient-to-br from-purple-500 to-pink-500">
                        {stream.profiles?.full_name?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                      <Radio className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <h2 className="text-white font-bold text-base md:text-lg mt-4 px-4 text-center">{stream.title}</h2>
                  <p className="text-gray-300 text-sm mt-1">{stream.profiles?.full_name || "Streamer"}</p>
                  <p className="text-gray-400 text-xs mt-2 px-6 text-center line-clamp-2">{stream.description}</p>
                  <p className="text-yellow-400 text-xs mt-3">{connectionStatus}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Floating reactions */}
        {reactions.map((reaction) => (
          <div
            key={reaction.id}
            className="absolute bottom-20 text-2xl animate-bounce pointer-events-none z-20"
            style={{
              left: `${reaction.x}%`,
              animation: 'float-up 2s ease-out forwards'
            }}
          >
            {reaction.emoji}
          </div>
        ))}

        {/* Gift notifications */}
        <div className="absolute top-14 left-2 space-y-1 z-20 max-w-[60%]">
          {giftNotifications.map((gift) => (
            <div 
              key={gift.id}
              className="bg-gradient-to-r from-pink-500/90 to-purple-500/90 text-white px-2 py-1 rounded-full animate-pulse backdrop-blur-sm text-xs"
            >
              <span className="font-medium">{gift.sender_name}</span> sent {gift.gift_type}
              <span className="ml-1 text-yellow-300">💎{gift.diamond_amount}</span>
            </div>
          ))}
        </div>

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 p-2 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent z-30">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Avatar className="h-8 w-8 border-2 border-pink-500 flex-shrink-0">
              <AvatarImage src={stream.profiles?.avatar_url || ""} />
              <AvatarFallback className="text-xs bg-gradient-to-br from-purple-500 to-pink-500">
                {stream.profiles?.full_name?.[0] || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-white font-semibold text-xs truncate">{stream.profiles?.full_name || "Streamer"}</p>
              <div className="flex items-center gap-1">
                <Badge variant="destructive" className="text-[9px] animate-pulse px-1 h-4">LIVE</Badge>
                <span className="text-white/80 text-[10px] flex items-center gap-0.5">
                  <Eye className="w-2.5 h-2.5" /> {viewerCount}
                </span>
              </div>
            </div>
            <Button
              size="sm"
              variant={isFollowing ? "secondary" : "default"}
              onClick={handleFollow}
              className="h-6 px-2 text-[10px]"
            >
              {isFollowing ? <UserMinus className="w-3 h-3" /> : <UserPlus className="w-3 h-3" />}
            </Button>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {user && (
              <Badge variant="outline" className="text-white border-white/50 text-[9px] px-1.5 h-5">
                💎 {userDiamonds.toLocaleString()}
              </Badge>
            )}
            <Button variant="ghost" size="icon" onClick={onClose} className="text-white h-7 w-7">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Side action icons */}
        <div className="absolute right-2 bottom-3 flex flex-col gap-2 z-20">
          <button 
            className="flex flex-col items-center active:scale-90 transition-transform"
            onClick={() => handleReaction("❤️")}
          >
            <div className="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center backdrop-blur-sm">
              <Heart className="w-5 h-5 text-white" fill="white" />
            </div>
            <span className="text-white text-[10px] mt-0.5 drop-shadow">Like</span>
          </button>
          
          <button 
            className="flex flex-col items-center active:scale-90 transition-transform"
            onClick={toggleComments}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-sm ${showComments ? 'bg-primary' : 'bg-black/50'}`}>
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <span className="text-white text-[10px] mt-0.5 drop-shadow">{comments.length}</span>
          </button>
          
          <button 
            className="flex flex-col items-center active:scale-90 transition-transform"
            onClick={() => { setShowGiftPanel(!showGiftPanel); setShowProducts(false); setShowComments(false); }}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-sm ${showGiftPanel ? 'bg-purple-500' : 'bg-black/50'}`}>
              <Gift className="w-5 h-5 text-white" />
            </div>
            <span className="text-white text-[10px] mt-0.5 drop-shadow">Gift</span>
          </button>

          <button 
            className="flex flex-col items-center active:scale-90 transition-transform"
            onClick={() => { setShowProducts(!showProducts); setShowGiftPanel(false); setShowComments(false); }}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-sm ${showProducts ? 'bg-orange-500' : 'bg-black/50'}`}>
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <span className="text-white text-[10px] mt-0.5 drop-shadow">{products.length}</span>
          </button>

          <LiveStreamShareButton
            streamId={stream.id}
            streamTitle={stream.title}
            streamerName={stream.profiles?.full_name || undefined}
            className="flex flex-col items-center"
            iconOnly
          />

          {onMinimize && (
            <button 
              className="flex flex-col items-center active:scale-90 transition-transform"
              onClick={() => onMinimize(stream)}
            >
              <div className="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center backdrop-blur-sm">
                <Minimize2 className="w-5 h-5 text-white" />
              </div>
            </button>
          )}
        </div>

        {/* Products panel overlay */}
        {showProducts && (
          <div className="absolute bottom-14 left-2 right-14 max-h-40 z-30 bg-black/90 backdrop-blur-md rounded-xl p-2">
            <ScrollArea className="h-full">
              {products.length > 0 ? (
                <div className="flex gap-2 pb-1 overflow-x-auto">
                  {products.map((product) => (
                    <Card 
                      key={product.id} 
                      className="flex-shrink-0 w-28 p-2 bg-white/10 backdrop-blur border-white/20 cursor-pointer active:scale-95 transition-transform"
                      onClick={() => handleViewProduct(product.id)}
                    >
                      <img
                        src={product.image_url || "/placeholder.svg"}
                        alt={product.name}
                        className="w-full h-16 object-cover rounded mb-1"
                      />
                      <p className="text-white text-[10px] truncate font-medium">{product.name}</p>
                      <p className="text-orange-400 font-bold text-xs">₱{product.final_price?.toLocaleString()}</p>
                      <Button 
                        size="sm" 
                        className="w-full bg-orange-500 hover:bg-orange-600 text-[10px] h-6 mt-1"
                        onClick={(e) => { e.stopPropagation(); handleBuyProduct(product); }}
                      >
                        Add to Cart
                      </Button>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-white/60 text-center py-4 text-xs">
                  No products
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        {/* Gift panel overlay */}
        {showGiftPanel && (
          <div className="absolute bottom-14 left-2 right-14 bg-black/90 backdrop-blur-md rounded-xl p-3 z-30">
            <div className="flex items-center justify-between mb-2">
              <p className="text-white text-xs font-medium">Send a gift</p>
              <Badge variant="outline" className="text-white border-white/50 text-[9px]">
                💎 {userDiamonds.toLocaleString()}
              </Badge>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {GIFT_OPTIONS.map((gift) => (
                <button
                  key={gift.type}
                  className={`flex flex-col items-center p-2 rounded-lg hover:bg-white/10 active:scale-90 transition-all ${userDiamonds < gift.diamonds ? 'opacity-40' : ''}`}
                  onClick={() => handleSendGift(gift.type, gift.diamonds)}
                  disabled={userDiamonds < gift.diamonds}
                >
                  <span className="text-2xl">{gift.type}</span>
                  <span className="text-[9px] text-yellow-400 mt-1">💎{gift.diamonds}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* TikTok-style Comments Section */}
      {showComments && (
        <div className="flex-1 bg-background flex flex-col min-h-0">
          <div className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0">
            <h3 className="text-sm font-semibold">{comments.length} comment{comments.length !== 1 ? 's' : ''}</h3>
            <div className="flex items-center gap-2">
              <button className="p-1">
                <ArrowDown className="w-5 h-5 text-muted-foreground" />
              </button>
              <button onClick={toggleComments} className="p-1">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </div>

          <ScrollArea className="flex-1 min-h-0">
            <div className="px-4 py-2 space-y-4">
              {comments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No comments yet. Be the first to comment!
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={comment.profiles?.avatar_url || ""} />
                      <AvatarFallback className="text-xs">{comment.profiles?.full_name?.[0] || "?"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{comment.profiles?.full_name || "User"}</span>
                        {comment.user_id === stream.user_id && (
                          <Badge variant="secondary" className="text-[9px] px-1 h-4">Creator</Badge>
                        )}
                      </div>
                      <p className="text-sm text-foreground mt-0.5">{comment.content}</p>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </span>
                        <button 
                          className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1"
                          onClick={() => handleReplyToComment(comment)}
                        >
                          <Reply className="w-3 h-3" />
                          Reply
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <button className="p-1 hover:bg-muted rounded active:scale-90 transition-transform">
                        <ThumbsUp className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button className="p-1 hover:bg-muted rounded active:scale-90 transition-transform">
                        <ThumbsDown className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                ))
              )}
              <div ref={commentsEndRef} />
            </div>
          </ScrollArea>

          {replyingTo && (
            <div className="px-3 py-2 bg-muted/50 border-t flex items-center justify-between flex-shrink-0">
              <span className="text-xs text-muted-foreground">
                Replying to <span className="font-medium text-foreground">@{replyingTo.profiles?.full_name || 'User'}</span>
              </span>
              <button onClick={cancelReply} className="text-xs text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="p-3 border-t bg-background flex-shrink-0">
            <div className="flex items-center gap-2">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={user ? (replyingTo ? `Reply to @${replyingTo.profiles?.full_name || 'User'}...` : "Add a comment...") : "Login to comment"}
                className="flex-1 h-10 text-sm"
                onKeyPress={(e) => e.key === 'Enter' && handleSendComment()}
                disabled={!user}
              />
              <Button
                size="icon"
                onClick={handleSendComment}
                disabled={!newComment.trim() || !user}
                className="h-10 w-10"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes float-up {
          0% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-100px) scale(1.5);
          }
        }
      `}</style>
    </div>
  );
}
