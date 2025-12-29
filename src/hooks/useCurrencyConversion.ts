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
}

export interface UserBalances {
  credits: number;
  diamonds: number;
  aiCredits: number;
  walletBalance: number;
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
  });
  const [balances, setBalances] = useState<UserBalances>({
    credits: 0,
    diamonds: 0,
    aiCredits: 0,
    walletBalance: 0,
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
      const [profileResult, walletResult, aiCreditsResult] = await Promise.all([
        supabase.from('profiles').select('credits').eq('id', user.id).single(),
        supabase.from('treasure_wallet').select('diamonds').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_ai_credits').select('total_credits').eq('user_id', user.id).maybeSingle(),
      ]);

      setBalances({
        credits: profileResult.data?.credits || 0,
        diamonds: walletResult.data?.diamonds || 0,
        aiCredits: aiCreditsResult.data?.total_credits || 0,
        walletBalance: 0, // Will be fetched from user_wallets if needed
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

    if (creditAmount > balances.credits) {
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
      // Deduct credits
      await supabase
        .from('profiles')
        .update({ credits: balances.credits - creditAmount })
        .eq('id', user.id);

      // Add diamonds
      const { data: wallet } = await supabase
        .from('treasure_wallet')
        .select('diamonds')
        .eq('user_id', user.id)
        .maybeSingle();

      if (wallet) {
        await supabase
          .from('treasure_wallet')
          .update({ diamonds: (wallet.diamonds || 0) + diamondsToReceive })
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('treasure_wallet')
          .insert({ user_id: user.id, diamonds: diamondsToReceive });
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

    if (diamondAmount > balances.diamonds) {
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
      // Deduct diamonds
      await supabase
        .from('treasure_wallet')
        .update({ diamonds: balances.diamonds - diamondAmount })
        .eq('user_id', user.id);

      // Add credits
      await supabase
        .from('profiles')
        .update({ credits: balances.credits + creditsToReceive })
        .eq('id', user.id);

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

  // AI Credit to Cash conversion (adds to wallet balance)
  const convertAiCreditsToCash = async (aiCreditAmount: number) => {
    if (!user || !settings.enableAiCreditToCash) {
      toast.error('AI credit to cash conversion is disabled');
      return false;
    }

    if (aiCreditAmount > balances.aiCredits) {
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
      // Deduct AI credits
      await supabase
        .from('user_ai_credits')
        .update({ total_credits: balances.aiCredits - aiCreditAmount })
        .eq('user_id', user.id);

      // Add to wallet balance
      const { data: wallet } = await supabase
        .from('user_wallets')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();

      if (wallet) {
        await supabase
          .from('user_wallets')
          .update({ balance: wallet.balance + cashToReceive })
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('user_wallets')
          .insert({ user_id: user.id, balance: cashToReceive });
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

    if (aiCreditAmount > balances.aiCredits) {
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
      // Deduct AI credits
      await supabase
        .from('user_ai_credits')
        .update({ total_credits: balances.aiCredits - aiCreditAmount })
        .eq('user_id', user.id);

      // Add diamonds
      const { data: wallet } = await supabase
        .from('treasure_wallet')
        .select('diamonds')
        .eq('user_id', user.id)
        .maybeSingle();

      if (wallet) {
        await supabase
          .from('treasure_wallet')
          .update({ diamonds: (wallet.diamonds || 0) + diamondsToReceive })
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('treasure_wallet')
          .insert({ user_id: user.id, diamonds: diamondsToReceive });
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

    if (aiCreditAmount > balances.aiCredits) {
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
      // Deduct AI credits
      await supabase
        .from('user_ai_credits')
        .update({ total_credits: balances.aiCredits - aiCreditAmount })
        .eq('user_id', user.id);

      // Add game credits (to profiles.credits)
      await supabase
        .from('profiles')
        .update({ credits: balances.credits + gameCreditsToReceive })
        .eq('id', user.id);

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

  // Preview calculations (without fee)
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
    // Preview functions
    previewCreditsToDiamonds,
    previewDiamondsToCredits,
    previewAiCreditsToCash,
    previewAiCreditsToDiamonds,
    previewAiCreditsToGameCredits,
  };
}
