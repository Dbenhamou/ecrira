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

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '')
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean
  const num = parseInt(full, 16)
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 }
}

// Translitère les caractères français en ASCII pour Gemini
function toAscii(str: string): string {
  return str
    .replace(/[àâä]/g, 'a').replace(/[éèêë]/g, 'e').replace(/[îï]/g, 'i')
    .replace(/[ôö]/g, 'o').replace(/[ùûü]/g, 'u').replace(/[ç]/g, 'c')
    .replace(/[ÀÂÄ]/g, 'A').replace(/[ÉÈÊË]/g, 'E').replace(/[ÎÏ]/g, 'I')
    .replace(/[ÔÖ]/g, 'O').replace(/[ÙÛÜ]/g, 'U').replace(/[Ç]/g, 'C')
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

  // ── Étape 1 : Haiku extrait le brief ──────────────────────────────────────
  let visualTitle = postTopic || ''
  let statValue = ''
  let statLabel = ''
  let bgDescription = ''
  let postType = 'conseil'

  try {
    const extract = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: `Tu es directeur artistique pour des visuels LinkedIn professionnels, tous secteurs confondus. Tu analyses un post et extrais les éléments clés. Réponds UNIQUEMENT en JSON strict, sans markdown.`,
      messages: [{
        role: 'user',
        content: `Analyse ce post LinkedIn.

POST : "${postContent.slice(0, 800)}"
SECTEUR : "${sector || 'déduis-le du post'}"

Renvoie ce JSON :
{
  "title": "titre percutant, 3 mots MAX, MAJUSCULES, SANS accents, SANS ponctuation. Si comparaison utilise TOUJOURS 'VS' (jamais VERSUS). Ex: 'SOC VS EXPERT', 'AGIR OU ATTENDRE', 'ROI X3'. Sinon titre simple ex: 'PROTECTION REELLE', 'CROISSANCE 2024'.",
  "statValue": "UN chiffre ou % marquant extrait du post (ex: '43%', '3x', '10k'), ou chaine vide si aucun",
  "statLabel": "contexte du chiffre, 3 mots MAX, SANS accents, ou chaine vide",
  "postType": "alerte | statistique | conseil | comparaison | storytelling",
  "bgPhoto": "description EN ANGLAIS d'une photo professionnelle réaliste liée au secteur, sans texte dans la scene. Ex: 'cybersecurity operations center with analysts at screens', 'modern hospital hallway with blue ambient light', 'construction site aerial view golden hour'."
}`,
      }],
    })
    const txt = (extract.content[0] as { text: string }).text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(txt)
    if (parsed.title) visualTitle = toAscii(parsed.title)
    if (parsed.statValue) statValue = parsed.statValue
    if (parsed.statLabel) statLabel = toAscii(parsed.statLabel)
    if (parsed.bgPhoto) bgDescription = parsed.bgPhoto
    if (parsed.postType) postType = parsed.postType
  } catch (e) {
    console.error('[extract]', e)
  }

  // ── Étape 2 : Gemini génère photo + texte intégré ─────────────────────────
  const hasStat = statValue.length > 0

  const textInstructions = hasStat
    ? `TEXT TO INCLUDE IN THE IMAGE:
- TOP THIRD: Bold title "${visualTitle}" in white, large font, clean — NOT oversized
- CENTER: Giant stat "${statValue}" dominant, bold white or light accent color
- BELOW STAT: Small subtle label "${statLabel}" in white, much smaller font
- Generous empty space around each text element — NO clutter`
    : `TEXT TO INCLUDE IN THE IMAGE:
- LOWER THIRD only: Bold title "${visualTitle}" in white, large clean font
- Large empty space in upper half — editorial negative space
- Subtle semi-transparent dark bar behind text for readability`

  const photoPrompt = `Create a PREMIUM LinkedIn visual, square 1:1 format (1080x1080px).

BACKGROUND SCENE: ${bgDescription || 'modern professional office environment'}
Style: photorealistic, cinematic lighting, editorial quality, shallow depth of field

${textInstructions}

DESIGN RULES:
- Primary brand color ${brandAccent} used for accents, underlines, or color highlights
- Secondary color ${brandSecondary} for gradients or secondary elements  
- Semi-transparent dark overlay on photo bottom half so text is perfectly readable
- Bold sans-serif typography (Helvetica Black style), clean and impactful
- NO watermark text, NO "Watermark" word, NO footer bar, NO copyright notice
- Leave bottom-right corner (100x100px) empty for logo overlay
- Premium editorial look: Bloomberg/Forbes magazine style
- All text must be crisp, perfectly rendered, easy to read`

  let rawImageBase64 = ''

  try {
    const apiKey = process.env.GOOGLE_AI_API_KEY
    if (!apiKey) return res.status(500).json({ error: 'Clé API Google manquante' })

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent',
      {
        method: 'POST',
        headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: photoPrompt }] }],
          generationConfig: {
            responseModalities: ['IMAGE'],
            imageConfig: { aspectRatio: '1:1' },
          },
        }),
      }
    )

    const data = await response.json()
    if (!response.ok) {
      console.error('[gemini]', JSON.stringify(data).slice(0, 500))
      return res.status(500).json({ error: 'Erreur génération image', detail: data?.error?.message })
    }

    const parts = data?.candidates?.[0]?.content?.parts || []
    const imagePart = parts.find((p: { inlineData?: { data: string; mimeType?: string } }) => p.inlineData?.data)
    if (!imagePart) return res.status(500).json({ error: 'Aucune image générée' })

    rawImageBase64 = imagePart.inlineData.data
  } catch (err) {
    console.error('[gemini]', err)
    return res.status(500).json({ error: 'Erreur génération image IA' })
  }

  // ── Étape 3 : Sharp — rogner footer + overlay gradient + logo ─────────────
  try {
    let imageBuffer: Buffer = Buffer.from(rawImageBase64, 'base64')

    const meta = await sharp(imageBuffer).metadata()
    const W = meta.width || 1080
    const H = meta.height || 1080

    // Rogner les ~7% du bas (footer blanc Gemini)
    const cropH = Math.round(H * 0.93)
    const croppedBuf = await sharp(imageBuffer)
      .extract({ left: 0, top: 0, width: W, height: cropH })
      .resize(W, H, { fit: 'fill' })
      .png()
      .toBuffer() as unknown as Buffer
    imageBuffer = croppedBuf

    // Overlay gradient brand (SVG sans texte — juste la couleur)
    const { r, g, b } = hexToRgb(brandAccent)
    const { r: r2, g: g2, b: b2 } = hexToRgb(brandSecondary)

    const svgOverlay = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgb(${r},${g},${b})" stop-opacity="0"/>
      <stop offset="60%" stop-color="rgb(${r},${g},${b})" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="rgb(${r2},${g2},${b2})" stop-opacity="0.45"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#g1)"/>
</svg>`

    let composited = await sharp(imageBuffer)
      .composite([{ input: Buffer.from(svgOverlay, 'utf-8'), blend: 'over' }])
      .png()
      .toBuffer()

    // Logo icône Ecrira (sauf hideWatermark)
    if (!hideWatermark) {
      const logoPath = path.join(process.cwd(), 'public', 'logo-ecrira-icon-bleu.png')
      if (fs.existsSync(logoPath)) {
        const logoResized = await sharp(logoPath)
          .resize({ width: 52, withoutEnlargement: true })
          .png()
          .toBuffer()
        const { width: lw = 52, height: lh = 52 } = await sharp(logoResized).metadata()
        const margin = 24
        composited = await sharp(composited)
          .composite([{
            input: logoResized,
            left: W - lw - margin,
            top: H - lh - margin,
            blend: 'over',
          }])
          .png()
          .toBuffer()
      }
    }

    res.status(200).json({
      image: composited.toString('base64'),
      mimeType: 'image/png',
      layout: hasStat ? 'hero-stat' : 'citation',
      postType,
    })
  } catch (err) {
    console.error('[composite]', err)
    res.status(500).json({ error: 'Erreur composition image' })
  }
}
