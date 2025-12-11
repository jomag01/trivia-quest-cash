import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings, Monitor, Smartphone, Zap, Sparkles } from 'lucide-react';
import { getGraphicsManager, QualityPreset, QUALITY_PRESETS } from '../engine/GraphicsSettings';

interface GraphicsSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSettingsChange?: () => void;
}

export const GraphicsSettingsDialog: React.FC<GraphicsSettingsDialogProps> = ({
  open,
  onOpenChange,
  onSettingsChange,
}) => {
  const graphicsManager = getGraphicsManager();
  const [preset, setPreset] = useState<QualityPreset>(graphicsManager.getPreset());
  const [autoAdjust, setAutoAdjust] = useState(false);
  const [fps, setFps] = useState(60);

  useEffect(() => {
    const interval = setInterval(() => {
      setFps(graphicsManager.getAverageFPS());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handlePresetChange = (newPreset: QualityPreset) => {
    setPreset(newPreset);
    graphicsManager.setPreset(newPreset);
    onSettingsChange?.();
  };

  const handleAutoAdjustChange = (enabled: boolean) => {
    setAutoAdjust(enabled);
    graphicsManager.enableAutoAdjust(enabled);
  };

  const config = QUALITY_PRESETS[preset];

  const getPresetIcon = (p: QualityPreset) => {
    switch (p) {
      case 'low': return <Smartphone className="w-4 h-4" />;
      case 'medium': return <Monitor className="w-4 h-4" />;
      case 'high': return <Zap className="w-4 h-4" />;
      case 'ultra': return <Sparkles className="w-4 h-4" />;
    }
  };

  const getPresetDescription = (p: QualityPreset) => {
    switch (p) {
      case 'low': return 'Best for older devices. Smooth performance.';
      case 'medium': return 'Balanced quality and performance.';
      case 'high': return 'Great visuals for modern devices.';
      case 'ultra': return 'Maximum quality. High-end devices only.';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Graphics Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* FPS Display */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <span className="text-sm">Current FPS</span>
            <Badge variant={fps >= 50 ? 'default' : fps >= 30 ? 'secondary' : 'destructive'}>
              {fps} FPS
            </Badge>
          </div>

          {/* Quality Presets */}
          <div className="space-y-2">
            <Label>Quality Preset</Label>
            <RadioGroup value={preset} onValueChange={(v) => handlePresetChange(v as QualityPreset)}>
              <div className="grid grid-cols-2 gap-2">
                {(['low', 'medium', 'high', 'ultra'] as QualityPreset[]).map((p) => (
                  <Card
                    key={p}
                    className={`cursor-pointer transition-all ${
                      preset === p ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => handlePresetChange(p)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <RadioGroupItem value={p} id={p} className="sr-only" />
                        {getPresetIcon(p)}
                        <span className="font-medium capitalize">{p}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{getPresetDescription(p)}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </RadioGroup>
          </div>

          {/* Auto Adjust */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-adjust Quality</Label>
              <p className="text-xs text-muted-foreground">
                Automatically lower quality if FPS drops
              </p>
            </div>
            <Switch checked={autoAdjust} onCheckedChange={handleAutoAdjustChange} />
          </div>

          {/* Current Settings Display */}
          <Card>
            <CardContent className="p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Resolution Scale</span>
                <span>{Math.round(config.resolutionScale * 100)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shadows</span>
                <span>{config.shadows ? config.shadowQuality : 'Off'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Anti-Aliasing</span>
                <span>{config.antiAliasing ? 'On' : 'Off'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Particle Density</span>
                <span>{Math.round(config.particleDensity * 100)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Target FPS</span>
                <span>{config.targetFPS}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Post Processing</span>
                <span>{config.postProcessing ? 'On' : 'Off'}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GraphicsSettingsDialog;
