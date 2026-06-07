import type { NextApiRequest, NextApiResponse } from 'next'
import Anthropic from '@anthropic-ai/sdk'
import { requireAuth } from '../../lib/auth-helper'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const userId = await requireAuth(req, res)
  if (!userId) return

  const { postContent, postTopic, profile, visualType = 'classique', hideWatermark = false } = req.body
  const isPro = profile?.plan === 'pro'
  const showWatermark = !isPro || !hideWatermark
  if (!postContent?.trim()) return res.status(400).json({ error: 'Contenu du post manquant' })

  const sector = profile?.sector || 'B2B'
  const company = profile?.company || ''
  const name = profile?.name || ''
  const role = profile?.role || ''
  const brandBg = profile?.brand_bg || '#FAF9F7'
  const brandAccent = profile?.brand_accent || '#516756'

  // Extraire les points clés du post (max 3)
  const lines = postContent
    .split('\n')
    .map((l: string) => l.trim())
    .filter((l: string) => l.length > 20 && l.length < 120)
    .slice(0, 3)

  const keyPoints = lines.length > 0 ? lines : [postContent.substring(0, 100)]

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      messages: [{
        role: 'user',
        content: `Tu es un expert en design graphique premium pour LinkedIn B2B. Tu crées des visuels SVG modernes, percutants et professionnels.

Génère un SVG LinkedIn portrait (1080x1350px) de haute qualité pour ce post :

SUJET : ${postTopic || 'Post LinkedIn'}
AUTEUR : ${name}${role ? ' — ' + role : ''}${company ? ' @ ' + company : ''}
SECTEUR : ${sector}
POINTS CLÉS :
${keyPoints.map((p: string, i: number) => `${i + 1}. ${p}`).join('\n')}

CHARTE GRAPHIQUE :
- Fond principal : ${brandBg}
- Couleur accent : ${brandAccent}
- Secondaire : #B7C0B8
- Champagne : #D9C8A3
- Charcoal : #1F2421
- Font : Arial, Helvetica, sans-serif uniquement

STRUCTURE (dans l'ordre vertical) :
1. HEADER (0-200px) — Dégradé de ${brandAccent} vers une version légèrement plus sombre. Nom entreprise "${company || 'Content Studio'}" bold blanc 54px à gauche (x=72, y=90). Sous-titre rôle/secteur en blanc 60% opacité 22px (x=72, y=135). Badge secteur arrondi à droite (rx=24, fill blanc 20% opacité, texte blanc bold 19px centré).

2. TITRE (200-500px) — Fond ${brandBg}. Accent bar : rect 72px large, 6px haut, rx=3, fill=${brandAccent}, y=220. Titre du sujet en ${brandAccent} bold 54px, max 2 lignes, x=72, y=300 et y=368. Sous-titre italic 24px charcoal à y=435.

3. SÉPARATEUR — Ligne décorative avec 3 cercles centrés.

4. POINTS CLÉS (520-1080px) — Fond blanc. Label "POINTS CLÉS" gris clair letter-spacing=4. 3 blocs cards avec rx=14, fond ${brandBg}, border ${brandAccent} 15% opacité. Chaque bloc : numéro cerclé ${brandAccent} à gauche, titre bold 26px #1F2421, sous-titre 20px ${brandAccent} 80% opacité. Décoration géométrique discrète dans le dernier bloc (cercles concentriques stroke only).

5. STAT HIGHLIGHT (1080-1200px) — Fond ${brandAccent} 10% opacité. Chiffre/stat clé du post en ${brandAccent} bold 52px centré, label 20px #1F2421 centré.

6. FOOTER (1200-1350px) — Fond #1F2421. Ligne décorative ${brandAccent} 3px en haut. Cercle avatar ${brandAccent} 25% opacité + initiales bold blanc. Nom "${name}" bold blanc 28px, rôle gris clair 21px. Badge LinkedIn arrondi ${brandAccent} à droite avec handle.

RÈGLES TECHNIQUES ABSOLUES :
- Padding horizontal partout : 72px minimum
- PAS de foreignObject, PAS de CSS, PAS de filter, PAS de backdrop-filter
- PAS de polices custom (pas de @import, pas de Google Fonts via SVG)
- Uniquement rect, text, circle, line, path, defs, linearGradient, stop
- Les dégradés via <defs><linearGradient>
- Texte long : découpe en plusieurs <text> avec tspan ou balises text séparées
- Tous les textes doivent être dans les limites 72px ↔ 1008px
TYPE DE VISUEL DEMANDÉ : ${visualType.toUpperCase()}
- 'classique' : structure header/titre/points clés/stat/footer
- 'timeline' : frise chronologique verticale avec étapes numérotées et connecteurs
- 'stat' : visuel centré sur un chiffre/stat impactant avec contexte minimaliste
- 'citation' : grande citation mise en valeur avec auteur et contexte
- 'liste' : liste structurée avec icônes/puces visuelles, sans header lourd
Adapte TOUTE la structure et la composition au type demandé.

${showWatermark ? '- WATERMARK OBLIGATOIRE : texte "ecrira.com" en bas à droite, font-size=16, fill=%239EA39C, opacity=0.7, x=980, y=1330, text-anchor=end' : '- PAS de mention Ecrira'}

Réponds UNIQUEMENT avec le code SVG complet, commençant par <svg et finissant par </svg>. Aucun texte avant ou après.`,      }],
    })

    const svgRaw = (message.content[0] as { text: string }).text

    // Nettoyer les backticks markdown (```svg, ```xml, ```)
    const svgCleaned = svgRaw
      .replace(/^```(?:svg|xml)?\s*/m, '')
      .replace(/\s*```\s*$/m, '')
      .trim()

    // Extraire le SVG — avec ou sans closing tag (troncature possible)
    let svgClean = ''
    const svgMatch = svgCleaned.match(/<svg[\s\S]*/i)
    if (!svgMatch) {
      console.error('Pas de SVG trouvé après nettoyage')
      return res.status(500).json({ error: 'Génération SVG invalide' })
    }
    svgClean = svgMatch[0]
    // Ajouter </svg> si manquant
    if (!svgClean.includes('</svg>')) svgClean += '</svg>'

    // Sanitisation SVG : supprimer scripts, event handlers, liens javascript
    const svgSafe = svgClean
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/data:text\/html/gi, '')

    res.status(200).json({ svgContent: svgSafe })

  } catch (err: any) {
    console.error('Generate visual error:', err)
    res.status(500).json({ error: err.message || 'Erreur serveur' })
  }
}
