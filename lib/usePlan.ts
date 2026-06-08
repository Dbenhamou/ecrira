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

      const postsCount = data.posts_count_this_month ?? 0;
      const plan: Plan = data.plan === 'pro' ? 'pro' : 'free';
      const isPro = plan === 'pro';
      // Free = 5 posts à vie (pas de reset)
      const canGenerate = isPro || postsCount < 5;

      setState({ plan, isPro, postsThisMonth: postsCount, canGenerate, loading: false });
    };

    fetchPlan();
  }, [userId]);

  return state;
}
