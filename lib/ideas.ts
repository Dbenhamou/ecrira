// lib/ideas.ts
// Moteur unique de generation d'idees : utilise par le cron du matin
// (/api/cron-ideas) ET par le bouton manuel (/api/ideas).

import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  THEMES,
  THEME_WINDOW_DAYS,
  WRITTEN_WINDOW_DAYS,
  topThemes,
  rankIdeas,
  keywordsOf,
  type ThemeContext,
  type IdeaLike,
} from './themes'
import { fetchSectorNews, formatNewsBlock, type NewsArticle } from './news'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const IDEAS_PER_DAY = 10

export type GeneratedIdea = {
  topic: string
  title: string
  hook: string
  angle: string // plan en 3 lignes separees par \n (ouverture / developpement / chute)
  theme: string | null
  recommended: boolean
}

// ── Historique de l'utilisateur ──
export async function loadThemeContext(supabase: SupabaseClient, userId: string): Promise<ThemeContext> {
  const empty: ThemeContext = { avoid: [], writtenTopics: [], recentTitles: [] }
  try {
    const sinceThemes = new Date(Date.now() - THEME_WINDOW_DAYS * 86400_000).toISOString()
    const sinceWritten = new Date(Date.now() - WRITTEN_WINDOW_DAYS * 86400_000).toISOString()
    const sinceTitles = new Date(Date.now() - 7 * 86400_000).toISOString()

    const [hist, titles, saved, scheduled] = await Promise.all([
      supabase.from('topic_history').select('theme').eq('user_id', userId).gte('created_at', sinceThemes).limit(2000),
      supabase.from('topic_history').select('title').eq('user_id', userId).gte('created_at', sinceTitles).order('created_at', { ascending: false }).limit(40),
      supabase.from('saved_posts').select('topic').eq('user_id', userId).gte('created_at', sinceWritten).limit(120),
      supabase.from('scheduled_posts').select('topic').eq('user_id', userId).gte('created_at', sinceWritten).limit(120),
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

    const recentTitles = (titles.data || []).map((r: any) => r.title).filter(Boolean)

    return {
      avoid: topThemes(counts),
      writtenTopics: Array.from(new Set(writtenTopics)),
      recentTitles: Array.from(new Set(recentTitles)) as string[],
    }
  } catch (e) {
    console.error('[ideas] loadThemeContext:', e)
    return empty
  }
}

// Mots trop generiques pour juger qu'une actu concerne le metier.
const GENERIC_TERMS = new Set([
  'france', 'french', 'paris', 'europe', 'entreprise', 'entreprises', 'service', 'services',
  'gestion', 'solution', 'solutions', 'marche', 'business', 'protection', 'operation', 'professionnel',
  'professionnels', 'conseil', 'client', 'clients', 'societe', 'groupe', 'digital', 'numerique',
])
const STOP_SHORT = new Set(['de', 'la', 'le', 'les', 'des', 'du', 'et', 'en', 'un', 'une', 'pour', 'par', 'sur', 'au', 'aux', 'the', 'and', 'of', 'to', 'in', 'b2b', 'b2c'])

// Ne garde que les actus dont le titre contient au moins un terme du metier.
function relevantNews(articles: NewsArticle[], sector: string, keywords: string): NewsArticle[] {
  const terms = new Set([
    ...keywordsOf(`${sector} ${keywords}`).filter((t) => !GENERIC_TERMS.has(t)),
    // sigles courts (EDR, SOC, MSP, RH...) ignores par keywordsOf
    ...`${sector},${keywords}`.split(/[,;\s]+/).map((t) => t.trim().toLowerCase()).filter((t) => t.length >= 2 && t.length <= 4 && /^[a-z0-9]+$/.test(t) && /[a-z]/.test(t) && !STOP_SHORT.has(t)),
  ])
  if (!terms.size) return []
  return articles.filter((a) => {
    const words = new Set(
      a.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
    )
    return Array.from(terms).some((t) => words.has(t))
  })
}

// Exemples de style : 2 posts max, 700 caracteres chacun.
function styleExamples(writingStyle: any): string {
  const raw = (writingStyle || '').toString().trim()
  if (!raw) return ''
  let posts: string[] = []
  try {
    const parsed = JSON.parse(raw)
    posts = Array.isArray(parsed) ? parsed.map(String) : [raw]
  } catch {
    posts = [raw]
  }
  return posts.filter((p) => p.trim()).slice(0, 2).map((p, i) => `--- Exemple ${i + 1} ---\n${p.slice(0, 700)}`).join('\n\n')
}

function toPlan(idea: any): string {
  if (Array.isArray(idea?.plan)) {
    return idea.plan.map((s: any) => String(s).trim()).filter(Boolean).slice(0, 3).join('\n')
  }
  return (idea?.angle || idea?.plan || '').toString().trim()
}

// ── Generation ──
export async function generateIdeas(opts: {
  supabase: SupabaseClient
  userId: string
  profile: any
  count?: number
  pastTitles?: string[]
}): Promise<{ ideas: GeneratedIdea[]; newsCount: number }> {
  const { supabase, userId, profile } = opts
  const count = opts.count || IDEAS_PER_DAY

  const role = (profile?.role || 'Professionnel').toString().trim()
  const company = (profile?.company || '').toString().trim()
  const sector = (profile?.sector || '').toString().trim()
  const audience = (profile?.audience || 'Professionnels LinkedIn').toString().trim()
  const keywords = (profile?.keywords || profile?.tech_stack || '').toString().trim()
  const isEn = profile?.lang === 'en'
  const year = new Date().getFullYear()

  const [rawNews, ctx] = await Promise.all([
    fetchSectorNews({ sector, keywords, lang: profile?.lang, limit: 12 }),
    loadThemeContext(supabase, userId),
  ])
  const news = relevantNews(rawNews, sector, keywords).slice(0, 8)
  const newsBlock = formatNewsBlock(news)

  const alreadyProposed = Array.from(new Set([...(opts.pastTitles || []), ...ctx.recentTitles])).slice(0, 40)
  const allowedThemes = THEMES.filter((t) => !ctx.avoid.includes(t))
  const examples = styleExamples(profile?.writing_style)

  const system = `Tu es un stratège de contenu LinkedIn B2B. Tu proposes des idées de posts pour UN professionnel précis.
Langue de sortie : ${isEn ? 'English' : 'Français'}.

PROFIL
Rôle : ${role}${company ? ` chez ${company}` : ''}
Secteur : ${sector || 'non précisé'}
Audience : ${audience}
${keywords ? `Expertise : ${keywords}` : ''}
${examples ? `\nSES POSTS (pour comprendre ses sujets et son angle, ne pas recopier) :\n${examples}\n` : ''}`

  const user = `${newsBlock ? `ACTUALITÉS RÉCENTES DU SECTEUR :\n${newsBlock}\n\n` : ''}${alreadyProposed.length ? `DÉJÀ PROPOSÉS (ne pas reproposer, même reformulé) :\n${alreadyProposed.map((t) => `- ${t}`).join('\n')}\n\n` : ''}${ctx.writtenTopics.length ? `DÉJÀ PUBLIÉS PAR L'UTILISATEUR (exclus) :\n${ctx.writtenTopics.slice(0, 30).map((t) => `- ${t}`).join('\n')}\n\n` : ''}Propose exactement ${count} idées de posts LinkedIn. Nous sommes en ${year}.

4 RÈGLES :
1. MÉTIER : chaque idée parle directement du quotidien, des clients ou des enjeux de ce professionnel et de son audience. Rien de générique.
2. FAITS : aucun pourcentage, montant ou statistique inventé. Un chiffre n'est autorisé que s'il figure dans une actualité ci-dessus. Maximum 2 idées de type prédiction ou « ${year + 1} : ... ».
3. ACTU : ${newsBlock ? `jusqu'à 4 idées peuvent partir d'une actualité ci-dessus, uniquement si elle concerne vraiment ce métier. Ignore les actus hors sujet.` : 'pas d\'actualité disponible : reste sur du vécu terrain, des méthodes et des prises de position.'}
4. VARIÉTÉ : un thème différent par idée, et des types d'accroche variés (prise de position, histoire terrain, erreur fréquente, question, conseil concret, coulisses).

THÈMES AUTORISÉS (valeur exacte) : ${allowedThemes.join(', ')}

FORMAT DE CHAQUE IDÉE :
- "topic" : étiquette de 2 à 4 mots
- "title" : le sujet du post, 12 mots maximum
- "hook" : la première phrase du post, 20 mots maximum
- "plan" : exactement 3 éléments courts (10 mots maximum chacun), sans flèche ni symbole :
  1) l'ouverture, 2) l'idée centrale à développer, 3) la chute ou la question finale
- "theme" : un des thèmes autorisés

Classe les idées de la plus forte à la moins forte.
Réponds UNIQUEMENT avec un tableau JSON valide :
[{"topic":"...","title":"...","hook":"...","plan":["...","...","..."],"theme":"..."}]`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 3500,
    system,
    messages: [{ role: 'user', content: user }],
  })

  const raw = (message.content[0] as { text: string }).text || ''
  const clean = raw.replace(/```json|```/g, '').trim()
  const start = clean.indexOf('[')
  const end = clean.lastIndexOf(']')
  const parsed = JSON.parse(start >= 0 && end > start ? clean.slice(start, end + 1) : clean)

  const normalized: IdeaLike[] = (Array.isArray(parsed) ? parsed : [])
    .filter((i: any) => i && i.title)
    .map((i: any) => ({
      topic: String(i.topic || '').trim(),
      title: String(i.title || '').trim(),
      hook: String(i.hook || '').trim(),
      angle: toPlan(i),
      theme: (THEMES as readonly string[]).includes(i.theme) ? i.theme : undefined,
    }))

  const ranked = rankIdeas(normalized, ctx, count).slice(0, count)
  const ideas: GeneratedIdea[] = ranked.map((i) => ({
    topic: i.topic || '',
    title: i.title || '',
    hook: i.hook || '',
    angle: i.angle || '',
    theme: i.theme || null,
    recommended: !!i.recommended,
  }))

  return { ideas, newsCount: news.length }
}

// Historique persistant (non bloquant).
export async function saveTopicHistory(supabase: SupabaseClient, userId: string, ideas: GeneratedIdea[]) {
  try {
    const rows = ideas
      .filter((i) => i.topic || i.title)
      .map((i) => ({ user_id: userId, theme: i.theme, topic: i.topic || null, title: i.title || null }))
    if (rows.length) await supabase.from('topic_history').insert(rows)
  } catch (e) {
    console.error('[ideas] saveTopicHistory:', e)
  }
}

// Remplace les idees du jour de l'utilisateur.
export async function replaceDailyIdeas(supabase: SupabaseClient, userId: string, ideas: GeneratedIdea[]) {
  const now = new Date().toISOString()
  await supabase.from('daily_ideas').delete().eq('user_id', userId)
  await supabase.from('daily_ideas').insert(
    ideas.map((i) => ({
      user_id: userId,
      topic: i.topic,
      title: i.title,
      hook: i.hook,
      angle: i.angle || null,
      theme: i.theme,
      recommended: i.recommended,
      created_at: now,
      generated_at: now.slice(0, 10),
    }))
  )
}
