import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Send, Search, User, Shield, Loader2, CheckCircle2, AlertTriangle, Copy
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface CashTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  currentBalance: number;
  hasPin: boolean;
  onSuccess: () => void;
}

type Step = "recipient" | "amount" | "confirm" | "pin" | "success";

interface FeeSettings {
  enabled: boolean;
  type: string;
  value: number;
  minAmount: number;
}

export default function CashTransferDialog({
  open, onOpenChange, userId, currentBalance, hasPin, onSuccess
}: CashTransferDialogProps) {
  const [step, setStep] = useState<Step>("recipient");
  const [searchQuery, setSearchQuery] = useState("");
  const [recipient, setRecipient] = useState<{ id: string; username: string; full_name: string } | null>(null);
  const [searching, setSearching] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    recipient_name: string; amount: number; new_balance: number;
    fee: number; total_deducted: number; reference_code: string;
  } | null>(null);
  const [feeSettings, setFeeSettings] = useState<FeeSettings>({
    enabled: false, type: "percentage", value: 0, minAmount: 1
  });

  useEffect(() => {
    if (open) {
      supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["transfer_fee_enabled", "transfer_fee_type", "transfer_fee_value", "transfer_min_amount"])
        .then(({ data }) => {
          if (data) {
            const map: Record<string, string> = {};
            data.forEach((s) => (map[s.key] = s.value || ""));
            setFeeSettings({
              enabled: map.transfer_fee_enabled === "true",
              type: map.transfer_fee_type || "percentage",
              value: Number(map.transfer_fee_value) || 0,
              minAmount: Number(map.transfer_min_amount) || 1,
            });
          }
        });
    }
  }, [open]);

  const reset = () => {
    setStep("recipient");
    setSearchQuery("");
    setRecipient(null);
    setAmount("");
    setNote("");
    setPin("");
    setLoading(false);
    setResult(null);
  };

  const handleClose = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, full_name")
        .or(`username.ilike.%${searchQuery.trim()}%,referral_code.ilike.%${searchQuery.trim()}%`)
        .neq("id", userId)
        .limit(5);

      if (error) throw error;
      if (!data || data.length === 0) {
        toast.error("No user found with that username or referral code");
        return;
      }
      const exact = data.find(
        (u) => u.username?.toLowerCase() === searchQuery.trim().toLowerCase()
      );
      setRecipient(exact || data[0]);
    } catch {
      toast.error("Search failed");
    } finally {
      setSearching(false);
    }
  };

  const parsedAmount = Number(amount);

  const calcFee = (amt: number) => {
    if (!feeSettings.enabled || feeSettings.value <= 0) return 0;
    if (feeSettings.type === "percentage") {
      return Math.round(amt * feeSettings.value / 100 * 100) / 100;
    }
    return feeSettings.value;
  };

  const feeAmount = calcFee(parsedAmount);
  const totalDeduct = parsedAmount + feeAmount;

  const handleTransfer = async () => {
    if (!recipient || !amount || !pin) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("transfer_wallet_balance", {
        p_sender_id: userId,
        p_recipient_username: recipient.username,
        p_amount: parsedAmount,
        p_pin: pin,
        p_note: note || null,
      });

      if (error) throw error;

      const res = data as any;
      if (!res.success) {
        toast.error(res.error);
        if (res.error === "Invalid PIN") setPin("");
        return;
      }

      setResult({
        recipient_name: res.recipient_name,
        amount: res.amount,
        new_balance: res.new_balance,
        fee: res.fee || 0,
        total_deducted: res.total_deducted || res.amount,
        reference_code: res.reference_code || "",
      });
      setStep("success");
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || "Transfer failed");
    } finally {
      setLoading(false);
    }
  };

  const copyRef = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Reference code copied!");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            Transfer to Wallet
          </DialogTitle>
          <DialogDescription>
            Send cash to another user's wallet securely
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        {step !== "success" && (
          <div className="flex items-center gap-1 mb-2">
            {(["recipient", "amount", "confirm", "pin"] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-1 flex-1">
                <div className={`h-1.5 rounded-full flex-1 transition-colors ${
                  (["recipient", "amount", "confirm", "pin"].indexOf(step) >= i) 
                    ? "bg-primary" : "bg-muted"
                }`} />
              </div>
            ))}
          </div>
        )}

        {!hasPin && step === "recipient" && (
          <Card className="border-amber-500/30 bg-amber-500/10">
            <CardContent className="p-3 flex items-center gap-2 text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>You need to set up a wallet PIN before making transfers.</span>
            </CardContent>
          </Card>
        )}

        {/* STEP 1: Find recipient */}
        {step === "recipient" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Recipient Username or Referral Code</Label>
              <div className="flex gap-2">
                <Input
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setRecipient(null); }}
                  placeholder="Enter username or referral code"
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={searching || !searchQuery.trim()} size="icon" variant="outline">
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {recipient && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{recipient.full_name || recipient.username}</p>
                    <p className="text-sm text-muted-foreground">@{recipient.username}</p>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-green-500 ml-auto" />
                </CardContent>
              </Card>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => handleClose(false)} className="flex-1">Cancel</Button>
              <Button onClick={() => setStep("amount")} disabled={!recipient || !hasPin} className="flex-1">
                Next
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: Amount */}
        {step === "amount" && (
          <div className="space-y-4">
            <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20">
              <CardContent className="p-3">
                <span className="text-xs text-muted-foreground">Available Balance</span>
                <div className="text-2xl font-bold text-green-600">
                  ₱{currentBalance.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label>Amount (PHP)</Label>
              <Input
                type="number" min={feeSettings.minAmount} step="0.01" max={currentBalance}
                value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder={`Min ₱${feeSettings.minAmount}`}
              />
            </div>

            {parsedAmount > 0 && feeSettings.enabled && feeAmount > 0 && (
              <Card className="border-amber-500/20 bg-amber-500/5">
                <CardContent className="p-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transfer Amount</span>
                    <span>₱{parsedAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Fee ({feeSettings.type === "percentage" ? `${feeSettings.value}%` : `₱${feeSettings.value}`})
                    </span>
                    <span className="text-amber-600">₱{feeAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <hr className="border-border" />
                  <div className="flex justify-between font-semibold">
                    <span>Total Deducted</span>
                    <span>₱{totalDeduct.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              <Label>Note (optional)</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. For order payment" maxLength={100} />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("recipient")} className="flex-1">Back</Button>
              <Button
                onClick={() => setStep("confirm")}
                disabled={!amount || parsedAmount <= 0 || totalDeduct > currentBalance || parsedAmount < feeSettings.minAmount}
                className="flex-1"
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Confirm */}
        {step === "confirm" && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">To</span>
                  <span className="font-medium">{recipient?.full_name || recipient?.username}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Username</span>
                  <span>@{recipient?.username}</span>
                </div>
                <hr className="border-border" />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount</span>
                  <span>₱{parsedAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                </div>
                {feeSettings.enabled && feeAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Transfer Fee</span>
                    <span className="text-amber-600">₱{feeAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <hr className="border-border" />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Deducted</span>
                  <span className="text-primary">₱{totalDeduct.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                </div>
                {note && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Note</span>
                    <span className="text-right max-w-[60%]">{note}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("amount")} className="flex-1">Back</Button>
              <Button onClick={() => setStep("pin")} className="flex-1">Confirm & Enter PIN</Button>
            </div>
          </div>
        )}

        {/* STEP 4: PIN */}
        {step === "pin" && (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">Enter your wallet PIN to authorize this transfer</p>
            </div>

            <Input
              type="password" inputMode="numeric" maxLength={6}
              value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="Enter 4-6 digit PIN"
              className="text-center text-2xl tracking-[0.5em]"
              autoFocus
            />

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => { setPin(""); setStep("confirm"); }} className="flex-1">Back</Button>
              <Button onClick={handleTransfer} disabled={loading || pin.length < 4} className="flex-1">
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</> : "Send"}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 5: Success */}
        {step === "success" && result && (
          <div className="space-y-4 text-center py-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <div>
              <p className="text-lg font-bold">Transfer Successful!</p>
              <p className="text-muted-foreground text-sm mt-1">
                ₱{result.amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })} sent to {result.recipient_name}
              </p>
            </div>

            {/* Reference Code */}
            {result.reference_code && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-3 space-y-1">
                  <span className="text-xs text-muted-foreground">Reference Code</span>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-lg font-mono font-bold tracking-wider">{result.reference_code}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyRef(result.reference_code)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Save this code for tracking and dispute resolution</p>
                </CardContent>
              </Card>
            )}

            {result.fee > 0 && (
              <div className="text-xs text-muted-foreground">
                Fee charged: ₱{result.fee.toLocaleString("en-PH", { minimumFractionDigits: 2 })} · 
                Total deducted: ₱{result.total_deducted.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
              </div>
            )}

            <Card className="bg-muted/50">
              <CardContent className="p-3">
                <span className="text-xs text-muted-foreground">New Balance</span>
                <div className="text-xl font-bold">
                  ₱{result.new_balance.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>
            <Button onClick={() => handleClose(false)} className="w-full">Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
