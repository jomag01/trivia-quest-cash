import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Wifi, 
  WifiOff, 
  Gauge, 
  Trash2, 
  RefreshCw, 
  Monitor, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  Smartphone,
  Info
} from "lucide-react";
import { bandwidthDetector, STREAMING_REQUIREMENTS } from "@/lib/performance";
import type { BandwidthInfo } from "@/lib/performance";

interface TroubleshootingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TroubleshootingDialog({ open, onOpenChange }: TroubleshootingDialogProps) {
  const [bandwidthInfo, setBandwidthInfo] = useState<BandwidthInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);

  useEffect(() => {
    if (open) {
      checkBandwidth();
    }
  }, [open]);

  const checkBandwidth = async () => {
    setIsChecking(true);
    try {
      const info = await bandwidthDetector.measureBandwidth();
      setBandwidthInfo(info);
    } finally {
      setIsChecking(false);
    }
  };

  const clearCache = async () => {
    try {
      // Clear localStorage cache
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('cache') || key.includes('temp'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));

      // Clear service worker caches
      if ('caches' in window) {
        const names = await caches.keys();
        await Promise.all(names.map(name => caches.delete(name)));
      }

      setCacheCleared(true);
      setTimeout(() => setCacheCleared(false), 3000);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  };

  const getQualityIcon = (score: number) => {
    if (score >= 70) return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    if (score >= 40) return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    return <XCircle className="h-5 w-5 text-red-500" />;
  };

  const getQualityColor = (score: number) => {
    if (score >= 70) return "bg-green-500";
    if (score >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Performance & Troubleshooting
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Network Status Section */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Wifi className="h-4 w-4" />
              Network Status
            </h3>
            
            {isChecking ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Checking connection...
              </div>
            ) : bandwidthInfo ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Connection Quality</span>
                  <div className="flex items-center gap-2">
                    {getQualityIcon(bandwidthInfo.qualityScore)}
                    <span className="font-medium">{bandwidthInfo.qualityScore}%</span>
                  </div>
                </div>
                <Progress 
                  value={bandwidthInfo.qualityScore} 
                  className="h-2"
                />

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 rounded-lg bg-muted">
                    <div className="text-muted-foreground">Download</div>
                    <div className="font-semibold">{bandwidthInfo.downloadSpeed.toFixed(1)} Mbps</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <div className="text-muted-foreground">Upload (est.)</div>
                    <div className="font-semibold">{bandwidthInfo.uploadSpeed.toFixed(1)} Mbps</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <div className="text-muted-foreground">Latency</div>
                    <div className="font-semibold">{bandwidthInfo.latency.toFixed(0)} ms</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <div className="text-muted-foreground">Type</div>
                    <div className="font-semibold capitalize">{bandwidthInfo.connectionType}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={bandwidthInfo.isStable ? "default" : "destructive"}>
                    {bandwidthInfo.isStable ? "Stable" : "Unstable"}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Recommended: {bandwidthDetector.getRecommendedQuality()} streaming
                  </span>
                </div>

                <Button variant="outline" size="sm" onClick={checkBandwidth} className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Re-check Connection
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <WifiOff className="h-4 w-4" />
                Unable to check connection
              </div>
            )}
          </div>

          {/* Streaming Requirements */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Gauge className="h-4 w-4" />
              Streaming Requirements
            </h3>
            <div className="space-y-2 text-sm">
              {Object.entries(STREAMING_REQUIREMENTS).map(([quality, reqs]) => (
                <div key={quality} className="flex items-center justify-between p-2 rounded bg-muted">
                  <span className="font-medium">{quality}</span>
                  <span className="text-muted-foreground">
                    Min: {reqs.minUpload} Mbps up / {reqs.minDownload} Mbps down
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Cache Management */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              Cache Management
            </h3>
            <p className="text-sm text-muted-foreground">
              Clear cached data to improve performance if the app becomes slow over time.
            </p>
            <Button 
              variant="outline" 
              onClick={clearCache}
              className="w-full"
              disabled={cacheCleared}
            >
              {cacheCleared ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                  Cache Cleared!
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear App Cache
                </>
              )}
            </Button>
          </div>

          {/* Troubleshooting Tips */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Info className="h-4 w-4" />
              Troubleshooting Tips
            </h3>
            <div className="space-y-2 text-sm">
              <div className="p-3 rounded-lg border">
                <div className="font-medium mb-1">Experiencing lag or buffering?</div>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Close other bandwidth-heavy apps (YouTube, Netflix, etc.)</li>
                  <li>Move closer to your WiFi router</li>
                  <li>Switch from WiFi to mobile data or vice versa</li>
                  <li>Lower stream quality in settings</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border">
                <div className="font-medium mb-1">App running slowly?</div>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Clear the app cache (button above)</li>
                  <li>Close unused browser tabs</li>
                  <li>Restart your browser or app</li>
                  <li>Ensure your device has sufficient free memory</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border">
                <div className="font-medium mb-1">Video not loading?</div>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Check your internet connection</li>
                  <li>Disable VPN if you're using one</li>
                  <li>Try refreshing the page</li>
                  <li>Update your browser to the latest version</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Device Info */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Device Information
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="p-2 rounded bg-muted">
                <div className="text-muted-foreground text-xs">Platform</div>
                <div className="font-medium">{navigator.platform}</div>
              </div>
              <div className="p-2 rounded bg-muted">
                <div className="text-muted-foreground text-xs">Cores</div>
                <div className="font-medium">{navigator.hardwareConcurrency || 'Unknown'}</div>
              </div>
              <div className="p-2 rounded bg-muted">
                <div className="text-muted-foreground text-xs">Language</div>
                <div className="font-medium">{navigator.language}</div>
              </div>
              <div className="p-2 rounded bg-muted">
                <div className="text-muted-foreground text-xs">Online</div>
                <div className="font-medium">{navigator.onLine ? 'Yes' : 'No'}</div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
