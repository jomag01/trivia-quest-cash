import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface InstallmentInfo {
  provider_name: string;
  interest_rate: number;
  terms: number[];
  min_amount: number;
}

export const useProductInstallments = (productIds: string[]) => {
  const [installmentMap, setInstallmentMap] = useState<Record<string, InstallmentInfo[]>>({});

  useEffect(() => {
    if (!productIds.length) return;

    const fetch = async () => {
      const { data: settings } = await supabase
        .from("product_installment_settings")
        .select("product_id, provider_id, is_enabled")
        .in("product_id", productIds)
        .eq("is_enabled", true);

      if (!settings?.length) return;

      const providerIds = [...new Set(settings.map(s => s.provider_id))];
      const { data: providers } = await supabase
        .from("installment_providers")
        .select("*")
        .in("id", providerIds)
        .eq("is_active", true);

      if (!providers?.length) return;

      const map: Record<string, InstallmentInfo[]> = {};
      for (const s of settings) {
        const provider = providers.find(p => p.id === s.provider_id);
        if (!provider) continue;
        if (!map[s.product_id]) map[s.product_id] = [];
        map[s.product_id].push({
          provider_name: provider.name,
          interest_rate: provider.interest_rate_percent || 0,
          terms: provider.available_terms || [3, 6, 12],
          min_amount: provider.min_amount || 0,
        });
      }
      setInstallmentMap(map);
    };

    fetch();
  }, [productIds.join(",")]);

  return installmentMap;
};
