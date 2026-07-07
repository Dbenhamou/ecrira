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

function buildComposition(
  postType: string,
  title: string,
  subtitle: string,
  stat: string,
  statContext: string,
  points: string[],
  callout: string,
  brandAccent: string,
  brandSecondary: string
): string {
  switch (postType) {
    case 'hero_stat':
      return [
        'COMPOSITION: Realistic photo background. Strong dark overlay on bottom 50%.',
        'TEXT ELEMENTS (render exactly):',
        '- TITLE: "' + title + '" — very large bold sans-serif white, top area',
        stat ? '- STAT: "' + stat + '" — enormous dominant center, bold white' : '',
        stat && statContext ? '- STAT LABEL: "' + statContext + '" — small clean white below stat' : '',
        subtitle ? '- SUBTITLE: "' + subtitle + '" — medium weight white, below title' : '',
        'Design: thin accent line ' + brandAccent + ' under title, generous whitespace',
      ].filter(Boolean).join('\n')

    case 'liste_icones':
      return [
        'COMPOSITION: Realistic photo RIGHT half. Clean structured panel LEFT half with semi-transparent background.',
        'TEXT ELEMENTS (render exactly):',
        '- TITLE: "' + title + '" — large bold top of panel, color ' + brandAccent,
        subtitle ? '- SUBTITLE: "' + subtitle + '" — smaller below title' : '',
        '- LIST with simple minimal icons, each line with thin separator:',
        ...points.map((p, i) => '  ' + (i + 1) + '. [icon] ' + p),
        callout ? '- CALLOUT BOX bottom: rounded rect background ' + brandAccent + ', white bold text: "' + callout + '"' : '',
        'Design: glassmorphism panel, clean icon style, brand colors prominent',
      ].filter(Boolean).join('\n')

    case 'citation':
      return [
        'COMPOSITION: Photo blurred dark background. Large editorial quote layout.',
        'TEXT ELEMENTS (render exactly):',
        '- Large typographic quote marks in color ' + brandAccent,
        '- QUOTE: "' + title + (subtitle ? ' — ' + subtitle : '') + '" — very large heavy font, left-aligned',
        stat ? '- STAT: "' + stat + ' ' + statContext + '" — prominent highlight' : '',
        callout ? '- CONTEXT: "' + callout + '" — small bottom line' : '',
        'Design: lots of negative space, editorial magazine feel, minimal clutter',
      ].filter(Boolean).join('\n')

    case 'comparaison':
      return [
        'COMPOSITION: Two distinct vertical zones separated by a line.',
        'The left half has a dark neutral background, the right half has a ' + brandAccent + ' tinted background.',
        'Do NOT write LEFT ZONE, RIGHT ZONE, ZONE A, ZONE B anywhere in the image.',
        'TEXT ELEMENTS (render exactly):',
        '- TOP TITLE spanning full width: "' + title + '" — bold large',
        points.length >= 2 ? '- In the left half only, show: ' + points.slice(0, Math.ceil(points.length / 2)).join(' / ') : '',
        points.length >= 2 ? '- In the right half only, show: ' + points.slice(Math.ceil(points.length / 2)).join(' / ') : '',
        stat ? '- KEY STAT: "' + stat + ' ' + statContext + '" — prominent in one zone' : '',
        'Design: clear hierarchy, icons for each point, strong contrast between zones',
      ].filter(Boolean).join('\n')

    case 'alerte_callout':
      return [
        'COMPOSITION: Dark dramatic photo background, high contrast text.',
        'TEXT ELEMENTS (render exactly):',
        '- TITLE: "' + title + '" — very large bold white, top area, impactful',
        subtitle ? '- SUBTITLE: "' + subtitle + '" — medium white, below title' : '',
        stat ? '- STAT: "' + stat + '" — very large center, bold white or light' : '',
        callout ? '- CALLOUT BOX: large rounded rect at bottom, background ' + brandAccent + ', white bold text: "' + callout + '"' : '',
        points.length > 0 ? '- KEY POINTS with alert icons: ' + points.join(' | ') : '',
        'Design: urgent dramatic feel, heavy typography, strong brand color on callout',
      ].filter(Boolean).join('\n')

    default:
      return 'COMPOSITION: Photo background with overlay. TITLE: "' + title + '" large bold white. Premium editorial style.'
  }
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

  // ── Étape 1 : Haiku — directeur artistique ────────────────────────────────
  let postType = 'hero_stat'
  let bgPhoto = 'modern professional office with natural lighting'
  let title = toAscii(postTopic || 'EXPERTISE')
  let subtitle = ''
  let stat = ''
  let statContext = ''
  let points: string[] = []
  let callout = ''

  try {
    const extract = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: 'Tu es directeur artistique senior pour des visuels LinkedIn premium, tous secteurs (cyber, sante, RH, coaching, immobilier, finance, retail, industrie, juridique, tech). Tu crées des briefs uniques adaptés au contenu ET au secteur. Reponds UNIQUEMENT en JSON strict sans markdown.',
      messages: [{
        role: 'user',
        content: 'Analyse ce post et cree un brief visuel LinkedIn premium.\n\nPOST : "' + postContent.slice(0, 1000) + '"\nSECTEUR : "' + (sector || 'deduis-le du post') + '"\nCOULEUR PRINCIPALE : "' + brandAccent + '"\n\nChoisis UNE composition :\n- hero_stat : post avec chiffre fort\n- liste_icones : post avec liste de points/risques\n- citation : post storytelling/opinion\n- comparaison : post comparatif X vs Y\n- alerte_callout : post alerte/urgence\n\nRenvoie ce JSON :\n{\n  "postType": "hero_stat|liste_icones|citation|comparaison|alerte_callout",\n  "title": "titre 3 mots MAX MAJUSCULES SANS accents SANS ponctuation. Si comparaison: X VS Y ex SOC VS EXPERT. Sinon ex SESSIONS OUVERTES, CROISSANCE REELLE, ALERTE CYBER",\n  "subtitle": "accroche 8 mots MAX sans accents",\n  "stat": "chiffre cle ex 70% ou vide",\n  "statContext": "contexte 5 mots MAX sans accents phrase lisible ex des attaques la nuit",\n  "points": ["point 1 sans accents 5 mots max", "point 2", "point 3"],\n  "callout": "phrase forte 10 mots MAX sans accents ou vide",\n  "bgPhoto": "description EN ANGLAIS photo realiste specifique au secteur ex pour cyber: security operations center analysts monitoring screens night, pour sante: hospital emergency corridor nurses workstations blue light, pour coaching: two professionals coaching conversation modern office, pour immobilier: luxury apartment interior natural light city view"\n}',
      }],
    })

    const txt = (extract.content[0] as { text: string }).text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(txt)
    postType = parsed.postType || 'hero_stat'
    bgPhoto = parsed.bgPhoto || bgPhoto
    title = toAscii(parsed.title || title)
    subtitle = toAscii(parsed.subtitle || '')
    stat = toAscii(parsed.stat || '')
    statContext = toAscii(parsed.statContext || '')
    points = (parsed.points || []).map((p: string) => toAscii(p)).slice(0, 4)
    callout = toAscii(parsed.callout || '')
  } catch (e) {
    console.error('[haiku]', e)
  }

  const composition = buildComposition(postType, title, subtitle, stat, statContext, points, callout, brandAccent, brandSecondary)

  // ── Étape 2 : Gemini génère le visuel ─────────────────────────────────────
  const geminiPrompt = 'Create a PREMIUM LinkedIn visual post, square 1:1 format (1080x1080px).\n\n'
    + 'BACKGROUND PHOTO: ' + bgPhoto + '\n'
    + 'Photorealistic, high quality, cinematic lighting, shallow depth of field.\n\n'
    + composition + '\n\n'
    + 'BRAND COLORS (mandatory):\n'
    + '- Primary: ' + brandAccent + ' — use for highlights, callout backgrounds, accent lines, icons\n'
    + '- Secondary: ' + brandSecondary + ' — for gradients, secondary elements\n'
    + 'These exact colors must be VISIBLE in the final image.\n\n'
    + 'GLOBAL RULES:\n'
    + '- Premium social media design quality\n'
    + '- Bold heavy sans-serif for titles, clean regular for body text\n'
    + '- All text perfectly readable, high contrast\n'
    + '- Generous negative space, never cramped\n'
    + '- NO watermark text, NO "Watermark" word, NO copyright notices\n'
    + '- NO footer bar\n'
    + '- Bottom-right corner 80x80px must be completely EMPTY\n'
    + '- Render all text exactly as specified\n'
    + '- NEVER write LEFT ZONE, RIGHT ZONE, ZONE A, ZONE B, TEXT ELEMENTS or COMPOSITION in the image\n'
    + '- Each text element appears ONCE only, no repetition\n'
    + '- Bottom-right 80x80px area must be completely empty, no color block'

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

  // ── Étape 3 : Sharp — rogner + overlay + logo ─────────────────────────────
  try {
    let imageBuffer: Buffer = Buffer.from(rawImageBase64, 'base64')

    const meta = await sharp(imageBuffer).metadata()
    const W = meta.width || 1080
    const H = meta.height || 1080

    const cropH = Math.round(H * 0.93)
    const croppedBuf = await sharp(imageBuffer)
      .extract({ left: 0, top: 0, width: W, height: cropH })
      .resize(W, W, { fit: 'cover', position: 'top' })
      .png()
      .toBuffer() as unknown as Buffer
    imageBuffer = croppedBuf

    const svgOverlay = '<svg width="' + W + '" height="' + H + '" xmlns="http://www.w3.org/2000/svg">'
      + '<defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">'
      + '<stop offset="0%" stop-color="rgb(' + r + ',' + g + ',' + b + ')" stop-opacity="0"/>'
      + '<stop offset="70%" stop-color="rgb(' + r + ',' + g + ',' + b + ')" stop-opacity="0.06"/>'
      + '<stop offset="100%" stop-color="rgb(' + r2 + ',' + g2 + ',' + b2 + ')" stop-opacity="0.2"/>'
      + '</linearGradient></defs>'
      + '<rect width="' + W + '" height="' + H + '" fill="url(#g1)"/>'
      + '</svg>'

    let composited = await sharp(imageBuffer)
      .composite([{ input: Buffer.from(svgOverlay, 'utf-8'), blend: 'over' }])
      .png()
      .toBuffer()

    if (!hideWatermark) {
      const logoPath = path.join(process.cwd(), 'public', 'logo-ecrira-icon-bleu.png')
      if (fs.existsSync(logoPath)) {
        const logoResized = await sharp(logoPath)
          .resize({ width: 48, withoutEnlargement: true })
          .png()
          .toBuffer()
        const { width: lw = 48, height: lh = 48 } = await sharp(logoResized).metadata()
        const margin = 20
        composited = await sharp(composited)
          .composite([{ input: logoResized, left: W - lw - margin, top: H - lh - margin, blend: 'over' }])
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
