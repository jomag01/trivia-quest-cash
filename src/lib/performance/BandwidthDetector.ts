// Bandwidth Detector - Monitors network speed and quality

export interface BandwidthInfo {
  downloadSpeed: number; // Mbps
  uploadSpeed: number; // Mbps (estimated)
  latency: number; // ms
  connectionType: string;
  isStable: boolean;
  qualityScore: number; // 0-100
}

export interface BandwidthRequirements {
  minUpload: number; // Mbps
  minDownload: number; // Mbps
  recommended: {
    upload: number;
    download: number;
  };
}

// Streaming quality requirements
export const STREAMING_REQUIREMENTS: Record<string, BandwidthRequirements> = {
  '480p': { minUpload: 2, minDownload: 3, recommended: { upload: 3, download: 5 } },
  '720p': { minUpload: 5, minDownload: 5, recommended: { upload: 8, download: 10 } },
  '1080p': { minUpload: 10, minDownload: 10, recommended: { upload: 15, download: 20 } },
};

class BandwidthDetector {
  private static instance: BandwidthDetector;
  private lastCheck: BandwidthInfo | null = null;
  private checkInterval: NodeJS.Timeout | null = null;
  private listeners: Set<(info: BandwidthInfo) => void> = new Set();

  private constructor() {}

  static getInstance(): BandwidthDetector {
    if (!BandwidthDetector.instance) {
      BandwidthDetector.instance = new BandwidthDetector();
    }
    return BandwidthDetector.instance;
  }

  // Get current network connection info
  getConnectionInfo(): { type: string; effectiveType: string; downlink: number; rtt: number } {
    const connection = (navigator as any).connection || 
                       (navigator as any).mozConnection || 
                       (navigator as any).webkitConnection;

    if (connection) {
      return {
        type: connection.type || 'unknown',
        effectiveType: connection.effectiveType || 'unknown',
        downlink: connection.downlink || 0,
        rtt: connection.rtt || 0
      };
    }

    return { type: 'unknown', effectiveType: 'unknown', downlink: 0, rtt: 0 };
  }

  // Estimate bandwidth using various methods
  async measureBandwidth(): Promise<BandwidthInfo> {
    const connection = this.getConnectionInfo();
    
    // Use Network Information API if available
    let downloadSpeed = connection.downlink;
    let latency = connection.rtt;
    
    // If not available, perform a simple bandwidth test
    if (!downloadSpeed) {
      const testResult = await this.performSpeedTest();
      downloadSpeed = testResult.downloadSpeed;
      latency = testResult.latency;
    }

    // Estimate upload speed (typically 10-20% of download for most connections)
    const uploadSpeed = downloadSpeed * 0.15;

    // Calculate quality score
    const qualityScore = this.calculateQualityScore(downloadSpeed, uploadSpeed, latency);

    // Determine connection stability
    const isStable = latency < 100 && qualityScore > 50;

    const info: BandwidthInfo = {
      downloadSpeed,
      uploadSpeed,
      latency,
      connectionType: connection.effectiveType,
      isStable,
      qualityScore
    };

    this.lastCheck = info;
    this.notifyListeners(info);

    return info;
  }

  // Simple speed test using fetch timing
  private async performSpeedTest(): Promise<{ downloadSpeed: number; latency: number }> {
    try {
      const startTime = performance.now();
      
      // Fetch a small resource to measure latency and approximate speed
      const response = await fetch('/favicon.ico', { cache: 'no-store' });
      const data = await response.arrayBuffer();
      
      const endTime = performance.now();
      const duration = (endTime - startTime) / 1000; // seconds
      const sizeInBits = data.byteLength * 8;
      const speedMbps = (sizeInBits / duration) / 1000000;

      return {
        downloadSpeed: Math.max(speedMbps, 1), // Minimum 1 Mbps
        latency: endTime - startTime
      };
    } catch (error) {
      return { downloadSpeed: 5, latency: 100 }; // Default fallback values
    }
  }

  // Calculate quality score based on bandwidth and latency
  private calculateQualityScore(download: number, upload: number, latency: number): number {
    let score = 0;

    // Download speed scoring (max 40 points)
    if (download >= 20) score += 40;
    else if (download >= 10) score += 30;
    else if (download >= 5) score += 20;
    else if (download >= 2) score += 10;

    // Upload speed scoring (max 40 points)
    if (upload >= 10) score += 40;
    else if (upload >= 5) score += 30;
    else if (upload >= 2) score += 20;
    else if (upload >= 1) score += 10;

    // Latency scoring (max 20 points)
    if (latency <= 50) score += 20;
    else if (latency <= 100) score += 15;
    else if (latency <= 200) score += 10;
    else if (latency <= 500) score += 5;

    return score;
  }

  // Check if bandwidth meets requirements for specific quality
  checkRequirements(quality: string): { 
    meetsMiinimum: boolean; 
    meetsRecommended: boolean; 
    issues: string[] 
  } {
    const requirements = STREAMING_REQUIREMENTS[quality];
    if (!requirements || !this.lastCheck) {
      return { meetsMiinimum: false, meetsRecommended: false, issues: ['Unable to check bandwidth'] };
    }

    const issues: string[] = [];
    let meetsMiinimum = true;
    let meetsRecommended = true;

    if (this.lastCheck.uploadSpeed < requirements.minUpload) {
      meetsMiinimum = false;
      issues.push(`Upload speed (${this.lastCheck.uploadSpeed.toFixed(1)} Mbps) is below minimum (${requirements.minUpload} Mbps)`);
    }

    if (this.lastCheck.downloadSpeed < requirements.minDownload) {
      meetsMiinimum = false;
      issues.push(`Download speed (${this.lastCheck.downloadSpeed.toFixed(1)} Mbps) is below minimum (${requirements.minDownload} Mbps)`);
    }

    if (this.lastCheck.uploadSpeed < requirements.recommended.upload) {
      meetsRecommended = false;
      issues.push(`Upload speed is below recommended (${requirements.recommended.upload} Mbps)`);
    }

    if (this.lastCheck.downloadSpeed < requirements.recommended.download) {
      meetsRecommended = false;
      issues.push(`Download speed is below recommended (${requirements.recommended.download} Mbps)`);
    }

    if (this.lastCheck.latency > 200) {
      issues.push(`High latency detected (${this.lastCheck.latency.toFixed(0)} ms)`);
    }

    return { meetsMiinimum, meetsRecommended, issues };
  }

  // Get recommended streaming quality based on bandwidth
  getRecommendedQuality(): string {
    if (!this.lastCheck) return '480p';

    const upload = this.lastCheck.uploadSpeed;
    
    if (upload >= 10) return '1080p';
    if (upload >= 5) return '720p';
    return '480p';
  }

  // Subscribe to bandwidth updates
  subscribe(listener: (info: BandwidthInfo) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Start continuous monitoring
  startMonitoring(intervalMs: number = 30000): void {
    if (this.checkInterval) return;

    this.measureBandwidth(); // Initial check
    this.checkInterval = setInterval(() => this.measureBandwidth(), intervalMs);

    // Listen for connection changes
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', () => this.measureBandwidth());
    }
  }

  // Stop monitoring
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  // Get last check result
  getLastCheck(): BandwidthInfo | null {
    return this.lastCheck;
  }

  private notifyListeners(info: BandwidthInfo): void {
    this.listeners.forEach(listener => listener(info));
  }
}

export const bandwidthDetector = BandwidthDetector.getInstance();
