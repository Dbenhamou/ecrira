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
  const { r, g, b } = hexToRgb(brandAccent)
  const { r: r2, g: g2, b: b2 } = hexToRgb(brandSecondary)

  // ── Étape 1 : Haiku — brief sectoriel ────────────────────────────────────
  let title = toAscii(postTopic || 'EXPERTISE')
  let stat = ''
  let statLabel = ''
  let bgPhoto = 'modern professional office cinematic lighting'
  let postType = 'conseil'

  try {
    const extract = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: 'Tu es directeur artistique pour des visuels LinkedIn premium, tous secteurs. Reponds UNIQUEMENT en JSON strict sans markdown.',
      messages: [{
        role: 'user',
        content: [
          'Analyse ce post LinkedIn et prepare un brief visuel.',
          '',
          'POST : "' + postContent.slice(0, 800) + '"',
          'SECTEUR : "' + (sector || 'deduis-le du post') + '"',
          '',
          'Regles pour le titre :',
          '- 3 mots MAX, MAJUSCULES, SANS accents, SANS ponctuation',
          '- Si comparaison entre 2 options : format "X VS Y" ex "SOC VS EXPERT"',
          '- Sinon titre court et impactant ex "SESSIONS OUVERTES", "RISQUE REEL", "ROI X3"',
          '',
          'Renvoie ce JSON :',
          '{',
          '  "title": "3 mots MAX voir regles",',
          '  "stat": "UN chiffre cle ex 70% ou 3x ou 10k, vide si aucun dans le post",',
          '  "statLabel": "contexte 4 mots MAX, UNIQUEMENT lettres de base a-z A-Z 0-9 espace, ZERO accent ZERO caractere special. Ex: des attaques la nuit, de gain de temps, des PME touchees",',
          '  "postType": "comparaison | statistique | alerte | conseil | storytelling",',
          '  "bgPhoto": "EN ANGLAIS, description precise photo realiste pro liee au secteur. Ex cyber: cybersecurity operations center analysts watching threat screens dramatic blue light. Sante: hospital emergency room doctors nurses working night shift. Coaching: executive coach and client in modern bright office. Immobilier: luxury penthouse living room with panoramic city view. Finance: busy trading floor multiple screens data. RH: diverse team collaborative meeting modern workspace."',
          '}',
        ].join('\n'),
      }],
    })

    const txt = (extract.content[0] as { text: string }).text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(txt)
    if (parsed.title) title = toAscii(parsed.title).slice(0, 30)
    if (parsed.stat) stat = toAscii(parsed.stat)
    if (parsed.statLabel) statLabel = toAscii(parsed.statLabel)
    if (parsed.bgPhoto) bgPhoto = parsed.bgPhoto
    if (parsed.postType) postType = parsed.postType
  } catch (e) {
    console.error('[haiku]', e)
  }

  // ── Étape 2 : Gemini — visuel photo réaliste plein écran ─────────────────
  const textBlock = stat
    ? [
        'Title "' + title + '" — bold white, large, top area',
        'Stat "' + stat + '" — enormous dominant center',
        'Label "' + statLabel + '" — small white below stat',
      ].join('. ')
    : 'Title "' + title + '" — bold white, very large, lower third of image'

  const geminiPrompt = [
    'Create a PREMIUM LinkedIn square visual (1080x1080px).',
    '',
    'PHOTO: ' + bgPhoto,
    'Style: photorealistic, cinematic, editorial quality, shallow depth of field, dramatic lighting.',
    '',
    'TEXT TO RENDER IN THE IMAGE:',
    textBlock,
    '',
    'TYPOGRAPHY & LAYOUT:',
    '- Bold heavy sans-serif (like Helvetica Black) for title and stat',
    '- Semi-transparent dark overlay behind text for readability',
    '- Generous empty space — never cramped',
    '- Accent color ' + brandAccent + ' for underlines, highlights or stat color',
    '- Secondary color ' + brandSecondary + ' for gradient or secondary accents',
    '',
    'ABSOLUTE RULES:',
    '- Photorealistic background, NOT flat design, NOT illustration',
    '- Do NOT add any text other than what is specified above',
    '- Do NOT add a black bar, dark strip or solid color band at the top or bottom of the image',
    '- Do NOT put any box, frame, rectangle or background shape behind the stat label text',
    '- The photo must fill the ENTIRE image edge to edge, no borders, no bands, no letterboxing',
    '- Stat and title color must use ONLY ' + brandAccent + ' or white — no random blue, no purple',
    '- Do NOT write watermark, copyright, footer, logo or any label',
    '- Do NOT add colored blocks, frames or zones not described above',
    '- Bottom-right corner (100x100px) must be completely empty',
    '- Each text element appears exactly once',
    '- Do NOT put any rectangle, box or dark background specifically behind the title text',
    '- Image must look like a premium Bloomberg or Forbes social post',
  ].join('\n')

  let rawImageBase64 = ''

  try {
    const apiKey = process.env.GOOGLE_AI_API_KEY
    if (!apiKey) return res.status(500).json({ error: 'Cle API Google manquante' })

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent',
      {
        method: 'POST',
        headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: geminiPrompt }] }],
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
      return res.status(500).json({ error: 'Erreur generation image', detail: data?.error?.message })
    }

    const parts = data?.candidates?.[0]?.content?.parts || []
    const imagePart = parts.find((p: { inlineData?: { data: string; mimeType?: string } }) => p.inlineData?.data)
    if (!imagePart) return res.status(500).json({ error: 'Aucune image generee' })

    rawImageBase64 = imagePart.inlineData.data
  } catch (err) {
    console.error('[gemini]', err)
    return res.status(500).json({ error: 'Erreur generation image IA' })
  }

  // ── Étape 3 : Sharp — rogner proprement + overlay léger + logo ────────────
  try {
    let imageBuffer: Buffer = Buffer.from(rawImageBase64, 'base64')

    const meta = await sharp(imageBuffer).metadata()
    const W = meta.width || 1080
    const H = meta.height || 1080

    // Rogner haut (bande noire) + bas (footer Gemini)
    const topCrop = Math.round(H * 0.06)
    const botCrop = Math.round(H * 0.07)
    const cropH = H - topCrop - botCrop
    const croppedBuf = await sharp(imageBuffer)
      .extract({ left: 0, top: topCrop, width: W, height: cropH })
      .resize(W, W, { fit: 'cover', position: 'centre' })
      .png()
      .toBuffer() as unknown as Buffer
    imageBuffer = croppedBuf

    // Overlay gradient brand très léger — renforce cohérence couleur sans cacher la photo
    const svgOverlay = [
      '<svg width="' + W + '" height="' + W + '" xmlns="http://www.w3.org/2000/svg">',
      '<defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">',
      '<stop offset="0%" stop-color="rgb(' + r + ',' + g + ',' + b + ')" stop-opacity="0"/>',
      '<stop offset="65%" stop-color="rgb(' + r + ',' + g + ',' + b + ')" stop-opacity="0.05"/>',
      '<stop offset="100%" stop-color="rgb(' + r2 + ',' + g2 + ',' + b2 + ')" stop-opacity="0.18"/>',
      '</linearGradient></defs>',
      '<rect width="' + W + '" height="' + W + '" fill="url(#g1)"/>',
      '</svg>',
    ].join('')

    let composited = await sharp(imageBuffer)
      .composite([{ input: Buffer.from(svgOverlay, 'utf-8'), blend: 'over' }])
      .png()
      .toBuffer()

    // Patch zone logo — recouvrir le fond blanc Gemini avant de poser le logo
    {
      const patchSize = 80
      const patchLeft = W - patchSize - 10
      const patchTop = W - patchSize - 10
      const patchSvg = '<svg width="' + patchSize + '" height="' + patchSize + '" xmlns="http://www.w3.org/2000/svg"><rect width="' + patchSize + '" height="' + patchSize + '" fill="rgb(' + r2 + ',' + g2 + ',' + b2 + ')" opacity="0.0"/></svg>'
      composited = await sharp(composited)
        .composite([{ input: Buffer.from(patchSvg, 'utf-8'), left: patchLeft, top: patchTop, blend: 'over' }])
        .png()
        .toBuffer()
    }

    // Patch zone logo — recouvrir le bloc blanc Gemini
    {
      const pSize = 90
      const patchSvg = '<svg width="' + pSize + '" height="' + pSize + '" xmlns="http://www.w3.org/2000/svg">'
        + '<rect width="' + pSize + '" height="' + pSize + '" fill="rgb(0,0,0)" opacity="0.5" rx="4"/>'
        + '</svg>'
      composited = await sharp(composited)
        .composite([{ input: Buffer.from(patchSvg, 'utf-8'), left: W - pSize - 12, top: W - pSize - 12, blend: 'over' }])
        .png()
        .toBuffer()
    }

    // Logo Ecrira icône (sauf hideWatermark)
    if (!hideWatermark) {
      const logoPath = path.join(process.cwd(), 'public', 'logo-ecrira-horizontal-400.png')
      if (fs.existsSync(logoPath)) {
        const logoResized = await sharp(logoPath)
          .resize({ width: 120, withoutEnlargement: true })
          .png()
          .toBuffer()
        const { width: lw = 44, height: lh = 44 } = await sharp(logoResized).metadata()
        const margin = 20
        composited = await sharp(composited)
          .composite([{
            input: logoResized,
            left: W - lw - margin,
            top: W - lh - margin,
            blend: 'over',
          }])
          .png()
          .toBuffer()
      }
    }

    res.status(200).json({
      image: composited.toString('base64'),
      mimeType: 'image/png',
      layout: postType,
      postType,
    })
  } catch (err) {
    console.error('[composite]', err)
    res.status(500).json({ error: 'Erreur composition image' })
  }
}
