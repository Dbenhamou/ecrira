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
// deux mots significatifs.
export function tooClose(a: string, b: string): boolean {
  const ka = new Set(keywordsOf(a))
  if (!ka.size) return false
  let common = 0
  for (const w of keywordsOf(b)) {
    if (ka.has(w)) common++
    if (common >= 2) return true
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

// Filtre et reordonne les idees generees.
// Ne renvoie jamais moins que `minCount` : les idees ecartees servent de
// complement si le filtrage est trop agressif.
export function rankIdeas(ideas: IdeaLike[], ctx: ThemeContext, minCount: number): IdeaLike[] {
  const avoid = new Set(ctx.avoid)
  const kept: IdeaLike[] = []
  const rejected: IdeaLike[] = []
  const usedThemes = new Set<string>()

  for (const idea of ideas) {
    const label = `${idea.topic || ''} ${idea.title || ''}`
    const duplicate =
      ctx.writtenTopics.some((t) => tooClose(t, label)) ||
      ctx.recentTitles.some((t) => tooClose(t, idea.title || ''))
    const themeClash = !!idea.theme && (avoid.has(idea.theme) || usedThemes.has(idea.theme))
    if (duplicate || themeClash) {
      rejected.push(idea)
    } else {
      kept.push(idea)
      if (idea.theme) usedThemes.add(idea.theme)
    }
  }

  const out = kept.concat(rejected).slice(0, Math.max(minCount, kept.length))
  return out.map((idea, i) => ({ ...idea, recommended: i < 2 }))
}
