import { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Eraser, Undo2, Redo2, RotateCcw, Check, Paintbrush } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ManualBrushEraserProps {
  imageUrl: string;
  onComplete: (maskedImageData: string, maskData: string) => void;
  onCancel: () => void;
}

export const ManualBrushEraser = ({ imageUrl, onComplete, onCancel }: ManualBrushEraserProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(30);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Initialize canvas with image
  useEffect(() => {
    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!canvas || !maskCanvas) return;

    const ctx = canvas.getContext('2d');
    const maskCtx = maskCanvas.getContext('2d');
    if (!ctx || !maskCtx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Calculate scaled dimensions to fit container
      const maxWidth = containerRef.current?.clientWidth || 600;
      const maxHeight = 400;
      
      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth) {
        height = (maxWidth / width) * height;
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = (maxHeight / height) * width;
        height = maxHeight;
      }

      canvas.width = width;
      canvas.height = height;
      maskCanvas.width = width;
      maskCanvas.height = height;
      setCanvasSize({ width, height });

      // Draw image on main canvas
      ctx.drawImage(img, 0, 0, width, height);
      
      // Initialize mask canvas as transparent
      maskCtx.clearRect(0, 0, width, height);
      
      // Save initial state
      const initialState = ctx.getImageData(0, 0, width, height);
      setHistory([initialState]);
      setHistoryIndex(0);
      setImageLoaded(true);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  const saveToHistory = useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;

    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return;

    const currentState = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    
    // Remove any states after current index
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(currentState);
    
    // Limit history to 20 states
    if (newHistory.length > 20) {
      newHistory.shift();
    }
    
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const getCanvasCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const draw = useCallback((x: number, y: number) => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;

    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return;

    // Draw on mask with red color (will be the erase area)
    maskCtx.globalCompositeOperation = 'source-over';
    maskCtx.fillStyle = 'rgba(255, 0, 0, 0.5)';
    maskCtx.beginPath();
    maskCtx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    maskCtx.fill();
  }, [brushSize]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    const { x, y } = getCanvasCoordinates(e);
    draw(x, y);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const { x, y } = getCanvasCoordinates(e);
    draw(x, y);
  };

  const handleMouseUp = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveToHistory();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    const { x, y } = getCanvasCoordinates(e);
    draw(x, y);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const { x, y } = getCanvasCoordinates(e);
    draw(x, y);
  };

  const handleTouchEnd = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveToHistory();
    }
  };

  const undo = () => {
    if (historyIndex <= 0) return;
    
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;

    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return;

    const newIndex = historyIndex - 1;
    if (newIndex === 0) {
      // Clear mask if going back to initial state
      maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    } else {
      maskCtx.putImageData(history[newIndex], 0, 0);
    }
    setHistoryIndex(newIndex);
  };

  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;

    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return;

    const newIndex = historyIndex + 1;
    maskCtx.putImageData(history[newIndex], 0, 0);
    setHistoryIndex(newIndex);
  };

  const clearMask = () => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;

    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return;

    maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    saveToHistory();
  };

  const handleComplete = () => {
    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!canvas || !maskCanvas) return;

    // Get mask as data URL (white = erase area, black = keep)
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return;

    // Create a black and white mask
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = maskCanvas.width;
    tempCanvas.height = maskCanvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    // Fill with black (keep areas)
    tempCtx.fillStyle = 'black';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // Get mask image data and convert red areas to white
    const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    const tempData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);

    for (let i = 0; i < maskData.data.length; i += 4) {
      // If there's any red (erase area)
      if (maskData.data[i] > 100 && maskData.data[i + 3] > 50) {
        tempData.data[i] = 255;     // R
        tempData.data[i + 1] = 255; // G
        tempData.data[i + 2] = 255; // B
        tempData.data[i + 3] = 255; // A
      }
    }

    tempCtx.putImageData(tempData, 0, 0);

    const maskDataUrl = tempCanvas.toDataURL('image/png');
    const imageDataUrl = canvas.toDataURL('image/png');

    onComplete(imageDataUrl, maskDataUrl);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Paintbrush className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Paint over areas to erase</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={undo}
            disabled={historyIndex <= 0}
            className="h-8 w-8"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            className="h-8 w-8"
          >
            <Redo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={clearMask}
            className="h-8 w-8"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Label className="text-xs whitespace-nowrap">Brush Size: {brushSize}px</Label>
        <Slider
          value={[brushSize]}
          onValueChange={(v) => setBrushSize(v[0])}
          min={5}
          max={100}
          step={1}
          className="flex-1"
        />
      </div>

      <div 
        ref={containerRef}
        className="relative border rounded-lg overflow-hidden bg-[repeating-conic-gradient(#80808020_0%_25%,transparent_0%_50%)] bg-[length:20px_20px]"
      >
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        )}
        <canvas
          ref={canvasRef}
          className={cn(
            "block mx-auto cursor-crosshair touch-none",
            !imageLoaded && "invisible"
          )}
          style={{ maxWidth: '100%' }}
        />
        <canvas
          ref={maskCanvasRef}
          className={cn(
            "absolute top-0 left-1/2 -translate-x-1/2 cursor-crosshair touch-none pointer-events-auto",
            !imageLoaded && "invisible"
          )}
          style={{ 
            maxWidth: '100%',
            width: canvasSize.width || 'auto',
            height: canvasSize.height || 'auto'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button onClick={handleComplete} className="flex-1 gap-2" disabled={!imageLoaded}>
          <Check className="h-4 w-4" />
          Apply & Erase
        </Button>
      </div>
    </div>
  );
};
