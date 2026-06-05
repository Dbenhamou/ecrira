import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export type Plan = 'free' | 'pro';

export interface PlanState {
  plan: Plan;
  isPro: boolean;
  postsThisMonth: number;
  canGenerate: boolean;
  loading: boolean;
}

export function usePlan(userId: string | null): PlanState {
  const [state, setState] = useState<PlanState>({
    plan: 'free',
    isPro: false,
    postsThisMonth: 0,
    canGenerate: true,
    loading: true,
  });

  useEffect(() => {
    if (!userId) return;

    const fetchPlan = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('plan, posts_count_this_month, posts_count_reset_at')
        .eq('id', userId)
        .single();

      if (!data) return;

      // Reset mensuel si besoin
      const resetAt = new Date(data.posts_count_reset_at);
      const now = new Date();
      const diffDays = (now.getTime() - resetAt.getTime()) / (1000 * 60 * 60 * 24);

      let postsCount = data.posts_count_this_month ?? 0;

      if (diffDays > 30) {
        await supabase.from('profiles').update({
          posts_count_this_month: 0,
          posts_count_reset_at: now.toISOString(),
        }).eq('id', userId);
        postsCount = 0;
      }

      const plan: Plan = data.plan === 'pro' ? 'pro' : 'free';
      const isPro = plan === 'pro';
      const canGenerate = isPro || postsCount < 3;

      setState({ plan, isPro, postsThisMonth: postsCount, canGenerate, loading: false });
    };

    fetchPlan();
  }, [userId]);

  return state;
}
