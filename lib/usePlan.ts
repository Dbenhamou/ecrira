import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export type Plan = 'free' | 'pro' | 'trial';

export interface PlanState {
  plan: Plan;
  isPro: boolean;
  postsThisMonth: number;
  canGenerate: boolean;
  trialDaysLeft: number;
  loading: boolean;
}

export function usePlan(userId: string | null): PlanState {
  const [state, setState] = useState<PlanState>({
    plan: 'free',
    isPro: false,
    postsThisMonth: 0,
    canGenerate: true,
    trialDaysLeft: 0,
    loading: true,
  });

  useEffect(() => {
    if (!userId) return;

    const fetchPlan = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('plan, posts_count_this_month, posts_count_reset_at, trial_ends_at')
        .eq('id', userId)
        .single();

      if (!data) return;

      const postsCount = data.posts_count_this_month ?? 0;
      const trialActive = data.plan === 'trial' && data.trial_ends_at && new Date(data.trial_ends_at) > new Date();
      const plan: Plan = data.plan === 'pro' ? 'pro' : trialActive ? 'trial' : 'free';
      const isPro = plan === 'pro' || plan === 'trial';
      const trialDaysLeft = trialActive ? Math.ceil((new Date(data.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;
      const canGenerate = isPro || postsCount < 5;

      setState({ plan, isPro, postsThisMonth: postsCount, canGenerate, trialDaysLeft, loading: false });
    };

    fetchPlan();

    // Refresh au focus fenêtre (ex: retour après paiement Stripe)
    const handleFocus = () => fetchPlan()
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [userId]);

  return state;
}
