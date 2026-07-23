// lib/themes.ts
// Taxonomie de themes de fond, volontairement generique pour couvrir
// tous les secteurs. Sert a garantir la rotation thematique des idees.

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

// Nombre d'idees sur un meme theme au-dela duquel on le considere sature.
export const SATURATION_THRESHOLD = 3

// Fenetre glissante : au-dela, un theme redevient disponible.
export const HISTORY_DAYS = 90

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

export type IdeaLike = { topic?: string; title?: string; theme?: string; recommended?: boolean }

export type ThemeContext = {
  saturated: string[]
  untouched: string[]
  writtenTopics: string[]
}

// Construit le bloc de contraintes injecte dans le prompt.
export function buildThemeBlock(ctx: ThemeContext, isEn = false): string {
  const parts: string[] = []

  if (ctx.untouched.length) {
    parts.push(
      isEn
        ? `THEMES NEVER COVERED (prioritize — at least 6 of the ideas must come from this list):\n${ctx.untouched.join(', ')}`
        : `THEMES JAMAIS TRAITES (a privilegier — au moins 6 idees doivent en venir) :\n${ctx.untouched.join(', ')}`
    )
  }

  if (ctx.saturated.length) {
    parts.push(
      isEn
        ? `SATURATED THEMES (forbidden, already covered extensively):\n${ctx.saturated.join(', ')}`
        : `THEMES SATURES (interdits, deja largement couverts) :\n${ctx.saturated.join(', ')}`
    )
  }

  if (ctx.writtenTopics.length) {
    parts.push(
      isEn
        ? `SUBJECTS THE USER ALREADY PUBLISHED (never suggest these again, not even from a different angle):\n${ctx.writtenTopics.map((t) => `- ${t}`).join('\n')}`
        : `SUJETS DEJA PUBLIES PAR L'UTILISATEUR (ne jamais reproposer, meme sous un autre angle) :\n${ctx.writtenTopics.map((t) => `- ${t}`).join('\n')}`
    )
  }

  return parts.length ? parts.join('\n\n') + '\n\n' : ''
}

// Filtre et reordonne les idees generees.
// Ne renvoie jamais moins que `minCount` : les idees ecartees servent de
// complement si le filtrage est trop agressif.
export function rankIdeas(
  ideas: IdeaLike[],
  ctx: ThemeContext,
  minCount: number
): IdeaLike[] {
  const saturated = new Set(ctx.saturated)

  const kept: IdeaLike[] = []
  const rejected: IdeaLike[] = []

  for (const idea of ideas) {
    const label = `${idea.topic || ''} ${idea.title || ''}`
    const duplicate = ctx.writtenTopics.some((t) => tooClose(t, label))
    if (duplicate || (idea.theme && saturated.has(idea.theme))) {
      rejected.push(idea)
    } else {
      kept.push(idea)
    }
  }

  // Themes vierges en premier
  const untouched = new Set(ctx.untouched)
  kept.sort((a, b) => {
    const sa = a.theme && untouched.has(a.theme) ? 0 : 1
    const sb = b.theme && untouched.has(b.theme) ? 0 : 1
    return sa - sb
  })

  const out = kept.concat(rejected).slice(0, Math.max(minCount, kept.length))
  return out.map((idea, i) => ({ ...idea, recommended: i < 2 }))
}
