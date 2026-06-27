import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAuth } from '../../lib/auth-helper'

// Rate limiting — max 10 images IA par heure par user
const imgRateLimit = new Map<string, {count: number, reset: number}>()
function checkImgRateLimit(userId: string): boolean {
  const now = Date.now()
  const limit = imgRateLimit.get(userId)
  if (!limit || now > limit.reset) {
    imgRateLimit.set(userId, { count: 1, reset: now + 3600_000 })
    return true
  }
  if (limit.count >= 10) return false
  limit.count++
  return true
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const userId = await requireAuth(req, res)
  if (!userId) return

  if (!checkImgRateLimit(userId)) {
    return res.status(429).json({ error: 'RATE_LIMIT', message: 'Limite de 10 images par heure atteinte.' })
  }

  const { postContent, postTopic, profile } = req.body
  if (!postContent?.trim()) return res.status(400).json({ error: 'Contenu du post manquant' })

  const isPro = profile?.plan === 'pro' || profile?.plan === 'trial'
  if (!isPro) return res.status(403).json({ error: 'PRO_ONLY', message: 'Les visuels IA sont réservés au plan Pro.' })

  const sector = profile?.sector || 'B2B'
  const brandAccent = profile?.brand_accent || '#3D52A0'
  const brandSecondary = profile?.brand_color2 || '#32458A'

  const designPrompt = `Crée une infographie LinkedIn premium et minimaliste au format carré 1:1 (1080x1080), en FRANÇAIS.

SUJET : "${postTopic}"
CONTEXTE (pour comprendre, NE PAS tout afficher) : "${postContent.slice(0, 600)}"
SECTEUR : ${sector}

RÈGLES DE CONTENU (strict) :
- Un GRAND titre accrocheur en haut (une phrase courte, percutante)
- MAXIMUM 2 à 3 éléments clés seulement (pas plus). Choisis les plus importants.
- Si un chiffre fort existe, mets-le en évidence visuelle
- Beaucoup d'espace négatif, épuré, aéré. PAS de surcharge.

RÈGLES GRAPHIQUES (premium) :
- Composition travaillée avec profondeur : formes organiques, dégradés subtils, ombres douces
- Style éditorial moderne, type magazine tech / cybersécurité haut de gamme
- Icônes minimalistes et élégantes pour illustrer les 2-3 points
- Hiérarchie visuelle forte : le titre domine, les éléments respirent

PALETTE OBLIGATOIRE (à respecter STRICTEMENT) :
- Couleur dominante : ${brandAccent}
- Couleur secondaire : ${brandSecondary}
- Fond clair et neutre
- N'utilise QUE ces teintes + neutres. Pas de cyan, pas de vert, pas d'autres couleurs.

Texte FRANÇAIS parfaitement orthographié et lisible. Format carré 1:1.`

  try {
    const apiKey = process.env.GOOGLE_AI_API_KEY
    if (!apiKey) return res.status(500).json({ error: 'Clé API Google manquante' })

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent',
      {
        method: 'POST',
        headers: {
          'x-goog-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: designPrompt }] }],
          generationConfig: {
            responseModalities: ['IMAGE'],
            imageConfig: { aspectRatio: '1:1' },
          },
        }),
      }
    )

    const data = await response.json()
    if (!response.ok) {
      console.error('[gemini-image]', JSON.stringify(data).slice(0, 500))
      return res.status(500).json({ error: 'Erreur génération image', detail: data?.error?.message })
    }

    const parts = data?.candidates?.[0]?.content?.parts || []
    const imagePart = parts.find((p: { inlineData?: { data: string, mimeType?: string } }) => p.inlineData?.data)
    if (!imagePart) {
      return res.status(500).json({ error: 'Aucune image générée' })
    }

    res.status(200).json({ image: imagePart.inlineData.data, mimeType: imagePart.inlineData.mimeType || 'image/png' })
  } catch (err) {
    console.error('[generate-image-ai]', err)
    res.status(500).json({ error: 'Erreur génération image IA' })
  }
}
