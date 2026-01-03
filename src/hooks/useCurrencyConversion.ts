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

interface ConversionResult {
  success: boolean;
  error?: string;
  new_diamonds?: number;
  new_credits?: number;
  new_cash?: number;
  new_ai_credits?: number;
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

  // Credit to Diamond conversion - using database function
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
      const { data, error } = await supabase.rpc('convert_credits_to_diamonds', {
        p_user_id: user.id,
        p_credit_amount: creditAmount,
        p_diamonds_to_receive: diamondsToReceive
      });

      if (error) throw error;

      const result = data as unknown as ConversionResult;
      if (!result?.success) {
        toast.error(result?.error || 'Conversion failed');
        return false;
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

  // Diamond to Credit conversion - using database function
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
      const { data, error } = await supabase.rpc('convert_diamonds_to_credits', {
        p_user_id: user.id,
        p_diamond_amount: diamondAmount,
        p_credits_to_receive: creditsToReceive
      });

      if (error) throw error;

      const result = data as unknown as ConversionResult;
      if (!result?.success) {
        toast.error(result?.error || 'Conversion failed');
        return false;
      }

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

  // AI Credit to Cash conversion - using database function
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
      const { data, error } = await supabase.rpc('convert_ai_credits_to_cash', {
        p_user_id: user.id,
        p_ai_credit_amount: aiCreditAmount,
        p_cash_to_receive: cashToReceive
      });

      if (error) throw error;

      const result = data as unknown as ConversionResult;
      if (!result?.success) {
        toast.error(result?.error || 'Conversion failed');
        return false;
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

  // AI Credit to Diamond conversion - using database function
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
      const { data, error } = await supabase.rpc('convert_ai_credits_to_diamonds', {
        p_user_id: user.id,
        p_ai_credit_amount: aiCreditAmount,
        p_diamonds_to_receive: diamondsToReceive
      });

      if (error) throw error;

      const result = data as unknown as ConversionResult;
      if (!result?.success) {
        toast.error(result?.error || 'Conversion failed');
        return false;
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

  // AI Credit to Game Credit conversion - using database function
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
      const { data, error } = await supabase.rpc('convert_ai_credits_to_game_credits', {
        p_user_id: user.id,
        p_ai_credit_amount: aiCreditAmount,
        p_game_credits_to_receive: gameCreditsToReceive
      });

      if (error) throw error;

      const result = data as unknown as ConversionResult;
      if (!result?.success) {
        toast.error(result?.error || 'Conversion failed');
        return false;
      }

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

  // Cash to Diamond conversion - using database function
  const convertCashToDiamonds = async (cashAmount: number) => {
    if (!user || !settings.enableCashToDiamond) {
      toast.error('Cash to diamond conversion is disabled');
      return false;
    }

    if (cashAmount > balances.cashBalance) {
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
      const { data, error } = await supabase.rpc('convert_cash_to_diamonds', {
        p_user_id: user.id,
        p_cash_amount: cashAmount,
        p_diamonds_to_receive: diamondsToReceive
      });

      if (error) throw error;

      const result = data as unknown as ConversionResult;
      if (!result?.success) {
        toast.error(result?.error || 'Conversion failed');
        return false;
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

  // Cash to Credits conversion - using database function
  const convertCashToCredits = async (cashAmount: number) => {
    if (!user || !settings.enableCashToCredit) {
      toast.error('Cash to credit conversion is disabled');
      return false;
    }

    if (cashAmount > balances.cashBalance) {
      toast.error('Insufficient cash balance');
      return false;
    }

    const creditsToReceive = Math.floor(calculateConversion(cashAmount, settings.diamondToCreditRate / settings.diamondBasePrice, true));

    if (creditsToReceive < 1) {
      toast.error('Amount too small to convert');
      return false;
    }

    setConverting(true);
    try {
      const { data, error } = await supabase.rpc('convert_cash_to_credits', {
        p_user_id: user.id,
        p_cash_amount: cashAmount,
        p_credits_to_receive: creditsToReceive
      });

      if (error) throw error;

      const result = data as unknown as ConversionResult;
      if (!result?.success) {
        toast.error(result?.error || 'Conversion failed');
        return false;
      }

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

  // Diamond to Cash conversion - using database function
  const convertDiamondsToCash = async (diamondAmount: number) => {
    if (!user || !settings.enableDiamondToCash) {
      toast.error('Diamond to cash conversion is disabled');
      return false;
    }

    if (diamondAmount > balances.diamonds) {
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
      const { data, error } = await supabase.rpc('convert_diamonds_to_cash', {
        p_user_id: user.id,
        p_diamond_amount: diamondAmount,
        p_cash_to_receive: cashToReceive
      });

      if (error) throw error;

      const result = data as unknown as ConversionResult;
      if (!result?.success) {
        toast.error(result?.error || 'Conversion failed');
        return false;
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

  // Credit to Cash conversion - using database function
  const convertCreditsToCash = async (creditAmount: number) => {
    if (!user || !settings.enableCreditToCash) {
      toast.error('Credit to cash conversion is disabled');
      return false;
    }

    if (creditAmount > balances.credits) {
      toast.error('Insufficient credits');
      return false;
    }

    const cashToReceive = calculateConversion(creditAmount, settings.diamondBasePrice / settings.creditToDiamondRate);

    if (cashToReceive < 1) {
      toast.error('Amount too small to convert');
      return false;
    }

    setConverting(true);
    try {
      const { data, error } = await supabase.rpc('convert_credits_to_cash', {
        p_user_id: user.id,
        p_credit_amount: creditAmount,
        p_cash_to_receive: cashToReceive
      });

      if (error) throw error;

      const result = data as unknown as ConversionResult;
      if (!result?.success) {
        toast.error(result?.error || 'Conversion failed');
        return false;
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

  // Preview functions (no actual conversion)
  const previewCreditsToDiamonds = (creditAmount: number) => {
    return Math.floor(calculateConversion(creditAmount, 1 / settings.creditToDiamondRate, true));
  };

  const previewDiamondsToCredits = (diamondAmount: number) => {
    return Math.floor(calculateConversion(diamondAmount, settings.diamondToCreditRate));
  };

  const previewAiCreditsToCash = (aiCreditAmount: number) => {
    return calculateConversion(aiCreditAmount, settings.aiCreditToCashRate);
  };

  const previewAiCreditsToDiamonds = (aiCreditAmount: number) => {
    return Math.floor(calculateConversion(aiCreditAmount, 1 / settings.aiCreditToDiamondRate, true));
  };

  const previewAiCreditsToGameCredits = (aiCreditAmount: number) => {
    return Math.floor(calculateConversion(aiCreditAmount, settings.aiCreditToGameCreditRate));
  };

  const previewCashToDiamonds = (cashAmount: number) => {
    return Math.floor(calculateConversion(cashAmount, 1 / settings.diamondBasePrice, true));
  };

  const previewCashToCredits = (cashAmount: number) => {
    return Math.floor(calculateConversion(cashAmount, settings.diamondToCreditRate / settings.diamondBasePrice, true));
  };

  const previewDiamondsToCash = (diamondAmount: number) => {
    return calculateConversion(diamondAmount, settings.diamondBasePrice);
  };

  const previewCreditsToCash = (creditAmount: number) => {
    return calculateConversion(creditAmount, settings.diamondBasePrice / settings.creditToDiamondRate);
  };

  return {
    settings,
    balances,
    loading,
    converting,
    fetchBalances,
    convertCreditsToDiamonds,
    convertDiamondsToCredits,
    convertAiCreditsToCash,
    convertAiCreditsToDiamonds,
    convertAiCreditsToGameCredits,
    convertCashToDiamonds,
    convertCashToCredits,
    convertDiamondsToCash,
    convertCreditsToCash,
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
