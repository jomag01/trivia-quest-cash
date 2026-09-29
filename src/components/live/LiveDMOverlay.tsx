import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MessageCircle } from "lucide-react";

interface DM { id: string; name: string; content: string }

/** Floats private messages the seller receives while live on top of their video. */
export default function LiveDMOverlay() {
  const { user } = useAuth();
  const [dms, setDms] = useState<DM[]>([]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`live-dm-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "provider_messages" }, async (payload: any) => {
        const m = payload.new;
        if (!m || m.sender_id === user.id) return;
        const { data: conv } = await supabase.from("provider_conversations")
          .select("provider_id, customer_id").eq("id", m.conversation_id).maybeSingle();
        if (!conv || (conv.provider_id !== user.id && conv.customer_id !== user.id)) return;
        const { data: p } = await supabase.from("profiles").select("full_name").eq("id", m.sender_id).maybeSingle();
        const dm = { id: m.id, name: p?.full_name || "Viewer", content: String(m.content || "").slice(0, 140) };
        setDms((d) => [...d.slice(-3), dm]);
        setTimeout(() => setDms((d) => d.filter((x) => x.id !== dm.id)), 12000);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  if (!dms.length) return null;
  return (
    <div className="absolute top-20 right-3 z-30 flex w-64 flex-col gap-2 pointer-events-none">
      {dms.map((d) => (
        <div key={d.id} className="rounded-xl bg-background/90 p-2 shadow-lg animate-in slide-in-from-right">
          <p className="flex items-center gap-1 text-xs font-semibold text-primary"><MessageCircle className="h-3 w-3" /> {d.name} messaged you</p>
          <p className="text-sm text-foreground break-words">{d.content}</p>
        </div>
      ))}
    </div>
  );
}
