import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ConversionSettings {
  creditToDiamondRate: number;
  diamondToCreditRate: number;
  aiCreditToCashRate: number;
  aiCreditToDiamondRate: number;
  aiCreditToGameCreditRate: number;
  conversionFeePercent: number;
  diamondBasePrice: number;
  enableCreditToDiamond: boolean;
  enableDiamondToCredit: boolean;
  enableAiCreditToCash: boolean;
  enableAiCreditToDiamond: boolean;
  enableAiCreditToGameCredit: boolean;
  enableCashToDiamond: boolean;
  enableCashToCredit: boolean;
  enableDiamondToCash: boolean;
  enableCreditToCash: boolean;
}

export interface UserBalances {
  credits: number;
  diamonds: number;
  aiCredits: number;
  cashBalance: number;
}

export function useCurrencyConversion() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<ConversionSettings>({
    creditToDiamondRate: 10,
    diamondToCreditRate: 10,
    aiCreditToCashRate: 0.10,
    aiCreditToDiamondRate: 5,
    aiCreditToGameCreditRate: 1,
    conversionFeePercent: 5,
    diamondBasePrice: 10,
    enableCreditToDiamond: true,
    enableDiamondToCredit: true,
    enableAiCreditToCash: true,
    enableAiCreditToDiamond: true,
    enableAiCreditToGameCredit: true,
    enableCashToDiamond: true,
    enableCashToCredit: true,
    enableDiamondToCash: true,
    enableCreditToCash: true,
  });
  const [balances, setBalances] = useState<UserBalances>({
    credits: 0,
    diamonds: 0,
    aiCredits: 0,
    cashBalance: 0,
  });
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('treasure_admin_settings')
        .select('setting_key, setting_value');

      if (error) throw error;

      const newSettings: Partial<ConversionSettings> = {};
      data?.forEach((s) => {
        switch (s.setting_key) {
          case 'credit_to_diamond_rate':
            newSettings.creditToDiamondRate = parseFloat(s.setting_value) || 10;
            break;
          case 'diamond_to_credit_rate':
            newSettings.diamondToCreditRate = parseFloat(s.setting_value) || 10;
            break;
          case 'ai_credit_to_cash_rate':
            newSettings.aiCreditToCashRate = parseFloat(s.setting_value) || 0.10;
            break;
          case 'ai_credit_to_diamond_conversion_rate':
            newSettings.aiCreditToDiamondRate = parseFloat(s.setting_value) || 5;
            break;
          case 'ai_credit_to_game_credit_rate':
            newSettings.aiCreditToGameCreditRate = parseFloat(s.setting_value) || 1;
            break;
          case 'conversion_fee_percent':
            newSettings.conversionFeePercent = parseFloat(s.setting_value) || 5;
            break;
          case 'diamond_base_price':
            newSettings.diamondBasePrice = parseFloat(s.setting_value) || 10;
            break;
          case 'enable_credit_to_diamond':
            newSettings.enableCreditToDiamond = s.setting_value === 'true';
            break;
          case 'enable_diamond_to_credit':
            newSettings.enableDiamondToCredit = s.setting_value === 'true';
            break;
          case 'enable_ai_credit_to_cash':
            newSettings.enableAiCreditToCash = s.setting_value === 'true';
            break;
          case 'enable_ai_credit_to_diamond':
            newSettings.enableAiCreditToDiamond = s.setting_value === 'true';
            break;
          case 'enable_ai_credit_to_game_credit':
            newSettings.enableAiCreditToGameCredit = s.setting_value === 'true';
            break;
          case 'enable_cash_to_diamond':
            newSettings.enableCashToDiamond = s.setting_value === 'true';
            break;
          case 'enable_cash_to_credit':
            newSettings.enableCashToCredit = s.setting_value === 'true';
            break;
          case 'enable_diamond_to_cash':
            newSettings.enableDiamondToCash = s.setting_value === 'true';
            break;
          case 'enable_credit_to_cash':
            newSettings.enableCreditToCash = s.setting_value === 'true';
            break;
        }
      });

      setSettings((prev) => ({ ...prev, ...newSettings }));
    } catch (error) {
      console.error('Error fetching conversion settings:', error);
    }
  }, []);

  const fetchBalances = useCallback(async () => {
    if (!user) return;

    try {
      const [profileResult, walletResult, aiCreditsResult, cashWalletResult] = await Promise.all([
        supabase.from('profiles').select('credits').eq('id', user.id).single(),
        supabase.from('treasure_wallet').select('diamonds').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_ai_credits').select('total_credits').eq('user_id', user.id).maybeSingle(),
        supabase.from('cash_wallets').select('balance').eq('user_id', user.id).maybeSingle(),
      ]);

      setBalances({
        credits: profileResult.data?.credits || 0,
        diamonds: walletResult.data?.diamonds || 0,
        aiCredits: aiCreditsResult.data?.total_credits || 0,
        cashBalance: cashWalletResult.data?.balance || 0,
      });
    } catch (error) {
      console.error('Error fetching balances:', error);
    }
  }, [user]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchSettings(), fetchBalances()]);
      setLoading(false);
    };
    init();
  }, [fetchSettings, fetchBalances]);

  // Calculate conversion with fee
  const calculateConversion = (amount: number, rate: number, isMultiply: boolean = true) => {
    const fee = (amount * settings.conversionFeePercent) / 100;
    const amountAfterFee = amount - fee;
    return isMultiply ? amountAfterFee * rate : amountAfterFee / rate;
  };

  // Credit to Diamond conversion
  const convertCreditsToDiamonds = async (creditAmount: number) => {
    if (!user || !settings.enableCreditToDiamond) {
      toast.error('Credit to diamond conversion is disabled');
      return false;
    }

    // Fetch fresh balances before conversion
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .single();
    
    const currentCredits = currentProfile?.credits || 0;

    if (creditAmount > currentCredits) {
      toast.error('Insufficient credits');
      return false;
    }

    const diamondsToReceive = Math.floor(calculateConversion(creditAmount, 1 / settings.creditToDiamondRate, true));
    
    if (diamondsToReceive < 1) {
      toast.error('Amount too small to convert');
      return false;
    }

    setConverting(true);
    try {
      // Deduct credits using fresh value
      const { error: creditError } = await supabase
        .from('profiles')
        .update({ credits: currentCredits - creditAmount })
        .eq('id', user.id);

      if (creditError) throw creditError;

      // Add diamonds - fetch current first
      const { data: wallet } = await supabase
        .from('treasure_wallet')
        .select('diamonds')
        .eq('user_id', user.id)
        .maybeSingle();

      if (wallet) {
        const { error: diamondError } = await supabase
          .from('treasure_wallet')
          .update({ diamonds: (wallet.diamonds || 0) + diamondsToReceive })
          .eq('user_id', user.id);
        if (diamondError) throw diamondError;
      } else {
        const { error: insertError } = await supabase
          .from('treasure_wallet')
          .insert({ user_id: user.id, diamonds: diamondsToReceive });
        if (insertError) throw insertError;
      }

      toast.success(`Converted ${creditAmount} credits to ${diamondsToReceive} diamonds`);
      await fetchBalances();
      return true;
    } catch (error) {
      console.error('Conversion error:', error);
      toast.error('Failed to convert credits');
      return false;
    } finally {
      setConverting(false);
    }
  };

  // Diamond to Credit conversion
  const convertDiamondsToCredits = async (diamondAmount: number) => {
    if (!user || !settings.enableDiamondToCredit) {
      toast.error('Diamond to credit conversion is disabled');
      return false;
    }

    // Fetch fresh diamond balance
    const { data: currentWallet } = await supabase
      .from('treasure_wallet')
      .select('diamonds')
      .eq('user_id', user.id)
      .maybeSingle();
    
    const currentDiamonds = currentWallet?.diamonds || 0;

    if (diamondAmount > currentDiamonds) {
      toast.error('Insufficient diamonds');
      return false;
    }

    const creditsToReceive = Math.floor(calculateConversion(diamondAmount, settings.diamondToCreditRate));

    if (creditsToReceive < 1) {
      toast.error('Amount too small to convert');
      return false;
    }

    setConverting(true);
    try {
      // Deduct diamonds using fresh value
      const { error: diamondError } = await supabase
        .from('treasure_wallet')
        .update({ diamonds: currentDiamonds - diamondAmount })
        .eq('user_id', user.id);

      if (diamondError) throw diamondError;

      // Fetch fresh credit balance
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', user.id)
        .single();

      const currentCredits = currentProfile?.credits || 0;

      // Add credits using fresh value
      const { error: creditError } = await supabase
        .from('profiles')
        .update({ credits: currentCredits + creditsToReceive })
        .eq('id', user.id);

      if (creditError) throw creditError;

      toast.success(`Converted ${diamondAmount} diamonds to ${creditsToReceive} credits`);
      await fetchBalances();
      return true;
    } catch (error) {
      console.error('Conversion error:', error);
      toast.error('Failed to convert diamonds');
      return false;
    } finally {
      setConverting(false);
    }
  };

  // AI Credit to Cash conversion (adds to cash wallet balance)
  const convertAiCreditsToCash = async (aiCreditAmount: number) => {
    if (!user || !settings.enableAiCreditToCash) {
      toast.error('AI credit to cash conversion is disabled');
      return false;
    }

    // Fetch fresh AI credit balance
    const { data: currentAiCredits } = await supabase
      .from('user_ai_credits')
      .select('total_credits')
      .eq('user_id', user.id)
      .maybeSingle();

    const aiCreditsAvailable = currentAiCredits?.total_credits || 0;

    if (aiCreditAmount > aiCreditsAvailable) {
      toast.error('Insufficient AI credits');
      return false;
    }

    const cashToReceive = calculateConversion(aiCreditAmount, settings.aiCreditToCashRate);

    if (cashToReceive < 1) {
      toast.error('Amount too small to convert');
      return false;
    }

    setConverting(true);
    try {
      // Deduct AI credits using fresh value
      const { error: aiError } = await supabase
        .from('user_ai_credits')
        .update({ total_credits: aiCreditsAvailable - aiCreditAmount })
        .eq('user_id', user.id);

      if (aiError) throw aiError;

      // Add to cash wallet balance
      const { data: cashWallet } = await supabase
        .from('cash_wallets')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cashWallet) {
        const { error: cashError } = await supabase
          .from('cash_wallets')
          .update({ balance: cashWallet.balance + cashToReceive })
          .eq('user_id', user.id);
        if (cashError) throw cashError;
      } else {
        const { error: insertError } = await supabase
          .from('cash_wallets')
          .insert({ user_id: user.id, balance: cashToReceive });
        if (insertError) throw insertError;
      }

      toast.success(`Converted ${aiCreditAmount} AI credits to ₱${cashToReceive.toFixed(2)}`);
      await fetchBalances();
      return true;
    } catch (error) {
      console.error('Conversion error:', error);
      toast.error('Failed to convert AI credits');
      return false;
    } finally {
      setConverting(false);
    }
  };

  // AI Credit to Diamond conversion
  const convertAiCreditsToDiamonds = async (aiCreditAmount: number) => {
    if (!user || !settings.enableAiCreditToDiamond) {
      toast.error('AI credit to diamond conversion is disabled');
      return false;
    }

    // Fetch fresh AI credit balance
    const { data: currentAiCredits } = await supabase
      .from('user_ai_credits')
      .select('total_credits')
      .eq('user_id', user.id)
      .maybeSingle();

    const aiCreditsAvailable = currentAiCredits?.total_credits || 0;

    if (aiCreditAmount > aiCreditsAvailable) {
      toast.error('Insufficient AI credits');
      return false;
    }

    const diamondsToReceive = Math.floor(calculateConversion(aiCreditAmount, 1 / settings.aiCreditToDiamondRate, true));

    if (diamondsToReceive < 1) {
      toast.error('Amount too small to convert');
      return false;
    }

    setConverting(true);
    try {
      // Deduct AI credits using fresh value
      const { error: aiError } = await supabase
        .from('user_ai_credits')
        .update({ total_credits: aiCreditsAvailable - aiCreditAmount })
        .eq('user_id', user.id);

      if (aiError) throw aiError;

      // Add diamonds - fetch current first
      const { data: wallet } = await supabase
        .from('treasure_wallet')
        .select('diamonds')
        .eq('user_id', user.id)
        .maybeSingle();

      if (wallet) {
        const { error: diamondError } = await supabase
          .from('treasure_wallet')
          .update({ diamonds: (wallet.diamonds || 0) + diamondsToReceive })
          .eq('user_id', user.id);
        if (diamondError) throw diamondError;
      } else {
        const { error: insertError } = await supabase
          .from('treasure_wallet')
          .insert({ user_id: user.id, diamonds: diamondsToReceive });
        if (insertError) throw insertError;
      }

      toast.success(`Converted ${aiCreditAmount} AI credits to ${diamondsToReceive} diamonds`);
      await fetchBalances();
      return true;
    } catch (error) {
      console.error('Conversion error:', error);
      toast.error('Failed to convert AI credits');
      return false;
    } finally {
      setConverting(false);
    }
  };

  // AI Credit to Game Credit conversion
  const convertAiCreditsToGameCredits = async (aiCreditAmount: number) => {
    if (!user || !settings.enableAiCreditToGameCredit) {
      toast.error('AI credit to game credit conversion is disabled');
      return false;
    }

    // Fetch fresh AI credit balance
    const { data: currentAiCredits } = await supabase
      .from('user_ai_credits')
      .select('total_credits')
      .eq('user_id', user.id)
      .maybeSingle();

    const aiCreditsAvailable = currentAiCredits?.total_credits || 0;

    if (aiCreditAmount > aiCreditsAvailable) {
      toast.error('Insufficient AI credits');
      return false;
    }

    const gameCreditsToReceive = Math.floor(calculateConversion(aiCreditAmount, settings.aiCreditToGameCreditRate));

    if (gameCreditsToReceive < 1) {
      toast.error('Amount too small to convert');
      return false;
    }

    setConverting(true);
    try {
      // Deduct AI credits using fresh value
      const { error: aiError } = await supabase
        .from('user_ai_credits')
        .update({ total_credits: aiCreditsAvailable - aiCreditAmount })
        .eq('user_id', user.id);

      if (aiError) throw aiError;

      // Fetch fresh credit balance
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', user.id)
        .single();

      const currentCredits = currentProfile?.credits || 0;

      // Add game credits using fresh value
      const { error: creditError } = await supabase
        .from('profiles')
        .update({ credits: currentCredits + gameCreditsToReceive })
        .eq('id', user.id);

      if (creditError) throw creditError;

      toast.success(`Converted ${aiCreditAmount} AI credits to ${gameCreditsToReceive} game credits`);
      await fetchBalances();
      return true;
    } catch (error) {
      console.error('Conversion error:', error);
      toast.error('Failed to convert AI credits');
      return false;
    } finally {
      setConverting(false);
    }
  };

  // Cash to Diamond conversion
  const convertCashToDiamonds = async (cashAmount: number) => {
    if (!user || !settings.enableCashToDiamond) {
      toast.error('Cash to diamond conversion is disabled');
      return false;
    }

    // Fetch fresh cash balance
    const { data: currentCashWallet } = await supabase
      .from('cash_wallets')
      .select('balance')
      .eq('user_id', user.id)
      .maybeSingle();

    const cashAvailable = currentCashWallet?.balance || 0;

    if (cashAmount > cashAvailable) {
      toast.error('Insufficient cash balance');
      return false;
    }

    const diamondsToReceive = Math.floor(calculateConversion(cashAmount, 1 / settings.diamondBasePrice, true));

    if (diamondsToReceive < 1) {
      toast.error('Amount too small to convert');
      return false;
    }

    setConverting(true);
    try {
      // Deduct cash
      const { error: cashError } = await supabase
        .from('cash_wallets')
        .update({ balance: cashAvailable - cashAmount })
        .eq('user_id', user.id);

      if (cashError) throw cashError;

      // Add diamonds
      const { data: wallet } = await supabase
        .from('treasure_wallet')
        .select('diamonds')
        .eq('user_id', user.id)
        .maybeSingle();

      if (wallet) {
        const { error: diamondError } = await supabase
          .from('treasure_wallet')
          .update({ diamonds: (wallet.diamonds || 0) + diamondsToReceive })
          .eq('user_id', user.id);
        if (diamondError) throw diamondError;
      } else {
        const { error: insertError } = await supabase
          .from('treasure_wallet')
          .insert({ user_id: user.id, diamonds: diamondsToReceive });
        if (insertError) throw insertError;
      }

      toast.success(`Converted ₱${cashAmount} to ${diamondsToReceive} diamonds`);
      await fetchBalances();
      return true;
    } catch (error) {
      console.error('Conversion error:', error);
      toast.error('Failed to convert cash to diamonds');
      return false;
    } finally {
      setConverting(false);
    }
  };

  // Cash to Credits conversion
  const convertCashToCredits = async (cashAmount: number) => {
    if (!user || !settings.enableCashToCredit) {
      toast.error('Cash to credit conversion is disabled');
      return false;
    }

    // Fetch fresh cash balance
    const { data: currentCashWallet } = await supabase
      .from('cash_wallets')
      .select('balance')
      .eq('user_id', user.id)
      .maybeSingle();

    const cashAvailable = currentCashWallet?.balance || 0;

    if (cashAmount > cashAvailable) {
      toast.error('Insufficient cash balance');
      return false;
    }

    // Convert cash to diamonds first, then diamonds to credits
    const creditsToReceive = Math.floor(calculateConversion(cashAmount, settings.diamondToCreditRate / settings.diamondBasePrice, true));

    if (creditsToReceive < 1) {
      toast.error('Amount too small to convert');
      return false;
    }

    setConverting(true);
    try {
      // Deduct cash
      const { error: cashError } = await supabase
        .from('cash_wallets')
        .update({ balance: cashAvailable - cashAmount })
        .eq('user_id', user.id);

      if (cashError) throw cashError;

      // Fetch fresh credit balance and add
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', user.id)
        .single();

      const currentCredits = currentProfile?.credits || 0;

      const { error: creditError } = await supabase
        .from('profiles')
        .update({ credits: currentCredits + creditsToReceive })
        .eq('id', user.id);

      if (creditError) throw creditError;

      toast.success(`Converted ₱${cashAmount} to ${creditsToReceive} credits`);
      await fetchBalances();
      return true;
    } catch (error) {
      console.error('Conversion error:', error);
      toast.error('Failed to convert cash to credits');
      return false;
    } finally {
      setConverting(false);
    }
  };

  // Diamond to Cash conversion
  const convertDiamondsToCash = async (diamondAmount: number) => {
    if (!user || !settings.enableDiamondToCash) {
      toast.error('Diamond to cash conversion is disabled');
      return false;
    }

    // Fetch fresh diamond balance
    const { data: currentWallet } = await supabase
      .from('treasure_wallet')
      .select('diamonds')
      .eq('user_id', user.id)
      .maybeSingle();

    const currentDiamonds = currentWallet?.diamonds || 0;

    if (diamondAmount > currentDiamonds) {
      toast.error('Insufficient diamonds');
      return false;
    }

    const cashToReceive = calculateConversion(diamondAmount, settings.diamondBasePrice);

    if (cashToReceive < 1) {
      toast.error('Amount too small to convert');
      return false;
    }

    setConverting(true);
    try {
      // Deduct diamonds
      const { error: diamondError } = await supabase
        .from('treasure_wallet')
        .update({ diamonds: currentDiamonds - diamondAmount })
        .eq('user_id', user.id);

      if (diamondError) throw diamondError;

      // Add to cash wallet
      const { data: cashWallet } = await supabase
        .from('cash_wallets')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cashWallet) {
        const { error: cashError } = await supabase
          .from('cash_wallets')
          .update({ balance: cashWallet.balance + cashToReceive })
          .eq('user_id', user.id);
        if (cashError) throw cashError;
      } else {
        const { error: insertError } = await supabase
          .from('cash_wallets')
          .insert({ user_id: user.id, balance: cashToReceive });
        if (insertError) throw insertError;
      }

      toast.success(`Converted ${diamondAmount} diamonds to ₱${cashToReceive.toFixed(2)}`);
      await fetchBalances();
      return true;
    } catch (error) {
      console.error('Conversion error:', error);
      toast.error('Failed to convert diamonds to cash');
      return false;
    } finally {
      setConverting(false);
    }
  };

  // Credit to Cash conversion
  const convertCreditsToCash = async (creditAmount: number) => {
    if (!user || !settings.enableCreditToCash) {
      toast.error('Credit to cash conversion is disabled');
      return false;
    }

    // Fetch fresh credit balance
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .single();

    const currentCredits = currentProfile?.credits || 0;

    if (creditAmount > currentCredits) {
      toast.error('Insufficient credits');
      return false;
    }

    // Credits → Diamonds → Cash 
    const cashToReceive = calculateConversion(creditAmount, settings.diamondBasePrice / settings.diamondToCreditRate);

    if (cashToReceive < 1) {
      toast.error('Amount too small to convert');
      return false;
    }

    setConverting(true);
    try {
      // Deduct credits
      const { error: creditError } = await supabase
        .from('profiles')
        .update({ credits: currentCredits - creditAmount })
        .eq('id', user.id);

      if (creditError) throw creditError;

      // Add to cash wallet
      const { data: cashWallet } = await supabase
        .from('cash_wallets')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cashWallet) {
        const { error: cashError } = await supabase
          .from('cash_wallets')
          .update({ balance: cashWallet.balance + cashToReceive })
          .eq('user_id', user.id);
        if (cashError) throw cashError;
      } else {
        const { error: insertError } = await supabase
          .from('cash_wallets')
          .insert({ user_id: user.id, balance: cashToReceive });
        if (insertError) throw insertError;
      }

      toast.success(`Converted ${creditAmount} credits to ₱${cashToReceive.toFixed(2)}`);
      await fetchBalances();
      return true;
    } catch (error) {
      console.error('Conversion error:', error);
      toast.error('Failed to convert credits to cash');
      return false;
    } finally {
      setConverting(false);
    }
  };

  // Preview calculations (with fee)
  const previewCreditsToDiamonds = (credits: number) => 
    Math.floor(calculateConversion(credits, 1 / settings.creditToDiamondRate, true));
  
  const previewDiamondsToCredits = (diamonds: number) => 
    Math.floor(calculateConversion(diamonds, settings.diamondToCreditRate));
  
  const previewAiCreditsToCash = (aiCredits: number) => 
    calculateConversion(aiCredits, settings.aiCreditToCashRate);
  
  const previewAiCreditsToDiamonds = (aiCredits: number) => 
    Math.floor(calculateConversion(aiCredits, 1 / settings.aiCreditToDiamondRate, true));
  
  const previewAiCreditsToGameCredits = (aiCredits: number) => 
    Math.floor(calculateConversion(aiCredits, settings.aiCreditToGameCreditRate));

  const previewCashToDiamonds = (cash: number) =>
    Math.floor(calculateConversion(cash, 1 / settings.diamondBasePrice, true));

  const previewCashToCredits = (cash: number) =>
    Math.floor(calculateConversion(cash, settings.diamondToCreditRate / settings.diamondBasePrice, true));

  const previewDiamondsToCash = (diamonds: number) =>
    calculateConversion(diamonds, settings.diamondBasePrice);

  const previewCreditsToCash = (credits: number) =>
    calculateConversion(credits, settings.diamondBasePrice / settings.diamondToCreditRate);

  return {
    settings,
    balances,
    loading,
    converting,
    refetch: () => Promise.all([fetchSettings(), fetchBalances()]),
    // Conversion functions
    convertCreditsToDiamonds,
    convertDiamondsToCredits,
    convertAiCreditsToCash,
    convertAiCreditsToDiamonds,
    convertAiCreditsToGameCredits,
    convertCashToDiamonds,
    convertCashToCredits,
    convertDiamondsToCash,
    convertCreditsToCash,
    // Preview functions
    previewCreditsToDiamonds,
    previewDiamondsToCredits,
    previewAiCreditsToCash,
    previewAiCreditsToDiamonds,
    previewAiCreditsToGameCredits,
    previewCashToDiamonds,
    previewCashToCredits,
    previewDiamondsToCash,
    previewCreditsToCash,
  };
}
