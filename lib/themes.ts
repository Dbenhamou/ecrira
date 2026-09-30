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

export type IdeaLike = { topic?: string; title?: string; hook?: string; angle?: string; theme?: string; recommended?: boolean }

export type ThemeContext = {
  avoid: string[]          // themes les plus utilises recemment (a eviter)
  writtenTopics: string[]  // sujets deja publies par l'utilisateur
  recentTitles: string[]   // titres d'idees deja proposees recemment
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

// Filtre et reordonne les idees generees.
// On genere plus d'idees que necessaire : les doublons et formules sont
// VRAIMENT ecartes. Les rejetees ne servent de complement que si on
// manque d'idees propres.
export function rankIdeas(ideas: IdeaLike[], ctx: ThemeContext, minCount: number): IdeaLike[] {
  const avoid = new Set(ctx.avoid)
  // recentTitles est trie du plus recent au plus ancien : ~3 derniers jours
  const recentOpeners = new Set(ctx.recentTitles.slice(0, 30).map(openerOf))
  const kept: IdeaLike[] = []
  const softRejected: IdeaLike[] = [] // theme deja pris : acceptable en complement
  const hardRejected: IdeaLike[] = [] // dernier recours si l'IA a trop peu produit
  const usedThemes = new Set<string>()
  const usedOpeners = new Set<string>()
  let predictions = 0

  for (const idea of ideas) {
    const title = idea.title || ''
    const label = `${idea.topic || ''} ${title}`
    const opener = openerOf(title)
    const hardReject =
      ctx.writtenTopics.some((t) => tooClose(t, label)) ||
      ctx.recentTitles.some((t) => tooClose(t, title, 3)) ||
      kept.some((k) => tooClose(`${k.topic || ''} ${k.title || ''}`, label)) ||
      isFormulaic(`${title} ${idea.hook || ''}`) ||
      usedOpeners.has(opener) ||
      recentOpeners.has(opener) ||
      (isPrediction(title) && predictions >= 1)
    if (hardReject) {
      if (!isFormulaic(`${title} ${idea.hook || ''}`)) hardRejected.push(idea)
      continue
    }

    const themeClash = !!idea.theme && (avoid.has(idea.theme) || usedThemes.has(idea.theme))
    if (themeClash) {
      softRejected.push(idea)
      continue
    }
    kept.push(idea)
    usedOpeners.add(opener)
    if (idea.theme) usedThemes.add(idea.theme)
    if (isPrediction(title)) predictions++
  }

  const out = kept.concat(softRejected, hardRejected).slice(0, minCount)
  return out.map((idea, i) => ({ ...idea, recommended: i < 2 }))
}
