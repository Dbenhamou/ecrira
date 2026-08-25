// lib/news.ts
// Source d'actualites qui s'adapte au secteur / mots-cles du profil.
// Strategie a deux niveaux, pensee pour la production :
//   1) Google News RSS  -> gratuit, sans cle. Fonctionne dans la plupart des
//      environnements serverless. Peut etre bloque (403) sur certaines IP.
//   2) Repli GNews.io    -> si la variable GNEWS_API_KEY est definie (cle
//      gratuite, 100 req/jour) et que le RSS a echoue.
// En cas d'echec des deux, renvoie [] : la generation d'idees continue sans actu.

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

// Construit la requete a partir du secteur (prioritaire) ou des mots-cles.
export function buildNewsQuery(sector: string, keywords: string): string {
  const base = (sector || keywords || '').trim()
  return base.split(/\s+/).slice(0, 4).join(' ')
}

// --- Source 1 : Google News RSS (sans cle) ---
async function fetchGoogleNews(q: string, isEn: boolean, days: number, limit: number): Promise<NewsArticle[]> {
  const hl = isEn ? 'en-US' : 'fr'
  const gl = isEn ? 'US' : 'FR'
  const ceid = isEn ? 'US:en' : 'FR:fr'
  const query = encodeURIComponent(`${q} when:${days}d`)
  const url = `https://news.google.com/rss/search?q=${query}&hl=${hl}&gl=${gl}&ceid=${ceid}`

  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
    },
  })
  if (!res.ok) throw new Error(`google-news ${res.status}`)
  const xml = await res.text()

  const items = xml.split('<item>').slice(1)
  const articles: NewsArticle[] = []
  const seen = new Set<string>()

  for (const item of items) {
    const rawTitle = item.match(/<title>([\s\S]*?)<\/title>/)?.[1] || ''
    const source = decodeEntities(item.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] || '')
    const date = (item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || '').trim()

    let title = decodeEntities(rawTitle)
    if (source && title.endsWith(` - ${source}`)) {
      title = title.slice(0, -(source.length + 3)).trim()
    }
    if (!title || title.length < 12) continue

    const key = title.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)

    articles.push({ title, source, date })
    if (articles.length >= limit) break
  }
  return articles
}

// --- Source 2 : GNews.io (cle gratuite optionnelle) ---
async function fetchGNews(q: string, isEn: boolean, limit: number): Promise<NewsArticle[]> {
  const key = process.env.GNEWS_API_KEY
  if (!key) return []
  const lang = isEn ? 'en' : 'fr'
  const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(q)}&lang=${lang}&max=${limit}&sortby=publishedAt&apikey=${key}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`gnews ${res.status}`)
  const data: any = await res.json()
  const seen = new Set<string>()
  const out: NewsArticle[] = []
  for (const a of data.articles || []) {
    const title = (a.title || '').trim()
    if (!title || title.length < 12) continue
    const key2 = title.toLowerCase()
    if (seen.has(key2)) continue
    seen.add(key2)
    out.push({ title, source: a.source?.name || '', date: a.publishedAt || '' })
    if (out.length >= limit) break
  }
  return out
}

// Recupere les actus recentes du secteur.
// Ne jette jamais : renvoie [] en cas de probleme (la generation continue).
export async function fetchSectorNews(opts: {
  sector?: string
  keywords?: string
  lang?: string
  limit?: number
  days?: number
}): Promise<NewsArticle[]> {
  const q = buildNewsQuery(opts.sector || '', opts.keywords || '')
  if (!q) return []

  const isEn = opts.lang === 'en'
  const days = opts.days || 21
  const limit = opts.limit || 10

  // 1) Google News RSS
  try {
    const g = await fetchGoogleNews(q, isEn, days, limit)
    if (g.length) return g
  } catch (e) {
    console.error('[news] google-news:', (e as Error).message)
  }

  // 2) Repli GNews.io (si cle configuree)
  try {
    const gn = await fetchGNews(q, isEn, limit)
    if (gn.length) return gn
  } catch (e) {
    console.error('[news] gnews:', (e as Error).message)
  }

  return []
}

// Formate les articles en bloc texte injecte dans le prompt.
export function formatNewsBlock(articles: NewsArticle[]): string {
  if (!articles.length) return ''
  return articles
    .map((a) => `- ${a.title}${a.source ? ` (${a.source})` : ''}`)
    .join('\n')
}
