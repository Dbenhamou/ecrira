import type { NextApiRequest, NextApiResponse } from 'next'
import Anthropic from '@anthropic-ai/sdk'
import { requireAuth } from '../../lib/auth-helper'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const userId = await requireAuth(req, res)
  if (!userId) return

  const { postContent, postTopic, profile } = req.body
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
        content: `Tu es un expert en design SVG premium pour LinkedIn B2B.

Génère un SVG LinkedIn portrait (1080x1350px) de haute qualité pour ce post :

SUJET : ${postTopic || 'Post LinkedIn'}
AUTEUR : ${name}${role ? ' — ' + role : ''}${company ? ' @ ' + company : ''}
SECTEUR : ${sector}
POINTS CLÉS :
${keyPoints.map((p: string, i: number) => `${i + 1}. ${p}`).join('\n')}

CHARTE GRAPHIQUE OBLIGATOIRE :
- Fond principal : ${brandBg}
- Couleur accent : ${brandAccent}
- Couleur secondaire : #B7C0B8
- Champagne : #D9C8A3
- Charcoal : #1F2421
- IMPORTANT : utilise UNIQUEMENT font-family="Arial, Helvetica, sans-serif" — pas de system-ui ni polices custom

STRUCTURE DU VISUEL (dans l'ordre vertical) :
1. Header (hauteur 180px) — fond ${brandAccent}, nom entreprise "${company || 'Content Studio'}" en blanc à gauche, secteur en badge à droite. PAS de mention Ecrira.
2. Zone titre (hauteur 280px) — fond ${brandBg}, grand titre du sujet en ${brandAccent} (font-size 52px, font-weight bold, max 2 lignes)
3. Séparateur décoratif — ligne simple
4. Zone points clés (hauteur 580px) — fond blanc, 3 blocs avec numéro cerclé en ${brandAccent} + texte en #1F2421
5. Footer (hauteur 160px) — fond #1F2421, nom auteur en blanc + rôle en #B7C0B8. PAS de mention Ecrira.
6. Bordure décorative gauche — bande verticale de 8px en ${brandAccent}

RÈGLES DESIGN :
- Padding horizontal : 64px
- Coins arrondis sur les blocs : rx="12"
- Numéros cerclés : cercle ${brandAccent} 44px, chiffre blanc bold
- Texte points clés : 26px, fill="#1F2421"
- Titre max 2 lignes — tronque si nécessaire
- PAS de filtres CSS complexes, PAS de backdrop-filter, PAS de foreignObject
- Utilise uniquement des éléments SVG basiques : rect, text, circle, line, path

Réponds UNIQUEMENT avec le code SVG complet, commençant par <svg et finissant par </svg>. Aucun texte avant ou après.`,
      }],
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
