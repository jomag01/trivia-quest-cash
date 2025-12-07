// Enterprise-grade streaming configuration for 1M+ concurrent viewers
// Uses SFU architecture, optimized codecs, and CDN distribution

export interface StreamingQualityPreset {
  name: string;
  width: number;
  height: number;
  frameRate: number;
  bitrate: number;
  keyFrameInterval: number;
}

export interface ICEServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

// Quality presets optimized for different network conditions
export const QUALITY_PRESETS: Record<string, StreamingQualityPreset> = {
  ultra: {
    name: 'Ultra HD',
    width: 1920,
    height: 1080,
    frameRate: 30,
    bitrate: 6000000, // 6 Mbps
    keyFrameInterval: 2000
  },
  high: {
    name: 'HD',
    width: 1280,
    height: 720,
    frameRate: 30,
    bitrate: 2500000, // 2.5 Mbps
    keyFrameInterval: 2000
  },
  medium: {
    name: 'SD',
    width: 854,
    height: 480,
    frameRate: 30,
    bitrate: 1000000, // 1 Mbps
    keyFrameInterval: 2000
  },
  low: {
    name: 'Low',
    width: 640,
    height: 360,
    frameRate: 24,
    bitrate: 500000, // 500 Kbps
    keyFrameInterval: 3000
  },
  mobile: {
    name: 'Mobile',
    width: 480,
    height: 270,
    frameRate: 20,
    bitrate: 300000, // 300 Kbps
    keyFrameInterval: 3000
  }
};

// Enterprise ICE servers with global distribution
// Includes STUN + TURN servers for NAT/firewall traversal
export const ICE_SERVERS: ICEServerConfig[] = [
  // Google STUN servers (free, reliable)
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  // Twilio STUN
  { urls: 'stun:global.stun.twilio.com:3478' },
  // Open Relay TURN servers (fallback for restrictive NATs)
  { 
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  { 
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  { 
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  }
];

// H.264 hardware encoder configuration for optimal performance
export const VIDEO_CODEC_PREFERENCES = [
  'video/H264; profile-level-id=42e01f', // H.264 Baseline
  'video/H264; profile-level-id=640028', // H.264 High
  'video/H264',
  'video/VP9',
  'video/VP8'
];

export const AUDIO_CODEC_PREFERENCES = [
  'audio/opus',
  'audio/PCMU',
  'audio/PCMA'
];

// Buffer management for minimal latency
export const BUFFER_CONFIG = {
  // Jitter buffer: 200-500ms for live interactivity
  jitterBufferTarget: 300,  // ms - small buffer for low latency
  jitterBufferMin: 100,     // ms
  jitterBufferMax: 500,     // ms
  
  // Playout delay
  playoutDelayMin: 0,       // ms
  playoutDelayMax: 200,     // ms
  
  // Buffered amount low threshold for data channels
  bufferedAmountLowThreshold: 65535,
  
  // Max retransmits for reliability
  maxRetransmits: 3
};

// Congestion control and bandwidth estimation
export const CONGESTION_CONTROL = {
  // Start with conservative bitrate
  initialBitrate: 1000000,  // 1 Mbps
  minBitrate: 150000,       // 150 Kbps
  maxBitrate: 6000000,      // 6 Mbps
  
  // Adaptive bitrate thresholds
  degradationPreference: 'maintain-framerate' as const,
  
  // RTT-based quality adaptation
  goodRttThreshold: 100,    // ms
  poorRttThreshold: 300,    // ms
  
  // Packet loss thresholds
  goodPacketLoss: 1,        // %
  poorPacketLoss: 5         // %
};

// SFU architecture settings
export const SFU_CONFIG = {
  // Enable simulcast for adaptive streaming
  enableSimulcast: true,
  
  // Temporal layers for scalable video
  temporalLayers: 3,
  
  // Spatial layers (for SVC)
  spatialLayers: 3,
  
  // Preferred SFU media servers by region
  mediaServers: {
    'asia-southeast': 'wss://sfu-sg.example.com',
    'asia-east': 'wss://sfu-hk.example.com',
    'us-west': 'wss://sfu-la.example.com',
    'us-east': 'wss://sfu-ny.example.com',
    'europe-west': 'wss://sfu-ams.example.com'
  }
};

// Detect best quality based on network conditions
export function detectOptimalQuality(
  connectionType?: string,
  downlinkMbps?: number,
  rtt?: number
): StreamingQualityPreset {
  // Use Network Information API if available
  const connection = (navigator as any).connection;
  const effectiveType = connectionType || connection?.effectiveType;
  const downlink = downlinkMbps || connection?.downlink || 10;
  const roundTripTime = rtt || connection?.rtt || 50;
  
  // Mobile networks or slow connections
  if (effectiveType === 'slow-2g' || effectiveType === '2g' || downlink < 0.5) {
    return QUALITY_PRESETS.mobile;
  }
  
  if (effectiveType === '3g' || downlink < 1.5 || roundTripTime > 300) {
    return QUALITY_PRESETS.low;
  }
  
  if (downlink < 3 || roundTripTime > 200) {
    return QUALITY_PRESETS.medium;
  }
  
  if (downlink < 6 || roundTripTime > 100) {
    return QUALITY_PRESETS.high;
  }
  
  return QUALITY_PRESETS.ultra;
}

// Check hardware encoding support
export async function checkHardwareEncodingSupport(): Promise<{
  h264: boolean;
  vp9: boolean;
  hevc: boolean;
}> {
  const result = { h264: false, vp9: false, hevc: false };
  
  if (!('VideoEncoder' in window)) {
    // Fallback: assume H.264 is supported (most common)
    result.h264 = true;
    return result;
  }
  
  try {
    const h264Support = await (window as any).VideoEncoder.isConfigSupported({
      codec: 'avc1.42E01F',
      hardwareAcceleration: 'prefer-hardware'
    });
    result.h264 = h264Support.supported;
  } catch (e) {
    result.h264 = true; // Assume supported
  }
  
  try {
    const vp9Support = await (window as any).VideoEncoder.isConfigSupported({
      codec: 'vp09.00.10.08',
      hardwareAcceleration: 'prefer-hardware'
    });
    result.vp9 = vp9Support.supported;
  } catch (e) {
    // VP9 hardware encoding less common
  }
  
  return result;
}

// Get optimal media constraints based on quality preset
export function getMediaConstraints(preset: StreamingQualityPreset): MediaStreamConstraints {
  return {
    video: {
      width: { ideal: preset.width, max: preset.width },
      height: { ideal: preset.height, max: preset.height },
      frameRate: { ideal: preset.frameRate, max: preset.frameRate },
      facingMode: 'user',
      // Request hardware acceleration
      ...(typeof (window as any).MediaTrackConstraints !== 'undefined' && {
        advanced: [
          { width: preset.width, height: preset.height },
          { aspectRatio: preset.width / preset.height }
        ]
      })
    },
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 48000,
      channelCount: 2
    }
  };
}

// Calculate optimal bitrate based on upload speed
export function calculateOptimalBitrate(uploadSpeedMbps: number): number {
  // Use 80% of available upload bandwidth for video
  const targetBitrate = uploadSpeedMbps * 0.8 * 1000000;
  
  // Clamp to min/max
  return Math.max(
    CONGESTION_CONTROL.minBitrate,
    Math.min(CONGESTION_CONTROL.maxBitrate, targetBitrate)
  );
}

// Estimate bandwidth using simple probe
export async function estimateBandwidth(): Promise<number> {
  const testUrl = 'https://www.cloudflare.com/cdn-cgi/trace';
  const testSize = 10000; // ~10KB
  
  try {
    const startTime = performance.now();
    const response = await fetch(testUrl, { cache: 'no-store' });
    await response.text();
    const endTime = performance.now();
    
    const duration = (endTime - startTime) / 1000; // seconds
    const speedMbps = (testSize * 8) / (duration * 1000000);
    
    // This is a rough estimate, actual upload speed may vary
    return Math.max(1, speedMbps);
  } catch (e) {
    // Default to conservative estimate
    return 2; // 2 Mbps
  }
}
