import { useState } from "react";
import { Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useCanGoLive } from "@/hooks/useCanGoLive";
import LiveStreamList from "@/components/live/LiveStreamList";
import LiveStreamViewer from "@/components/live/LiveStreamViewer";
import GoLiveDialog from "@/components/live/GoLiveDialog";
import { useLiveBroadcast } from "@/contexts/LiveBroadcastContext";

export default function Live() {
  const { user } = useAuth();
  const { canGoLive } = useCanGoLive(user?.id);
  const [selected, setSelected] = useState<any>(null);
  const [showGoLive, setShowGoLive] = useState(false);
  const { startBroadcast } = useLiveBroadcast();

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <Radio className="h-5 w-5 text-destructive" />
          <h1 className="text-lg font-bold text-foreground">Live Selling</h1>
        </div>
        {canGoLive && (
          <Button size="sm" variant="destructive" className="animate-pulse" onClick={() => setShowGoLive(true)}>
            <Radio className="mr-1 h-4 w-4" /> Go Live
          </Button>
        )}
      </header>

      <main className="mx-auto max-w-screen-xl p-3">
        <LiveStreamList onSelectStream={(s) => setSelected(s)} />
      </main>

      {selected && <LiveStreamViewer stream={selected} onClose={() => setSelected(null)} />}
      <GoLiveDialog open={showGoLive} onOpenChange={setShowGoLive} onGoLive={(id) => startBroadcast(id)} />
    </div>
  );
}
