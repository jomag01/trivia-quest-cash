import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Settings, Eye, ShoppingBag, Video, VideoOff, Mic, MicOff } from "lucide-react";

interface BroadcasterViewProps {
  streamId: string;
  onEndStream: () => void;
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
  profiles?: {
    full_name: string;
  };
}

export default function BroadcasterView({ streamId, onEndStream }: BroadcasterViewProps) {
  const { user } = useAuth();
  const [stream, setStream] = useState<any>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [showProducts, setShowProducts] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    fetchStreamData();
    startCamera();

    const commentsChannel = supabase
      .channel(`broadcaster-comments-${streamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_stream_comments',
          filter: `stream_id=eq.${streamId}`
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

    const giftsChannel = supabase
      .channel(`broadcaster-gifts-${streamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_stream_gifts',
          filter: `stream_id=eq.${streamId}`
        },
        async (payload) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', payload.new.sender_id)
            .single();
          
          const newGift = {
            ...payload.new as Gift,
            profiles: profile
          };
          
          setGifts(prev => [...prev, newGift]);
          toast.success(`🎉 ${profile?.full_name || 'Someone'} sent ${payload.new.gift_type} (+${payload.new.diamond_amount} 💎)!`);
          
          setTimeout(() => {
            setGifts(prev => prev.filter(g => g.id !== newGift.id));
          }, 4000);
        }
      )
      .subscribe();

    const streamChannel = supabase
      .channel(`broadcaster-stream-${streamId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_streams',
          filter: `id=eq.${streamId}`
        },
        (payload) => {
          setViewerCount(payload.new.viewer_count);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(giftsChannel);
      supabase.removeChannel(streamChannel);
      stopCamera();
    };
  }, [streamId]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true
      });
      setMediaStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      // Update stream status to live
      await supabase
        .from('live_streams')
        .update({ 
          status: 'live',
          started_at: new Date().toISOString(),
          stream_key: `live_${streamId}`
        })
        .eq('id', streamId);
        
      toast.success("You're now live!");
    } catch (error) {
      console.error('Failed to access camera:', error);
      toast.error("Failed to access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      setMediaStream(null);
    }
  };

  const toggleVideo = () => {
    if (mediaStream) {
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOn(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (mediaStream) {
      const audioTrack = mediaStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioOn(audioTrack.enabled);
      }
    }
  };

  const fetchStreamData = async () => {
    const { data } = await supabase
      .from('live_streams')
      .select('*')
      .eq('id', streamId)
      .single();
    
    if (data) {
      setStream(data);
      setViewerCount(data.viewer_count);
    }

    const { data: commentsData } = await supabase
      .from('live_stream_comments')
      .select('*')
      .eq('stream_id', streamId)
      .order('created_at', { ascending: true })
      .limit(100);
    
    if (commentsData) {
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

    const { data: streamProducts } = await supabase
      .from('live_stream_products')
      .select('product_id, display_order')
      .eq('stream_id', streamId)
      .order('display_order');
    
    if (streamProducts && streamProducts.length > 0) {
      const productIds = streamProducts.map(sp => sp.product_id);
      const { data: productsData } = await supabase
        .from('products')
        .select('id, name, final_price, image_url')
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

  const handleEndStream = async () => {
    stopCamera();
    
    await supabase
      .from('live_streams')
      .update({ 
        status: 'ended',
        ended_at: new Date().toISOString(),
        stream_key: null
      })
      .eq('id', streamId);
    
    toast.success("Stream ended");
    onEndStream();
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="relative flex-1 bg-gray-900">
        <video 
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />

        {!isVideoOn && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
            <VideoOff className="w-16 h-16 text-gray-500" />
          </div>
        )}

        <div className="absolute top-20 left-4 space-y-2 z-10 pointer-events-none">
          {gifts.map((gift) => (
            <div 
              key={gift.id}
              className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-4 py-2 rounded-full animate-bounce"
            >
              {gift.profiles?.full_name} sent {gift.gift_type} 💎{gift.diamond_amount}
            </div>
          ))}
        </div>

        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent z-10">
          <div className="flex items-center gap-3">
            <Badge variant="destructive" className="animate-pulse">● LIVE</Badge>
            <span className="text-white flex items-center gap-1 text-sm">
              <Eye className="w-4 h-4" /> {viewerCount}
            </span>
          </div>
          <Button variant="destructive" size="sm" onClick={handleEndStream}>
            End
          </Button>
        </div>

        <Button
          className="absolute bottom-20 left-4 bg-orange-500 hover:bg-orange-600 z-10 text-xs px-3"
          size="sm"
          onClick={() => setShowProducts(!showProducts)}
        >
          <ShoppingBag className="w-4 h-4 mr-1" />
          ({products.length})
        </Button>

        {showProducts && (
          <div className="absolute bottom-32 left-4 right-20 max-h-32 z-10">
            <ScrollArea className="h-full">
              <div className="flex gap-2 p-2">
                {products.map((product) => (
                  <Card key={product.id} className="flex-shrink-0 w-20 p-1.5 bg-white/10 backdrop-blur">
                    <img
                      src={product.image_url || "/placeholder.svg"}
                      alt={product.name}
                      className="w-full h-12 object-cover rounded mb-1"
                    />
                    <p className="text-white text-[8px] truncate">{product.name}</p>
                    <p className="text-orange-400 font-bold text-[10px]">₱{product.final_price}</p>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        <div className="absolute bottom-20 right-4 w-56 max-h-36 z-10">
          <ScrollArea className="h-full">
            <div className="space-y-1.5 p-2">
              {comments.slice(-15).map((comment) => (
                <div key={comment.id} className="flex items-start gap-1.5">
                  <Avatar className="h-4 w-4">
                    <AvatarImage src={comment.profiles?.avatar_url || ""} />
                    <AvatarFallback className="text-[6px]">{comment.profiles?.full_name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="bg-black/50 rounded-lg px-2 py-1 max-w-[180px]">
                    <span className="text-pink-400 text-[8px] font-medium">{comment.profiles?.full_name}</span>
                    <span className="text-white text-[10px] ml-1">{comment.content}</span>
                  </div>
                </div>
              ))}
              <div ref={commentsEndRef} />
            </div>
          </ScrollArea>
        </div>
      </div>

      <div className="bg-black p-3 flex items-center justify-center gap-3">
        <Button 
          variant={isVideoOn ? "outline" : "destructive"} 
          size="icon"
          className="h-10 w-10"
          onClick={toggleVideo}
        >
          {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </Button>
        <Button 
          variant={isAudioOn ? "outline" : "destructive"} 
          size="icon"
          className="h-10 w-10"
          onClick={toggleAudio}
        >
          {isAudioOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </Button>
        <Button variant="outline" size="icon" className="h-10 w-10">
          <Settings className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}