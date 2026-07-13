import type { NextApiRequest, NextApiResponse } from 'next'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { sendNotification } from '../../lib/notify'

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

    // Génère des idées pour chaque utilisateur — adaptées à SON secteur
    for (const profile of profiles) {
      const sector = (profile.sector || '').trim()
      const role = (profile.role || '').trim()
      const company = (profile.company || '').trim()
      const audience = (profile.audience || '').trim()

      // Actualités du jour spécifiques au secteur de l'utilisateur
      let news = ''
      if (sector) {
        try {
          const query = encodeURIComponent(sector)
          const newsRes = await fetch(
            `https://newsapi.org/v2/everything?q=${query}&language=fr&sortBy=publishedAt&pageSize=5&apiKey=${process.env.NEWS_API_KEY}`
          )
          const newsData = await newsRes.json()
          news = newsData.articles?.map((a: { title: string }) => `- ${a.title}`).join('\n') || ''
        } catch {}
      }

      // Anti-répétition : récupère les titres des 3 derniers jours
      const { data: recentIdeas } = await supabase
        .from('daily_ideas')
        .select('title')
        .eq('user_id', profile.id)
        .order('generated_at', { ascending: false })
        .limit(15)
      const recentTitles = (recentIdeas || []).map((i: { title: string }) => i.title).join('\n')

      // Profil de l'utilisateur pour contextualiser
      const profilLines = [
        role ? `Rôle : ${role}` : '',
        sector ? `Secteur : ${sector}` : '',
        company ? `Entreprise : ${company}` : '',
        audience ? `Audience cible : ${audience}` : '',
      ].filter(Boolean).join('\n')

      const prompt = `Tu es un expert en création de contenu LinkedIn. Génère 5 idées de posts VARIÉES et PERTINENTES pour ce professionnel.

PROFIL :
${profilLines || 'Professionnel (secteur non précisé — reste généraliste et pertinent)'}

${news ? `ACTUALITÉS RÉCENTES DU SECTEUR :\n${news}\n` : ''}
${recentTitles ? `IDÉES DÉJÀ PROPOSÉES CES DERNIERS JOURS (à NE PAS répéter, trouve des angles différents) :\n${recentTitles}\n` : ''}
RÈGLES :
- Les 5 idées doivent couvrir des ANGLES DIFFÉRENTS. Utilise une variété parmi : un chiffre ou une statistique marquante, une opinion tranchée ou contre-intuitive, une erreur commune du secteur, une histoire ou un retour d'expérience, une tendance émergente, une question qui fait réfléchir, un mythe à déconstruire, un conseil actionnable.
- Chaque idée doit être DIRECTEMENT liée au secteur et au rôle du professionnel ci-dessus.
- Reste concret et spécifique au métier — évite les banalités génériques.
- Ton professionnel mais accrocheur, adapté à LinkedIn.

Format JSON strict : [{"topic":"sujet court","title":"titre accrocheur","hook":"phrase d'accroche percutante"}]
Réponds UNIQUEMENT avec le JSON, sans markdown.`

      const message = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
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
