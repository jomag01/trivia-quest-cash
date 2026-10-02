import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import BroadcasterView from "@/components/live/BroadcasterView";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Ctx {
  streamId: string | null;
  startBroadcast: (id: string) => void;
}

const KEY = "triviabees-active-live";
const LiveBroadcastContext = createContext<Ctx>({ streamId: null, startBroadcast: () => {} });

export const useLiveBroadcast = () => useContext(LiveBroadcastContext);

/** Keeps the seller's live broadcast mounted across pages and resumes it after a reload or lost signal. */
export function LiveBroadcastProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [streamId, setStreamId] = useState<string | null>(null);
  const startBroadcast = useCallback((id: string) => {
    localStorage.setItem(KEY, id);
    setStreamId(id);
  }, []);
  const end = useCallback(() => {
    localStorage.removeItem(KEY);
    setStreamId(null);
  }, []);

  // Resume a live that wasn't ended with the End button
  useEffect(() => {
    if (!user || streamId) return;
    const saved = localStorage.getItem(KEY);
    if (!saved) return;
    supabase.from("live_streams").select("id, user_id, status, ends_at, source").eq("id", saved).maybeSingle().then(({ data }) => {
      const d = data as any;
      const ok = d && d.user_id === user.id && d.status === "live" && d.source !== "restream" && (!d.ends_at || new Date(d.ends_at).getTime() > Date.now());
      if (ok) {
        toast.info("Resuming your live…");
        setStreamId(saved);
      } else {
        localStorage.removeItem(KEY);
      }
    });
  }, [user, streamId]);

  return (
    <LiveBroadcastContext.Provider value={{ streamId, startBroadcast }}>
      {children}
      {streamId && <BroadcasterView streamId={streamId} onEndStream={end} />}
    </LiveBroadcastContext.Provider>
  );
}
