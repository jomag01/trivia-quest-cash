import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  X, Heart, MessageCircle, Gift, ShoppingBag, Share2, 
  Loader2, Volume2, VolumeX, RefreshCw, Wifi, WifiOff,
  Minimize2, Send
} from "lucide-react";
import { IVSViewer, IVSConnectionState } from "@/lib/streaming/IVSConnection";

interface LiveStream {
  id: string;
  user_id: string;
  title: string;
  viewer_count: number;
  profiles?: {
    full_name: string;
    avatar_url: string;
    referral_code: string;
  };
}

interface Product {
  id: string;
  name: string;
  final_price: number;
  image_url: string;
}

interface Comment {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  profiles?: {
    full_name: string;
    avatar_url: string;
  };
}

interface Gift {
  id: string;
  gift_type: string;
  diamond_amount: number;
  sender_id: string;
}

interface IVSViewerViewProps {
  stream: LiveStream;
  onClose: () => void;
  onMinimize?: () => void;
}

const GIFT_OPTIONS = [
  { type: '🌹', name: 'Rose', cost: 1 },
  { type: '💎', name: 'Diamond', cost: 5 },
  { type: '🎁', name: 'Gift Box', cost: 10 },
  { type: '👑', name: 'Crown', cost: 50 },
  { type: '🚀', name: 'Rocket', cost: 100 },
];

export default function IVSViewerView({ stream, onClose, onMinimize }: IVSViewerViewProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [newComment, setNewComment] = useState("");
  const [showGifts, setShowGifts] = useState(false);
  const [showProducts, setShowProducts] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [connectionState, setConnectionState] = useState<IVSConnectionState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [viewerCount, setViewerCount] = useState(stream.viewer_count || 0);
  const [userDiamonds, setUserDiamonds] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const viewerRef = useRef<IVSViewer | null>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const isConnecting = connectionState === 'initializing' || connectionState === 'connecting';
  const isConnected = connectionState === 'connected';

  useEffect(() => {
    fetchInitialData();
    connectToStream();

    // Real-time subscriptions
    const commentsChannel = supabase
      .channel(`ivs-viewer-comments-${stream.id}`)
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
      .channel(`ivs-viewer-stream-${stream.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_streams',
          filter: `id=eq.${stream.id}`
        },
        (payload) => {
          if (payload.new.status === 'ended') {
            toast.info("Stream has ended");
            onClose();
          }
          setViewerCount(payload.new.viewer_count || 0);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(streamChannel);
      disconnectFromStream();
    };
  }, [stream.id]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const fetchInitialData = async () => {
    // Fetch comments
    const { data: commentsData } = await supabase
      .from('live_stream_comments')
      .select('*')
      .eq('stream_id', stream.id)
      .order('created_at', { ascending: true })
      .limit(100);

    if (commentsData && commentsData.length > 0) {
      const userIds = [...new Set(commentsData.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      setComments(commentsData.map(c => ({
        ...c,
        profiles: profileMap.get(c.user_id)
      })));
    }

    // Fetch products
    const { data: streamProducts } = await supabase
      .from('live_stream_products')
      .select('product_id')
      .eq('stream_id', stream.id);

    if (streamProducts && streamProducts.length > 0) {
      const productIds = streamProducts.map(sp => sp.product_id);
      const { data: productsData } = await supabase
        .from('products')
        .select('id, name, final_price, image_url')
        .in('id', productIds);

      if (productsData) {
        setProducts(productsData);
      }
    }

    // Fetch user diamonds
    if (user) {
      const { data: wallet } = await supabase
        .from('treasure_wallet')
        .select('diamonds')
        .eq('user_id', user.id)
        .single();

      if (wallet) {
        setUserDiamonds(wallet.diamonds);
      }

      // Check follow status
      const { data: follow } = await supabase
        .from('live_stream_followers')
        .select('id')
        .eq('streamer_id', stream.user_id)
        .eq('follower_id', user.id)
        .maybeSingle();

      setIsFollowing(!!follow);
    }
  };

  const connectToStream = async () => {
    if (!user) {
      toast.error("Please login to watch streams");
      return;
    }

    setError(null);

    try {
      viewerRef.current = new IVSViewer(
        {
          streamId: stream.id,
          userId: user.id,
          onStateChange: (state) => {
            setConnectionState(state);
            console.log('[IVS Viewer UI] State:', state);
          },
          onError: (err) => {
            console.error('[IVS Viewer UI] Error:', err);
            setError(err.message);
          }
        },
        stream.user_id,
        (remoteStream) => {
          console.log('[IVS Viewer UI] Received stream');
          if (videoRef.current) {
            videoRef.current.srcObject = remoteStream;
            videoRef.current.muted = isMuted;
            videoRef.current.play().catch(e => {
              console.log('[IVS Viewer UI] Autoplay blocked:', e);
            });
          }
        }
      );

      await viewerRef.current.connect();

      // Increment viewer count
      await supabase
        .from('live_streams')
        .update({ viewer_count: viewerCount + 1 })
        .eq('id', stream.id);

    } catch (err: any) {
      console.error('[IVS Viewer UI] Connection failed:', err);
      setError(err.message || 'Failed to connect');
      setConnectionState('failed');
    }
  };

  const disconnectFromStream = async () => {
    if (viewerRef.current) {
      viewerRef.current.disconnect();
      viewerRef.current = null;
    }

    // Decrement viewer count
    await supabase
      .from('live_streams')
      .update({ viewer_count: Math.max(0, viewerCount - 1) })
      .eq('id', stream.id);
  };

  const handleRetry = async () => {
    setError(null);
    await disconnectFromStream();
    await connectToStream();
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
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

  const handleSendGift = async (giftType: string, cost: number) => {
    if (!user) {
      toast.error("Please login to send gifts");
      return;
    }

    if (userDiamonds < cost) {
      toast.error("Not enough diamonds");
      return;
    }

    // Deduct diamonds
    const { error: walletError } = await supabase
      .from('treasure_wallet')
      .update({ diamonds: userDiamonds - cost })
      .eq('user_id', user.id);

    if (walletError) {
      toast.error("Failed to send gift");
      return;
    }

    // Record gift
    const { error: giftError } = await supabase
      .from('live_stream_gifts')
      .insert({
        stream_id: stream.id,
        sender_id: user.id,
        gift_type: giftType,
        diamond_amount: cost
      });

    if (!giftError) {
      setUserDiamonds(prev => prev - cost);
      toast.success(`Sent ${giftType}!`);
      setShowGifts(false);
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

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="relative flex-1">
        {/* Loading overlay */}
        {isConnecting && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-white">Connecting to stream...</p>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {error && connectionState === 'failed' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-20">
            <div className="text-center p-6">
              <WifiOff className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <h3 className="text-white text-lg font-semibold mb-2">Connection Failed</h3>
              <p className="text-gray-400 text-sm mb-4">{error}</p>
              <Button onClick={handleRetry} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Video */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isMuted}
          className="w-full h-full object-contain bg-black"
          onClick={toggleMute}
        />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent z-10">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-pink-500">
              <AvatarImage src={stream.profiles?.avatar_url || ""} />
              <AvatarFallback>{stream.profiles?.full_name?.[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-white font-semibold text-sm">{stream.profiles?.full_name}</p>
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="text-[10px] py-0">LIVE</Badge>
                <span className="text-gray-300 text-xs">{viewerCount} watching</span>
              </div>
            </div>
            <Button
              size="sm"
              variant={isFollowing ? "secondary" : "default"}
              className="h-7 text-xs"
              onClick={handleFollow}
            >
              {isFollowing ? "Following" : "Follow"}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {connectionState === 'connected' ? (
              <Wifi className="w-4 h-4 text-green-400" />
            ) : connectionState === 'reconnecting' ? (
              <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
            ) : null}
            
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-white"
              onClick={toggleMute}
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </Button>
            
            {onMinimize && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-white"
                onClick={onMinimize}
              >
                <Minimize2 className="w-5 h-5" />
              </Button>
            )}
            
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-white"
              onClick={onClose}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Products panel */}
        {showProducts && products.length > 0 && (
          <div className="absolute bottom-32 left-4 right-4 z-20">
            <ScrollArea className="max-h-40">
              <div className="flex gap-2 p-2">
                {products.map((product) => (
                  <Card key={product.id} className="flex-shrink-0 w-28 p-2 bg-white/10 backdrop-blur">
                    <img
                      src={product.image_url || "/placeholder.svg"}
                      alt={product.name}
                      className="w-full h-16 object-cover rounded mb-2"
                    />
                    <p className="text-white text-xs truncate">{product.name}</p>
                    <p className="text-orange-400 font-bold text-sm">₱{product.final_price}</p>
                    <Button size="sm" className="w-full mt-2 h-6 text-xs">
                      Buy
                    </Button>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Gifts panel */}
        {showGifts && (
          <div className="absolute bottom-32 left-4 right-4 bg-black/80 rounded-lg p-4 z-20">
            <div className="flex justify-between items-center mb-3">
              <span className="text-white text-sm font-semibold">Send a Gift</span>
              <span className="text-yellow-400 text-sm">💎 {userDiamonds}</span>
            </div>
            <div className="flex gap-3 justify-center">
              {GIFT_OPTIONS.map((gift) => (
                <button
                  key={gift.type}
                  onClick={() => handleSendGift(gift.type, gift.cost)}
                  className="flex flex-col items-center p-2 rounded-lg hover:bg-white/10 transition-colors"
                  disabled={userDiamonds < gift.cost}
                >
                  <span className="text-3xl">{gift.type}</span>
                  <span className="text-white text-xs">{gift.name}</span>
                  <span className="text-yellow-400 text-xs">{gift.cost}💎</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Comments */}
        <div className="absolute bottom-20 left-0 right-0 max-h-40">
          <ScrollArea className="h-full">
            <div className="space-y-2 px-4">
              {comments.slice(-20).map((comment) => (
                <div key={comment.id} className="flex items-start gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={comment.profiles?.avatar_url || ""} />
                    <AvatarFallback className="text-xs">
                      {comment.profiles?.full_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-black/50 rounded-lg px-3 py-1.5 max-w-[80%]">
                    <span className="text-pink-400 text-xs font-semibold">
                      {comment.profiles?.full_name}
                    </span>
                    <span className="text-white text-sm ml-2">{comment.content}</span>
                  </div>
                </div>
              ))}
              <div ref={commentsEndRef} />
            </div>
          </ScrollArea>
        </div>

        {/* Action buttons */}
        <div className="absolute right-4 bottom-24 flex flex-col gap-3 z-10">
          <Button
            size="icon"
            variant="ghost"
            className="h-10 w-10 bg-black/50 text-white rounded-full"
            onClick={handleFollow}
          >
            <Heart className={`w-6 h-6 ${isFollowing ? 'fill-red-500 text-red-500' : ''}`} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-10 w-10 bg-black/50 text-white rounded-full"
            onClick={() => setShowGifts(!showGifts)}
          >
            <Gift className="w-6 h-6" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-10 w-10 bg-black/50 text-white rounded-full"
            onClick={() => setShowProducts(!showProducts)}
          >
            <ShoppingBag className="w-6 h-6" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-10 w-10 bg-black/50 text-white rounded-full"
          >
            <Share2 className="w-6 h-6" />
          </Button>
        </div>
      </div>

      {/* Comment input */}
      <div className="bg-black p-3 flex items-center gap-2">
        <Input
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Say something..."
          className="flex-1 bg-gray-800 border-gray-700 text-white"
          onKeyPress={(e) => e.key === 'Enter' && handleSendComment()}
        />
        <Button
          size="icon"
          onClick={handleSendComment}
          disabled={!newComment.trim()}
        >
          <Send className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
