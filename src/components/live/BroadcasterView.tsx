import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Settings, Eye, ShoppingBag } from "lucide-react";

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
  const [jitsiLoaded, setJitsiLoaded] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const jitsiApiRef = useRef<any>(null);

  const roomName = `livestream_${streamId.replace(/-/g, '')}`;

  useEffect(() => {
    fetchStreamData();
    initJitsi();

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
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
      }
    };
  }, [streamId]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const initJitsi = () => {
    const script = document.createElement('script');
    script.src = 'https://meet.jit.si/external_api.js';
    script.async = true;
    script.onload = () => {
      console.log('Jitsi script loaded for broadcaster');
      setJitsiLoaded(true);
    };
    script.onerror = () => {
      console.error('Failed to load Jitsi script');
      toast.error('Failed to load video streaming');
    };
    document.body.appendChild(script);
  };

  const startJitsiMeeting = () => {
    if (!jitsiContainerRef.current || jitsiApiRef.current) return;

    try {
      const domain = 'meet.jit.si';
      const options = {
        roomName: roomName,
        parentNode: jitsiContainerRef.current,
        width: '100%',
        height: '100%',
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          prejoinPageEnabled: false,
          disableDeepLinking: true,
          enableWelcomePage: false,
          enableClosePage: false,
          disableInviteFunctions: true,
          toolbarButtons: ['microphone', 'camera', 'settings'],
          hideConferenceSubject: true,
          hideConferenceTimer: true,
          subject: ' ',
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_BRAND_WATERMARK: false,
          TOOLBAR_BUTTONS: ['microphone', 'camera', 'settings'],
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
          HIDE_INVITE_MORE_HEADER: true,
          MOBILE_APP_PROMO: false,
          FILM_STRIP_MAX_HEIGHT: 0,
          VERTICAL_FILMSTRIP: false,
        },
        userInfo: {
          displayName: user?.user_metadata?.full_name || 'Broadcaster',
        }
      };

      // @ts-ignore
      jitsiApiRef.current = new window.JitsiMeetExternalAPI(domain, options);
      
      jitsiApiRef.current.addListener('videoConferenceJoined', () => {
        console.log('Broadcaster joined the stream');
        // Store room name in stream_key field
        (supabase as any)
          .from('live_streams')
          .update({ stream_key: roomName })
          .eq('id', streamId);
      });

    } catch (error) {
      console.error('Failed to initialize Jitsi:', error);
    }
  };

  useEffect(() => {
    if (jitsiLoaded && jitsiContainerRef.current && !jitsiApiRef.current) {
      startJitsiMeeting();
    }
  }, [jitsiLoaded]);

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
    if (jitsiApiRef.current) {
      jitsiApiRef.current.dispose();
    }
    
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
        <div 
          ref={jitsiContainerRef} 
          className="w-full h-full"
          style={{ minHeight: '300px' }}
        />

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
            <span className="text-white flex items-center gap-1">
              <Eye className="w-4 h-4" /> {viewerCount} viewers
            </span>
          </div>
          <Button variant="destructive" size="sm" onClick={handleEndStream}>
            End Stream
          </Button>
        </div>

        <Button
          className="absolute bottom-20 left-4 bg-orange-500 hover:bg-orange-600 z-10"
          onClick={() => setShowProducts(!showProducts)}
        >
          <ShoppingBag className="w-4 h-4 mr-2" />
          Products ({products.length})
        </Button>

        {showProducts && (
          <div className="absolute bottom-32 left-4 right-20 max-h-32 z-10">
            <ScrollArea className="h-full">
              <div className="flex gap-2 p-2">
                {products.map((product) => (
                  <Card key={product.id} className="flex-shrink-0 w-24 p-2 bg-white/10 backdrop-blur">
                    <img
                      src={product.image_url || "/placeholder.svg"}
                      alt={product.name}
                      className="w-full h-14 object-cover rounded mb-1"
                    />
                    <p className="text-white text-[10px] truncate">{product.name}</p>
                    <p className="text-orange-400 font-bold text-xs">₱{product.final_price}</p>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        <div className="absolute bottom-20 right-4 w-64 max-h-40 z-10">
          <ScrollArea className="h-full">
            <div className="space-y-2 p-2">
              {comments.slice(-15).map((comment) => (
                <div key={comment.id} className="flex items-start gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={comment.profiles?.avatar_url || ""} />
                    <AvatarFallback className="text-[8px]">{comment.profiles?.full_name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="bg-black/50 rounded-lg px-2 py-1 max-w-[200px]">
                    <span className="text-pink-400 text-[10px] font-medium">{comment.profiles?.full_name}</span>
                    <span className="text-white text-xs ml-1">{comment.content}</span>
                  </div>
                </div>
              ))}
              <div ref={commentsEndRef} />
            </div>
          </ScrollArea>
        </div>
      </div>

      <div className="bg-black p-4 flex items-center justify-center gap-4">
        <Button variant="outline" size="icon">
          <Settings className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
