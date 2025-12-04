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
import { 
  Heart, MessageCircle, Share2, Gift, ShoppingBag, 
  X, Users, Eye, Send, UserPlus, UserMinus 
} from "lucide-react";

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

interface LiveStreamViewerProps {
  stream: LiveStream;
  onClose: () => void;
}

export default function LiveStreamViewer({ stream, onClose }: LiveStreamViewerProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isFollowing, setIsFollowing] = useState(false);
  const [viewerCount, setViewerCount] = useState(stream.viewer_count);
  const [showProducts, setShowProducts] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchComments();
    fetchProducts();
    checkFollowStatus();
    incrementViewCount();

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
          setViewerCount(payload.new.viewer_count);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(streamChannel);
    };
  }, [stream.id]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const fetchComments = async () => {
    const { data } = await supabase
      .from('live_stream_comments')
      .select('*')
      .eq('stream_id', stream.id)
      .order('created_at', { ascending: true })
      .limit(100);
    
    if (data) {
      // Fetch profiles separately
      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      setComments(data.map(c => ({
        ...c,
        profiles: profileMap.get(c.user_id)
      })));
    }
  };

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('live_stream_products')
      .select(`*, products:product_id(id, name, final_price, image_url, seller_id, diamond_reward)`)
      .eq('stream_id', stream.id)
      .order('display_order');
    
    if (data) {
      setProducts(data.map(p => p.products as unknown as Product).filter(Boolean));
    }
  };

  const handleBuyProduct = async (product: Product) => {
    if (!user) {
      toast.error("Please login to purchase");
      return;
    }

    // Add to cart with live stream referrer tracking
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

    // Store live stream referrer info in localStorage for checkout
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
      .update({ viewer_count: viewerCount + 1 })
      .eq('id', stream.id);
  };

  const handleSendComment = async () => {
    if (!user || !newComment.trim()) return;
    
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

    // Check diamond balance
    const { data: wallet } = await supabase
      .from('treasure_wallet')
      .select('diamonds')
      .eq('user_id', user.id)
      .single();

    if (!wallet || wallet.diamonds < diamonds) {
      toast.error("Insufficient diamonds");
      return;
    }

    // Deduct diamonds
    await supabase
      .from('treasure_wallet')
      .update({ diamonds: wallet.diamonds - diamonds })
      .eq('user_id', user.id);

    // Record gift
    await supabase
      .from('live_stream_gifts')
      .insert({
        stream_id: stream.id,
        sender_id: user.id,
        gift_type: giftType,
        diamond_amount: diamonds
      });

    toast.success(`Sent ${giftType}!`);
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Video/Stream Area */}
      <div className="relative flex-1 bg-gradient-to-b from-purple-900 to-black flex items-center justify-center">
        {/* Placeholder for actual video stream */}
        <div className="text-center text-white">
          <div className="text-6xl mb-4">📺</div>
          <h2 className="text-2xl font-bold">{stream.title}</h2>
          <p className="text-gray-300 mt-2">Live Stream</p>
        </div>

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-pink-500">
              <AvatarImage src={stream.profiles?.avatar_url || ""} />
              <AvatarFallback>{stream.profiles?.full_name?.[0] || "?"}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-white font-semibold text-sm">{stream.profiles?.full_name || "Streamer"}</p>
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="text-xs">LIVE</Badge>
                <span className="text-white/80 text-xs flex items-center gap-1">
                  <Eye className="w-3 h-3" /> {viewerCount}
                </span>
              </div>
            </div>
            <Button
              size="sm"
              variant={isFollowing ? "secondary" : "default"}
              onClick={handleFollow}
              className="ml-2"
            >
              {isFollowing ? <UserMinus className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            </Button>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white">
            <X className="w-6 h-6" />
          </Button>
        </div>

        {/* Products showcase button */}
        <Button
          className="absolute bottom-20 left-4 bg-orange-500 hover:bg-orange-600"
          onClick={() => setShowProducts(!showProducts)}
        >
          <ShoppingBag className="w-4 h-4 mr-2" />
          Products ({products.length})
        </Button>

        {/* Products panel */}
        {showProducts && products.length > 0 && (
          <div className="absolute bottom-32 left-4 right-20 max-h-48">
            <ScrollArea className="h-full">
              <div className="flex gap-2 p-2">
                {products.map((product) => (
                  <Card key={product.id} className="flex-shrink-0 w-36 p-2 bg-white/10 backdrop-blur">
                    <img
                      src={product.image_url || "/placeholder.svg"}
                      alt={product.name}
                      className="w-full h-20 object-cover rounded mb-2"
                    />
                    <p className="text-white text-xs truncate">{product.name}</p>
                    <p className="text-orange-400 font-bold text-sm">₱{product.final_price}</p>
                    {product.diamond_reward && (
                      <p className="text-cyan-400 text-xs">+{product.diamond_reward} 💎</p>
                    )}
                    <Button 
                      size="sm" 
                      className="w-full mt-2 bg-orange-500 hover:bg-orange-600 text-xs h-7"
                      onClick={() => handleBuyProduct(product)}
                    >
                      <ShoppingBag className="w-3 h-3 mr-1" />
                      Buy Now
                    </Button>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Side actions */}
        <div className="absolute right-4 bottom-32 flex flex-col gap-4">
          <Button variant="ghost" size="icon" className="text-white" onClick={() => handleSendGift("❤️", 1)}>
            <Heart className="w-7 h-7" />
          </Button>
          <Button variant="ghost" size="icon" className="text-white" onClick={() => handleSendGift("🎁", 10)}>
            <Gift className="w-7 h-7" />
          </Button>
          <Button variant="ghost" size="icon" className="text-white">
            <Share2 className="w-7 h-7" />
          </Button>
        </div>

        {/* Comments overlay */}
        <div className="absolute bottom-20 left-4 right-20 max-h-48 pointer-events-none">
          <ScrollArea className="h-full">
            <div className="space-y-2 p-2">
              {comments.slice(-20).map((comment) => (
                <div key={comment.id} className="flex items-start gap-2 pointer-events-auto">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={comment.profiles?.avatar_url || ""} />
                    <AvatarFallback className="text-xs">{comment.profiles?.full_name?.[0] || "?"}</AvatarFallback>
                  </Avatar>
                  <div className="bg-black/50 rounded-lg px-2 py-1 max-w-xs">
                    <span className="text-pink-400 text-xs font-medium">{comment.profiles?.full_name || "User"}</span>
                    <span className="text-white text-sm ml-2">{comment.content}</span>
                  </div>
                </div>
              ))}
              <div ref={commentsEndRef} />
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Comment input */}
      <div className="bg-black p-4 flex items-center gap-2">
        <Input
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Say something..."
          className="flex-1 bg-white/10 border-0 text-white placeholder:text-gray-400"
          onKeyPress={(e) => e.key === 'Enter' && handleSendComment()}
        />
        <Button onClick={handleSendComment} size="icon">
          <Send className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}