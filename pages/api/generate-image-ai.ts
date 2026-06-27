import type { NextApiRequest, NextApiResponse } from 'next'
import Anthropic from '@anthropic-ai/sdk'
import { requireAuth } from '../../lib/auth-helper'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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

  const brandAccent = profile?.brand_accent || '#3D52A0'
  const brandSecondary = profile?.brand_color2 || '#32458A'

  // Étape 1 : Claude extrait le contenu ultra-court pour le visuel
  let visualTitle = postTopic || ''
  let visualPoints: string[] = []
  try {
    const extract = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: 'Tu extrais le contenu pour une infographie LinkedIn minimaliste. Réponds UNIQUEMENT en JSON strict, sans markdown.',
      messages: [{
        role: 'user',
        content: `À partir de ce post LinkedIn, extrais :
- "title" : un titre accrocheur de 6 mots MAXIMUM
- "points" : un tableau de EXACTEMENT 3 éléments, chacun avec "label" (3 mots max) et "value" (8 mots max, percutant)

POST : "${postContent.slice(0, 700)}"

Réponds en JSON : {"title": "...", "points": [{"label":"...","value":"..."}, ...]}`,
      }],
    })
    const txt = (extract.content[0] as { text: string }).text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(txt)
    if (parsed.title) visualTitle = parsed.title
    if (Array.isArray(parsed.points)) visualPoints = parsed.points.map((p: {label:string,value:string}) => `${p.label} — ${p.value}`)
  } catch (e) {
    console.error('[extract]', e)
  }

  const pointsBlock = visualPoints.length ? visualPoints.map((p,i)=>`${i+1}. ${p}`).join('\n') : ''

  const designPrompt = `Crée une infographie LinkedIn premium et minimaliste au format carré 1:1 (1080x1080), en FRANÇAIS.

TITRE (à afficher en grand, en haut) : "${visualTitle}"

LES 3 SEULS ÉLÉMENTS À AFFICHER (rien d'autre) :
${pointsBlock}

RÈGLES DE CONTENU (strict) :
- Affiche le titre en grand + EXACTEMENT ces 3 éléments, pas plus
- Chaque élément : un label court + une icône minimaliste. Texte très court.
- Beaucoup d'espace négatif, épuré, aéré. AUCUNE surcharge de texte.

RÈGLES GRAPHIQUES (premium) :
- Composition travaillée avec profondeur : formes organiques, dégradés subtils, ombres douces
- Style éditorial moderne, type magazine tech haut de gamme
- Icônes minimalistes et élégantes
- Hiérarchie visuelle forte : le titre domine, les éléments respirent

PALETTE OBLIGATOIRE (STRICTE) :
- Couleur dominante : ${brandAccent}
- Couleur secondaire : ${brandSecondary}
- Fond clair et neutre
- N'utilise QUE ces teintes + neutres. Pas de cyan, pas de vert.

Texte FRANÇAIS parfaitement orthographié. Format carré 1:1.`

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
