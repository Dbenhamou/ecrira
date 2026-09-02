import type { NextApiRequest, NextApiResponse } from 'next'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { sendNotification } from '../../lib/notify'
import {
  THEMES,
  SATURATION_THRESHOLD,
  HISTORY_DAYS,
  buildThemeBlock,
  rankIdeas,
  type ThemeContext,
} from '../../lib/themes'
import { fetchSectorNews, formatNewsBlock } from '../../lib/news'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Client serveur (pas exposé au navigateur)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function loadThemeContext(userId: string): Promise<ThemeContext> {
  try {
    const since = new Date(Date.now() - HISTORY_DAYS * 86400_000).toISOString()

    const [hist, saved, scheduled] = await Promise.all([
      supabase.from('topic_history').select('theme').eq('user_id', userId).gte('created_at', since),
      supabase.from('saved_posts').select('topic').eq('user_id', userId).gte('created_at', since).limit(120),
      supabase.from('scheduled_posts').select('topic').eq('user_id', userId).gte('created_at', since).limit(120),
    ])

    const counts: Record<string, number> = {}
    for (const row of hist.data || []) {
      const t = (row as any).theme
      if (t) counts[t] = (counts[t] || 0) + 1
    }

    const writtenTopics = [
      ...(saved.data || []).map((r: any) => r.topic),
      ...(scheduled.data || []).map((r: any) => r.topic),
    ].filter((t: string) => t && t.trim()).slice(0, 60)

    return {
      saturated: THEMES.filter((t) => (counts[t] || 0) >= SATURATION_THRESHOLD),
      untouched: THEMES.filter((t) => !counts[t]),
      writtenTopics: Array.from(new Set(writtenTopics)),
    }
  } catch (e) {
    console.error('[cron-ideas] loadThemeContext:', e)
    return { saturated: [], untouched: [...THEMES], writtenTopics: [] }
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Sécurité : seul Vercel Cron peut appeler cette route
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Non autorisé' })
  }

  try {
    // Récupère tous les utilisateurs
    const { data: profiles } = await supabase.from('profiles').select('*')
    if (!profiles?.length) return res.status(200).json({ message: 'Aucun utilisateur' })

    // Génère des idées par batch de 3 users en parallèle
    const batchSize = 3
    for (let i = 0; i < profiles.length; i += batchSize) {
      const batch = profiles.slice(i, i + batchSize)
      await Promise.all(batch.map(async (profile: any) => {
      try {
      const sector = (profile.sector || '').trim()
      const role = (profile.role || '').trim()
      const company = (profile.company || '').trim()
      const audience = (profile.audience || '').trim()
      const keywords = (profile.keywords || profile.tech_stack || '').trim()
      const isEn = profile.lang === 'en'
      const currentYear = new Date().getFullYear()
      const writingStyle = (profile.writing_style || '').toString().trim()

      // Actualités du jour spécifiques au secteur (Google News RSS, gratuit et
      // fonctionnel en prod — remplace NewsAPI qui renvoyait 426).
      const newsArticles = await fetchSectorNews({ sector, keywords, lang: profile.lang, limit: 8 })
      const news = formatNewsBlock(newsArticles)

      // Historique thematique persistant (survit a la purge de daily_ideas)
      const themeCtx = await loadThemeContext(profile.id)
      const themeBlock = buildThemeBlock(themeCtx, isEn)

      // Adaptation au niveau de l'audience (expert / decideur / generaliste)
      const audienceIsExpert = audience.toLowerCase().match(/expert|rssi|dsi|cto|ciso|ingénieur|engineer|developer|technique|msp|mssp|analyst|architect/i)
      const audienceIsDecideur = audience.toLowerCase().match(/directeur|manager|ceo|coo|dg|pme|pmle|dirigeant|decision|business|commercial|vente/i)
      const niveau = audienceIsExpert
        ? 'Audience experte : terminologie technique précise, vrais outils, métriques concrètes.'
        : audienceIsDecideur
        ? 'Audience de décideurs : traduis en impact business (ROI, risque, coût, temps), chiffres concrets.'
        : 'Audience mixte : alterne conseils accessibles et insights plus pointus.'

      // Profil de l'utilisateur pour contextualiser
      const profilLines = [
        role ? `Rôle : ${role}` : '',
        sector ? `Secteur : ${sector}` : '',
        company ? `Entreprise : ${company}` : '',
        audience ? `Audience cible : ${audience}` : '',
        keywords ? `Mots-clés métier : ${keywords}` : '',
      ].filter(Boolean).join('\n')

      const prompt = `Tu es un expert en création de contenu LinkedIn, calibré sur les meilleurs créateurs du secteur du professionnel ci-dessous. Génère 5 idées de posts VARIÉES, CONCRÈTES et PERTINENTES.

PROFIL :
${profilLines || 'Professionnel (secteur non précisé — reste généraliste et pertinent)'}
${niveau}

ANNÉE EN COURS : ${currentYear}. Toute référence temporelle (bilan, tendances, prédictions, « cette année ») doit porter sur ${currentYear}. N'écris JAMAIS une année passée — surtout pas « 2025 », « bilan 2025 », « tendances 2025 » — sauf si le sujet demande explicitement une rétrospective.
${writingStyle ? `\nEXEMPLES DE POSTS DE L'UTILISATEUR (sa voix — inspire-toi de ses sujets récurrents et de son angle, sans les recopier) :\n${writingStyle.slice(0, 1500)}\n` : ''}
${news ? `ACTUALITÉS RÉCENTES DU SECTEUR (vrais titres — sers-t'en comme matière première) :\n${news}\n` : ''}
${themeBlock}CE QUE FONT LES MEILLEURS CRÉATEURS DU SECTEUR (reproduis ces patterns) :
- Concret et actionnable plutôt que théorique : vrais noms d'outils, incidents réels, chiffres précis, normes nommées.
- Angle tranché : une opinion claire, un mythe à casser, ou une prise contre-intuitive — jamais neutre.
- Hook de moins de 12 mots qui crée une tension immédiate.
- Varie le TYPE de hook d'une idée à l'autre : prise de position, curiosity gap, stat choc, histoire de terrain, question provocatrice, mythe déconstruit.

RÈGLE D'ANCRAGE ACTU (prioritaire quand des actus sont fournies) :
${news
  ? `- Au moins 3 des 5 idées DOIVENT partir d'un titre précis de la liste d'actus ci-dessus, et le hook doit reprendre le fait concret. N'invente aucun fait.`
  : `- Pas d'actu fraîche : compense avec des faits concrets, datés et nommés du secteur.`}

RÈGLE DE ROTATION THÉMATIQUE (prioritaire) :
- Chaque idée doit relever d'un THÈME DE FOND DIFFÉRENT. Jamais deux idées sur le même thème.
- Respecte strictement les thèmes interdits et prioritaires listés plus haut.
- Un sujet déjà publié par l'utilisateur est définitivement exclu, même reformulé.

RÈGLES :
- Chaque idée doit être DIRECTEMENT liée au secteur et au rôle du professionnel ci-dessus.
- Reste concret et spécifique au métier — évite les banalités génériques.

THÈMES AUTORISÉS (choisis-en un par idée, valeur exacte) :
${THEMES.join(', ')}

Format JSON strict : [{"topic":"sujet court","title":"titre accrocheur","hook":"phrase d'accroche percutante","angle":"plan de rédaction du post en 1 phrase : ouverture + 2-3 points + chute/CTA","theme":"un des thèmes autorisés"}]
Réponds UNIQUEMENT avec le JSON, sans markdown.`

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1600,
        messages: [{ role: 'user', content: prompt }],
      })

      const raw = (message.content[0] as { text: string }).text
      const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())
      const ideas = rankIdeas(Array.isArray(parsed) ? parsed : [], themeCtx, 5)

      // Supprime les idées d'hier pour cet utilisateur
      await supabase
        .from('daily_ideas')
        .delete()
        .eq('user_id', profile.id)
        .lt('generated_at', new Date().toISOString().split('T')[0])

      // Insère les nouvelles idées (sans le champ theme : colonne absente
      // de daily_ideas, le theme vit dans topic_history)
      await supabase.from('daily_ideas').insert(
        ideas.map((idea: any) => ({
          user_id: profile.id,
          topic: idea.topic,
          title: idea.title,
          hook: idea.hook,
          angle: idea.angle || null,
          recommended: !!idea.recommended,
          theme: idea.theme || null,
          generated_at: new Date().toISOString().split('T')[0],
        }))
      )

      // Historique persistant
      try {
        const rows = ideas
          .filter((i: any) => i && (i.topic || i.title))
          .map((i: any) => ({
            user_id: profile.id,
            theme: i.theme || null,
            topic: i.topic || null,
            title: i.title || null,
          }))
        if (rows.length) await supabase.from('topic_history').insert(rows)
      } catch (e) {
        console.error('[cron-ideas] historique', profile.id, e)
      }
      } catch (userErr) {
        console.error('[cron-ideas] Erreur user', profile.id, userErr)
      }
      }))
    }

    res.status(200).json({ message: `Idées générées pour ${profiles.length} utilisateur(s)` })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur cron' })
  }
}
