import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingBag, Radio, Sparkles, Plane, Utensils, Gavel, Megaphone, Users } from "lucide-react";

const STREAMS = [
  { icon: ShoppingBag, title: "Shop & Marketplace", text: "Margin on every product sold by verified sellers and suppliers." },
  { icon: Radio, title: "Live Selling", text: "TikTok-style live commerce with in-stream checkout and platform fees." },
  { icon: Sparkles, title: "AI Services", text: "Subscriptions and credits for AI tools: ads, lesson plans, images, research." },
  { icon: Plane, title: "Travel & Bookings", text: "Affiliate commissions from flights, hotels and tours, plus booking fees." },
  { icon: Utensils, title: "Food Delivery", text: "Service fees on food orders and rider dispatch." },
  { icon: Gavel, title: "Auctions", text: "Commission on winning bids with escrow protection." },
  { icon: Megaphone, title: "Advertising", text: "Sponsored listings and impression-based ads for sellers." },
  { icon: Users, title: "Beehive Network", text: "A referral community that grows users at low acquisition cost." },
];

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter your name").max(120),
  email: z.string().trim().email("Enter a valid email").max(200),
  company: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(40).optional(),
  investment_range: z.string().max(60).optional(),
  message: z.string().trim().max(2000).optional(),
});

export default function Investors() {
  const [t, setT] = useState<Record<string, number> | null>(null);
  const [form, setForm] = useState({ full_name: "", email: "", company: "", phone: "", investment_range: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    document.title = "Invest in Triviabees – Investor Relations";
    supabase.rpc("get_public_traction").then(({ data }) => setT(data as Record<string, number>));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setSending(true);
    const { error } = await supabase.from("investor_inquiries").insert(parsed.data as any);
    setSending(false);
    if (error) return toast.error("Couldn't send. Please try again.");
    setSent(true);
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <main className="min-h-screen bg-background pb-24">
      <section className="px-4 py-14 max-w-5xl mx-auto text-center">
        <p className="text-sm uppercase tracking-widest text-primary font-semibold">Investor Relations</p>
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mt-3">One app for shopping, live selling, AI and travel in the Philippines</h1>
        <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
          Triviabees combines e-commerce, live commerce, AI tools, bookings and a referral community into a single super-app, with many revenue streams on one user base.
        </p>
        <Button className="mt-6" size="lg" onClick={() => document.getElementById("invest")?.scrollIntoView({ behavior: "smooth" })}>Talk to the founder</Button>
      </section>

      <section className="px-4 max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3">
        {[["Registered users", t?.users], ["Orders placed", t?.orders], ["Active sellers", t?.sellers], ["Live streams", t?.live_streams]].map(([label, v]) => (
          <Card key={label as string}><CardContent className="p-5 text-center">
            <div className="text-3xl font-bold text-foreground">{v == null ? "–" : Number(v).toLocaleString()}</div>
            <div className="text-sm text-muted-foreground mt-1">{label}</div>
          </CardContent></Card>
        ))}
      </section>

      <section className="px-4 max-w-5xl mx-auto mt-14">
        <h2 className="text-2xl font-bold text-foreground">Revenue streams</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
          {STREAMS.map(s => (
            <Card key={s.title}><CardContent className="p-5">
              <s.icon className="h-6 w-6 text-primary" />
              <div className="font-semibold text-foreground mt-3">{s.title}</div>
              <p className="text-sm text-muted-foreground mt-1">{s.text}</p>
            </CardContent></Card>
          ))}
        </div>
      </section>

      <section id="invest" className="px-4 max-w-2xl mx-auto mt-14">
        <h2 className="text-2xl font-bold text-foreground">Interested in investing?</h2>
        <p className="text-muted-foreground mt-1">Leave your details and the founder will contact you.</p>
        {sent ? (
          <Card className="mt-5"><CardContent className="p-6 text-foreground">Thank you! We received your message and will get back to you soon.</CardContent></Card>
        ) : (
          <form onSubmit={submit} className="grid gap-3 mt-5">
            <Input placeholder="Full name *" value={form.full_name} onChange={set("full_name")} />
            <Input placeholder="Email *" type="email" value={form.email} onChange={set("email")} />
            <div className="grid sm:grid-cols-2 gap-3">
              <Input placeholder="Company / Fund" value={form.company} onChange={set("company")} />
              <Input placeholder="Phone" value={form.phone} onChange={set("phone")} />
            </div>
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground" value={form.investment_range} onChange={set("investment_range")}>
              <option value="">Investment range (optional)</option>
              <option>Under ₱500,000</option><option>₱500,000 – ₱5M</option><option>₱5M – ₱50M</option><option>Above ₱50M</option>
            </select>
            <Textarea placeholder="Message" rows={4} value={form.message} onChange={set("message")} />
            <Button type="submit" disabled={sending}>{sending ? "Sending…" : "Send"}</Button>
          </form>
        )}
        <p className="text-xs text-muted-foreground mt-6">This page is for information only and is not an offer to sell securities.</p>
      </section>
    </main>
  );
}
