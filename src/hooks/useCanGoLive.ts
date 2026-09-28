import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** True when an admin approved this user for live selling (admins always allowed). */
export function useCanGoLive(userId: string | undefined) {
  const [canGoLive, setCanGoLive] = useState(false);
  useEffect(() => {
    if (!userId) return setCanGoLive(false);
    supabase.rpc("can_go_live", { _user_id: userId }).then(({ data }) => setCanGoLive(data === true));
  }, [userId]);
  return canGoLive;
}
