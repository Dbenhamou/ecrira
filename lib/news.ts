// lib/news.ts
// Actualites pilotees UNIQUEMENT par le secteur d'activite du user.
// Aucune source ni thematique codee en dur : la requete d'actu est
// construite a partir du secteur + mots-cles du profil, dans sa langue.
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

function parseItems(xml: string, fallbackSource: string): NewsArticle[] {
  const out: NewsArticle[] = []
  const isAtom = xml.includes('<entry')
  const blocks = isAtom ? xml.split(/<entry[ >]/).slice(1) : xml.split('<item').slice(1)
  for (const b of blocks) {
    let title = decodeEntities(b.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1] || '')
    if (!title || title.length < 12) continue
    // Google News suffixe souvent le titre par " - Nom du media" : on l'extrait.
    let source = fallbackSource
    const dash = title.lastIndexOf(' - ')
    if (dash > 20) {
      source = title.slice(dash + 3).trim() || fallbackSource
      title = title.slice(0, dash).trim()
    }
    const date = (
      b.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ||
      b.match(/<published>([\s\S]*?)<\/published>/)?.[1] ||
      b.match(/<updated>([\s\S]*?)<\/updated>/)?.[1] ||
      b.match(/<dc:date>([\s\S]*?)<\/dc:date>/)?.[1] || ''
    ).trim()
    out.push({ title, source, date })
  }
  return out
}

// Construit la requete de recherche a partir du secteur + mots-cles du user.
// 100% pilote par le profil : aucun secteur n'est code en dur.
export function buildNewsQuery(sector: string, keywords: string): string {
  const sec = (sector || '').trim()
  const kws = (keywords || '')
    .split(/[,;]/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 4)
  const parts = [sec, ...kws].filter(Boolean)
  if (!parts.length) return ''
  // Expressions multi-mots entre guillemets, reliees par OR pour elargir.
  return parts.map((p) => (p.includes(' ') ? `"${p}"` : p)).join(' OR ')
}

// Source 1 : Google News RSS recherche — pilotee par la requete, sans cle.
async function fetchGoogleNews(query: string, isEn: boolean, limit: number): Promise<NewsArticle[]> {
  if (!query) return []
  const hl = isEn ? 'en-US' : 'fr'
  const gl = isEn ? 'US' : 'FR'
  const ceid = isEn ? 'US:en' : 'FR:fr'
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${hl}&gl=${gl}&ceid=${ceid}`
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EcriraBot/1.0; +https://ecrira.com)' },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return []
    return parseItems(await res.text(), 'Google News').slice(0, limit * 2)
  } catch {
    return []
  }
}

// Source 2 (repli) : GNews.io — pilotee par la meme requete, cle optionnelle.
async function fetchGNews(query: string, isEn: boolean, limit: number): Promise<NewsArticle[]> {
  const key = process.env.GNEWS_API_KEY
  if (!key || !query) return []
  try {
    const lang = isEn ? 'en' : 'fr'
    const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=${lang}&max=${limit}&sortby=publishedAt&apikey=${key}`
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) })
    if (!res.ok) return []
    const data: any = await res.json()
    return (data.articles || [])
      .map((a: any) => ({ title: (a.title || '').trim(), source: a.source?.name || 'GNews', date: a.publishedAt || '' }))
      .filter((a: NewsArticle) => a.title.length >= 12)
  } catch {
    return []
  }
}

function toTs(dateStr: string): number | null {
  if (!dateStr) return null
  const t = new Date(dateStr).getTime()
  return Number.isFinite(t) ? t : null
}

export async function fetchSectorNews(opts: {
  sector?: string
  keywords?: string
  lang?: string
  limit?: number
  days?: number
}): Promise<NewsArticle[]> {
  const sector = opts.sector || ''
  const keywords = opts.keywords || ''
  const isEn = opts.lang === 'en'
  const days = opts.days || 14
  const limit = opts.limit || 10

  const query = buildNewsQuery(sector, keywords)
  // Pas de secteur renseigne => pas d'actu forcee (le prompt reste qualitatif).
  if (!query) return []

  const items: NewsArticle[] = []
  items.push(...(await fetchGoogleNews(query, isEn, limit)))
  if (items.length < 3) {
    items.push(...(await fetchGNews(query, isEn, limit)))
  }
  if (!items.length) return []

  // Termes du secteur pour scorer la pertinence (bonus, pas un filtre dur :
  // la requete garantit deja que les resultats concernent le secteur).
  const terms = Array.from(new Set(
    `${keywords},${sector}`.toLowerCase().split(/[,;\s]+/).map((t) => t.trim()).filter((t) => t.length >= 3)
  )).slice(0, 12)

  const now = Date.now()
  const windowMs = days * 86400_000
  const seen = new Set<string>()
  const scored: { a: NewsArticle; score: number }[] = []

  for (const a of items) {
    const key = a.title.toLowerCase().slice(0, 80)
    if (seen.has(key)) continue
    seen.add(key)
    const t = toTs(a.date)
    if (t !== null && now - t > windowMs * 1.5) continue // trop vieux
    const recency = t !== null ? Math.max(0, 1 - (now - t) / windowMs) : 0.3
    const titleLc = a.title.toLowerCase()
    const kw = terms.reduce((n, term) => n + (titleLc.includes(term) ? 1 : 0), 0)
    scored.push({ a, score: kw * 2 + recency * 2 })
  }

  scored.sort((x, y) => y.score - x.score)
  return scored.slice(0, limit).map((s) => s.a)
}

export function formatNewsBlock(articles: NewsArticle[]): string {
  if (!articles.length) return ''
  return articles
    .map((a) => {
      const t = a.date ? new Date(a.date) : null
      const d = t && Number.isFinite(t.getTime())
        ? ` · ${String(t.getDate()).padStart(2, '0')}/${String(t.getMonth() + 1).padStart(2, '0')}`
        : ''
      return `- ${a.title}${a.source ? ` (${a.source}${d})` : d}`
    })
    .join('\n')
}
