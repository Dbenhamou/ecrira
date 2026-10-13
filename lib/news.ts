// lib/news.ts
// Actualites pilotees UNIQUEMENT par le secteur d'activite du user.
// Aucune source ni thematique codee en dur : les requetes d'actu sont
// construites a partir du secteur + mots-cles du profil, dans sa langue.
// Ne jette jamais : renvoie [] en cas de probleme (la generation continue).

export type NewsArticle = { title: string; source: string; date: string }

function decodeEntities(s: string): string {
  return (s || '')
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .trim()
}

export function parseItems(xml: string, fallbackSource: string): NewsArticle[] {
  const out: NewsArticle[] = []
  const isAtom = xml.includes('<entry')
  const blocks = isAtom ? xml.split(/<entry[ >]/).slice(1) : xml.split('<item').slice(1)
  for (const b of blocks) {
    let title = decodeEntities(b.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1] || '')
    if (!title || title.length < 12) continue
    let source = decodeEntities(
      b.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] ||
      b.match(/<News:Source>([\s\S]*?)<\/News:Source>/i)?.[1] || ''
    )
    // Google News suffixe souvent le titre par " - Nom du media" : on l'extrait.
    const dash = title.lastIndexOf(' - ')
    if (dash > 20) {
      if (!source) source = title.slice(dash + 3).trim()
      title = title.slice(0, dash).trim()
    }
    const date = (
      b.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ||
      b.match(/<published>([\s\S]*?)<\/published>/)?.[1] ||
      b.match(/<updated>([\s\S]*?)<\/updated>/)?.[1] ||
      b.match(/<dc:date>([\s\S]*?)<\/dc:date>/)?.[1] || ''
    ).trim()
    out.push({ title, source: source || fallbackSource, date })
  }
  return out
}

// Qualificatifs marketing qui tuent une recherche d'actu ("Cybersecurite B2B"
// entre guillemets ne renvoie presque rien) : on les retire des termes.
const NOISE = /\b(b2b|b2c|24\s?\/\s?7|24h\s?\/\s?24|7j\s?\/\s?7)\b/gi

function norm(s: string): string {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

// Termes trop larges pour chercher des actus : ils ramenent n'importe quoi
// (« reseaux sociaux » -> politique et faits divers, « services numeriques »
// -> administrations etrangeres). Ignores dans la recherche, quel que soit
// le secteur, sauf s'ils sont les seuls termes disponibles.
export const BROAD_TERMS = new Set([
  'reseaux sociaux', 'reseau social', 'social media', 'digital', 'numerique', 'digitale', 'numeriques',
  'services numeriques', 'service numerique', 'plateformes digitales', 'plateforme digitale', 'plateformes numeriques',
  'application numerique', 'applications', 'application', 'communication', 'entrepreneuriat', 'entrepreneur',
  'innovation', 'transformation digitale', 'transformation numerique', 'web', 'internet', 'marketing',
  'strategie', 'management', 'croissance', 'business', 'services', 'solutions', 'conseil', 'technologie',
  'technologies', 'tech', 'ia', 'intelligence artificielle', 'data', 'donnees', 'performance', 'productivite',
  'optimisation digitale', 'presence digitale', 'acceleration business', 'saas',
])

// Termes de recherche issus du profil : secteur d'abord, puis mots-cles.
export function newsTerms(sector: string, keywords: string): string[] {
  const seen = new Set<string>()
  const all: string[] = []
  for (const raw of `${sector || ''},${keywords || ''}`.split(/[,;|\n]/)) {
    const term = raw.replace(NOISE, ' ').replace(/["()]/g, ' ').replace(/\s+/g, ' ').trim()
    if (term.length < 2 || term.split(' ').length > 4) continue
    const key = term.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    all.push(term)
  }
  const specific = all.filter((t) => !BROAD_TERMS.has(norm(t)))
  return (specific.length ? specific : all).slice(0, 12)
}

function orQuery(terms: string[]): string {
  return terms.map((p) => (p.includes(' ') ? `"${p}"` : p)).join(' OR ')
}

// Conserve pour compatibilite : une requete unique secteur + mots-cles.
export function buildNewsQuery(sector: string, keywords: string): string {
  return orQuery(newsTerms(sector, keywords).slice(0, 5))
}

// Plusieurs requetes courtes plutot qu'un seul long OR : chaque groupe de
// termes ramene ses propres actus (sinon les premiers termes ecrasent tout).
export function buildNewsQueries(sector: string, keywords: string): string[] {
  const terms = newsTerms(sector, keywords)
  const queries: string[] = []
  for (let i = 0; i < terms.length && queries.length < 3; i += 4) {
    queries.push(orQuery(terms.slice(i, i + 4)))
  }
  return queries
}

const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; EcriraBot/1.0; +https://ecrira.com)' }

// Diagnostic : une entree par appel a une source (code HTTP, nb d'articles,
// erreur). Sert a savoir ou les actus se perdent en production.
export type SourceCall = { source: string; status: number | string; items: number; ms: number }
export type NewsDiag = { queries: string[]; calls: SourceCall[]; sensitive: number; picked: number }

async function timed(source: string, diag: NewsDiag | undefined, run: () => Promise<{ status: number | string; items: NewsArticle[] }>): Promise<NewsArticle[]> {
  const t0 = Date.now()
  let status: number | string = 'erreur'
  let items: NewsArticle[] = []
  try {
    const r = await run()
    status = r.status
    items = r.items
  } catch (e: any) {
    status = e?.name === 'TimeoutError' || e?.name === 'AbortError' ? 'timeout' : 'erreur: ' + String(e?.message || e).slice(0, 60)
  }
  diag?.calls.push({ source, status, items: items.length, ms: Date.now() - t0 })
  return items
}

// Source 1 : Google News RSS recherche — sans cle. "when:Nd" force des
// resultats recents (sans lui, le flux est trie par pertinence et remonte
// surtout des articles vieux de plusieurs mois).
async function fetchGoogleNews(query: string, isEn: boolean, days: number, diag?: NewsDiag): Promise<NewsArticle[]> {
  if (!query) return []
  const hl = isEn ? 'en-US' : 'fr'
  const gl = isEn ? 'US' : 'FR'
  const ceid = isEn ? 'US:en' : 'FR:fr'
  const q = `${query} when:${days}d`
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=${hl}&gl=${gl}&ceid=${ceid}`
  return timed('google', diag, async () => {
    const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(6000) })
    if (!res.ok) return { status: res.status, items: [] }
    const text = await res.text()
    // Une page HTML (consentement, captcha) au lieu du flux RSS : on le signale.
    const status = text.includes('<rss') || text.includes('<feed') ? res.status : `${res.status} sans flux (${res.url.slice(0, 60)})`
    return { status, items: parseItems(text, 'Google News') }
  })
}

// Source 2 (repli, sans cle) : Bing News RSS.
async function fetchBingNews(query: string, isEn: boolean, diag?: NewsDiag): Promise<NewsArticle[]> {
  if (!query) return []
  const mkt = isEn ? 'en-US' : 'fr-FR'
  const url = `https://www.bing.com/news/search?q=${encodeURIComponent(query)}&format=rss&mkt=${mkt}&setlang=${isEn ? 'en' : 'fr'}`
  return timed('bing', diag, async () => {
    const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(6000) })
    if (!res.ok) return { status: res.status, items: [] }
    return { status: res.status, items: parseItems(await res.text(), 'Bing News') }
  })
}

// Source 3 (repli) : GNews.io — cle optionnelle.
async function fetchGNews(query: string, isEn: boolean, limit: number, diag?: NewsDiag): Promise<NewsArticle[]> {
  const key = process.env.GNEWS_API_KEY
  if (!key || !query) return []
  const lang = isEn ? 'en' : 'fr'
  const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=${lang}&max=${limit}&sortby=publishedAt&apikey=${key}`
  return timed('gnews', diag, async () => {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) })
    if (!res.ok) return { status: res.status, items: [] }
    const data: any = await res.json()
    const items = (data.articles || [])
      .map((a: any) => ({ title: (a.title || '').trim(), source: a.source?.name || 'GNews', date: a.publishedAt || '' }))
      .filter((a: NewsArticle) => a.title.length >= 12)
    return { status: res.status, items }
  })
}

function toTs(dateStr: string): number | null {
  if (!dateStr) return null
  const t = new Date(dateStr).getTime()
  return Number.isFinite(t) ? t : null
}

// Trie, dedoublonne et garde les actus recentes les plus proches du metier.
// Faits divers sensibles (crimes, violences, deces...) : jamais proposes
// comme base d'un post professionnel, quel que soit le secteur.
const SENSITIVE = /\b(viols?|violee?s?|violeur|agressions? sexuelles?|agresse(e|s)?|meurtres?|meurtrier|assassinats?|assassine|tuee?s?|homicides?|suicides?|pedo\w*|incestes?|attentats?|terroris\w*|feminicides?|deces|decede|mort|morts|accuse(e|s)? de|mise? en examen|garde a vue|condamnee?s?|prison|harcelement sexuel|enlevement|noyade|rape|murder|killed|suicide|terror\w*)\b/

export function isSensitiveNews(title: string): boolean {
  return SENSITIVE.test(norm(title))
}

export function selectNews(items: NewsArticle[], terms: string[], days: number, limit: number, now = Date.now(), diag?: NewsDiag): NewsArticle[] {
  const before = items.length
  items = items.filter((a) => !isSensitiveNews(a.title))
  if (diag) diag.sensitive = before - items.length
  const windowMs = days * 86400_000
  const seen = new Set<string>()
  const scored: { a: NewsArticle; score: number }[] = []
  for (const a of items) {
    const key = a.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 60)
    if (seen.has(key)) continue
    seen.add(key)
    const t = toTs(a.date)
    if (t !== null && now - t > windowMs) continue // trop vieux
    const recency = t !== null ? Math.max(0, 1 - (now - t) / windowMs) : 0.3
    const titleLc = a.title.toLowerCase()
    const kw = terms.reduce((n, term) => n + (titleLc.includes(term) ? 1 : 0), 0)
    scored.push({ a, score: kw * 2 + recency * 2 })
  }
  scored.sort((x, y) => y.score - x.score)
  // Au plus 2 articles par media pour varier les sources.
  const perSource: Record<string, number> = {}
  const out: NewsArticle[] = []
  for (const s of scored) {
    const src = s.a.source.toLowerCase()
    if ((perSource[src] || 0) >= 2) continue
    perSource[src] = (perSource[src] || 0) + 1
    out.push(s.a)
    if (out.length >= limit) break
  }
  return out
}

export async function fetchSectorNews(opts: {
  sector?: string
  keywords?: string
  lang?: string
  limit?: number
  days?: number
  diag?: NewsDiag
}): Promise<NewsArticle[]> {
  const diag = opts.diag
  const sector = opts.sector || ''
  const keywords = opts.keywords || ''
  const isEn = opts.lang === 'en'
  const days = opts.days || 14
  const limit = opts.limit || 10

  const queries = buildNewsQueries(sector, keywords)
  if (diag) diag.queries = queries
  // Pas de secteur renseigne => pas d'actu forcee (le prompt reste qualitatif).
  if (!queries.length) return []

  const items: NewsArticle[] = []
  const google = await Promise.all(queries.map((q) => fetchGoogleNews(q, isEn, days, diag)))
  for (const list of google) items.push(...list)

  const terms = Array.from(new Set(
    `${keywords},${sector}`.toLowerCase().split(/[,;\s]+/).map((t) => t.trim()).filter((t) => t.length >= 3)
  )).slice(0, 12)

  let picked = selectNews(items, terms, days, limit, Date.now(), diag)
  if (picked.length < 3) {
    const bing = await Promise.all(queries.slice(0, 2).map((q) => fetchBingNews(q, isEn, diag)))
    for (const list of bing) items.push(...list)
    picked = selectNews(items, terms, days, limit, Date.now(), diag)
  }
  if (picked.length < 3) {
    items.push(...(await fetchGNews(queries[0], isEn, limit, diag)))
    picked = selectNews(items, terms, days, limit, Date.now(), diag)
  }
  if (diag) diag.picked = picked.length
  return picked
}

function plainWords(text: string): string[] {
  return (text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean)
}

const GENERIC_NAMES = new Set(['france', 'europe', 'etat', 'paris', 'union', 'etats', 'unis', 'gouvernement', 'commission'])

// Deux titres parlent du meme evenement s'ils partagent un nom propre
// (« Cnaf », « IonQ »...) ou au moins 2 mots distinctifs. Les mots du metier
// (`protectedText` = secteur + mots-cles) ne comptent pas : ils sont dans
// presque tous les titres. On garde le premier article (le mieux classe).
export function dedupeNews(articles: NewsArticle[], protectedText: string): NewsArticle[] {
  const common = new Set(plainWords(protectedText))
  const signature = (title: string) => {
    const words = new Set(plainWords(title).filter((w) => w.length > 3 && !common.has(w)))
    const names = new Set(
      title.split(/\s+/).slice(1)
        .filter((w) => /^[A-ZÀ-Ý]/.test(w))
        .map((w) => plainWords(w).join(''))
        .filter((w) => w.length >= 3 && !common.has(w) && !GENERIC_NAMES.has(w))
    )
    return { words, names }
  }
  const kept: { a: NewsArticle; sig: { words: Set<string>; names: Set<string> } }[] = []
  for (const a of articles) {
    const sig = signature(a.title)
    const duplicate = kept.some((k) => {
      if (Array.from(sig.names).some((n) => k.sig.names.has(n))) return true
      return Array.from(sig.words).filter((w) => k.sig.words.has(w)).length >= 2
    })
    if (!duplicate) kept.push({ a, sig })
  }
  return kept.map((k) => k.a)
}

function shortDate(dateStr: string): string {
  const t = dateStr ? new Date(dateStr) : null
  return t && Number.isFinite(t.getTime())
    ? `${String(t.getDate()).padStart(2, '0')}/${String(t.getMonth() + 1).padStart(2, '0')}`
    : ''
}

export function formatNewsBlock(articles: NewsArticle[]): string {
  if (!articles.length) return ''
  return articles
    .map((a) => {
      const d = shortDate(a.date)
      const meta = [a.source, d].filter(Boolean).join(' · ')
      return `- ${a.title}${meta ? ` (${meta})` : ''}`
    })
    .join('\n')
}

// Variante numerotee : l'IA renvoie le numero de l'actu utilisee.
export function formatNumberedNews(articles: NewsArticle[]): string {
  return articles
    .map((a, i) => {
      const d = shortDate(a.date)
      const meta = [a.source, d].filter(Boolean).join(' · ')
      return `${i + 1}. ${a.title}${meta ? ` (${meta})` : ''}`
    })
    .join('\n')
}
