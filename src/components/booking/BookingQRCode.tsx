import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode, Download, Share2, X } from "lucide-react";

interface BookingQRCodeProps {
  bookingUrl?: string;
  title?: string;
}

const BookingQRCode = ({ 
  bookingUrl, 
  title = "Scan to Book or Order" 
}: BookingQRCodeProps) => {
  const [open, setOpen] = useState(false);

  const url = bookingUrl || `${window.location.origin}/booking`;

  const handleDownload = () => {
    const svg = document.getElementById("booking-qr-svg");
    if (!svg) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const data = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    const svgBlob = new Blob([data], { type: "image/svg+xml;charset=utf-8" });
    const urlObj = URL.createObjectURL(svgBlob);

    img.onload = () => {
      canvas.width = 1024;
      canvas.height = 1024;
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, 1024, 1024);
        ctx.drawImage(img, 0, 0, 1024, 1024);
      }
      const pngUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = "booking-qr-code.png";
      downloadLink.href = pngUrl;
      downloadLink.click();
      URL.revokeObjectURL(urlObj);
    };
    img.src = urlObj;
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: "Book or Order",
        text: "Scan this QR code to book services or order food!",
        url,
      });
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  return (
    <>
      {/* Compact inline QR banner */}
      <div className="relative overflow-hidden rounded-xl border bg-gradient-to-r from-primary/10 via-background to-accent/10 p-4">
        <div className="flex items-center gap-4">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <button className="shrink-0 rounded-lg border-2 border-primary/20 bg-white p-2 shadow-md transition-transform hover:scale-105 active:scale-95">
                <QRCodeSVG
                  value={url}
                  size={72}
                  level="M"
                  includeMargin={false}
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              </button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-center">{title}</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="rounded-2xl border-4 border-primary/20 bg-white p-6 shadow-lg">
                  <QRCodeSVG
                    id="booking-qr-svg"
                    value={url}
                    size={240}
                    level="H"
                    includeMargin
                    bgColor="#ffffff"
                    fgColor="#000000"
                  />
                </div>
                <p className="text-center text-sm text-muted-foreground max-w-xs">
                  Point your camera at this code to instantly access our booking & food ordering platform
                </p>
                <div className="flex gap-2 w-full">
                  <Button onClick={handleDownload} variant="outline" className="flex-1">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button onClick={handleShare} variant="outline" className="flex-1">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground break-all text-center">{url}</p>
              </div>
            </DialogContent>
          </Dialog>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <QrCode className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Scan QR to Book or Order</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Tap the QR code to enlarge, download, or share it with customers
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default BookingQRCode;
