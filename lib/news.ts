// lib/news.ts
// Actualités sectorielles depuis des FLUX RSS directs — fiables depuis un
// datacenter (contrairement à Google News qui bloque les IP serveur).
// Cyber par défaut (fuites, ransomware, CVE) ; repli tech/général sinon.
// Repli optionnel GNews.io si GNEWS_API_KEY est défini.
// Ne jette jamais : renvoie [] en cas de problème (la génération continue).

export type NewsArticle = { title: string; source: string; date: string }

type Feed = { url: string; source: string }

const CYBER_FEEDS: Feed[] = [
  { url: 'https://www.zataz.com/feed/', source: 'ZATAZ' },
  { url: 'https://www.lemagit.fr/rss/Securite.xml', source: 'LeMagIT' },
  { url: 'https://www.cert.ssi.gouv.fr/feed/', source: 'CERT-FR' },
  { url: 'https://www.bleepingcomputer.com/feed/', source: 'BleepingComputer' },
  { url: 'https://feeds.feedburner.com/TheHackersNews', source: 'The Hacker News' },
  { url: 'https://www.lemondeinformatique.fr/flux-rss/thematique/securite/rss.xml', source: 'Le Monde Informatique' },
]

const GENERAL_FEEDS: Feed[] = [
  { url: 'https://www.numerama.com/feed/', source: 'Numerama' },
  { url: 'https://www.lemondeinformatique.fr/rss/rss.xml', source: 'Le Monde Informatique' },
  { url: 'https://feeds.feedburner.com/TheHackersNews', source: 'The Hacker News' },
]

const CYBER_RE = /cyber|s[ée]curit|infosec|\bsoc\b|mssp|\bmsp\b|ransomware|pentest|siem|\bedr\b|\bxdr\b|rssi|ciso|phishing|malware|vuln|\bcve\b|iso ?27|nis ?2|\bdora\b|hacking|menace|threat|dfir|\bgrc\b/i

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

function parseItems(xml: string, feedSource: string): NewsArticle[] {
  const out: NewsArticle[] = []
  const isAtom = xml.includes('<entry')
  const blocks = isAtom ? xml.split(/<entry[ >]/).slice(1) : xml.split('<item').slice(1)
  for (const b of blocks) {
    const title = decodeEntities(b.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1] || '')
    if (!title || title.length < 12) continue
    const date = (
      b.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ||
      b.match(/<published>([\s\S]*?)<\/published>/)?.[1] ||
      b.match(/<updated>([\s\S]*?)<\/updated>/)?.[1] ||
      b.match(/<dc:date>([\s\S]*?)<\/dc:date>/)?.[1] || ''
    ).trim()
    out.push({ title, source: feedSource, date })
  }
  return out
}

async function fetchFeed(feed: Feed): Promise<NewsArticle[]> {
  try {
    const res = await fetch(feed.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EcriraBot/1.0; +https://ecrira.com)' },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return []
    return parseItems(await res.text(), feed.source)
  } catch {
    return []
  }
}

export function buildNewsQuery(sector: string, keywords: string): string {
  const source = (keywords || sector || '').trim()
  if (!source) return ''
  return source.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 2).join(' ')
}

// Repli GNews.io (clé gratuite optionnelle) — couvre les secteurs non-cyber.
async function fetchGNews(q: string, isEn: boolean, limit: number): Promise<NewsArticle[]> {
  const key = process.env.GNEWS_API_KEY
  if (!key || !q) return []
  try {
    const lang = isEn ? 'en' : 'fr'
    const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(q)}&lang=${lang}&max=${limit}&sortby=publishedAt&apikey=${key}`
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

  const feeds = CYBER_RE.test(`${sector} ${keywords}`) ? CYBER_FEEDS : GENERAL_FEEDS

  const settled = await Promise.allSettled(feeds.map(fetchFeed))
  const items: NewsArticle[] = []
  for (const r of settled) if (r.status === 'fulfilled') items.push(...r.value)

  // Repli GNews (si clé) — utile hors cyber
  const gn = await fetchGNews(buildNewsQuery(sector, keywords), isEn, limit)
  items.push(...gn)

  const terms = Array.from(new Set(
    `${keywords},${sector}`.toLowerCase().split(/[,\s]+/).map((t) => t.trim()).filter((t) => t.length >= 3)
  )).slice(0, 10)

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
