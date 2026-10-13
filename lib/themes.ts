// lib/themes.ts
// Taxonomie de themes de fond, volontairement generique pour couvrir
// tous les secteurs. Sert a varier les idees d'un jour a l'autre.

export const THEMES = [
  'reglementation_conformite',
  'tendances_marche',
  'technologie_outils',
  'methodes_process',
  'management_equipe',
  'recrutement_talents',
  'relation_client',
  'strategie_business',
  'finance_couts',
  'retour_experience',
  'erreurs_pieges',
  'formation_competences',
  'innovation_ia',
  'securite_risques',
  'culture_metier',
] as const

export type Theme = typeof THEMES[number]

// Fenetre d'analyse de l'usage des themes.
export const THEME_WINDOW_DAYS = 30

// Nombre de themes les plus utilises a eviter lors d'une generation.
export const AVOID_TOP_N = 3

// Fenetre pour les sujets deja publies (posts sauvegardes / planifies).
export const WRITTEN_WINDOW_DAYS = 90

const STOP_WORDS = new Set([
  'le', 'la', 'les', 'de', 'des', 'du', 'un', 'une', 'et', 'en', 'pour',
  'avec', 'sur', 'dans', 'au', 'aux', 'par', 'ce', 'cette', 'ces', 'que',
  'qui', 'quoi', 'plus', 'moins', 'tout', 'tous', 'vos', 'votre', 'son',
  'sont', 'est', 'ete', 'the', 'a', 'of', 'to', 'in', 'for', 'and', 'your',
  'you', 'with', 'from', 'this', 'that', 'are', 'was', 'have', 'has',
])

export function keywordsOf(text: string): string[] {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w))
}

// Deux sujets sont consideres trop proches s'ils partagent au moins
// `minCommon` mots significatifs (2 par defaut).
export function tooClose(a: string, b: string, minCommon = 2): boolean {
  const ka = new Set(keywordsOf(a))
  if (!ka.size) return false
  let common = 0
  for (const w of Array.from(new Set(keywordsOf(b)))) {
    if (ka.has(w)) common++
    if (common >= minCommon) return true
  }
  return false
}

export type IdeaLike = {
  topic?: string; title?: string; hook?: string; angle?: string; theme?: string
  recommended?: boolean; fresh?: boolean
  format?: string // type de post (conseil, opinion, question, recit...)
  news?: number   // numero de l'actualite utilisee (0 ou absent = idee terrain)
  zone?: string   // territoire : expertise, audience, metier
}

export type ThemeContext = {
  avoid: string[]          // themes les plus utilises recemment (a eviter)
  writtenTopics: string[]  // sujets deja publies par l'utilisateur
  recentTitles: string[]   // titres d'idees deja proposees recemment
  recentTopics?: string[]  // etiquettes (2-4 mots) des idees deja proposees
  overusedOpeners?: string[] // debuts de titre qui reviennent trop (appris automatiquement)
  overusedWords?: string[]   // mots / entreprises qui reviennent trop (appris automatiquement)
}

// Apprentissage automatique, sans IA : repere dans les idees des derniers
// jours les debuts de titre et les mots qui reviennent trop souvent.
// `protectedText` = secteur + mots-cles du profil (jamais bannis).
export const OPENER_MAX = 2 // un meme debut de titre au plus 2 fois
export const WORD_MAX = 5   // un meme mot au plus 5 fois
export function learnOverused(titles: string[], protectedText: string): { openers: string[]; words: string[] } {
  const protectedWords = new Set(keywordsOf(protectedText))
  const openers: Record<string, number> = {}
  const words: Record<string, number> = {}
  for (const t of titles) {
    const o = openerOf(t)
    if (o) openers[o] = (openers[o] || 0) + 1
    for (const w of Array.from(new Set(keywordsOf(t)))) {
      if (!protectedWords.has(w)) words[w] = (words[w] || 0) + 1
    }
  }
  // Seuils relatifs : un utilisateur qui regenere souvent a plus de titres.
  const openerMax = Math.max(OPENER_MAX, Math.ceil(titles.length * 0.04))
  const wordMax = Math.max(WORD_MAX, Math.ceil(titles.length * 0.1))
  return {
    openers: Object.keys(openers).filter((o) => openers[o] >= openerMax),
    words: Object.keys(words).filter((w) => words[w] >= wordMax).sort((a, b) => words[b] - words[a]).slice(0, 25),
  }
}

// Classe les themes par usage et renvoie les N plus utilises.
export function topThemes(counts: Record<string, number>, n = AVOID_TOP_N): string[] {
  return Object.entries(counts)
    .filter(([t, c]) => c > 0 && (THEMES as readonly string[]).includes(t))
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([t]) => t)
}

// Formules repetitives que l'IA reutilise d'un jour a l'autre.
export const BANNED_PATTERNS: RegExp[] = [
  /\billusion\b/i,
  /\ble vrai (probleme|sujet|enjeu|risque|cout)\b/i,
  /\bla vraie? (raison|question|valeur)\b/i,
  /\bpersonne ne\b/i,
  /\bce n'?est pas .{1,40}, c'?est\b/i,
  /\bla valeur du silence\b/i,
  /\bet si\b/i,
]

function normalize(s: string): string {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, "'")
}

export function isFormulaic(text: string): boolean {
  const n = normalize(text)
  return BANNED_PATTERNS.some((re) => re.test(n))
}

// Les 2 premiers mots d'un titre : "ingram micro", "2027 :", "ton client"...
export function openerOf(title: string): string {
  return normalize(title).replace(/[^a-z0-9: ]/g, ' ').split(/\s+/).filter(Boolean).slice(0, 2).join(' ')
}

function isPrediction(title: string): boolean {
  return /^\s*20\d\d\b/.test(title || '')
}

// Titre en deux temps "Phrase courte. Chute." : efficace, mais lassant
// quand toutes les idees du jour ont cette forme.
export function isTwoBeat(title: string): boolean {
  const t = (title || '').trim().replace(/[.!?…]+$/, '')
  return /[.!?…]\s+\S/.test(t)
}

// Au plus FORMAT_MAX idees du meme type et TWO_BEAT_MAX titres en deux temps.
export const FORMAT_MAX = 2
export const TWO_BEAT_MAX = 2
// Longueurs au-dela desquelles une idee passe en complement (le prompt
// demande 12 mots pour le titre, 20 pour l'accroche).
export const TITLE_MAX_WORDS = 14
export const HOOK_MAX_WORDS = 28
function wordCount(s: string): number {
  return (s || '').trim().split(/\s+/).filter(Boolean).length
}
// Titre qui commence par un nombre (« 3 questions... ») : 1 par jour au plus.
function isListicle(title: string): boolean {
  return /^\s*\d+\s+\S/.test(title || '') && !isPrediction(title)
}

// Au plus ZONE_MAX idees terrain sur le meme territoire (expertise / audience / metier).
export const ZONE_MAX = 4

// Filtre et reordonne les idees generees.
// On genere plus d'idees que necessaire : les doublons et formules sont
// VRAIMENT ecartes. Les rejetees ne servent de complement que si on
// manque d'idees propres.
// Les idees tirees d'une actualite ont des places reservees (maxNews) :
// elles ne sont pas soumises aux filtres de themes / mots trop utilises.
export function rankIdeas(ideas: IdeaLike[], ctx: ThemeContext, minCount: number, maxNews = 0): IdeaLike[] {
  const avoid = new Set(ctx.avoid)
  // recentTitles est trie du plus recent au plus ancien : ~3 derniers jours
  const recentOpeners = new Set([...ctx.recentTitles.slice(0, 30).map(openerOf), ...(ctx.overusedOpeners || [])])
  const overusedWords = new Set(ctx.overusedWords || [])
  const newsKept: IdeaLike[] = []
  const kept: IdeaLike[] = []
  const softRejected: IdeaLike[] = [] // theme / format deja pris : acceptable en complement
  const beatRejected: IdeaLike[] = [] // titre en deux temps en trop : complement de second rang
  const hardRejected: IdeaLike[] = [] // dernier recours si l'IA a trop peu produit
  const usedThemes = new Set<string>()
  const usedOpeners = new Set<string>()
  const usedNews = new Set<number>()
  const formatCount: Record<string, number> = {}
  const zoneCount: Record<string, number> = {}
  let twoBeats = 0
  let listicles = 0
  let predictions = 0

  // 1) Idees d'actualite : une par actu, jamais deux fois le meme sujet.
  for (const idea of ideas) {
    if (!idea.news || newsKept.length >= maxNews) continue
    const title = idea.title || ''
    const opener = openerOf(title)
    if (
      usedNews.has(idea.news) ||
      usedOpeners.has(opener) ||
      isFormulaic(`${title} ${idea.hook || ''}`) ||
      ctx.recentTitles.some((t) => tooClose(t, title, 3)) ||
      newsKept.some((k) => tooClose(k.title || '', title))
    ) continue
    newsKept.push(idea)
    usedNews.add(idea.news)
    usedOpeners.add(opener)
  }

  // 2) Idees terrain.
  for (const idea of ideas) {
    if (idea.news) continue // actus non retenues : ecartees
    const title = idea.title || ''
    const label = `${idea.topic || ''} ${title}`
    const opener = openerOf(title)
    const hardReject =
      ctx.writtenTopics.some((t) => tooClose(t, label)) ||
      ctx.recentTitles.some((t) => tooClose(t, title, 3)) ||
      kept.some((k) => tooClose(`${k.topic || ''} ${k.title || ''}`, label)) ||
      newsKept.some((k) => tooClose(k.title || '', title)) ||
      isFormulaic(`${title} ${idea.hook || ''}`) ||
      usedOpeners.has(opener) ||
      recentOpeners.has(opener) ||
      keywordsOf(title).some((w) => overusedWords.has(w)) ||
      (isPrediction(title) && predictions >= 1)
    if (hardReject) {
      if (!isFormulaic(`${title} ${idea.hook || ''}`)) hardRejected.push(idea)
      continue
    }

    const themeClash = !!idea.theme && (avoid.has(idea.theme) || usedThemes.has(idea.theme))
    const formatClash = !!idea.format && (formatCount[idea.format] || 0) >= FORMAT_MAX
    const beatClash =
      (isTwoBeat(title) && twoBeats >= TWO_BEAT_MAX) ||
      (isListicle(title) && listicles >= 1) ||
      wordCount(title) > TITLE_MAX_WORDS ||
      wordCount(idea.hook || '') > HOOK_MAX_WORDS
    const zoneClash = !!idea.zone && (zoneCount[idea.zone] || 0) >= ZONE_MAX
    if (beatClash) {
      beatRejected.push(idea)
      continue
    }
    if (themeClash || formatClash || zoneClash) {
      softRejected.push(idea)
      continue
    }
    kept.push(idea)
    usedOpeners.add(opener)
    if (idea.theme) usedThemes.add(idea.theme)
    if (idea.format) formatCount[idea.format] = (formatCount[idea.format] || 0) + 1
    if (idea.zone) zoneCount[idea.zone] = (zoneCount[idea.zone] || 0) + 1
    if (isTwoBeat(title)) twoBeats++
    if (isListicle(title)) listicles++
    if (isPrediction(title)) predictions++
  }

  const field = [
    ...kept.map((i) => ({ ...i, fresh: true })),
    ...softRejected.map((i) => ({ ...i, fresh: true })), // theme / format repete mais sujet neuf
    ...beatRejected.map((i) => ({ ...i, fresh: true })),
    ...hardRejected.map((i) => ({ ...i, fresh: false })),
  ].slice(0, Math.max(0, minCount - newsKept.length))

  // Les actus sont inserees en positions 2, 4, 6... pour rester visibles
  // sans occuper tout le haut de la liste.
  const out: IdeaLike[] = [...field]
  newsKept.forEach((n, i) => {
    out.splice(Math.min(out.length, 1 + i * 2), 0, { ...n, fresh: true })
  })
  return out.slice(0, minCount).map((idea, i) => ({ ...idea, recommended: i < 2 }))
}
