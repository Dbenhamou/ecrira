import type { NextApiRequest, NextApiResponse } from 'next'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const rateLimitMap = new Map<string, number>()

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
