import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Video, Phone, Mic, MicOff, VideoOff, Users } from "lucide-react";
import { toast } from "sonner";

interface VideoCallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId?: string;
  conversationId?: string;
  groupName?: string;
}

export const VideoCallDialog = ({ open, onOpenChange, groupId, conversationId, groupName }: VideoCallDialogProps) => {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [participants, setParticipants] = useState<string[]>([]);

  const startCall = async () => {
    try {
      // Request permissions
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      // For now, we'll just show a placeholder
      // In production, you'd integrate with a WebRTC service like Agora, Twilio, or Daily.co
      setIsCallActive(true);
      toast.success("Call started!");
      
      // Clean up stream
      stream.getTracks().forEach(track => track.stop());
    } catch (error: any) {
      console.error("Error starting call:", error);
      toast.error("Failed to access camera/microphone");
    }
  };

  const endCall = () => {
    setIsCallActive(false);
    onOpenChange(false);
    toast.success("Call ended");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            {groupName ? `${groupName} - Video Call` : "Video Call"}
          </DialogTitle>
        </DialogHeader>

        {!isCallActive ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center">
              <Video className="w-16 h-16 text-primary" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold mb-2">Ready to start a video call?</h3>
              <p className="text-muted-foreground mb-6">
                Make sure your camera and microphone are working
              </p>
            </div>
            <Button onClick={startCall} size="lg" className="px-8">
              <Video className="w-5 h-5 mr-2" />
              Start Call
            </Button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            {/* Video Grid */}
            <div className="flex-1 bg-muted rounded-lg mb-4 relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Video calling feature coming soon!
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Will support up to 200 participants with WebRTC
                  </p>
                </div>
              </div>
              
              {/* Participant count */}
              <div className="absolute top-4 right-4 bg-background/80 backdrop-blur px-3 py-1 rounded-full">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4" />
                  <span>{participants.length + 1}</span>
                </div>
              </div>
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
                onClick={endCall}
              >
                <Phone className="w-6 h-6 rotate-135" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
