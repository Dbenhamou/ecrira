import type { NextApiRequest, NextApiResponse } from 'next'
import Anthropic from '@anthropic-ai/sdk'
import { requireAuth } from '../../lib/auth-helper'
import sharp from 'sharp'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Logo Ecrira BLANC embarque (pas de dependance au FS Vercel).
const ECRIRA_WHITE_B64 = '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'

const imgRateLimit = new Map<string, { count: number; reset: number }>()
function checkImgRateLimit(userId: string, max: number = 10): boolean {
  const now = Date.now()
  const limit = imgRateLimit.get(userId)
  if (!limit || now > limit.reset) {
    imgRateLimit.set(userId, { count: 1, reset: now + 3600_000 })
    return true
  }
  if (limit.count >= max) return false
  limit.count++
  return true
}

function esc(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

// Scrim sombre appliqué PAR-DESSUS la photo Gemini pour garantir la lisibilité
// du texte blanc, quelle que soit la luminosité de la photo générée.
function scrim(secondary: string): string {
  return `linear-gradient(160deg, rgba(10,18,38,0.72) 0%, rgba(10,18,38,0.55) 45%, ${hexToRgba(secondary, 0.78)} 100%)`
}

function hexToRgba(hex: string, a: number): string {
  const clean = hex.replace('#', '')
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean
  const num = parseInt(full, 16)
  const r = (num >> 16) & 255, g = (num >> 8) & 255, b = num & 255
  return `rgba(${r},${g},${b},${a})`
}

// Construit la propriété background complète : scrim + photo si dispo, sinon dégradé brand.
function bgLayer(bgImage: string, accent: string, secondary: string): string {
  if (bgImage) {
    return `background:${scrim(secondary)}, url(${bgImage});background-size:cover;background-position:center;`
  }
  return `background:linear-gradient(160deg,#0d1b2e 0%,${secondary} 100%);`
}

// ── Templates HTML ──────────────────────────────────────────────────────────

function templateStat(data: any, accent: string, secondary: string, bgImage: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:1080px;height:1080px;${bgLayer(bgImage, accent, secondary)}font-family:'Helvetica Neue',Arial,sans-serif;color:white;display:flex;flex-direction:column;justify-content:space-between;padding:72px 64px}
.badge{display:inline-block;font-size:18px;letter-spacing:0.15em;color:${accent};border:2px solid ${accent};padding:6px 20px;border-radius:40px;text-transform:uppercase;margin-bottom:24px}
.title{font-size:56px;font-weight:800;line-height:1.1;margin-bottom:8px;text-shadow:0 2px 20px rgba(0,0,0,0.4)}
.accent-line{width:100px;height:4px;background:${accent};margin:16px 0}
.sub{font-size:22px;color:rgba(255,255,255,0.65);text-shadow:0 1px 8px rgba(0,0,0,0.5)}
.stat-zone{text-align:center;flex:1;display:flex;flex-direction:column;justify-content:center}
.stat{font-size:180px;font-weight:800;color:white;line-height:1;text-shadow:0 4px 30px rgba(0,0,0,0.5)}
.stat-label{font-size:24px;color:rgba(255,255,255,0.8);letter-spacing:0.12em;text-transform:uppercase;margin-top:16px;text-shadow:0 1px 8px rgba(0,0,0,0.5)}
.bottom{font-size:18px;color:rgba(255,255,255,0.25)}
</style></head><body>
<div>
<div class="badge">${esc(data.sector || '')}</div>
<div class="title">${esc(data.title || '')}</div>
<div class="accent-line"></div>
<div class="sub">${esc(data.subtitle || '')}</div>
</div>
<div class="stat-zone">
<div class="stat">${esc(data.stat || '')}</div>
<div class="stat-label">${esc(data.statLabel || '')}</div>
</div>
<div class="bottom"></div>
</body></html>`
}

function templateComparaison(data: any, accent: string, secondary: string, _bgImage: string): string {
  // Flat design volontaire — pas de photo Gemini.
  const leftItems = (data.leftPoints || []).map((p: string) => `<div class="item"><div class="dot dot-red"></div>${esc(p)}</div>`).join('')
  const rightItems = (data.rightPoints || []).map((p: string) => `<div class="item"><div class="dot dot-green"></div>${esc(p)}</div>`).join('')
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:1080px;height:1080px;font-family:'Helvetica Neue',Arial,sans-serif;display:flex;flex-direction:column}
.header{padding:56px 56px 32px;background:#f8f7f4;color:#1a1a1a}
.header h2{font-size:52px;font-weight:800;margin-bottom:8px}
.header .sub{font-size:20px;color:#888;letter-spacing:0.08em;text-transform:uppercase}
.cols{display:grid;grid-template-columns:1fr 1fr;flex:1}
.col{padding:40px 44px;display:flex;flex-direction:column;gap:16px}
.col-left{background:#1a1c2e;color:white}
.col-right{background:${accent};color:white}
.col-title{font-size:28px;font-weight:700;margin-bottom:8px;letter-spacing:0.04em}
.item{font-size:22px;display:flex;align-items:center;gap:14px}
.dot{width:12px;height:12px;border-radius:50%;flex-shrink:0}
.dot-red{background:#e24b4a}
.dot-green{background:#5dca5d}
.footer{padding:24px 56px;text-align:center;font-size:18px;color:#888;background:#f8f7f4;border-top:1px solid #e0e0e0}
</style></head><body>
<div class="header">
<h2>${esc(data.title || '')}</h2>
<div class="sub">${esc(data.subtitle || 'Analyse comparative')}</div>
</div>
<div class="cols">
<div class="col col-left">
<div class="col-title">${esc(data.leftTitle || 'Option A')}</div>
${leftItems}
</div>
<div class="col col-right">
<div class="col-title">${esc(data.rightTitle || 'Option B')}</div>
${rightItems}
</div>
</div>
<div class="footer"></div>
</body></html>`
}

function templateCitation(data: any, accent: string, secondary: string, bgImage: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:1080px;height:1080px;${bgLayer(bgImage, accent, secondary)}font-family:'Helvetica Neue',Arial,sans-serif;color:white;display:flex;flex-direction:column;justify-content:center;padding:80px 72px}
.quote-mark{font-size:120px;color:${accent};line-height:0.8;font-family:Georgia,serif;margin-bottom:16px}
.quote{font-size:44px;font-weight:500;line-height:1.45;margin-bottom:32px;font-style:italic;text-shadow:0 2px 20px rgba(0,0,0,0.5)}
.quote em{color:${accent};font-style:normal;font-weight:700}
.divider{width:80px;height:4px;background:${accent};margin-bottom:20px}
.context{font-size:20px;color:rgba(255,255,255,0.65);letter-spacing:0.12em;text-transform:uppercase}
</style></head><body>
<div class="quote-mark">«</div>
<div class="quote">${data.quote || ''}</div>
<div class="divider"></div>
<div class="context">${esc(data.context || '')}</div>
</body></html>`
}

function templateListe(data: any, accent: string, secondary: string, bgImage: string): string {
  const icons = ['◆', '◇', '●', '○', '▸']
  const items = (data.items || []).map((item: any, i: number) => `
<div class="item">
<div class="icon-circle">${icons[i % icons.length]}</div>
<div class="item-content">
<div class="item-text">${esc(item.text || '')}</div>
<div class="item-sub">${esc(item.detail || '')}</div>
</div>
</div>`).join('')

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:1080px;height:1080px;${bgLayer(bgImage, accent, secondary)}font-family:'Helvetica Neue',Arial,sans-serif;color:white;padding:64px;display:flex;flex-direction:column;position:relative}
.badge{display:inline-block;font-size:16px;letter-spacing:0.12em;color:${accent};border:2px solid ${hexToRgba(accent, 0.4)};padding:6px 18px;border-radius:30px;text-transform:uppercase;margin-bottom:28px}
.title{font-size:48px;font-weight:800;margin-bottom:8px;text-shadow:0 2px 20px rgba(0,0,0,0.4)}
.sub{font-size:22px;color:rgba(255,255,255,0.65);margin-bottom:36px;text-shadow:0 1px 8px rgba(0,0,0,0.5)}
.items{flex:1;display:flex;flex-direction:column;gap:12px}
.item{display:flex;align-items:center;gap:20px;padding:20px 24px;background:rgba(255,255,255,0.08);border-radius:16px;border:1px solid rgba(255,255,255,0.12);backdrop-filter:blur(8px)}
.icon-circle{width:48px;height:48px;border-radius:50%;background:${hexToRgba(accent, 0.25)};display:flex;align-items:center;justify-content:center;flex-shrink:0;color:${accent};font-size:22px}
.item-text{font-size:24px;font-weight:600}
.item-sub{font-size:18px;color:rgba(255,255,255,0.55);margin-top:4px}
.callout{margin-top:auto;padding:24px 32px;background:${accent};border-radius:16px;font-size:24px;font-weight:700;text-align:center}
</style></head><body>
<div class="badge">${esc(data.badge || data.sector || '')}</div>
<div class="title">${esc(data.title || '')}</div>
<div class="sub">${esc(data.subtitle || '')}</div>
<div class="items">${items}</div>
${data.callout ? `<div class="callout">${esc(data.callout)}</div>` : ''}
</body></html>`
}

function templateEditorial(data: any, accent: string, secondary: string, bgImage: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:1080px;height:1080px;${bgLayer(bgImage, accent, secondary)}font-family:'Helvetica Neue',Arial,sans-serif;color:white;display:flex;flex-direction:column;justify-content:flex-end;padding:80px 64px}
.kicker{color:${accent};font-size:22px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:28px}
.phrase{font-size:64px;font-weight:800;line-height:1.12;text-shadow:0 2px 24px rgba(0,0,0,0.45)}
.phrase em{color:${accent};font-style:normal}
.foot{margin-top:36px;display:flex;align-items:center;gap:16px}
.bar{width:56px;height:4px;background:${accent};flex-shrink:0}
.sub{color:rgba(255,255,255,0.78);font-size:22px}
</style></head><body>
<div class="kicker">${esc(data.kicker || data.sector || '')}</div>
<div class="phrase">${data.phrase || ''}</div>
${data.sub ? `<div class="foot"><div class="bar"></div><div class="sub">${esc(data.sub)}</div></div>` : ''}
</body></html>`
}

// ── Prompts Haiku par template ──────────────────────────────────────────────

function getHaikuPrompt(templateType: string, postContent: string, sector: string): string {
  const base = 'Analyse ce post LinkedIn et extrais les elements cles. Reponds UNIQUEMENT en JSON strict sans markdown.\n\nPOST : "' + postContent.slice(0, 1000) + '"\nSECTEUR : "' + (sector || 'deduis-le du post') + '"\n\n'

  switch (templateType) {
    case 'stat':
      return base + 'Renvoie ce JSON :\n{\n  "title": "titre 2 a 3 mots MAX MAJUSCULES, SANS AUCUN chiffre ni annee",\n  "subtitle": "accroche 8 mots MAX qui NE CONTIENT PAS le chiffre et NE REPREND PAS les mots du titre",\n  "stat": "UN SEUL chiffre cle ex 70% ou 3x ou 181",\n  "statLabel": "ce que represente le chiffre, 4 mots MAX, SANS reprendre les mots du titre ni le chiffre",\n  "sector": "secteur en 1-2 mots",\n  "bgPhoto": "EN ANGLAIS, photo realiste liee au secteur, ex: cybersecurity operations center blue screens, modern hospital corridor, coaching session bright office"\n}'

    case 'comparaison':
      return base + 'Renvoie ce JSON :\n{\n  "title": "titre comparatif 4 mots MAX ex Expert vs SOC",\n  "subtitle": "sous-titre 6 mots MAX",\n  "leftTitle": "nom option A, 2 mots MAX",\n  "leftPoints": ["point negatif 1", "point negatif 2", "point negatif 3"],\n  "rightTitle": "nom option B, 2 mots MAX",\n  "rightPoints": ["point positif 1", "point positif 2", "point positif 3"]\n}'

    case 'citation':
      return base + 'Renvoie ce JSON :\n{\n  "quote": "phrase forte extraite du post, percutante, 15 mots MAX. Mets le mot cle entre <em> et </em>",\n  "context": "contexte en 3 mots MAX ex RETOUR EXPERIENCE ou MANAGEMENT",\n  "bgPhoto": "EN ANGLAIS, photo realiste liee au secteur"\n}'

    case 'liste':
      return base + 'Renvoie ce JSON :\n{\n  "title": "titre 3 mots MAX",\n  "subtitle": "accroche 8 mots MAX",\n  "items": [{"text": "point principal 3 mots", "detail": "explication 5 mots MAX"}, {"text":"...", "detail":"..."}, {"text":"...", "detail":"..."}],\n  "callout": "phrase de conclusion percutante 8 mots MAX ou vide",\n  "sector": "secteur 1-2 mots",\n  "bgPhoto": "EN ANGLAIS, photo realiste liee au secteur"\n}'

    case 'editorial':
      return base + 'Renvoie ce JSON :\n{\n  "phrase": "LA phrase forte du post, percutante, 10 mots MAX. Mets 1 ou 2 mots cles entre <em> et </em>. Accents et ponctuation OK.",\n  "kicker": "theme en 1-2 mots MAJUSCULES ex LEADERSHIP ou STRATEGIE",\n  "sub": "accroche complementaire 8 mots MAX ou vide",\n  "sector": "secteur 1-2 mots",\n  "bgPhoto": "EN ANGLAIS, photo realiste liee au secteur"\n}'

    default:
      return base + 'Renvoie ce JSON :\n{\n  "title": "titre 3 mots MAX MAJUSCULES",\n  "stat": "chiffre cle ou vide",\n  "statLabel": "contexte 5 mots MAX",\n  "sector": "secteur"\n}'
  }
}

// ── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const userId = await requireAuth(req, res)
  if (!userId) return

  const { postContent, profile, templateType, hideWatermark } = req.body
  if (!postContent?.trim()) return res.status(400).json({ error: 'Contenu du post manquant' })

  const isPro = profile?.plan === 'pro' || profile?.plan === 'trial'
  if (!isPro) return res.status(403).json({ error: 'PRO_ONLY', message: 'Les visuels sont reserves au plan Pro.' })

  const imgLimit = profile?.plan === 'trial' ? 3 : 10
  if (!checkImgRateLimit(userId, imgLimit)) {
    return res.status(429).json({ error: 'RATE_LIMIT', message: 'Limite de ' + imgLimit + ' visuels par heure atteinte.' })
  }

  const brandAccent = profile?.brand_accent || '#3D52A0'
  const brandSecondary = profile?.brand_color2 || '#32458A'
  const sector = profile?.sector || ''
  const type = templateType || 'stat'

  // ── Étape 1 : Haiku extrait le contenu ────────────────────────────────────
  let data: any = { title: 'EXPERTISE', stat: '', statLabel: '', sector: sector }

  try {
    const prompt = getHaikuPrompt(type, postContent, sector)
    const extract = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: 'Tu es directeur artistique. Extrais les elements cles du post pour un visuel LinkedIn. Reponds UNIQUEMENT en JSON strict sans markdown.',
      messages: [{ role: 'user', content: prompt }],
    })

    const txt = (extract.content[0] as { text: string }).text.replace(/```json|```/g, '').trim()
    data = { ...data, ...JSON.parse(txt) }
  } catch (e) {
    console.error('[haiku-template]', e)
  }

  // Anti-repetition (template stat) : retire le chiffre du titre/sous-titre
  // et les mots du titre du statLabel, meme si Haiku a un peu debordé.
  if (type === 'stat') {
    const statDigits = (String(data.stat || '').match(/\d[\d.,%kKmMxX]*/g) || [])
    const stripDigits = (v: string) => {
      let out = String(v || '')
      for (const d of statDigits) out = out.split(d).join('')
      return out.replace(/\s{2,}/g, ' ').trim()
    }
    data.title = stripDigits(data.title)
    data.subtitle = stripDigits(data.subtitle)
    const titleWords = String(data.title || '').toLowerCase().split(/\s+/).filter((w) => w.length > 3)
    data.statLabel = String(data.statLabel || '')
      .split(/\s+/)
      .filter((w) => !titleWords.includes(w.toLowerCase().replace(/[^a-zà-ÿ0-9]/gi, '')))
      .join(' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
    if (!data.statLabel) data.statLabel = String(data.sector || '')
  }

  // ── Étape 2 : Gemini génère la photo de fond (jamais pour comparaison) ─────
  let bgImageDataUrl = ''
  if (type !== 'comparaison') {
    try {
      const gApiKey = process.env.GOOGLE_AI_API_KEY
      if (gApiKey && data.bgPhoto) {
        const directions = [
          'extreme close-up detail, macro, shallow focus',
          'wide establishing shot, expansive, atmospheric depth',
          'top-down flat lay perspective, organized composition',
          'low angle dramatic perspective, bold and cinematic',
          'over-the-shoulder candid moment, natural and human',
          'abstract textural background, soft bokeh, minimal',
          'golden hour warm light, long shadows',
          'moody low-key lighting, deep contrast, editorial'
        ]
        const dir = directions[Math.floor(Math.random() * directions.length)]
        const photoPrompt = 'Photorealistic professional editorial photo, square 1:1 format. Scene: ' + (data.bgPhoto || 'modern professional office') + '. Visual direction: ' + dir + '. Cinematic quality, atmospheric. STRICT RULES: absolutely NO text, NO words, NO letters, NO numbers, NO logos, NO signage anywhere in the image. No people looking directly at the camera. Ambiance and environment only. Pure photography.'
        const gRes = await fetch(
          'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent',
          {
            method: 'POST',
            headers: { 'x-goog-api-key': gApiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: photoPrompt }] }],
              generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '1:1' } },
            }),
          }
        )
        const gData = await gRes.json()
        if (gRes.ok) {
          const gParts = gData?.candidates?.[0]?.content?.parts || []
          const gImg = gParts.find((p: any) => p.inlineData?.data)
          if (gImg) {
            bgImageDataUrl = 'data:' + (gImg.inlineData.mimeType || 'image/png') + ';base64,' + gImg.inlineData.data
          }
        } else {
          console.error('[gemini-bg]', JSON.stringify(gData).slice(0, 300))
        }
      }
    } catch (e) {
      console.error('[gemini-bg]', e)
    }
  }

  // ── Étape 3 : Générer le HTML ─────────────────────────────────────────────
  let html = ''
  switch (type) {
    case 'stat': html = templateStat(data, brandAccent, brandSecondary, bgImageDataUrl); break
    case 'comparaison': html = templateComparaison(data, brandAccent, brandSecondary, bgImageDataUrl); break
    case 'citation': html = templateCitation(data, brandAccent, brandSecondary, bgImageDataUrl); break
    case 'liste': html = templateListe(data, brandAccent, brandSecondary, bgImageDataUrl); break
    case 'editorial': html = templateEditorial(data, brandAccent, brandSecondary, bgImageDataUrl); break
    default: html = templateStat(data, brandAccent, brandSecondary, bgImageDataUrl)
  }

  // ── Étape 4 : Browserless screenshot → PNG ────────────────────────────────
  try {
    const apiKey = process.env.BROWSERLESS_API_KEY
    if (!apiKey) return res.status(500).json({ error: 'BROWSERLESS_API_KEY manquant' })

    const browserlessRes = await fetch('https://production-sfo.browserless.io/screenshot?token=' + apiKey, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        html,
        options: { type: 'png', clip: { x: 0, y: 0, width: 1080, height: 1080 } },
        viewport: { width: 1080, height: 1080 },
        waitForTimeout: 1200,
      }),
    })

    if (!browserlessRes.ok) {
      const err = await browserlessRes.text()
      console.error('[browserless]', err)
      return res.status(500).json({ error: 'Erreur capture visuel' })
    }

    let pngBuffer: Buffer = Buffer.from(await browserlessRes.arrayBuffer()) as Buffer

    // ── Étape 5 : Logo Ecrira via Sharp ───────────────────────────────────────
    if (!hideWatermark) {
      try {
        const logoBuf = Buffer.from(ECRIRA_WHITE_B64, 'base64')
        const logoResized = await sharp(logoBuf)
          .resize({ width: 132, withoutEnlargement: true })
          .png()
          .toBuffer()
        const logoMeta = await sharp(logoResized).metadata()
        const lw = logoMeta.width || 132
        const lh = logoMeta.height || 28
        const margin = 32
        pngBuffer = await sharp(pngBuffer)
          .composite([{ input: logoResized, left: 1080 - lw - margin, top: 1080 - lh - margin, blend: 'over' }])
          .png()
          .toBuffer()
      } catch (wErr) {
        console.error('[watermark]', wErr)
      }
    }

    res.status(200).json({
      image: pngBuffer.toString('base64'),
      mimeType: 'image/png',
      templateType: type,
    })
  } catch (err) {
    console.error('[generate-visual-template]', err)
    res.status(500).json({ error: 'Erreur generation visuel' })
  }
}
