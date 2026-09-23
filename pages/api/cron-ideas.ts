import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { generateIdeas, saveTopicHistory, replaceDailyIdeas, IDEAS_PER_DAY } from '../../lib/ideas'

// Client serveur (pas expose au navigateur)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Un compte est "actif" s'il a ouvert l'app (last_seen_at) ou s'est connecte
// dans les ACTIVE_DAYS derniers jours.
const ACTIVE_DAYS = 14

async function lastSignInMap(): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  try {
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
      if (error || !data?.users?.length) break
      for (const u of data.users) {
        if (u.last_sign_in_at) map.set(u.id, new Date(u.last_sign_in_at).getTime())
      }
      if (data.users.length < 1000) break
    }
  } catch (e) {
    console.error('[cron-ideas] listUsers:', e)
  }
  return map
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Securite : seul Vercel Cron peut appeler cette route
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Non autorisé' })
  }

  try {
    const { data: profiles } = await supabase.from('profiles').select('*')
    if (!profiles?.length) return res.status(200).json({ message: 'Aucun utilisateur' })

    const since = Date.now() - ACTIVE_DAYS * 86400_000
    const signIns = await lastSignInMap()

    const targets = profiles.filter((p: any) => {
      if (!(p.sector || '').toString().trim()) return false
      const seen = p.last_seen_at ? new Date(p.last_seen_at).getTime() : 0
      const signIn = signIns.get(p.id) || 0
      return Math.max(seen, signIn) >= since
    })

    let ok = 0
    const batchSize = 3
    for (let i = 0; i < targets.length; i += batchSize) {
      const batch = targets.slice(i, i + batchSize)
      await Promise.all(batch.map(async (profile: any) => {
        try {
          const { data: prev } = await supabase.from('daily_ideas').select('title').eq('user_id', profile.id).limit(20)
          const pastTitles = (prev || []).map((r: any) => r.title).filter(Boolean)
          const { ideas } = await generateIdeas({ supabase, userId: profile.id, profile, count: IDEAS_PER_DAY, pastTitles })
          if (!ideas.length) return
          await replaceDailyIdeas(supabase, profile.id, ideas)
          await saveTopicHistory(supabase, profile.id, ideas)
          ok++
        } catch (userErr) {
          console.error('[cron-ideas] Erreur user', profile.id, userErr)
        }
      }))
    }

    res.status(200).json({ message: `Idées générées pour ${ok}/${targets.length} compte(s) actif(s) sur ${profiles.length}` })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur cron' })
  }
}
