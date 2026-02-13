import { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Send, Search, User, Shield, Loader2, CheckCircle2, AlertTriangle
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
  const [result, setResult] = useState<{ recipient_name: string; amount: number; new_balance: number } | null>(null);

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
      if (data.length === 1) {
        setRecipient(data[0]);
      } else {
        // show list — for now pick first exact match or show all
        const exact = data.find(
          (u) =>
            u.username?.toLowerCase() === searchQuery.trim().toLowerCase()
        );
        if (exact) {
          setRecipient(exact);
        } else {
          setRecipient(data[0]);
        }
      }
    } catch (e: any) {
      toast.error("Search failed");
    } finally {
      setSearching(false);
    }
  };

  const handleTransfer = async () => {
    if (!recipient || !amount || !pin) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("transfer_wallet_balance", {
        p_sender_id: userId,
        p_recipient_username: recipient.username,
        p_amount: Number(amount),
        p_pin: pin,
        p_note: note || null,
      });

      if (error) throw error;

      const res = data as any;
      if (!res.success) {
        toast.error(res.error);
        if (res.error === "Invalid PIN") {
          setPin("");
        }
        return;
      }

      setResult({ recipient_name: res.recipient_name, amount: res.amount, new_balance: res.new_balance });
      setStep("success");
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || "Transfer failed");
    } finally {
      setLoading(false);
    }
  };

  const parsedAmount = Number(amount);

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
                type="number" min="1" step="0.01" max={currentBalance}
                value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount to transfer"
              />
            </div>

            <div className="space-y-2">
              <Label>Note (optional)</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. For order payment" maxLength={100} />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("recipient")} className="flex-1">Back</Button>
              <Button
                onClick={() => setStep("confirm")}
                disabled={!amount || parsedAmount <= 0 || parsedAmount > currentBalance || parsedAmount < 1}
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
                <div className="flex justify-between text-lg font-bold">
                  <span>Amount</span>
                  <span className="text-primary">₱{parsedAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
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
