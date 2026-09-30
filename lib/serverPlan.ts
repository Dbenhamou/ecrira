// lib/serverPlan.ts
// Verification du plan cote serveur, a partir de la base (jamais du navigateur).
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const PAID_PLANS = ['pro', 'pro_agency']

export async function isProUser(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('plan, trial_ends_at')
    .eq('id', userId)
    .single()
  if (!data) return false
  if (PAID_PLANS.includes(data.plan)) return true
  return data.plan === 'trial' && !!data.trial_ends_at && new Date(data.trial_ends_at) > new Date()
}
