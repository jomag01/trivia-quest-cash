// Enterprise streaming infrastructure exports
// SFU architecture, adaptive bitrate, hardware encoding

export * from './StreamingConfig';
export * from './SFUConnection';

// Re-export legacy connections for backward compatibility
export { BroadcasterConnection, ViewerConnection } from '../webrtc';
