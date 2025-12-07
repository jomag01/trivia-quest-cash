// SFU (Selective Forwarding Unit) Connection for enterprise-scale streaming
// Handles signaling, media routing, and adaptive quality

import { supabase } from "@/integrations/supabase/client";
import {
  ICE_SERVERS,
  QUALITY_PRESETS,
  BUFFER_CONFIG,
  CONGESTION_CONTROL,
  SFU_CONFIG,
  StreamingQualityPreset,
  detectOptimalQuality,
  getMediaConstraints,
  calculateOptimalBitrate,
  VIDEO_CODEC_PREFERENCES
} from "./StreamingConfig";

export type ConnectionState = 'new' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'failed';

export interface StreamStats {
  bitrate: number;
  frameRate: number;
  resolution: { width: number; height: number };
  packetsLost: number;
  jitter: number;
  rtt: number;
  qualityLimitationReason: string;
}

interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'quality-change' | 'viewer-count';
  streamId: string;
  senderId: string;
  targetId?: string;
  payload: any;
}

// Broadcaster connection using SFU architecture
export class SFUBroadcaster {
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private localStream: MediaStream | null = null;
  private streamId: string;
  private userId: string;
  private channel: any;
  private currentQuality: StreamingQualityPreset;
  private statsInterval: NodeJS.Timeout | null = null;
  private onStatsUpdate?: (stats: StreamStats) => void;
  private onStateChange?: (state: ConnectionState) => void;
  private onViewerCountChange?: (count: number) => void;

  constructor(
    streamId: string,
    userId: string,
    options?: {
      onStatsUpdate?: (stats: StreamStats) => void;
      onStateChange?: (state: ConnectionState) => void;
      onViewerCountChange?: (count: number) => void;
    }
  ) {
    this.streamId = streamId;
    this.userId = userId;
    this.currentQuality = detectOptimalQuality();
    this.onStatsUpdate = options?.onStatsUpdate;
    this.onStateChange = options?.onStateChange;
    this.onViewerCountChange = options?.onViewerCountChange;
  }

  async start(stream: MediaStream): Promise<void> {
    this.localStream = stream;
    this.onStateChange?.('connecting');

    // Apply encoding parameters for hardware H.264
    await this.configureEncoderSettings(stream);

    // Set up signaling channel
    this.channel = supabase
      .channel(`sfu-stream-${this.streamId}`)
      .on('broadcast', { event: 'viewer-join' }, async ({ payload }) => {
        if (payload.viewerId !== this.userId) {
          console.log('[SFU] Viewer joined:', payload.viewerId);
          await this.handleViewerJoin(payload.viewerId, payload.quality);
        }
      })
      .on('broadcast', { event: 'answer' }, async ({ payload }) => {
        if (payload.targetId === this.userId) {
          await this.handleAnswer(payload.senderId, payload.sdp);
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        if (payload.targetId === this.userId) {
          await this.handleIceCandidate(payload.senderId, payload.candidate);
        }
      })
      .on('broadcast', { event: 'quality-change' }, async ({ payload }) => {
        if (payload.targetId === this.userId) {
          await this.adjustQualityForViewer(payload.senderId, payload.quality);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[SFU] Broadcaster subscribed to signaling channel');
          this.onStateChange?.('connected');
          this.startStatsMonitoring();
        }
      });
  }

  private async configureEncoderSettings(stream: MediaStream): Promise<void> {
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return;

    // Apply constraints for optimal encoding
    try {
      await videoTrack.applyConstraints({
        width: { ideal: this.currentQuality.width },
        height: { ideal: this.currentQuality.height },
        frameRate: { ideal: this.currentQuality.frameRate }
      });
    } catch (e) {
      console.warn('[SFU] Could not apply video constraints:', e);
    }
  }

  private async handleViewerJoin(viewerId: string, requestedQuality?: string): Promise<void> {
    const pc = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    });

    this.peerConnections.set(viewerId, pc);

    // Add local tracks with simulcast for adaptive streaming
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      const audioTrack = this.localStream.getAudioTracks()[0];

      if (videoTrack) {
        const sender = pc.addTrack(videoTrack, this.localStream);
        
        // Configure encoding parameters for simulcast
        await this.configureSimulcast(sender, requestedQuality);
      }

      if (audioTrack) {
        pc.addTrack(audioTrack, this.localStream);
      }
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

    pc.onconnectionstatechange = () => {
      console.log(`[SFU] Connection to ${viewerId}:`, pc.connectionState);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        this.handleViewerDisconnect(viewerId);
      }
    };

    // Create offer with H.264 preference
    const offer = await pc.createOffer({
      offerToReceiveAudio: false,
      offerToReceiveVideo: false
    });

    // Modify SDP for H.264 priority
    const modifiedSdp = this.prioritizeH264(offer.sdp || '');
    await pc.setLocalDescription({ type: 'offer', sdp: modifiedSdp });

    this.channel.send({
      type: 'broadcast',
      event: 'offer',
      payload: {
        senderId: this.userId,
        targetId: viewerId,
        sdp: pc.localDescription
      }
    });

    // Update viewer count
    this.onViewerCountChange?.(this.peerConnections.size);
  }

  private async configureSimulcast(sender: RTCRtpSender, quality?: string): Promise<void> {
    if (!SFU_CONFIG.enableSimulcast) return;

    const params = sender.getParameters();
    if (!params.encodings) {
      params.encodings = [{}];
    }

    // Configure simulcast layers for adaptive streaming
    if (params.encodings.length >= 1) {
      const targetBitrate = quality 
        ? QUALITY_PRESETS[quality]?.bitrate || this.currentQuality.bitrate
        : this.currentQuality.bitrate;

      params.encodings[0] = {
        ...params.encodings[0],
        maxBitrate: targetBitrate,
        maxFramerate: this.currentQuality.frameRate,
        priority: 'high' as RTCPriorityType,
        networkPriority: 'high' as RTCPriorityType
      };
    }

    try {
      await sender.setParameters(params);
    } catch (e) {
      console.warn('[SFU] Could not set encoding parameters:', e);
    }
  }

  private prioritizeH264(sdp: string): string {
    // Reorder codec preferences to prioritize H.264
    const lines = sdp.split('\r\n');
    const mLineIndex = lines.findIndex(line => line.startsWith('m=video'));
    
    if (mLineIndex === -1) return sdp;

    // Find H.264 payload types
    const h264Payloads: string[] = [];
    lines.forEach((line, i) => {
      if (line.includes('a=rtpmap:') && line.toLowerCase().includes('h264')) {
        const match = line.match(/a=rtpmap:(\d+)/);
        if (match) h264Payloads.push(match[1]);
      }
    });

    if (h264Payloads.length === 0) return sdp;

    // Reorder m=video line to prioritize H.264
    const mLine = lines[mLineIndex];
    const parts = mLine.split(' ');
    const payloadTypes = parts.slice(3);
    
    // Move H.264 payload types to front
    const reordered = [
      ...h264Payloads,
      ...payloadTypes.filter(pt => !h264Payloads.includes(pt))
    ];
    
    lines[mLineIndex] = [...parts.slice(0, 3), ...reordered].join(' ');
    
    return lines.join('\r\n');
  }

  private async handleAnswer(viewerId: string, sdp: RTCSessionDescriptionInit): Promise<void> {
    const pc = this.peerConnections.get(viewerId);
    if (!pc) return;

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      console.log('[SFU] Set remote description for viewer:', viewerId);
    } catch (e) {
      console.error('[SFU] Error setting remote description:', e);
    }
  }

  private async handleIceCandidate(viewerId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const pc = this.peerConnections.get(viewerId);
    if (!pc) return;

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.error('[SFU] Error adding ICE candidate:', e);
    }
  }

  private async adjustQualityForViewer(viewerId: string, quality: string): Promise<void> {
    const pc = this.peerConnections.get(viewerId);
    if (!pc) return;

    const senders = pc.getSenders();
    const videoSender = senders.find(s => s.track?.kind === 'video');
    
    if (videoSender) {
      await this.configureSimulcast(videoSender, quality);
    }
  }

  private handleViewerDisconnect(viewerId: string): void {
    const pc = this.peerConnections.get(viewerId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(viewerId);
      this.onViewerCountChange?.(this.peerConnections.size);
    }
  }

  private startStatsMonitoring(): void {
    this.statsInterval = setInterval(async () => {
      const aggregatedStats: StreamStats = {
        bitrate: 0,
        frameRate: 0,
        resolution: { width: 0, height: 0 },
        packetsLost: 0,
        jitter: 0,
        rtt: 0,
        qualityLimitationReason: 'none'
      };

      let connectionCount = 0;

      for (const [viewerId, pc] of this.peerConnections) {
        try {
          const stats = await pc.getStats();
          stats.forEach(report => {
            if (report.type === 'outbound-rtp' && report.kind === 'video') {
              aggregatedStats.bitrate += report.bytesSent * 8 / 1000; // kbps
              aggregatedStats.frameRate = report.framesPerSecond || 0;
              aggregatedStats.packetsLost += report.packetsLost || 0;
              
              if (report.qualityLimitationReason) {
                aggregatedStats.qualityLimitationReason = report.qualityLimitationReason;
              }
            }
            if (report.type === 'candidate-pair' && report.state === 'succeeded') {
              aggregatedStats.rtt = report.currentRoundTripTime * 1000 || 0;
            }
          });
          connectionCount++;
        } catch (e) {
          // Stats not available
        }
      }

      if (connectionCount > 0) {
        this.onStatsUpdate?.(aggregatedStats);
        
        // Adaptive quality adjustment based on stats
        this.adaptQualityFromStats(aggregatedStats);
      }
    }, 2000);
  }

  private adaptQualityFromStats(stats: StreamStats): void {
    // Reduce quality if bandwidth constrained
    if (stats.qualityLimitationReason === 'bandwidth' || stats.rtt > CONGESTION_CONTROL.poorRttThreshold) {
      const qualities = Object.keys(QUALITY_PRESETS);
      const currentIndex = qualities.indexOf(this.getQualityLevel());
      
      if (currentIndex < qualities.length - 1) {
        const newQuality = qualities[currentIndex + 1];
        this.currentQuality = QUALITY_PRESETS[newQuality];
        console.log('[SFU] Reducing quality to:', newQuality);
      }
    }
    // Increase quality if conditions are good
    else if (stats.rtt < CONGESTION_CONTROL.goodRttThreshold && stats.packetsLost === 0) {
      const qualities = Object.keys(QUALITY_PRESETS);
      const currentIndex = qualities.indexOf(this.getQualityLevel());
      
      if (currentIndex > 0) {
        const newQuality = qualities[currentIndex - 1];
        this.currentQuality = QUALITY_PRESETS[newQuality];
        console.log('[SFU] Increasing quality to:', newQuality);
      }
    }
  }

  private getQualityLevel(): string {
    for (const [key, preset] of Object.entries(QUALITY_PRESETS)) {
      if (preset.bitrate === this.currentQuality.bitrate) {
        return key;
      }
    }
    return 'medium';
  }

  stop(): void {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
    }

    this.peerConnections.forEach(pc => pc.close());
    this.peerConnections.clear();

    if (this.channel) {
      supabase.removeChannel(this.channel);
    }

    this.onStateChange?.('disconnected');
  }

  getViewerCount(): number {
    return this.peerConnections.size;
  }
}

// Viewer connection with adaptive quality and reconnection
export class SFUViewer {
  private peerConnection: RTCPeerConnection | null = null;
  private streamId: string;
  private viewerId: string;
  private broadcasterId: string;
  private channel: any;
  private onStream: (stream: MediaStream) => void;
  private onStateChange?: (state: ConnectionState) => void;
  private onQualityChange?: (quality: string) => void;
  private iceCandidateQueue: RTCIceCandidateInit[] = [];
  private hasRemoteDescription = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private currentQuality: string = 'auto';
  private connectionTimeout: NodeJS.Timeout | null = null;

  constructor(
    streamId: string,
    viewerId: string,
    broadcasterId: string,
    onStream: (stream: MediaStream) => void,
    options?: {
      onStateChange?: (state: ConnectionState) => void;
      onQualityChange?: (quality: string) => void;
    }
  ) {
    this.streamId = streamId;
    this.viewerId = viewerId;
    this.broadcasterId = broadcasterId;
    this.onStream = onStream;
    this.onStateChange = options?.onStateChange;
    this.onQualityChange = options?.onQualityChange;
  }

  async connect(): Promise<void> {
    this.onStateChange?.('connecting');

    // Detect optimal quality based on network conditions
    const optimalQuality = detectOptimalQuality();
    this.currentQuality = this.getQualityLevel(optimalQuality);
    
    this.peerConnection = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    });

    // Configure for low-latency playback
    this.configureLowLatency();

    // Handle incoming stream
    this.peerConnection.ontrack = (event) => {
      console.log('[SFU Viewer] Received track:', event.track.kind);
      if (event.streams && event.streams[0]) {
        this.onStream(event.streams[0]);
        this.onStateChange?.('connected');
        this.reconnectAttempts = 0;
        
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
        }
      }
    };

    // Set up signaling
    this.channel = supabase
      .channel(`sfu-stream-${this.streamId}`)
      .on('broadcast', { event: 'offer' }, async ({ payload }) => {
        if (payload.targetId === this.viewerId && payload.senderId === this.broadcasterId) {
          console.log('[SFU Viewer] Received offer');
          await this.handleOffer(payload.sdp);
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        if (payload.targetId === this.viewerId) {
          await this.handleIceCandidate(payload.candidate);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[SFU Viewer] Subscribed, sending join request');
          this.channel.send({
            type: 'broadcast',
            event: 'viewer-join',
            payload: {
              viewerId: this.viewerId,
              quality: this.currentQuality
            }
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
      const state = this.peerConnection?.connectionState;
      console.log('[SFU Viewer] Connection state:', state);

      switch (state) {
        case 'connected':
          this.onStateChange?.('connected');
          this.reconnectAttempts = 0;
          break;
        case 'disconnected':
          this.onStateChange?.('reconnecting');
          this.attemptReconnect();
          break;
        case 'failed':
          this.onStateChange?.('failed');
          this.attemptReconnect();
          break;
      }
    };

    // Monitor network quality for adaptive streaming
    this.startQualityMonitoring();

    // Set connection timeout
    this.connectionTimeout = setTimeout(() => {
      if (this.peerConnection?.connectionState !== 'connected') {
        console.log('[SFU Viewer] Connection timeout, retrying...');
        this.attemptReconnect();
      }
    }, 10000);
  }

  private configureLowLatency(): void {
    if (!this.peerConnection) return;

    // Request low-latency playback
    const receivers = this.peerConnection.getReceivers();
    receivers.forEach(receiver => {
      if (receiver.track.kind === 'video') {
        // Configure jitter buffer for minimal latency
        const params = receiver.getParameters();
        // Note: These are advanced features that may not be available in all browsers
        (params as any).jitterBufferTarget = BUFFER_CONFIG.jitterBufferTarget;
        (params as any).jitterBufferMinimum = BUFFER_CONFIG.jitterBufferMin;
      }
    });
  }

  private async handleOffer(sdp: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) return;

    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
      this.hasRemoteDescription = true;

      // Process queued ICE candidates
      await this.processIceCandidateQueue();

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
    } catch (e) {
      console.error('[SFU Viewer] Error handling offer:', e);
      this.onStateChange?.('failed');
    }
  }

  private async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (this.hasRemoteDescription && this.peerConnection) {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error('[SFU Viewer] Error adding ICE candidate:', e);
      }
    } else {
      this.iceCandidateQueue.push(candidate);
    }
  }

  private async processIceCandidateQueue(): Promise<void> {
    if (!this.peerConnection) return;

    for (const candidate of this.iceCandidateQueue) {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error('[SFU Viewer] Error processing queued ICE candidate:', e);
      }
    }
    this.iceCandidateQueue = [];
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[SFU Viewer] Max reconnection attempts reached');
      this.onStateChange?.('failed');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`[SFU Viewer] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    this.onStateChange?.('reconnecting');

    setTimeout(() => {
      this.disconnect();
      this.iceCandidateQueue = [];
      this.hasRemoteDescription = false;
      this.connect();
    }, delay);
  }

  private startQualityMonitoring(): void {
    setInterval(async () => {
      if (!this.peerConnection) return;

      try {
        const stats = await this.peerConnection.getStats();
        let packetsLost = 0;
        let jitter = 0;
        let rtt = 0;

        stats.forEach(report => {
          if (report.type === 'inbound-rtp' && report.kind === 'video') {
            packetsLost = report.packetsLost || 0;
            jitter = report.jitter * 1000 || 0;
          }
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            rtt = report.currentRoundTripTime * 1000 || 0;
          }
        });

        // Request quality change if conditions change significantly
        const optimalQuality = detectOptimalQuality(undefined, undefined, rtt);
        const newQualityLevel = this.getQualityLevel(optimalQuality);

        if (newQualityLevel !== this.currentQuality) {
          this.currentQuality = newQualityLevel;
          this.onQualityChange?.(newQualityLevel);
          
          // Request quality change from broadcaster
          this.channel.send({
            type: 'broadcast',
            event: 'quality-change',
            payload: {
              senderId: this.viewerId,
              targetId: this.broadcasterId,
              quality: newQualityLevel
            }
          });
        }
      } catch (e) {
        // Stats monitoring failed
      }
    }, 5000);
  }

  private getQualityLevel(preset: StreamingQualityPreset): string {
    for (const [key, p] of Object.entries(QUALITY_PRESETS)) {
      if (p.bitrate === preset.bitrate) {
        return key;
      }
    }
    return 'medium';
  }

  setQuality(quality: string): void {
    this.currentQuality = quality;
    this.channel?.send({
      type: 'broadcast',
      event: 'quality-change',
      payload: {
        senderId: this.viewerId,
        targetId: this.broadcasterId,
        quality
      }
    });
  }

  disconnect(): void {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.channel) {
      supabase.removeChannel(this.channel);
    }

    this.iceCandidateQueue = [];
    this.hasRemoteDescription = false;
    this.onStateChange?.('disconnected');
  }
}
