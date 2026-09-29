import React, { createContext, useContext, useState, useCallback } from "react";
import BroadcasterView from "@/components/live/BroadcasterView";

interface Ctx {
  streamId: string | null;
  startBroadcast: (id: string) => void;
}

const LiveBroadcastContext = createContext<Ctx>({ streamId: null, startBroadcast: () => {} });

export const useLiveBroadcast = () => useContext(LiveBroadcastContext);

/** Keeps the seller's live broadcast mounted across pages so it can be minimized. */
export function LiveBroadcastProvider({ children }: { children: React.ReactNode }) {
  const [streamId, setStreamId] = useState<string | null>(null);
  const startBroadcast = useCallback((id: string) => setStreamId(id), []);
  return (
    <LiveBroadcastContext.Provider value={{ streamId, startBroadcast }}>
      {children}
      {streamId && <BroadcasterView streamId={streamId} onEndStream={() => setStreamId(null)} />}
    </LiveBroadcastContext.Provider>
  );
}
