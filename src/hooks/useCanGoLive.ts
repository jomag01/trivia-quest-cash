import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** True when an admin approved this user for live selling (admins always allowed). */
export function useCanGoLive(userId: string | undefined) {
  const [canGoLive, setCanGoLive] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setCanGoLive(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.rpc("can_go_live", { _user_id: userId });
    if (error) {
      console.error("Unable to check live-selling access:", error);
      setCanGoLive(false);
    } else {
      setCanGoLive(data === true);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void refresh();
    if (!userId) return;

    const channel = supabase
      .channel(`live-selling-access-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_selling_access", filter: `user_id=eq.${userId}` },
        () => void refresh(),
      )
      .subscribe();

    const refreshOnFocus = () => void refresh();
    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnFocus);

    return () => {
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnFocus);
      void supabase.removeChannel(channel);
    };
  }, [refresh, userId]);

  return { canGoLive, loading, refresh };
}
