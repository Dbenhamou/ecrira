import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../lib/auth-helper'
import { rateLimitHit } from '../../lib/rateLimit'
import { generateIdeas, saveTopicHistory, replaceDailyIdeas, IDEAS_PER_DAY } from '../../lib/ideas'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Generation manuelle (bouton "Generer des idees" ou premiere ouverture du jour).
// Meme moteur que le cron du matin.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const userId = await requireAuth(req, res)
  if (!userId) return

  if (!(await rateLimitHit('ideas:' + userId, 10, 3600))) {
    return res.status(429).json({ error: 'RATE_LIMIT', message: "Limite de 10 générations d'idées par heure atteinte." })
  }

  const { profile, pastTitles } = req.body || {}
  if (profile?.role && String(profile.role).length > 200) return res.status(400).json({ error: 'Profil invalide' })

  try {
    const titles = Array.isArray(pastTitles) ? pastTitles.filter((t: any) => typeof t === 'string').slice(0, 20) : []
    const { ideas, newsCount } = await generateIdeas({ supabase, userId, profile, count: IDEAS_PER_DAY, pastTitles: titles })
    if (!ideas.length) return res.status(500).json({ error: 'Aucune idée générée' })

    await replaceDailyIdeas(supabase, userId, ideas)
    saveTopicHistory(supabase, userId, ideas)

    res.status(200).json({ ideas, hasNews: newsCount > 0, newsCount })
  } catch (err) {
    console.error('[ideas]', err)
    res.status(500).json({ error: 'Erreur génération idées' })
  }
}
