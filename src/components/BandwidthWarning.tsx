import { useState, useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { WifiOff, X, HelpCircle } from "lucide-react";
import { bandwidthDetector } from "@/lib/performance";
import type { BandwidthInfo } from "@/lib/performance";
import { TroubleshootingDialog } from "./TroubleshootingDialog";

interface BandwidthWarningProps {
  requiredQuality?: string;
  onDismiss?: () => void;
}

export function BandwidthWarning({ requiredQuality = "720p", onDismiss }: BandwidthWarningProps) {
  const [bandwidthInfo, setBandwidthInfo] = useState<BandwidthInfo | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);

  useEffect(() => {
    const checkBandwidth = async () => {
      const info = await bandwidthDetector.measureBandwidth();
      setBandwidthInfo(info);

      const requirements = bandwidthDetector.checkRequirements(requiredQuality);
      if (!requirements.meetsMiinimum) {
        setShowWarning(true);
      }
    };

    checkBandwidth();

    // Subscribe to bandwidth updates
    const unsubscribe = bandwidthDetector.subscribe((info) => {
      setBandwidthInfo(info);
      const requirements = bandwidthDetector.checkRequirements(requiredQuality);
      if (!requirements.meetsMiinimum) {
        setShowWarning(true);
      } else {
        setShowWarning(false);
      }
    });

    // Start monitoring
    bandwidthDetector.startMonitoring(30000);

    return () => {
      unsubscribe();
      bandwidthDetector.stopMonitoring();
    };
  }, [requiredQuality]);

  const handleDismiss = () => {
    setDismissed(true);
    setShowWarning(false);
    onDismiss?.();
  };

  if (!showWarning || dismissed) return null;

  return (
    <>
      <Alert variant="destructive" className="mb-4">
        <WifiOff className="h-4 w-4" />
        <AlertTitle className="flex items-center justify-between">
          <span>Slow Connection Detected</span>
          <Button variant="ghost" size="sm" onClick={handleDismiss} className="h-6 w-6 p-0">
            <X className="h-4 w-4" />
          </Button>
        </AlertTitle>
        <AlertDescription className="mt-2">
          <p className="mb-2">
            Your connection speed ({bandwidthInfo?.uploadSpeed.toFixed(1) || '?'} Mbps upload) 
            may not be sufficient for {requiredQuality} streaming. You may experience lag or buffering.
          </p>
          <div className="flex gap-2 mt-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowTroubleshooting(true)}
            >
              <HelpCircle className="h-4 w-4 mr-1" />
              Get Help
            </Button>
          </div>
        </AlertDescription>
      </Alert>

      <TroubleshootingDialog 
        open={showTroubleshooting} 
        onOpenChange={setShowTroubleshooting} 
      />
    </>
  );
}
