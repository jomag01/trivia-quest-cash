import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Settings, Eye, ShoppingBag, Video, VideoOff, Mic, MicOff, Loader2, Wifi, WifiOff, Signal, SwitchCamera, Minimize2, Maximize2 } from "lucide-react";
import { 
  SFUBroadcaster, 
  StreamStats,
  detectOptimalQuality,
  getMediaConstraints,
  QUALITY_PRESETS 
} from "@/lib/streaming";
import type { ConnectionState } from "@/lib/streaming/SFUConnection";
import LiveBasketManager from "./LiveBasketManager";
import LiveDMOverlay from "./LiveDMOverlay";
import { uploadToAWS } from "@/lib/awsMedia";
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
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionState, setConnectionState] = useState<ConnectionState>('new');
  const [streamStats, setStreamStats] = useState<StreamStats | null>(null);
  const [currentQuality, setCurrentQuality] = useState('high');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [minimized, setMinimized] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);
  const MINI_W = 120, MINI_H = 200;
  const minimize = () => {
    setPos({ x: window.innerWidth - MINI_W - 12, y: window.innerHeight - MINI_H - 90 });
    setShowProducts(false);
    setMinimized(true);
  };
  const onPointerDown = (e: React.PointerEvent) => {
    if (!minimized) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (Math.abs(dx) + Math.abs(dy) > 5) d.moved = true;
    setPos({
      x: Math.min(Math.max(0, d.ox + dx), window.innerWidth - MINI_W),
      y: Math.min(Math.max(0, d.oy + dy), window.innerHeight - MINI_H),
    });
  };
  const onPointerUp = () => {
    const d = dragRef.current;
    dragRef.current = null;
    if (d && !d.moved) setMinimized(false);
  };
  const broadcasterConnectionRef = useRef<SFUBroadcaster | null>(null);

  const saveThumbnail = async (camera: MediaStream) => {
    const track = camera.getVideoTracks()[0];
    if (!track || !user) return;
    try {
      // A temporary video lets us capture a frame even before the local preview paints.
      const preview = document.createElement('video');
      preview.srcObject = camera;
      preview.muted = true;
      preview.playsInline = true;
      await preview.play();
      if (!preview.videoWidth) await new Promise<void>(resolve => {
        preview.onloadeddata = () => resolve();
        setTimeout(resolve, 2000);
      });
      if (!preview.videoWidth || track.readyState !== 'live') return;
      const canvas = document.createElement('canvas');
      canvas.width = 360;
      canvas.height = Math.round(360 * preview.videoHeight / preview.videoWidth);
      canvas.getContext('2d')?.drawImage(preview, 0, 0, canvas.width, canvas.height);
      preview.srcObject = null;
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.75));
      if (!blob) return;
      const result = await uploadToAWS(new File([blob], `live-${streamId}.jpg`, { type: 'image/jpeg' }), `live/${user.id}`);
      if (result?.cdnUrl) {
        await supabase.from('live_streams').update({ thumbnail_url: result.cdnUrl }).eq('id', streamId).eq('user_id', user.id);
      }
    } catch (error) {
      console.warn('Could not save live preview:', error);
    }
  };

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
      if (broadcasterConnectionRef.current) {
        broadcasterConnectionRef.current.stop();
      }
    };
  }, [streamId]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const startCamera = async (facing: 'user' | 'environment' = facingMode) => {
    if (!user) return;
    
    // Stop existing stream first
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
    }
    
    setIsConnecting(true);
    setConnectionState('connecting');
    
    try {
      // Detect optimal quality based on network conditions
      const optimalQuality = detectOptimalQuality();
      const qualityKey = Object.entries(QUALITY_PRESETS).find(
        ([, preset]) => preset.bitrate === optimalQuality.bitrate
      )?.[0] || 'high';
      setCurrentQuality(qualityKey);
      
      // Get optimized media constraints with hardware encoding and camera facing mode
      const baseConstraints = getMediaConstraints(optimalQuality);
      const constraints = {
        ...baseConstraints,
        video: {
          ...(typeof baseConstraints.video === 'object' ? baseConstraints.video : {}),
          facingMode: facing
        }
      };
      console.log('[Broadcaster] Starting with quality:', qualityKey, 'camera:', facing);
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setMediaStream(stream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Enable low-latency playback for local preview
        videoRef.current.playsInline = true;
      }
      
      // Initialize SFU broadcaster connection with callbacks
      broadcasterConnectionRef.current = new SFUBroadcaster(streamId, user.id, {
        onStatsUpdate: (stats) => {
          setStreamStats(stats);
        },
        onStateChange: (state) => {
          setConnectionState(state);
          if (state === 'connected') {
            setIsConnecting(false);
          }
        },
        onViewerCountChange: (count) => {
          setViewerCount(count);
        }
      });
      
      await broadcasterConnectionRef.current.start(stream);
      void saveThumbnail(stream);
      
      // Update stream status to live
      await supabase
        .from('live_streams')
        .update({ 
          status: 'live',
          started_at: new Date().toISOString(),
          stream_key: `live_${streamId}`
        })
        .eq('id', streamId);
        
      setIsConnecting(false);
      toast.success("You're now live! Enterprise streaming enabled.");
    } catch (error) {
      console.error('Failed to access camera:', error);
      toast.error("Failed to access camera. Please check permissions.");
      setIsConnecting(false);
      setConnectionState('failed');
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

  const switchCamera = async () => {
    const newFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacing);
    await startCamera(newFacing);
    toast.success(newFacing === 'user' ? 'Front camera' : 'Back camera');
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
      if (userIds.length > 0) {
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
    
    if (broadcasterConnectionRef.current) {
      broadcasterConnectionRef.current.stop();
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
    <div
      className={minimized
        ? "fixed z-[60] rounded-xl overflow-hidden shadow-2xl ring-2 ring-destructive bg-black touch-none select-none"
        : "fixed inset-0 bg-black z-50 flex flex-col"}
      style={minimized ? { left: pos.x, top: pos.y, width: MINI_W, height: MINI_H } : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {minimized && (
        <div className="absolute top-1 left-1 right-1 z-30 flex items-center justify-between pointer-events-none">
          <Badge variant="destructive" className="text-[9px] px-1 py-0 animate-pulse">● LIVE</Badge>
          <span className="text-white text-[10px] flex items-center gap-0.5 bg-black/50 rounded px-1"><Eye className="w-3 h-3" />{viewerCount}</span>
          <Maximize2 className="w-4 h-4 text-white" />
        </div>
      )}
      <div className={minimized ? "relative w-full h-full" : "relative flex-1 bg-gray-900"}>
        {isConnecting && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-20">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-white">Starting stream...</p>
            </div>
          </div>
        )}
        {!minimized && <LiveDMOverlay />}
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

        {!minimized && (<>
        {/* Gift/Reaction Notifications - visible to broadcaster */}
        <div className="absolute top-20 left-4 right-4 space-y-2 z-20 pointer-events-none">
          {gifts.map((gift) => (
            <div 
              key={gift.id}
              className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-4 py-3 rounded-xl shadow-lg animate-bounce flex items-center gap-2"
            >
              <span className="text-2xl">{gift.gift_type}</span>
              <div>
                <p className="font-bold text-sm">{gift.profiles?.full_name || 'Someone'}</p>
                <p className="text-xs opacity-90">sent a gift! +{gift.diamond_amount} 💎</p>
              </div>
            </div>
          ))}
        </div>

        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent z-10">
          <div className="flex items-center gap-3">
            <Badge variant="destructive" className="animate-pulse">● LIVE</Badge>
            <span className="text-white flex items-center gap-1 text-sm">
              <Eye className="w-4 h-4" /> {viewerCount}
            </span>
            {/* Quality indicator */}
            <span className="text-white flex items-center gap-1 text-xs bg-black/50 px-2 py-1 rounded">
              <Signal className="w-3 h-3" /> {currentQuality.toUpperCase()}
            </span>
            {/* Connection status */}
            <span className="flex items-center gap-1">
              {connectionState === 'connected' ? (
                <Wifi className="w-4 h-4 text-green-400" />
              ) : connectionState === 'connecting' ? (
                <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-400" />
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={minimize} aria-label="Minimize live">
              <Minimize2 className="w-4 h-4 mr-1" /> Minimize
            </Button>
            <Button variant="destructive" size="sm" onClick={handleEndStream}>
              End
            </Button>
          </div>
        </div>
        
        {/* Stream stats overlay */}
        {streamStats && (
          <div className="absolute top-16 right-4 bg-black/60 text-white text-xs p-2 rounded z-10 space-y-1">
            <div>Bitrate: {Math.round(streamStats.bitrate)} kbps</div>
            <div>FPS: {streamStats.frameRate}</div>
            <div>RTT: {Math.round(streamStats.rtt)} ms</div>
            {streamStats.qualityLimitationReason !== 'none' && (
              <div className="text-yellow-400">Limited: {streamStats.qualityLimitationReason}</div>
            )}
          </div>
        )}

        <Button
          className="absolute bottom-20 left-4 z-10 text-xs px-3"
          size="sm"
          onClick={() => setShowProducts(!showProducts)}
        >
          <ShoppingBag className="w-4 h-4 mr-1" />
          Basket
        </Button>

        {showProducts && (
          <LiveBasketManager streamId={streamId} onClose={() => setShowProducts(false)} />
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
        </>)}
      </div>

      <div className={minimized ? "hidden" : "bg-black p-3 flex items-center justify-center gap-3"}>
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
        <Button 
          variant="outline" 
          size="icon" 
          className="h-10 w-10"
          onClick={switchCamera}
        >
          <SwitchCamera className="w-5 h-5" />
        </Button>
        <Button variant="outline" size="icon" className="h-10 w-10">
          <Settings className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
