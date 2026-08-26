import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Rate-limiting persistant, partagé entre les instances serverless (Postgres).
// Fail-open : en cas d'erreur DB, on autorise — le produit ne casse jamais
// à cause du limiteur.
export async function rateLimitHit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin.rpc('rl_hit', {
      p_key: key,
      p_limit: limit,
      p_window: windowSeconds,
    })
    if (error) {
      console.error('[rateLimit] rpc error (fail-open):', error.message)
      return true
    }
    return data === true
  } catch (e) {
    console.error('[rateLimit] exception (fail-open):', e)
    return true
  }
}
