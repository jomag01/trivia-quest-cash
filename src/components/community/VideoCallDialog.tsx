import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Video, Mic, MicOff, VideoOff, PhoneOff, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface VideoCallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId?: string;
  conversationId?: string;
  groupName?: string;
}

export const VideoCallDialog = ({ open, onOpenChange, groupId, conversationId, groupName }: VideoCallDialogProps) => {
  const { user } = useAuth();
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [roomUrl, setRoomUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && !isCallActive) {
      initializeCall();
    } else if (!open) {
      endCall();
    }
  }, [open]);

  const initializeCall = async () => {
    setLoading(true);
    try {
      const supabaseClient: any = supabase;
      
      // Create a unique room ID
      const roomId = `room-${groupId || conversationId}-${Date.now()}`;
      
      // Save call session to database
      const { error } = await supabaseClient
        .from("video_call_sessions")
        .insert({
          group_id: groupId || null,
          conversation_id: conversationId || null,
          started_by: user?.id,
          room_id: roomId
        });

      if (error) throw error;

      // Use Jitsi Meet as the WebRTC provider (free, open source, supports many participants)
      const jitsiUrl = `https://meet.jit.si/${roomId}`;
      setRoomUrl(jitsiUrl);
      
    } catch (error: any) {
      console.error("Error initializing call:", error);
      toast.error("Failed to initialize video call");
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const startCall = async () => {
    try {
      // Request permissions
      await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      setIsCallActive(true);
      toast.success("Call started!");
    } catch (error: any) {
      console.error("Error starting call:", error);
      toast.error("Failed to access camera/microphone. Please allow permissions.");
    }
  };

  const endCall = () => {
    setIsCallActive(false);
    setRoomUrl("");
    toast.success("Call ended");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            {groupName ? `${groupName} - Video Call` : "Video Call"}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">Initializing video call...</p>
          </div>
        ) : !isCallActive ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center">
              <Video className="w-16 h-16 text-primary" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold mb-2">Ready to start a video call?</h3>
              <p className="text-muted-foreground mb-2">
                Make sure your camera and microphone are working
              </p>
              <p className="text-xs text-muted-foreground">
                Supports up to 200 participants
              </p>
            </div>
            <Button onClick={startCall} size="lg" className="px-8">
              <Video className="w-5 h-5 mr-2" />
              Start Call
            </Button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            {/* Video Container */}
            <div className="flex-1 bg-muted rounded-lg mb-4 relative overflow-hidden">
              {roomUrl ? (
                <iframe
                  src={roomUrl}
                  allow="camera; microphone; fullscreen; display-capture; autoplay"
                  className="w-full h-full border-0"
                  title="Video Call"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Connecting to video call...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
              <Button
                size="lg"
                variant={isMuted ? "destructive" : "secondary"}
                className="rounded-full w-14 h-14"
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </Button>
              
              <Button
                size="lg"
                variant={isVideoOff ? "destructive" : "secondary"}
                className="rounded-full w-14 h-14"
                onClick={() => setIsVideoOff(!isVideoOff)}
              >
                {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
              </Button>
              
              <Button
                size="lg"
                variant="destructive"
                className="rounded-full w-14 h-14"
                onClick={() => {
                  endCall();
                  onOpenChange(false);
                }}
              >
                <PhoneOff className="w-6 h-6" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
