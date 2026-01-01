import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, ArrowRight, Diamond, Coins, Sparkles, Lock } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

interface CashConversionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  currentBalance: number;
  hasPin: boolean;
  onSuccess: () => void;
}

type ConversionType = 'diamonds' | 'credits';

export default function CashConversionDialog({ 
  open, 
  onOpenChange, 
  userId, 
  currentBalance,
  hasPin,
  onSuccess 
}: CashConversionDialogProps) {
  const queryClient = useQueryClient();
  const [conversionType, setConversionType] = useState<ConversionType>('diamonds');
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  const [showPinInput, setShowPinInput] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ['conversion-rates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .in('key', ['diamond_price_php', 'credit_to_diamond_rate']);
      if (error) throw error;
      const result: Record<string, string> = {};
      data?.forEach((s) => { result[s.key] = s.value || ''; });
      return result;
    },
    enabled: open,
  });

  const diamondPrice = parseFloat(settings?.diamond_price_php || '10');
  const creditRate = parseFloat(settings?.credit_to_diamond_rate || '10');

  const calculateConversion = () => {
    const cashAmount = parseFloat(amount) || 0;
    if (conversionType === 'diamonds') {
      return Math.floor(cashAmount / diamondPrice);
    } else {
      return Math.floor((cashAmount / diamondPrice) * creditRate);
    }
  };

  const convertMutation = useMutation({
    mutationFn: async () => {
      // Verify PIN if set
      if (hasPin) {
        const { data: wallet, error: walletError } = await supabase
          .from('cash_wallets')
          .select('pin_hash, pin_attempts, locked_until')
          .eq('user_id', userId)
          .single();

        if (walletError) throw new Error('Failed to verify PIN');

        // Check if locked
        if (wallet.locked_until && new Date(wallet.locked_until) > new Date()) {
          throw new Error('Wallet is locked. Try again later.');
        }

        // Simple PIN verification (in production, use proper hashing)
        const expectedHash = btoa(pin);
        if (wallet.pin_hash !== expectedHash) {
          // Increment attempts
          const attempts = (wallet.pin_attempts || 0) + 1;
          const updates: any = { pin_attempts: attempts };
          
          if (attempts >= 3) {
            updates.locked_until = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // Lock for 30 min
          }

          await supabase.from('cash_wallets').update(updates).eq('user_id', userId);
          
          if (attempts >= 3) {
            throw new Error('Too many attempts. Wallet locked for 30 minutes.');
          }
          throw new Error(`Invalid PIN. ${3 - attempts} attempts remaining.`);
        }

        // Reset attempts on success
        await supabase.from('cash_wallets').update({ pin_attempts: 0 }).eq('user_id', userId);
      }

      const cashAmount = parseFloat(amount);
      const convertedAmount = calculateConversion();

      // Deduct from cash wallet
      const { data: deductResult, error: deductError } = await supabase.rpc('deduct_cash_balance', {
        p_user_id: userId,
        p_amount: cashAmount,
        p_description: `Converted to ${conversionType}`,
        p_reference_type: 'conversion',
        p_reference_id: `${conversionType}_${Date.now()}`
      });

      if (deductError || !deductResult) {
        throw new Error('Failed to deduct cash balance');
      }

      // Add to appropriate wallet using raw query to bypass type issues
      if (conversionType === 'diamonds') {
        const { data: profile } = await supabase
          .from('profiles')
          .select('treasure_wallet')
          .eq('id', userId)
          .single();
        
        const currentBalance = (profile as any)?.treasure_wallet || 0;
        await supabase
          .from('profiles')
          .update({ treasure_wallet: currentBalance + convertedAmount } as any)
          .eq('id', userId);
      } else {
        const { data: profile } = await supabase
          .from('profiles')
          .select('credits')
          .eq('id', userId)
          .single();
        
        const currentCredits = (profile as any)?.credits || 0;
        await supabase
          .from('profiles')
          .update({ credits: currentCredits + convertedAmount } as any)
          .eq('id', userId);
      }

      return { cashAmount, convertedAmount };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['cash-wallet'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast.success(`Successfully converted ₱${result.cashAmount} to ${result.convertedAmount} ${conversionType}`);
      resetForm();
      onSuccess();
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message || 'Conversion failed'),
  });

  const resetForm = () => {
    setAmount('');
    setPin('');
    setShowPinInput(false);
    setConversionType('diamonds');
  };

  const handleConvert = () => {
    if (hasPin && !showPinInput) {
      setShowPinInput(true);
      return;
    }
    convertMutation.mutate();
  };

  const cashAmount = parseFloat(amount) || 0;
  const isValid = cashAmount > 0 && cashAmount <= currentBalance;
  const convertedAmount = calculateConversion();

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            Convert Cash
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Conversion Type Selection */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={conversionType === 'diamonds' ? 'default' : 'outline'}
              onClick={() => setConversionType('diamonds')}
              className={conversionType === 'diamonds' ? 'bg-gradient-to-r from-cyan-500 to-blue-500' : ''}
            >
              <Diamond className="w-4 h-4 mr-2" />
              Diamonds
            </Button>
            <Button
              variant={conversionType === 'credits' ? 'default' : 'outline'}
              onClick={() => setConversionType('credits')}
              className={conversionType === 'credits' ? 'bg-gradient-to-r from-amber-500 to-orange-500' : ''}
            >
              <Coins className="w-4 h-4 mr-2" />
              Credits
            </Button>
          </div>

          {/* Amount Input */}
          <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-900/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Amount to Convert</CardTitle>
              <CardDescription>
                Available: ₱{currentBalance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-semibold">₱</span>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-8 text-xl h-12"
                  max={currentBalance}
                  min="1"
                />
              </div>
              <div className="flex gap-2 mt-2">
                {[100, 500, 1000].map((preset) => (
                  <Button
                    key={preset}
                    variant="outline"
                    size="sm"
                    onClick={() => setAmount(Math.min(preset, currentBalance).toString())}
                    className="flex-1"
                    disabled={preset > currentBalance}
                  >
                    ₱{preset}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount(currentBalance.toString())}
                  className="flex-1"
                >
                  Max
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Conversion Preview */}
          {isValid && (
            <Card className={`border-0 ${conversionType === 'diamonds' ? 'bg-gradient-to-r from-cyan-500/10 to-blue-500/10' : 'bg-gradient-to-r from-amber-500/10 to-orange-500/10'}`}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="text-center flex-1">
                    <p className="text-sm text-muted-foreground">You Pay</p>
                    <p className="text-2xl font-bold">₱{cashAmount.toLocaleString()}</p>
                  </div>
                  <ArrowRight className="w-6 h-6 text-muted-foreground" />
                  <div className="text-center flex-1">
                    <p className="text-sm text-muted-foreground">You Get</p>
                    <p className="text-2xl font-bold flex items-center justify-center gap-1">
                      {conversionType === 'diamonds' ? (
                        <><Diamond className="w-5 h-5 text-cyan-500" /> {convertedAmount}</>
                      ) : (
                        <><Coins className="w-5 h-5 text-amber-500" /> {convertedAmount}</>
                      )}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-center text-muted-foreground mt-2">
                  Rate: ₱{diamondPrice}/diamond • {creditRate} credits/diamond
                </p>
              </CardContent>
            </Card>
          )}

          {/* PIN Input */}
          {showPinInput && hasPin && (
            <Card className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-900/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Enter Security PIN
                </CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                <InputOTP maxLength={4} value={pin} onChange={setPin}>
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

          <Button
            onClick={handleConvert}
            disabled={!isValid || convertMutation.isPending || (showPinInput && pin.length < 4)}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            {convertMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Converting...
              </>
            ) : showPinInput ? (
              'Confirm Conversion'
            ) : hasPin ? (
              <>
                <Lock className="w-4 h-4 mr-2" />
                Continue with PIN
              </>
            ) : (
              'Convert Now'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
