import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, Shield, Lock, Check } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

interface CashPinSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  hasExistingPin: boolean;
  onSuccess: () => void;
}

export default function CashPinSetupDialog({ 
  open, 
  onOpenChange, 
  userId, 
  hasExistingPin,
  onSuccess 
}: CashPinSetupDialogProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (hasExistingPin) {
        // Verify current PIN
        const { data: wallet, error: walletError } = await supabase
          .from('cash_wallets')
          .select('pin_hash')
          .eq('user_id', userId)
          .single();

        if (walletError) throw new Error('Failed to verify current PIN');

        const currentHash = btoa(currentPin);
        if (wallet.pin_hash !== currentHash) {
          throw new Error('Current PIN is incorrect');
        }
      }

      if (newPin !== confirmPin) {
        throw new Error('PINs do not match');
      }

      if (newPin.length !== 4) {
        throw new Error('PIN must be 4 digits');
      }

      // Save new PIN (in production, use proper hashing like bcrypt)
      const pinHash = btoa(newPin);
      
      const { error } = await supabase
        .from('cash_wallets')
        .update({ pin_hash: pinHash, pin_attempts: 0, locked_until: null })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-wallet'] });
      toast.success(hasExistingPin ? 'PIN changed successfully' : 'Security PIN set successfully');
      resetForm();
      onSuccess();
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to save PIN'),
  });

  const resetForm = () => {
    setStep(1);
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
  };

  const handleContinue = () => {
    if (hasExistingPin && step === 1) {
      if (currentPin.length !== 4) {
        toast.error('Please enter your current 4-digit PIN');
        return;
      }
      setStep(2);
    } else if (step === (hasExistingPin ? 2 : 1)) {
      if (newPin.length !== 4) {
        toast.error('Please enter a 4-digit PIN');
        return;
      }
      setStep(hasExistingPin ? 3 : 2);
    } else {
      if (confirmPin.length !== 4) {
        toast.error('Please confirm your PIN');
        return;
      }
      saveMutation.mutate();
    }
  };

  const currentStep = hasExistingPin ? step : step + 1;
  const totalSteps = hasExistingPin ? 3 : 2;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
              <Shield className="w-5 h-5" />
            </div>
            {hasExistingPin ? 'Change Security PIN' : 'Set Security PIN'}
          </DialogTitle>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-2 py-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full ${
                i + 1 <= currentStep ? 'bg-indigo-500' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        <div className="space-y-4">
          {/* Step 1: Current PIN (only if has existing) */}
          {hasExistingPin && step === 1 && (
            <Card className="border-indigo-200 bg-indigo-50/50 dark:bg-indigo-900/20">
              <CardHeader className="pb-2 text-center">
                <CardTitle className="text-lg flex items-center justify-center gap-2">
                  <Lock className="w-4 h-4" />
                  Enter Current PIN
                </CardTitle>
                <CardDescription>Verify your identity</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center pt-4">
                <InputOTP maxLength={4} value={currentPin} onChange={setCurrentPin}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                  </InputOTPGroup>
                </InputOTP>
              </CardContent>
            </Card>
          )}

          {/* Step 2: New PIN */}
          {((hasExistingPin && step === 2) || (!hasExistingPin && step === 1)) && (
            <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-900/20">
              <CardHeader className="pb-2 text-center">
                <CardTitle className="text-lg">Enter New PIN</CardTitle>
                <CardDescription>Choose a 4-digit PIN you'll remember</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center pt-4">
                <InputOTP maxLength={4} value={newPin} onChange={setNewPin}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                  </InputOTPGroup>
                </InputOTP>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Confirm PIN */}
          {((hasExistingPin && step === 3) || (!hasExistingPin && step === 2)) && (
            <Card className="border-green-200 bg-green-50/50 dark:bg-green-900/20">
              <CardHeader className="pb-2 text-center">
                <CardTitle className="text-lg flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" />
                  Confirm PIN
                </CardTitle>
                <CardDescription>Enter the same PIN again</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center pt-4">
                <InputOTP maxLength={4} value={confirmPin} onChange={setConfirmPin}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                  </InputOTPGroup>
                </InputOTP>
              </CardContent>
            </Card>
          )}

          {/* Security Tips */}
          <div className="p-3 rounded-lg bg-muted text-xs text-muted-foreground space-y-1">
            <p>🔒 <strong>Security Tips:</strong></p>
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              <li>Never share your PIN with anyone</li>
              <li>Avoid obvious PINs like 1234 or 0000</li>
              <li>Your account locks after 3 failed attempts</li>
            </ul>
          </div>

          <div className="flex gap-2">
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
                Back
              </Button>
            )}
            <Button
              onClick={handleContinue}
              disabled={saveMutation.isPending}
              className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : ((hasExistingPin && step === 3) || (!hasExistingPin && step === 2)) ? (
                'Save PIN'
              ) : (
                'Continue'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
