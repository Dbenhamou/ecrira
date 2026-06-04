import type { NextApiRequest, NextApiResponse } from 'next'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Client serveur (pas exposé au navigateur)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Sécurité : seul Vercel Cron peut appeler cette route
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Non autorisé' })
  }

  try {
    // Récupère tous les utilisateurs
    const { data: profiles } = await supabase.from('profiles').select('*')
    if (!profiles?.length) return res.status(200).json({ message: 'Aucun utilisateur' })

    // Actualités cyber du jour
    let news = ''
    try {
      const newsRes = await fetch(
        `https://newsapi.org/v2/everything?q=cybersecurity+ransomware+vulnerability&language=fr&sortBy=publishedAt&pageSize=5&apiKey=${process.env.NEWS_API_KEY}`
      )
      const newsData = await newsRes.json()
      news = newsData.articles?.map((a: { title: string }) => `- ${a.title}`).join('\n') || ''
    } catch {}

    // Génère des idées pour chaque utilisateur
    for (const profile of profiles) {
      const prompt = `${news ? `Actualités du jour :\n${news}\n\n` : ''}
Génère 5 idées de posts LinkedIn pour ${profile.role || 'un expert'} en ${profile.sector || 'cybersécurité'}.
Format JSON : [{"topic":"...","title":"...","hook":"..."}]
JSON uniquement.`

      const message = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      })

      const raw = (message.content[0] as { text: string }).text
      const ideas = JSON.parse(raw.replace(/```json|```/g, '').trim())

      // Supprime les idées d'hier pour cet utilisateur
      await supabase
        .from('daily_ideas')
        .delete()
        .eq('user_id', profile.id)
        .lt('generated_at', new Date().toISOString().split('T')[0])

      // Insère les nouvelles idées
      await supabase.from('daily_ideas').insert(
        ideas.map((idea: { topic: string; title: string; hook: string }) => ({
          user_id: profile.id,
          ...idea,
          generated_at: new Date().toISOString().split('T')[0],
        }))
      )
    }

    res.status(200).json({ message: `Idées générées pour ${profiles.length} utilisateur(s)` })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur cron' })
  }
}
