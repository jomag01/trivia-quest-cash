import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, ArrowUpCircle, ArrowDownCircle, History, Shield, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import CashDepositDialog from './CashDepositDialog';
import CashTransactionHistory from './CashTransactionHistory';
import CashConversionDialog from './CashConversionDialog';
import CashPinSetupDialog from './CashPinSetupDialog';

interface CashWalletCardProps {
  userId: string;
}

export default function CashWalletCard({ userId }: CashWalletCardProps) {
  const [showDeposit, setShowDeposit] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showConvert, setShowConvert] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);

  const { data: wallet, isLoading, refetch } = useQuery({
    queryKey: ['cash-wallet', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cash_wallets')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) throw error;
      
      // Create wallet if doesn't exist
      if (!data) {
        const { data: newWallet, error: createError } = await supabase
          .from('cash_wallets')
          .insert({ user_id: userId, balance: 0 })
          .select()
          .single();
        if (createError) throw createError;
        return newWallet;
      }
      
      return data;
    },
    enabled: !!userId,
  });

  const { data: pendingDeposits = [] } = useQuery({
    queryKey: ['pending-deposits', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cash_deposit_requests')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const hasPin = wallet?.pin_hash;
  const isLocked = wallet?.locked_until && new Date(wallet.locked_until) > new Date();

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600 text-white">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600 text-white overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjIiIGZpbGw9IndoaXRlIiBmaWxsLW9wYWNpdHk9IjAuMSIvPjwvZz48L3N2Zz4=')] opacity-30" />
        
        <CardHeader className="relative pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-white/90">
              <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                <Wallet className="w-5 h-5" />
              </div>
              Cash Wallet
            </CardTitle>
            <div className="flex items-center gap-1">
              {hasPin && (
                <Badge className="bg-white/20 text-white border-0">
                  <Shield className="w-3 h-3 mr-1" />
                  Secured
                </Badge>
              )}
              {isLocked && (
                <Badge variant="destructive">Locked</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="relative space-y-4">
          <div className="text-center py-2">
            <p className="text-sm text-white/70">Available Balance</p>
            <p className="text-4xl font-bold tracking-tight">
              ₱{Number(wallet?.balance || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </p>
            {pendingDeposits.length > 0 && (
              <p className="text-xs text-yellow-200 mt-1">
                ⏳ {pendingDeposits.length} pending deposit(s) awaiting approval
              </p>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm"
              onClick={() => setShowDeposit(true)}
            >
              <ArrowUpCircle className="w-4 h-4 mr-1" />
              Deposit
            </Button>
            <Button
              variant="secondary"
              className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm"
              onClick={() => setShowConvert(true)}
              disabled={!wallet?.balance || wallet.balance <= 0}
            >
              <ArrowDownCircle className="w-4 h-4 mr-1" />
              Convert
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 text-white/80 hover:text-white hover:bg-white/10"
              onClick={() => setShowHistory(true)}
            >
              <History className="w-4 h-4 mr-1" />
              History
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 text-white/80 hover:text-white hover:bg-white/10"
              onClick={() => setShowPinSetup(true)}
            >
              <Shield className="w-4 h-4 mr-1" />
              {hasPin ? 'Change PIN' : 'Set PIN'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <CashDepositDialog
        open={showDeposit}
        onOpenChange={setShowDeposit}
        userId={userId}
        onSuccess={() => refetch()}
      />
      
      <CashTransactionHistory
        open={showHistory}
        onOpenChange={setShowHistory}
        userId={userId}
      />
      
      <CashConversionDialog
        open={showConvert}
        onOpenChange={setShowConvert}
        userId={userId}
        currentBalance={Number(wallet?.balance || 0)}
        hasPin={!!hasPin}
        onSuccess={() => refetch()}
      />
      
      <CashPinSetupDialog
        open={showPinSetup}
        onOpenChange={setShowPinSetup}
        userId={userId}
        hasExistingPin={!!hasPin}
        onSuccess={() => refetch()}
      />
    </>
  );
}
