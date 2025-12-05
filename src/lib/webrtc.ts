// WebRTC utilities for live streaming
import { supabase } from "@/integrations/supabase/client";

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate';
  streamId: string;
  senderId: string;
  targetId?: string;
  payload: any;
}

export class BroadcasterConnection {
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private localStream: MediaStream | null = null;
  private streamId: string;
  private userId: string;
  private channel: any;

  constructor(streamId: string, userId: string) {
    this.streamId = streamId;
    this.userId = userId;
  }

  async start(stream: MediaStream) {
    this.localStream = stream;
    
    // Listen for viewer join requests
    this.channel = supabase
      .channel(`stream-signaling-${this.streamId}`)
      .on('broadcast', { event: 'viewer-join' }, async ({ payload }) => {
        if (payload.viewerId !== this.userId) {
          console.log('Viewer joined:', payload.viewerId);
          await this.createPeerConnection(payload.viewerId);
        }
      })
      .on('broadcast', { event: 'answer' }, async ({ payload }) => {
        if (payload.targetId === this.userId) {
          const pc = this.peerConnections.get(payload.senderId);
          if (pc && payload.sdp) {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          }
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        if (payload.targetId === this.userId) {
          const pc = this.peerConnections.get(payload.senderId);
          if (pc && payload.candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
          }
        }
      })
      .subscribe();
  }

  private async createPeerConnection(viewerId: string) {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.peerConnections.set(viewerId, pc);

    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.channel.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: {
            senderId: this.userId,
            targetId: viewerId,
            candidate: event.candidate.toJSON()
          }
        });
      }
    };

    // Create and send offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    this.channel.send({
      type: 'broadcast',
      event: 'offer',
      payload: {
        senderId: this.userId,
        targetId: viewerId,
        sdp: pc.localDescription
      }
    });
  }

  stop() {
    this.peerConnections.forEach(pc => pc.close());
    this.peerConnections.clear();
    if (this.channel) {
      supabase.removeChannel(this.channel);
    }
  }
}

export class ViewerConnection {
  private peerConnection: RTCPeerConnection | null = null;
  private streamId: string;
  private viewerId: string;
  private broadcasterId: string;
  private channel: any;
  private onStream: (stream: MediaStream) => void;

  constructor(streamId: string, viewerId: string, broadcasterId: string, onStream: (stream: MediaStream) => void) {
    this.streamId = streamId;
    this.viewerId = viewerId;
    this.broadcasterId = broadcasterId;
    this.onStream = onStream;
  }

  async connect() {
    this.peerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Handle incoming stream
    this.peerConnection.ontrack = (event) => {
      console.log('Received track:', event.track.kind);
      if (event.streams && event.streams[0]) {
        this.onStream(event.streams[0]);
      }
    };

    // Set up signaling channel
    this.channel = supabase
      .channel(`stream-signaling-${this.streamId}`)
      .on('broadcast', { event: 'offer' }, async ({ payload }) => {
        if (payload.targetId === this.viewerId && payload.senderId === this.broadcasterId) {
          console.log('Received offer from broadcaster');
          await this.handleOffer(payload.sdp);
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        if (payload.targetId === this.viewerId) {
          if (this.peerConnection && payload.candidate) {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(payload.candidate));
          }
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Notify broadcaster that viewer joined
          this.channel.send({
            type: 'broadcast',
            event: 'viewer-join',
            payload: { viewerId: this.viewerId }
          });
        }
      });

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.channel.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: {
            senderId: this.viewerId,
            targetId: this.broadcasterId,
            candidate: event.candidate.toJSON()
          }
        });
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      console.log('Connection state:', this.peerConnection?.connectionState);
    };
  }

  private async handleOffer(sdp: RTCSessionDescriptionInit) {
    if (!this.peerConnection) return;

    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    this.channel.send({
      type: 'broadcast',
      event: 'answer',
      payload: {
        senderId: this.viewerId,
        targetId: this.broadcasterId,
        sdp: this.peerConnection.localDescription
      }
    });
  }

  disconnect() {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    if (this.channel) {
      supabase.removeChannel(this.channel);
    }
  }
}
