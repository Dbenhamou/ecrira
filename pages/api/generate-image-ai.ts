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

  const designPrompt = `Tu es un directeur artistique. À partir de ce post LinkedIn, crée une infographie professionnelle au format carré (1080x1080).

POST : "${postTopic}"
CONTENU : "${postContent.slice(0, 800)}"
SECTEUR : ${sector}
COULEUR PRINCIPALE : ${brandAccent}

Génère une infographie LinkedIn professionnelle et moderne :
- Titre accrocheur en gros (extrait du post)
- 3 à 4 points clés avec icônes
- Un chiffre ou statistique en évidence si présent dans le post
- Palette : ${brandAccent} comme couleur dominante, fond clair, accents
- Style : épuré, corporate, premium, type infographie cybersécurité/tech
- Texte en FRANÇAIS, parfaitement lisible
- Format carré 1:1`

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
