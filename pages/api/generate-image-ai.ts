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

function escSvg(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '')
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean
  const num = parseInt(full, 16)
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 }
}

function isLight(hex: string): boolean {
  const { r, g, b } = hexToRgb(hex)
  return (r * 299 + g * 587 + b * 114) / 1000 > 128
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
  const textColor = isLight(brandAccent) ? '#1A1A1A' : '#FFFFFF'

  // ── Étape 1 : Haiku extrait le brief ──────────────────────────────────────
  let visualTitle = postTopic || ''
  let statValue = ''
  let statLabel = ''
  let subtitle = ''
  let bgDescription = ''
  let postType = 'conseil'

  try {
    const extract = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: `Tu es directeur artistique pour des visuels LinkedIn professionnels, tous secteurs confondus. Tu analyses un post et extrais les éléments clés pour un visuel percutant. Réponds UNIQUEMENT en JSON strict, sans markdown.`,
      messages: [{
        role: 'user',
        content: `Analyse ce post LinkedIn.

POST : "${postContent.slice(0, 800)}"
SECTEUR : "${sector || 'déduis-le du post'}"

Renvoie ce JSON :
{
  "title": "titre choc, 4 mots MAX, MAJUSCULES, sans ponctuation",
  "subtitle": "accroche courte, 8 mots MAX, minuscules",
  "statValue": "UN chiffre ou % marquant extrait du post, ou chaine vide si aucun",
  "statLabel": "contexte du chiffre, 4 mots max, ou chaine vide",
  "postType": "alerte | statistique | conseil | comparaison | storytelling",
  "bgPhoto": "description EN ANGLAIS d'une photo professionnelle réaliste liée au secteur. PAS de texte dans la scène. Exemples: 'cybersecurity operations center with analysts at workstations', 'modern hospital hallway with soft blue light', 'aerial view of construction site at golden hour'. Scène réaliste et concrète."
}`,
      }],
    })
    const txt = (extract.content[0] as { text: string }).text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(txt)
    if (parsed.title) visualTitle = parsed.title
    if (parsed.subtitle) subtitle = parsed.subtitle
    if (parsed.statValue) statValue = parsed.statValue
    if (parsed.statLabel) statLabel = parsed.statLabel
    if (parsed.bgPhoto) bgDescription = parsed.bgPhoto
    if (parsed.postType) postType = parsed.postType
  } catch (e) {
    console.error('[extract]', e)
  }

  // ── Étape 2 : Gemini génère la photo de fond SANS texte ───────────────────
  const photoPrompt = `Photorealistic professional photo, square format. Scene: ${bgDescription || 'modern professional office with natural lighting'}.

ABSOLUTE RULES — violation is not acceptable:
- NO text, NO words, NO letters, NO numbers, NO signs, NO labels anywhere in the image
- NO watermarks, NO logos, NO UI overlays, NO copyright notices
- NO footer, NO banner, NO white bar at the bottom
- Pure photo only, clean composition
- Cinematic lighting, shallow depth of field, editorial quality`

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

  // ── Étape 3 : Sharp — rogner footer Gemini + overlay brand + texte SVG + logo ──
  try {
    let imageBuffer: Buffer = Buffer.from(rawImageBase64, 'base64')

    // Rogner les ~80px du bas pour éliminer le footer blanc que Gemini génère parfois
    const meta = await sharp(imageBuffer).metadata()
    const W = meta.width || 1080
    const H = meta.height || 1080
    const cropH = Math.round(H * 0.93) // on garde 93% de la hauteur
    const croppedBuf = await sharp(imageBuffer)
      .extract({ left: 0, top: 0, width: W, height: cropH })
      .resize(W, H, { fit: 'fill' })
      .png()
      .toBuffer() as unknown as Buffer
    imageBuffer = croppedBuf

    const { r, g, b } = hexToRgb(brandAccent)
    const { r: r2, g: g2, b: b2 } = hexToRgb(brandSecondary)

    const hasStat = statValue.length > 0
    const padding = 56
    const titleFontSize = visualTitle.length > 15 ? 76 : visualTitle.length > 10 ? 92 : 108
    const statFontSize = 156
    const subtitleFontSize = 36

    // Zone texte : démarre à 42% de hauteur
    const textZoneY = Math.round(H * 0.42)
    const titleY = textZoneY + 72
    const statY = titleY + titleFontSize + 16
    const subtitleY = hasStat ? statY + statFontSize : titleY + titleFontSize + 48

    const svgOverlay = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgb(${r},${g},${b})" stop-opacity="0"/>
      <stop offset="30%" stop-color="rgb(${r},${g},${b})" stop-opacity="0.1"/>
      <stop offset="50%" stop-color="rgb(${r},${g},${b})" stop-opacity="0.78"/>
      <stop offset="100%" stop-color="rgb(${r2},${g2},${b2})" stop-opacity="0.95"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#g1)"/>
  <rect x="${padding}" y="${textZoneY - 6}" width="${Math.round(W * 0.5)}" height="5" fill="${brandAccent}" rx="2"/>
  <text x="${padding}" y="${titleY}" font-family="'Arial Black','Helvetica Neue',Arial,sans-serif" font-weight="900" font-size="${titleFontSize}" fill="${textColor}" letter-spacing="-1">${escSvg(visualTitle)}</text>
  ${hasStat ? `
  <text x="${padding}" y="${statY}" font-family="'Arial Black','Helvetica Neue',Arial,sans-serif" font-weight="900" font-size="${statFontSize}" fill="${textColor}">${escSvg(statValue)}</text>
  ${statLabel ? `<text x="${padding}" y="${statY + 42}" font-family="Arial,sans-serif" font-size="30" fill="${textColor}" opacity="0.85">${escSvg(statLabel)}</text>` : ''}
  ` : ''}
  ${subtitle ? `<text x="${padding}" y="${subtitleY}" font-family="Arial,sans-serif" font-size="${subtitleFontSize}" fill="${textColor}" opacity="0.88">${escSvg(subtitle)}</text>` : ''}
</svg>`

    let composited = await sharp(imageBuffer)
      .composite([{ input: Buffer.from(svgOverlay), blend: 'over' }])
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
