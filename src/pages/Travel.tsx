import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plane, Hotel, MapPin, Car, Globe, ExternalLink, Search } from "lucide-react";

type Partner = {
  id: string; name: string; category: string; description: string | null;
  logo_url: string | null; url_template: string;
};

const CATS = [
  { id: "all", label: "All", icon: Globe },
  { id: "flight", label: "Flights", icon: Plane },
  { id: "hotel", label: "Hotels", icon: Hotel },
  { id: "tour", label: "Tours", icon: MapPin },
  { id: "car", label: "Cars", icon: Car },
];

export default function Travel() {
  const { user } = useAuth();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("all");

  useEffect(() => {
    document.title = "Travel – Flights, Hotels & Tours | Triviabees";
    supabase.from("travel_partners").select("id,name,category,description,logo_url,url_template")
      .eq("is_active", true).order("sort_order")
      .then(({ data }) => setPartners((data as Partner[]) ?? []));
  }, []);

  const shown = useMemo(() => partners.filter(p => cat === "all" || p.category === cat), [partners, cat]);

  const open = (p: Partner) => {
    const q = encodeURIComponent(query.trim());
    const url = p.url_template.replace(/\{q\}/g, q);
    const ref = new URLSearchParams(window.location.search).get("ref") ?? localStorage.getItem("referral_code");
    supabase.from("travel_clicks").insert({
      partner_id: p.id, user_id: user?.id ?? null, ref_code: ref, search_query: query.trim() || null,
    }).then(() => {});
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <main className="min-h-screen bg-background pb-24">
      <section className="px-4 pt-8 pb-6 max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground">Travel</h1>
        <p className="text-muted-foreground mt-1">Find flights, hotels and tours from trusted partners.</p>
        <div className="flex gap-2 mt-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Where to? e.g. Boracay, Tokyo" value={query} onChange={e => setQuery(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2 mt-4 overflow-x-auto">
          {CATS.map(c => (
            <Button key={c.id} size="sm" variant={cat === c.id ? "default" : "outline"} onClick={() => setCat(c.id)}>
              <c.icon className="h-4 w-4 mr-1" />{c.label}
            </Button>
          ))}
        </div>
      </section>
      <section className="px-4 max-w-5xl mx-auto grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map(p => (
          <Card key={p.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex flex-col gap-3 h-full">
              <div className="flex items-center gap-3">
                {p.logo_url
                  ? <img src={p.logo_url} alt={p.name} className="h-10 w-10 rounded object-contain bg-muted" />
                  : <div className="h-10 w-10 rounded bg-muted flex items-center justify-center font-bold text-foreground">{p.name[0]}</div>}
                <div>
                  <div className="font-semibold text-foreground">{p.name}</div>
                  <Badge variant="secondary" className="capitalize">{p.category}</Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground flex-1">{p.description}</p>
              <Button onClick={() => open(p)}>Search {query ? `"${query}"` : ""} on {p.name}<ExternalLink className="h-4 w-4 ml-1" /></Button>
            </CardContent>
          </Card>
        ))}
        {shown.length === 0 && <p className="text-muted-foreground">No partners in this category yet.</p>}
      </section>
      <p className="text-xs text-muted-foreground text-center mt-8 px-4">Bookings are completed on the partner's website. Triviabees may earn a commission.</p>
    </main>
  );
}
