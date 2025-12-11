import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Hero, GameLevel, PlayerProgress, StoreItem, PlayerHero } from '../types';
import { toast } from 'sonner';

export const useHeroes = () => {
  return useQuery({
    queryKey: ['moba-heroes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('moba_heroes')
        .select('*')
        .eq('is_active', true)
        .order('is_starter', { ascending: false });

      if (error) throw error;

      return (data || []).map(h => ({
        id: h.id,
        name: h.name,
        slug: h.slug,
        description: h.description || '',
        role: h.role as Hero['role'],
        baseHp: h.base_hp,
        baseAttack: h.base_attack,
        baseDefense: h.base_defense,
        baseSpeed: Number(h.base_speed),
        skill1: h.skill_1 as unknown as Hero['skill1'],
        skill2: h.skill_2 as unknown as Hero['skill2'],
        ultimate: h.ultimate as unknown as Hero['ultimate'],
        spriteUrl: h.sprite_url,
        unlockCostDiamonds: h.unlock_cost_diamonds || 0,
        isStarter: h.is_starter || false,
      })) as Hero[];
    },
  });
};

export const useLevels = () => {
  return useQuery({
    queryKey: ['moba-levels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('moba_levels')
        .select('*')
        .eq('is_active', true)
        .order('level_number', { ascending: true });

      if (error) throw error;

      return (data || []).map(l => ({
        id: l.id,
        levelNumber: l.level_number,
        name: l.name,
        description: l.description || '',
        difficulty: l.difficulty as GameLevel['difficulty'],
        mapConfig: l.map_config as unknown as GameLevel['mapConfig'],
        enemyConfig: l.enemy_config as unknown as GameLevel['enemyConfig'],
        bossConfig: l.boss_config as unknown as GameLevel['bossConfig'],
        timeLimitSeconds: l.time_limit_seconds || 300,
        rewardDiamonds: l.reward_diamonds || 1,
        rewardXp: l.reward_xp || 100,
        unlockHeroId: l.unlock_hero_id,
        unlockAbility: l.unlock_ability,
        storyChapter: l.story_chapter,
        storyCutscene: l.story_cutscene as unknown as GameLevel['storyCutscene'],
        difficultyMultiplier: Number(l.difficulty_multiplier),
        minPlayerLevel: l.min_player_level || 1,
        entryCostDiamonds: l.entry_cost_diamonds || 0,
      })) as GameLevel[];
    },
  });
};

export const usePlayerProgress = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['moba-player-progress', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('moba_player_progress')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (!data) {
        const { data: newProgress, error: createError } = await supabase
          .from('moba_player_progress')
          .insert({ user_id: user.id })
          .select()
          .single();

        if (createError) throw createError;
        return {
          id: newProgress.id,
          userId: newProgress.user_id,
          currentLevel: newProgress.current_level,
          totalXp: newProgress.total_xp,
          playerLevel: newProgress.player_level,
          highestLevelCompleted: newProgress.highest_level_completed,
          totalGamesPlayed: newProgress.total_games_played,
          totalWins: newProgress.total_wins,
          totalKills: newProgress.total_kills,
          playTimeMinutes: newProgress.play_time_minutes,
        } as PlayerProgress;
      }

      return {
        id: data.id,
        userId: data.user_id,
        currentLevel: data.current_level,
        totalXp: data.total_xp,
        playerLevel: data.player_level,
        highestLevelCompleted: data.highest_level_completed,
        totalGamesPlayed: data.total_games_played,
        totalWins: data.total_wins,
        totalKills: data.total_kills,
        playTimeMinutes: data.play_time_minutes,
      } as PlayerProgress;
    },
    enabled: !!user?.id,
  });
};

export const usePlayerHeroes = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['moba-player-heroes', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('moba_player_heroes')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      return (data || []).map(h => ({
        id: h.id,
        heroId: h.hero_id,
        isFavorite: h.is_favorite,
        heroXp: h.hero_xp,
        heroLevel: h.hero_level,
        skinEquipped: h.skin_equipped,
      })) as PlayerHero[];
    },
    enabled: !!user?.id,
  });
};

export const useStoreItems = () => {
  return useQuery({
    queryKey: ['moba-store-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('moba_store_items')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      return (data || []).map(item => ({
        id: item.id,
        name: item.name,
        description: item.description || '',
        itemType: item.item_type as StoreItem['itemType'],
        effectConfig: item.effect_config as Record<string, any>,
        priceDiamonds: item.price_diamonds,
        durationSeconds: item.duration_seconds,
        iconUrl: item.icon_url,
      })) as StoreItem[];
    },
  });
};

export const useUnlockHero = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (heroId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Use upsert to handle duplicates gracefully
      const { error } = await supabase
        .from('moba_player_heroes')
        .upsert(
          { user_id: user.id, hero_id: heroId },
          { onConflict: 'user_id,hero_id', ignoreDuplicates: true }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moba-player-heroes'] });
    },
    onError: (error: any) => {
      // Silently ignore duplicate key errors for starter heroes
      if (!error.message?.includes('duplicate')) {
        toast.error(error.message || 'Failed to unlock hero');
      }
    },
  });
};

export const useRecordLevelCompletion = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      levelId: string;
      heroUsed: string;
      score: number;
      timeSeconds: number;
      starsEarned: number;
      diamondsEarned: number;
      xpEarned: number;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Record completion
      await supabase.from('moba_level_completions').insert({
        user_id: user.id,
        level_id: params.levelId,
        hero_used: params.heroUsed,
        score: params.score,
        time_seconds: params.timeSeconds,
        stars_earned: params.starsEarned,
        diamonds_earned: params.diamondsEarned,
        xp_earned: params.xpEarned,
      });

      // Update progress
      const { data: progress } = await supabase
        .from('moba_player_progress')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (progress) {
        const { data: level } = await supabase
          .from('moba_levels')
          .select('level_number')
          .eq('id', params.levelId)
          .single();

        await supabase.from('moba_player_progress').update({
          total_xp: (progress.total_xp || 0) + params.xpEarned,
          highest_level_completed: Math.max(progress.highest_level_completed || 0, level?.level_number || 0),
          total_games_played: (progress.total_games_played || 0) + 1,
          total_wins: (progress.total_wins || 0) + 1,
        }).eq('user_id', user.id);
      }

      // Award diamonds - use treasure_wallets table
      const { data: wallet } = await supabase
        .from('treasure_wallets' as any)
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (wallet) {
        await supabase.from('treasure_wallets' as any).update({
          diamonds: ((wallet as any).diamonds || 0) + params.diamondsEarned,
        }).eq('user_id', user.id);
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moba-player-progress'] });
      queryClient.invalidateQueries({ queryKey: ['treasure-wallet'] });
    },
  });
};

export const usePurchaseItem = () => {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { itemId: string; itemType: string; priceDiamonds: number }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data: wallet } = await supabase
        .from('treasure_wallets' as any)
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!wallet || ((wallet as any).diamonds || 0) < params.priceDiamonds) {
        throw new Error('Insufficient diamonds');
      }

      await supabase.from('treasure_wallets' as any).update({
        diamonds: (wallet as any).diamonds - params.priceDiamonds,
      }).eq('user_id', user.id);

      await supabase.from('moba_purchases').insert({
        user_id: user.id,
        item_id: params.itemId,
        item_type: params.itemType,
        diamonds_spent: params.priceDiamonds,
        referrer_id: profile?.referred_by || null,
      });

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treasure-wallet'] });
      toast.success('Purchase successful!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Purchase failed');
    },
  });
};
