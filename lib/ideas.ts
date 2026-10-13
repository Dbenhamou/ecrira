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
  tooClose,
  learnOverused,
  type ThemeContext,
  type IdeaLike,
} from './themes'
import { fetchSectorNews, dedupeNews, BROAD_TERMS, type NewsArticle, type NewsDiag } from './news'
import { buildIdeasPrompt, parseIdeasResponse, parseRetainedNews, hasUnsourcedFigure, cleanIdeaText } from './ideasPrompt'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const IDEAS_PER_DAY = 10
// On en demande plus a l'IA pour pouvoir ecarter doublons et formules.
const OVERSAMPLE = 6
// Memoire des idees deja proposees (anti-repetition).
const RECENT_TITLES_DAYS = 21
// Actus : 7 derniers jours, jusqu'a 3 idees par jour (places reservees).
const NEWS_DAYS = 7
const MAX_NEWS_IDEAS = 3
// Fenetre d'apprentissage des formules / mots qui reviennent trop.
const LEARN_DAYS = 7
// En dessous de ce nombre d'idees neuves, on relance UNE fois la generation.
export const MIN_FRESH = 7

export type GeneratedIdea = {
  topic: string
  title: string
  hook: string
  angle: string // plan en 3 lignes separees par \n (ouverture / developpement / chute)
  theme: string | null
  recommended: boolean
}

// ── Historique de l'utilisateur ──
export async function loadThemeContext(supabase: SupabaseClient, userId: string, protectedText = ''): Promise<ThemeContext> {
  const empty: ThemeContext = { avoid: [], writtenTopics: [], recentTitles: [] }
  try {
    const sinceThemes = new Date(Date.now() - THEME_WINDOW_DAYS * 86400_000).toISOString()
    const sinceWritten = new Date(Date.now() - WRITTEN_WINDOW_DAYS * 86400_000).toISOString()
    const sinceTitles = new Date(Date.now() - RECENT_TITLES_DAYS * 86400_000).toISOString()

    const [hist, titles, saved, scheduled] = await Promise.all([
      supabase.from('topic_history').select('theme').eq('user_id', userId).gte('created_at', sinceThemes).limit(2000),
      supabase.from('topic_history').select('title, topic, created_at').eq('user_id', userId).gte('created_at', sinceTitles).order('created_at', { ascending: false }).limit(250),
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
    const recentTopics = (titles.data || [])
      .map((r: any) => (r.topic || '').toString().trim())
      .filter((t: string) => t && !/^(actu|news) ·/i.test(t))
    const since7 = Date.now() - LEARN_DAYS * 86400_000
    const lastWeek = (titles.data || [])
      .filter((r: any) => r.title && new Date(r.created_at).getTime() >= since7)
      .map((r: any) => r.title as string)
    const overused = learnOverused(lastWeek, protectedText)

    return {
      avoid: topThemes(counts),
      writtenTopics: Array.from(new Set(writtenTopics)),
      recentTitles: Array.from(new Set(recentTitles)) as string[],
      recentTopics: Array.from(new Set(recentTopics)) as string[],
      overusedOpeners: overused.openers,
      overusedWords: overused.words,
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
  'reseaux', 'sociaux', 'social', 'numeriques', 'digitale', 'digitales', 'plateforme', 'plateformes',
  'application', 'applications', 'communication', 'entrepreneuriat', 'innovation', 'strategie',
  'croissance', 'marketing', 'internet', 'donnees', 'technologie', 'technologies', 'performance',
  'optimisation', 'transformation', 'acceleration', 'infrastructure', 'presence', 'media', 'medias',
])
const STOP_SHORT = new Set(['de', 'la', 'le', 'les', 'des', 'du', 'et', 'en', 'un', 'une', 'pour', 'par', 'sur', 'au', 'aux', 'the', 'and', 'of', 'to', 'in', 'b2b', 'b2c'])

function termsOf(text: string): string[] {
  const kept = text.split(/[,;|\n]/).filter((t) => !BROAD_TERMS.has(keywordsOf(t).join(' ')) && t.trim())
  const src = kept.join(',')
  return Array.from(new Set([
    ...keywordsOf(src).filter((t) => !GENERIC_TERMS.has(t)),
    // sigles courts (EDR, SOC, MSP, RH, BTP...) ignores par keywordsOf
    ...src.split(/[,;\s]+/).map((t) => t.trim().toLowerCase()).filter((t) => t.length >= 2 && t.length <= 4 && /^[a-z0-9]+$/.test(t) && /[a-z]/.test(t) && !STOP_SHORT.has(t)),
  ]))
}

function titleMatches(title: string, terms: string[]): boolean {
  const words = title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
  // Racine sur 7 lettres pour les mots longs (immobilier / immobiliere).
  return terms.some((t) => words.some((w) => w === t || (t.length >= 7 && w.length >= 7 && w.slice(0, 7) === t.slice(0, 7))))
}

// Ne garde que les actus du metier : d'abord celles qui citent un terme du
// SECTEUR, puis, s'il en manque, celles qui citent un mot-cle specifique.
function relevantNews(articles: NewsArticle[], sector: string, keywords: string): NewsArticle[] {
  const sectorTerms = termsOf(sector)
  const keywordTerms = termsOf(keywords).filter((t) => !sectorTerms.includes(t))
  const bySector = articles.filter((a) => titleMatches(a.title, sectorTerms))
  if (bySector.length >= 3) return bySector
  const byKeyword = articles.filter((a) => !bySector.includes(a) && titleMatches(a.title, keywordTerms))
  return [...bySector, ...byKeyword]
}

// Numero d'actu renvoye par l'IA (1..n), 0 si absent ou invalide.
function newsIndex(idea: any, max: number): number {
  const n = Number(idea?.news)
  return Number.isInteger(n) && n >= 1 && n <= max ? n : 0
}

// Une idee se presente comme une idee d'actu (format "actu" ou numero d'actu).
function claimsNews(idea: any): boolean {
  return String(idea?.format || '').trim().toLowerCase() === 'actu' || Number(idea?.news) > 0
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
  onDebug?: (info: { system?: string; user?: string; news?: NewsArticle[]; raw?: string }) => void
  // Origine de la generation, enregistree dans le diagnostic (ideas_runs).
  // Absent = essai (script) : rien n'est enregistre.
  source?: 'manual' | 'cron'
}): Promise<{ ideas: GeneratedIdea[]; newsCount: number; freshCount: number }> {
  const { supabase, userId, profile } = opts
  const count = opts.count || IDEAS_PER_DAY
  const started = Date.now()
  const newsDiag: NewsDiag = { queries: [], calls: [], sensitive: 0, picked: 0 }
  const modelDiag: { retained: number[] | null; newsClaimed: number; newsKept: number }[] = []

  const company = (profile?.company || '').toString().trim()
  const sector = (profile?.sector || '').toString().trim()
  // Mots-cles d'expertise ; la stack technique ne sert qu'a defaut.
  const keywords = (profile?.keywords || profile?.tech_stack || '').toString().trim()
  const isEn = profile?.lang === 'en'

  const [rawNews, ctx] = await Promise.all([
    fetchSectorNews({ sector, keywords, lang: profile?.lang, limit: 12, days: NEWS_DAYS, diag: newsDiag }),
    loadThemeContext(supabase, userId, `${sector} ${keywords} ${company}`),
  ])
  // On retire les actus deja exploitees ces 21 derniers jours (meme article).
  // Seuil a 3 mots communs : a 2, presque toute actu du metier etait ecartee
  // des que l'historique d'idees grossissait.
  // Puis on retire les doublons : un meme evenement repris par plusieurs medias.
  const relevant = relevantNews(rawNews, sector, keywords)
  const unseen = relevant.filter((a) => !ctx.recentTitles.some((t) => tooClose(t, a.title, 3)))
  const news = dedupeNews(unseen, `${sector} ${keywords}`).slice(0, 6)
  const newsQuota = Math.min(MAX_NEWS_IDEAS, news.length)
  const total = count + OVERSAMPLE
  const newsAsked = news.length ? Math.min(news.length, newsQuota + 1) : 0
  const newsText = news.map((a) => a.title).join(' \n ')

  // Le prompt lui-meme vit dans lib/ideasPrompt.ts.
  // Sujets deja proposes : on envoie les ETIQUETTES (2-4 mots), pas les titres
  // (une liste de titres servait de modele a l'IA, qui en recopiait la forme).
  const { system, user } = buildIdeasPrompt({
    profile,
    news,
    newsDays: NEWS_DAYS,
    newsAsked,
    total,
    pastTopics: (ctx.recentTopics || []).slice(0, 90),
    writtenTopics: ctx.writtenTopics,
    allowedThemes: THEMES.filter((t) => !ctx.avoid.includes(t)),
    overused: [...(ctx.overusedOpeners || []).map((o) => `« ${o}... »`), ...(ctx.overusedWords || [])],
  })
  opts.onDebug?.({ system, user, news })

  const callModel = async (extraAvoid: string[]): Promise<IdeaLike[]> => {
    const extra = extraAvoid.length
      ? `\n\nCes idées ont été REFUSÉES (trop proches de l'historique ou chiffre non sourcé). Propose des sujets totalement différents :\n${extraAvoid.map((t) => `- ${t}`).join('\n')}`
      : ''
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 6000,
      system,
      messages: [{ role: 'user', content: user + extra }],
    })
    const raw = (message.content[0] as { text: string }).text || ''
    opts.onDebug?.({ raw })
    // Actus que l'IA a declarees exploitables (une par type d'evenement).
    // Une idee d'actu hors de cette liste est supprimee : l'IA ne peut plus
    // utiliser une actu qu'elle a elle-meme jugee hors sujet.
    const retained = parseRetainedNews(raw, news.length)
    const parsed = parseIdeasResponse(raw).filter((i: any) => i && i.title)
    const claimed = parsed.filter((i: any) => claimsNews(i)).length
    const kept = parsed.filter((i: any) => {
        if (!claimsNews(i)) return true
        const n = newsIndex(i, news.length)
        return n > 0 && (retained === null || retained.includes(n))
      })
    modelDiag.push({ retained, newsClaimed: claimed, newsKept: kept.filter((i: any) => claimsNews(i)).length })
    return kept
      .map((i: any) => ({
        topic: cleanIdeaText(String(i.topic || '')),
        title: cleanIdeaText(String(i.title || '')),
        hook: cleanIdeaText(String(i.hook || '')),
        angle: toPlan(i).split('\n').map(cleanIdeaText).join('\n'),
        theme: (THEMES as readonly string[]).includes(i.theme) ? i.theme : undefined,
        format: String(i.format || '').trim().toLowerCase() || undefined,
        zone: String(i.zone || '').trim().toLowerCase() || undefined,
        news: newsIndex(i, news.length),
      }))
      // Garde-fou : un chiffre absent des actus est un chiffre invente.
      .filter((i: IdeaLike) => {
        const ok = !hasUnsourcedFigure(`${i.title} \n ${i.hook} \n ${i.angle}`, newsText)
        if (!ok) unsourced.push(i.title || '')
        return ok
      })
  }
  const unsourced: string[] = []

  let pool = await callModel([])
  let ranked = rankIdeas(pool, ctx, count, newsQuota)
  let freshCount = ranked.filter((i) => i.fresh).length

  // Auto-correction : trop peu d'idees neuves => UNE seule relance.
  if (freshCount < MIN_FRESH) {
    try {
      const rejected = [...unsourced, ...pool.filter((p) => !ranked.some((r) => r.title === p.title && r.fresh)).map((p) => p.title || '')]
      const second = await callModel(rejected.slice(0, 20))
      pool = pool.concat(second)
      ranked = rankIdeas(pool, ctx, count, newsQuota)
      freshCount = ranked.filter((i) => i.fresh).length
    } catch (e) {
      console.error('[ideas] relance:', e)
    }
  }

  // Idee d'actu : l'etiquette affichee devient "Actu · Media" (theme vide,
  // l'app affiche alors le topic) et l'idee ne compte pas dans la rotation.
  const ideas: GeneratedIdea[] = ranked.slice(0, count).map((i) => {
    const article = i.news ? news[i.news - 1] : undefined
    return {
      topic: article ? `${isEn ? 'News' : 'Actu'} · ${article.source.slice(0, 28)}` : i.topic || '',
      title: i.title || '',
      hook: i.hook || '',
      angle: i.angle || '',
      theme: article ? null : i.theme || null,
      recommended: !!i.recommended,
    }
  })

  // newsCount = nombre d'idees reellement tirees d'une actualite.
  const newsCount = ranked.slice(0, count).filter((i) => i.news).length

  // Diagnostic : ou les actus se perdent (sources, filtres, choix de l'IA).
  if (opts.source) {
    try {
      await supabase.from('ideas_runs').insert({
        user_id: userId,
        source: opts.source,
        info: {
          duree_s: Math.round((Date.now() - started) / 1000),
          requetes: newsDiag.queries,
          appels_sources: newsDiag.calls,
          actus_faits_divers_ecartees: newsDiag.sensitive,
          actus_trouvees: rawNews.length,
          actus_du_metier: relevant.length,
          actus_non_deja_vues: unseen.length,
          actus_envoyees: news.map((a) => `${a.title} (${a.source})`),
          appels_ia: modelDiag,
          idees_actu_finales: newsCount,
          idees_neuves: freshCount,
          chiffres_inventes_rejetes: unsourced.length,
        },
      })
    } catch (e) {
      console.error('[ideas] diagnostic:', e)
    }
  }

  return { ideas, newsCount, freshCount }
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
