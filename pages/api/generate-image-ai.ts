import type { NextApiRequest, NextApiResponse } from 'next'
import Anthropic from '@anthropic-ai/sdk'
import { requireAuth } from '../../lib/auth-helper'
import sharp from 'sharp'
import path from 'path'
import fs from 'fs'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const imgRateLimit = new Map<string, { count: number; reset: number }>()
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

  const { postContent, postTopic, profile, hideWatermark } = req.body
  if (!postContent?.trim()) return res.status(400).json({ error: 'Contenu du post manquant' })

  const isPro = profile?.plan === 'pro' || profile?.plan === 'trial'
  if (!isPro) return res.status(403).json({ error: 'PRO_ONLY', message: 'Les visuels IA sont réservés au plan Pro.' })

  const brandAccent = profile?.brand_accent || '#3D52A0'
  const brandSecondary = profile?.brand_color2 || '#32458A'
  const sector = profile?.sector || ''

  // Étape 1 : Claude Haiku analyse le post et prépare le brief visuel
  let visualTitle = postTopic || ''
  let visualPoints: string[] = []
  let layout = 'trois-points'
  let bgDescription = ''
  let postType = 'conseil'

  try {
    const extract = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: `Tu es directeur artistique pour des visuels LinkedIn professionnels photo-réalistes, tous secteurs confondus (tech, immobilier, finance, coaching, RH, santé, cybersécurité, juridique, retail, industrie, etc.). Tu analyses un post et prépares un brief visuel percutant. Réponds UNIQUEMENT en JSON strict, sans markdown.`,
      messages: [{
        role: 'user',
        content: `Analyse ce post LinkedIn et prépare le brief d'un visuel pro photo-réaliste.

POST : "${postContent.slice(0, 800)}"
SECTEUR DE L'AUTEUR : "${sector || 'non précisé — déduis-le du post'}"

Renvoie ce JSON :
{
  "title": "titre accrocheur et court, 5 mots MAX, en MAJUSCULES",
  "subtitle": "phrase d'accroche percutante, 10 mots MAX",
  "postType": "un parmi: alerte | statistique | conseil | comparaison | storytelling",
  "layout": "un parmi: hero-stat (grand chiffre central) | comparaison (2 colonnes) | liste (3-4 points clés) | citation (phrase forte centrale)",
  "points": [{"icon": "emoji simple", "label": "3 mots max", "value": "8 mots max"}],
  "bgPhoto": "description EN ANGLAIS d'une vraie photo professionnelle réaliste liée au SECTEUR (ex: 'modern hospital corridor with blue lighting and medical staff', 'busy trading floor with multiple screens', 'construction site with safety equipment'). Photo concrète, pas abstraite.",
  "overlayStyle": "dark (fond sombre) ou light (fond clair) selon la lisibilité souhaitée"
}

Nombre de points selon layout : hero-stat=1, comparaison=2, liste=3 ou 4, citation=0.`,
      }],
    })
    const txt = (extract.content[0] as { text: string }).text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(txt)
    if (parsed.title) visualTitle = parsed.title
    if (parsed.layout) layout = parsed.layout
    if (parsed.postType) postType = parsed.postType
    if (parsed.bgPhoto) bgDescription = parsed.bgPhoto
    if (Array.isArray(parsed.points)) {
      visualPoints = parsed.points.map((p: { icon?: string; label: string; value: string }) =>
        `${p.icon ? p.icon + ' ' : ''}${p.label} — ${p.value}`
      )
    }
  } catch (e) {
    console.error('[extract]', e)
  }

  const pointsBlock = visualPoints.length
    ? visualPoints.map((p) => `• ${p}`).join('\n')
    : ''

  const layoutGuide: Record<string, string> = {
    'hero-stat': 'UN chiffre/statistique ÉNORME au centre, dominant toute la composition. Titre au-dessus en gras, explication courte en dessous. Effet wow immédiat.',
    'comparaison': 'Deux zones distinctes côte à côte avec séparateur vertical. Contraste fort entre les deux côtés. Titres de colonne clairs et gras.',
    'liste': 'Liste verticale de 3-4 points avec icônes ou numéros. Chaque point sur une ligne avec label en gras et valeur. Hiérarchie claire.',
    'citation': 'UNE phrase forte en très grand, centrée, style citation premium. Auteur ou source en dessous. Beaucoup d\'espace blanc.',
  }

  const designPrompt = `Create a PREMIUM LinkedIn visual, square format 1:1 (1080x1080px). Text in FRENCH.

STYLE : Photo-realistic editorial. Real photo background with professional overlay. NOT an illustration, NOT flat design, NOT a generic template. Think magazine cover or premium media post.

BACKGROUND PHOTO : ${bgDescription || 'professional office environment with natural lighting'}
Apply a semi-transparent overlay (dark gradient or color wash) on the photo so text is perfectly readable.

MAIN TITLE (huge, dominant, bold) : "${visualTitle}"

CONTENT (${layout} layout) :
${layoutGuide[layout] || layoutGuide['liste']}
${pointsBlock || '(no bullet points — emphasize the title as a powerful statement)'}

DESIGN RULES (strictly follow) :
- Typography : Bold sans-serif for titles (think Helvetica Black or similar weight), clean regular for body
- Strong visual hierarchy : title must be immediately dominant
- Semi-transparent dark or colored overlay on photo for text readability
- Color accent : ${brandAccent} for highlights, numbers, underlines, or key elements
- Secondary color : ${brandSecondary}
- Only use these colors + white + black/dark neutrals. No other colors.
- Generous spacing, NO visual clutter
- Premium editorial feel : think Bloomberg, Forbes, Le Monde visual style
- Clean bottom bar or footer area (leave space for watermark)

All text perfectly spelled in FRENCH. Square 1:1 format. Photorealistic, high quality.`

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
    const imagePart = parts.find(
      (p: { inlineData?: { data: string; mimeType?: string } }) => p.inlineData?.data
    )
    if (!imagePart) {
      return res.status(500).json({ error: 'Aucune image générée' })
    }

    let finalImageBase64 = imagePart.inlineData.data
    const mimeType = imagePart.inlineData.mimeType || 'image/png'

    // Watermark logo Ecrira via sharp (sauf si Pro avec hideWatermark)
    const shouldAddWatermark = !hideWatermark
    if (shouldAddWatermark) {
      try {
        const logoPath = path.join(process.cwd(), 'public', 'logo-ecrira.png')
        if (fs.existsSync(logoPath)) {
          const imageBuffer = Buffer.from(finalImageBase64, 'base64')

          // Redimensionner le logo à ~140px de large
          const logoBuffer = await sharp(logoPath)
            .resize({ width: 140, withoutEnlargement: true })
            .png()
            .toBuffer()

          const { width: imgW, height: imgH } = await sharp(imageBuffer).metadata()
          const { width: logoW, height: logoH } = await sharp(logoBuffer).metadata()

          const margin = 24
          const left = (imgW || 1080) - (logoW || 140) - margin
          const top = (imgH || 1080) - (logoH || 40) - margin

          const composited = await sharp(imageBuffer)
            .composite([{
              input: logoBuffer,
              left,
              top,
              blend: 'over',
            }])
            .png()
            .toBuffer()

          finalImageBase64 = composited.toString('base64')
        }
      } catch (wmErr) {
        console.error('[watermark]', wmErr)
        // On continue sans watermark plutôt que de bloquer
      }
    }

    res.status(200).json({
      image: finalImageBase64,
      mimeType: 'image/png',
      layout,
      postType,
    })
  } catch (err) {
    console.error('[generate-image-ai]', err)
    res.status(500).json({ error: 'Erreur génération image IA' })
  }
}
