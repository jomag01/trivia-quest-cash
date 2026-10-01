import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Copy, Loader2, Upload, Clock } from "lucide-react";
import { uploadToAWS } from "@/lib/awsMedia";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  planCode: string;
  planName: string;
  amount: number;
  onSubmitted?: () => void;
}

export default function ManualPassPaymentDialog({ open, onOpenChange, planCode, planName, amount, onSubmitted }: Props) {
  const { user } = useAuth();
  const [acct, setAcct] = useState<Record<string, string>>({});
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    if (!open) return;
    supabase.from("app_settings").select("key, value").like("key", "payment_%").then(({ data }) => {
      const m: Record<string, string> = {};
      data?.forEach((r) => { m[r.key] = r.value || ""; });
      setAcct(m);
    });
    if (user) {
      supabase.from("live_session_passes").select("id", { count: "exact", head: true })
        .eq("user_id", user.id).eq("status", "pending_review").then(({ count }) => setPending(count || 0));
    }
  }, [open, user]);

  const pick = (f?: File) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("Please choose a screenshot image");
    if (f.size > 10 * 1024 * 1024) return toast.error("Image must be under 10MB");
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (!user || !file) return;
    setBusy(true);
    try {
      const up = await uploadToAWS(file, `payment-proofs/${user.id}`);
      const url = (up as any)?.cdnUrl || (up as any)?.url;
      if (!url) throw new Error("Upload failed");
      const { error } = await supabase.rpc("live_submit_manual_pass", { _plan_code: planCode, _proof_url: url, _reference: reference.trim() });
      if (error) throw error;
      toast.success("Payment sent for review. You'll be notified once approved.");
      setFile(null); setPreview(null); setReference("");
      onSubmitted?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Could not submit payment");
    } finally {
      setBusy(false);
    }
  };

  const copy = (v: string) => { navigator.clipboard.writeText(v); toast.success("Copied"); };
  const configured = acct.payment_bank_account_number || acct.payment_qr_code_url;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pay {planName} via GCash</DialogTitle>
          <DialogDescription>Send exactly ₱{amount.toFixed(2)} to the account below, then upload your receipt.</DialogDescription>
        </DialogHeader>

        {pending > 0 && (
          <div className="flex items-center gap-2 rounded-md bg-muted p-2 text-xs">
            <Clock className="h-4 w-4 text-primary" /> You have {pending} payment{pending > 1 ? "s" : ""} waiting for admin approval.
          </div>
        )}

        {!configured ? (
          <p className="text-sm text-muted-foreground">The payment account hasn't been set up yet. Please use another payment option.</p>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border p-3 space-y-2">
              {acct.payment_qr_code_url && (
                <img src={acct.payment_qr_code_url} alt="Payment QR code" className="mx-auto h-44 w-44 rounded-md object-contain bg-background" />
              )}
              {[
                ["Payment channel", acct.payment_bank_name],
                ["Account name", acct.payment_bank_account_name],
                ["Account number", acct.payment_bank_account_number],
                ["Amount", `₱${amount.toFixed(2)}`],
              ].filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="flex items-center gap-1 font-medium">
                    {v}
                    {(k === "Account number" || k === "Amount") && (
                      <button type="button" onClick={() => copy(k === "Amount" ? amount.toFixed(2) : v!)} aria-label={`Copy ${k}`}>
                        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    )}
                  </span>
                </div>
              ))}
            </div>

            <div>
              <Label htmlFor="proof">Upload payment screenshot</Label>
              <label htmlFor="proof" className="mt-1 flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                {preview ? <img src={preview} alt="Payment proof" className="max-h-48 rounded" /> : (<><Upload className="mb-1 h-5 w-5" />Tap to choose image</>)}
              </label>
              <input id="proof" type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
            </div>

            <div>
              <Label htmlFor="ref">GCash reference number (optional)</Label>
              <Input id="ref" value={reference} maxLength={100} onChange={(e) => setReference(e.target.value)} placeholder="e.g. 1234 567 890123" />
            </div>

            <Button className="w-full" disabled={!file || busy} onClick={submit}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Submit payment for approval
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
