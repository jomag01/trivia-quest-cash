import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Copy, Eye, EyeOff, Loader2, Radio, ShoppingBag } from "lucide-react";
import LiveBasketManager from "./LiveBasketManager";
import PromoteLiveDialog from "./PromoteLiveDialog";

interface Props { streamId: string; onClose: () => void }

/** Seller screen for "Go live from Restream": shows the server URL + key to paste in Restream as a Custom RTMP channel. */
export default function RestreamLivePanel({ streamId, onClose }: Props) {
  const [creds, setCreds] = useState<{ ingestServer: string; streamKey: string } | null>(null);
  const [state, setState] = useState("OFFLINE");
  const [showKey, setShowKey] = useState(false);
  const [showBasket, setShowBasket] = useState(false);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.functions.invoke("ivs-stream", { body: { action: "restream-ingest", streamId } }).then(({ data, error }) => {
      if (error || data?.error || !data?.streamKey) setError(data?.error || error?.message || "Could not create your stream link");
      else setCreds(data);
    });
  }, [streamId]);

  useEffect(() => {
    if (!creds) return;
    const poll = async () => {
      const { data } = await supabase.functions.invoke("ivs-stream", { body: { action: "restream-status", streamId } });
      if (data?.state) setState(data.state);
    };
    poll();
    const t = setInterval(poll, 8000);
    return () => clearInterval(t);
  }, [creds, streamId]);

  const copy = (v: string, label: string) => { navigator.clipboard.writeText(v); toast.success(`${label} copied`); };

  const end = async () => {
    setEnding(true);
    await supabase.functions.invoke("ivs-stream", { body: { action: "restream-end", streamId } });
    toast.success("Live ended");
    onClose();
  };

  const live = state === "LIVE";
  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      <div className="max-w-lg mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2"><Radio className="h-5 w-5 text-destructive" /> Live from Restream</h2>
          <Badge variant={live ? "destructive" : "outline"} className={live ? "animate-pulse" : ""}>{live ? "● LIVE" : "Waiting for Restream"}</Badge>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {!creds && !error && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Creating your stream link…</div>}

        {creds && (
          <>
            <div className="space-y-2">
              <p className="text-sm font-medium">Server URL</p>
              <div className="flex gap-2"><Input readOnly value={creds.ingestServer} /><Button size="icon" variant="outline" onClick={() => copy(creds.ingestServer, "Server URL")}><Copy className="h-4 w-4" /></Button></div>
              <p className="text-sm font-medium">Stream key</p>
              <div className="flex gap-2">
                <Input readOnly type={showKey ? "text" : "password"} value={creds.streamKey} />
                <Button size="icon" variant="outline" onClick={() => setShowKey(!showKey)}>{showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                <Button size="icon" variant="outline" onClick={() => copy(creds.streamKey, "Stream key")}><Copy className="h-4 w-4" /></Button>
              </div>
              <p className="text-xs text-muted-foreground">Keep the stream key private. It only works for this live.</p>
            </div>
            <ol className="text-sm space-y-1 list-decimal pl-5 text-muted-foreground">
              <li>In Restream, open <b>Channels → Add Channel → Custom RTMP</b>.</li>
              <li>Paste the Server URL and Stream key above, name it "Triviabees", and save.</li>
              <li>Turn on Facebook, YouTube and Triviabees, then start your live in Restream.</li>
              <li>This screen shows <b>● LIVE</b> once Triviabees receives your video.</li>
            </ol>
          </>
        )}

        <Button variant="outline" className="w-full" onClick={() => setShowBasket(!showBasket)}><ShoppingBag className="h-4 w-4 mr-2" /> {showBasket ? "Hide basket" : "Manage basket"}</Button>
        {showBasket && <LiveBasketManager streamId={streamId} onClose={() => setShowBasket(false)} />}

        <Button variant="destructive" className="w-full" disabled={ending} onClick={end}>
          {ending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} End live
        </Button>
      </div>
    </div>
  );
}
