import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Search, Package, MapPin, CheckCircle, Truck, Clock, AlertTriangle } from "lucide-react";

interface TrackingEvent {
  id: string;
  status: string;
  location: string;
  description: string;
  timestamp: string;
}

interface TrackingResult {
  tracking_number: string;
  status: string;
  sender_city: string;
  recipient_city: string;
  recipient_name: string;
  estimated_delivery: string;
  timeline: TrackingEvent[];
}

const PublicTrackingPage = () => {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [error, setError] = useState("");

  const handleTrack = async () => {
    if (!trackingNumber.trim()) {
      setError("Please enter a tracking number");
      return;
    }

    setIsLoading(true);
    setError("");
    setResult(null);

    try {
      const { data, error: fetchError } = await supabase.functions.invoke("courier-tracking", {
        body: { tracking_number: trackingNumber.trim() },
      });

      if (fetchError) throw fetchError;
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Tracking number not found");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "delivered":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "out_for_delivery":
        return <Truck className="h-5 w-5 text-blue-500" />;
      case "in_transit":
      case "at_hub":
        return <Package className="h-5 w-5 text-yellow-500" />;
      case "failed_delivery":
      case "exception":
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "Pending Pickup",
      picked_up: "Picked Up",
      in_transit: "In Transit",
      at_hub: "At Sorting Hub",
      out_for_delivery: "Out for Delivery",
      delivered: "Delivered",
      failed_delivery: "Delivery Attempt Failed",
      returned: "Returned to Sender",
      exception: "Exception",
    };
    return labels[status] || status;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="container max-w-2xl mx-auto p-4 py-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Track Your Parcel</h1>
          <p className="text-muted-foreground">Enter your tracking number to see delivery status</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-2">
              <Input
                placeholder="Enter tracking number (e.g., TRV-XXXXXXXX)"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleTrack()}
                className="font-mono text-lg"
              />
              <Button onClick={handleTrack} disabled={isLoading}>
                {isLoading ? (
                  "Tracking..."
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Track
                  </>
                )}
              </Button>
            </div>
            {error && (
              <p className="text-destructive text-sm mt-2">{error}</p>
            )}
          </CardContent>
        </Card>

        {result && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-mono">{result.tracking_number}</CardTitle>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    result.status === 'delivered' ? 'bg-green-100 text-green-800' :
                    result.status === 'out_for_delivery' ? 'bg-blue-100 text-blue-800' :
                    result.status === 'failed_delivery' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {getStatusLabel(result.status)}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 text-center p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">From</p>
                    <p className="font-medium">{result.sender_city}</p>
                  </div>
                  <Package className="h-6 w-6 text-muted-foreground" />
                  <div className="flex-1 text-center p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">To</p>
                    <p className="font-medium">{result.recipient_city}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Recipient</p>
                    <p className="font-medium">{result.recipient_name}</p>
                  </div>
                  {result.estimated_delivery && (
                    <div>
                      <p className="text-muted-foreground">Est. Delivery</p>
                      <p className="font-medium">{result.estimated_delivery}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tracking History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  {result.timeline?.map((event, index) => (
                    <div key={event.id} className="flex gap-4 pb-6 last:pb-0">
                      <div className="relative">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          index === 0 ? 'bg-primary/10' : 'bg-muted'
                        }`}>
                          {getStatusIcon(event.status)}
                        </div>
                        {index < result.timeline.length - 1 && (
                          <div className="absolute left-1/2 top-10 bottom-0 w-px bg-border -translate-x-1/2" />
                        )}
                      </div>
                      <div className="flex-1 pt-1">
                        <p className={`font-medium ${index === 0 ? 'text-primary' : ''}`}>
                          {event.description}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <MapPin className="h-3 w-3" />
                          <span>{event.location}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(event.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicTrackingPage;
