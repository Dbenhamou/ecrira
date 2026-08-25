import type { NextApiRequest, NextApiResponse } from 'next'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Plafond global quotidien de la demo publique (protection budget API).
const DAILY_GLOBAL_LIMIT = 300

const rateLimitMap = new Map<string, number>()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Incremente le compteur du jour et indique si le plafond est atteint.
// En cas d'erreur (table absente, Supabase indisponible), on laisse passer :
// la demo ne doit jamais tomber a cause du compteur.
async function overDailyQuota(): Promise<boolean> {
  try {
    const day = new Date().toISOString().slice(0, 10)

    const { data, error } = await supabase
      .from('demo_usage')
      .select('count')
      .eq('day', day)
      .maybeSingle()

    if (error) return false

    const current = data?.count ?? 0
    if (current >= DAILY_GLOBAL_LIMIT) return true

    await supabase
      .from('demo_usage')
      .upsert({ day, count: current + 1 }, { onConflict: 'day' })

    return false
  } catch (e) {
    console.error('[demo] quota check failed (ignore):', e)
    return false
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { email, topic } = req.body
  if (!email || !topic || typeof topic !== 'string') return res.status(400).json({ error: 'Paramètres manquants' })
  if (topic.length > 200) return res.status(400).json({ error: 'Sujet trop long' })

  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || 'unknown'
  const now = Date.now()
  const last = rateLimitMap.get(ip) || 0
  if (now - last < 30_000) return res.status(429).json({ error: 'Trop de requêtes — réessayez dans 30 secondes.' })
  rateLimitMap.set(ip, now)

  if (await overDailyQuota()) {
    return res.status(429).json({ error: 'La démo est très sollicitée aujourd\'hui. Réessayez demain ou créez un compte gratuit.' })
  }

  // Capture du lead démo (non bloquant : la démo ne doit jamais casser)
  try {
    await supabase.from('demo_leads').upsert(
      { email: String(email).toLowerCase().trim(), last_topic: String(topic).slice(0, 200) },
      { onConflict: 'email' }
    )
  } catch (e) { console.error('[demo] lead capture (ignore):', e) }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: `Tu es un expert en création de contenu LinkedIn. Génère un post LinkedIn court et percutant.
Règles :
- Maximum 150 mots
- Pas de hashtags
- Pas de tirets, utilise des retours à la ligne à la place
- Commence directement par le contenu, pas de titre
- Ton authentique et direct
- Termine par une question ouverte
- Réponds UNIQUEMENT avec le post, sans commentaire`,
      messages: [{ role: 'user', content: `Génère un post LinkedIn sur le sujet : ${topic}` }],
    })

    const post = (message.content[0] as { text: string }).text.trim()
    res.status(200).json({ post })
  } catch (err) {
    console.error('[demo]', err)
    res.status(500).json({ error: 'Erreur génération' })
  }
}
