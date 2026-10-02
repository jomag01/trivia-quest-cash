import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface LivePlan {
  code: "basic" | "pro";
  name: string;
  description: string;
  price_per_session: number;
  max_hours?: number;
  extension_price_per_hour?: number;
  price_diamonds?: number;
  price_credits?: number;
  extension_diamonds_per_hour?: number;
  extension_credits_per_hour?: number;
  features: { chroma_key?: boolean; auto_bg_removal?: boolean; custom_background?: boolean; stickers?: boolean; cross_platform?: boolean };
  is_active: boolean;
  sort_order: number;
}

export interface LiveEntitlements { approved: boolean; basic_passes: number; pro_passes: number }

/** Paid live plans and the signed-in user's unused session passes. */
export function useLivePlans(enabled = true) {
  const [plans, setPlans] = useState<LivePlan[]>([]);
  const [ent, setEnt] = useState<LiveEntitlements>({ approved: false, basic_passes: 0, pro_passes: 0 });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [{ data: p }, { data: e }] = await Promise.all([
      supabase.from("live_plans").select("*").order("sort_order"),
      supabase.rpc("live_my_entitlements"),
    ]);
    setPlans((p as unknown as LivePlan[]) || []);
    if (e) setEnt(e as unknown as LiveEntitlements);
    setLoading(false);
  }, []);

  useEffect(() => { if (enabled) void refresh(); }, [enabled, refresh]);

  return { plans, ent, loading, refresh };
}
