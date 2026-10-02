import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/** Shop header button showing how many sellers are live right now. */
export default function LiveNowButton() {
  const navigate = useNavigate();
  const [count, setCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      const { count: c } = await supabase.from("live_streams").select("id", { count: "estimated", head: true }).eq("status", "live");
      setCount(c || 0);
    };
    load();
    // Poll rather than subscribing to every live_streams change (scales to huge numbers of lives)
    const t = setInterval(() => { if (document.visibilityState === "visible") load(); }, 30000);
    return () => clearInterval(t);
  }, []);

  return (
    <button onClick={() => navigate("/live")} aria-label="Live selling"
      className={`relative flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold ${count ? "bg-destructive text-destructive-foreground" : "bg-muted text-muted-foreground"}`}>
      {count > 0 && <span className="absolute -left-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-destructive animate-ping" />}
      <Radio className="h-4 w-4" /> LIVE{count > 0 ? ` ${count}` : ""}
    </button>
  );
}
