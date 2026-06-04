import type { NextApiRequest, NextApiResponse } from 'next'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

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
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
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
- Couleur accent : ${brandAccent} (Forest Sage)
- Couleur secondaire : #B7C0B8 (Soft Sage)
- Champagne : #D9C8A3
- Charcoal : #1F2421
- Ivory : #FAF9F7
- Polices : system-ui, sans-serif (Inter style)

STRUCTURE DU VISUEL (dans l'ordre vertical) :
1. Header (hauteur 180px) — fond ${brandAccent}, logo "E" + "ECRIRA" en blanc à gauche, secteur en badge à droite
2. Zone titre (hauteur 280px) — fond ${brandBg}, grand titre du sujet en ${brandAccent} (font-size 52px, font-weight 700, max 2 lignes)
3. Séparateur décoratif — ligne champagne + accent géométrique
4. Zone points clés (hauteur 580px) — fond blanc, 3 blocs avec numéro cerclé en ${brandAccent} + texte en #1F2421
5. Footer (hauteur 160px) — fond #1F2421, nom auteur en blanc + rôle en #B7C0B8 + site "ecrira.com" à droite
6. Bordure décorative gauche — bande verticale de 8px en ${brandAccent}

RÈGLES DESIGN :
- Padding horizontal : 64px partout
- Coins arrondis sur les blocs internes : rx="16"
- Ombres légères sur les blocs points clés
- Numéros cerclés : cercle ${brandAccent} 44px, chiffre blanc bold
- Texte points clés : 28px, line-height 1.5, couleur #1F2421
- Le titre doit tenir en 2 lignes max — tronque si nécessaire
- Style épuré, beaucoup d'espace blanc, premium B2B

Réponds UNIQUEMENT avec le code SVG complet, commençant par <svg et finissant par </svg>. Aucun texte avant ou après.`,
      }],
    })

    const svgRaw = (message.content[0] as { text: string }).text

    // Nettoyer les backticks markdown (```svg, ```xml, ```)
    const svgCleaned = svgRaw
      .replace(/^```(?:svg|xml)?\s*/m, '')
      .replace(/\s*```\s*$/m, '')
      .trim()

    // Extraire le SVG
    const svgMatch = svgCleaned.match(/<svg[\s\S]*<\/svg>/i)
    if (!svgMatch) {
      console.error('Pas de SVG trouvé après nettoyage:', svgCleaned.substring(0, 200))
      return res.status(500).json({ error: 'Génération SVG invalide' })
    }
    const svgClean = svgMatch[0]

    // Encoder en data URL SVG directe
    const encoded = encodeURIComponent(svgClean)
    const imageUrl = `data:image/svg+xml,${encoded}`

    res.status(200).json({ imageUrl, svgContent: svgClean })

  } catch (err: any) {
    console.error('Generate visual error:', err)
    res.status(500).json({ error: err.message || 'Erreur serveur' })
  }
}
