import type { NextApiRequest, NextApiResponse } from 'next'
import Anthropic from '@anthropic-ai/sdk'
import { requireAuth } from '../../lib/auth-helper'
import sharp from 'sharp'
import path from 'path'
import fs from 'fs'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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

// ── Templates HTML ──────────────────────────────────────────────────────────

function templateStat(data: any, accent: string, secondary: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:1080px;height:1080px;background:#0d1b2e;font-family:'Helvetica Neue',Arial,sans-serif;color:white;display:flex;flex-direction:column;justify-content:space-between;padding:72px 64px}
.badge{display:inline-block;font-size:18px;letter-spacing:0.15em;color:${accent};border:2px solid ${accent};padding:6px 20px;border-radius:40px;text-transform:uppercase;margin-bottom:24px}
.title{font-size:56px;font-weight:800;line-height:1.1;margin-bottom:8px}
.accent-line{width:100px;height:4px;background:${accent};margin:16px 0}
.sub{font-size:22px;color:rgba(255,255,255,0.5)}
.stat-zone{text-align:center;flex:1;display:flex;flex-direction:column;justify-content:center}
.stat{font-size:180px;font-weight:800;color:${accent};line-height:1}
.stat-label{font-size:24px;color:rgba(255,255,255,0.65);letter-spacing:0.12em;text-transform:uppercase;margin-top:16px}
.bottom{font-size:18px;color:rgba(255,255,255,0.25)}
</style></head><body>
<div>
<div class="badge">${esc(data.sector || '')}</div>
<div class="title">${esc(data.title)}</div>
<div class="accent-line"></div>
<div class="sub">${esc(data.subtitle || '')}</div>
</div>
<div class="stat-zone">
<div class="stat">${esc(data.stat)}</div>
<div class="stat-label">${esc(data.statLabel)}</div>
</div>
<div class="bottom"></div>
</body></html>`
}

function templateComparaison(data: any, accent: string, secondary: string): string {
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
<h2>${esc(data.title)}</h2>
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

function templateCitation(data: any, accent: string, secondary: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:1080px;height:1080px;background:linear-gradient(160deg,#0d1b2e,${secondary});font-family:'Helvetica Neue',Arial,sans-serif;color:white;display:flex;flex-direction:column;justify-content:center;padding:80px 72px}
.quote-mark{font-size:120px;color:${accent};line-height:0.8;font-family:Georgia,serif;margin-bottom:16px}
.quote{font-size:44px;font-weight:500;line-height:1.45;margin-bottom:32px;font-style:italic}
.quote em{color:${accent};font-style:normal;font-weight:700}
.divider{width:80px;height:4px;background:${accent};margin-bottom:20px}
.context{font-size:20px;color:rgba(255,255,255,0.45);letter-spacing:0.12em;text-transform:uppercase}
</style></head><body>
<div class="quote-mark">«</div>
<div class="quote">${data.quote || ''}</div>
<div class="divider"></div>
<div class="context">${esc(data.context || '')}</div>
</body></html>`
}

function templateListe(data: any, accent: string, secondary: string): string {
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
body{width:1080px;height:1080px;background:#0d1b2e;font-family:'Helvetica Neue',Arial,sans-serif;color:white;padding:64px;display:flex;flex-direction:column}
.badge{display:inline-block;font-size:16px;letter-spacing:0.12em;color:${accent};border:2px solid rgba(91,110,191,0.3);padding:6px 18px;border-radius:30px;text-transform:uppercase;margin-bottom:28px}
.title{font-size:48px;font-weight:800;margin-bottom:8px}
.sub{font-size:22px;color:rgba(255,255,255,0.5);margin-bottom:36px}
.items{flex:1;display:flex;flex-direction:column;gap:12px}
.item{display:flex;align-items:center;gap:20px;padding:20px 24px;background:rgba(255,255,255,0.05);border-radius:16px;border:1px solid rgba(255,255,255,0.08)}
.icon-circle{width:48px;height:48px;border-radius:50%;background:rgba(91,110,191,0.15);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:${accent};font-size:22px}
.item-text{font-size:24px;font-weight:600}
.item-sub{font-size:18px;color:rgba(255,255,255,0.45);margin-top:4px}
.callout{margin-top:auto;padding:24px 32px;background:${accent};border-radius:16px;font-size:24px;font-weight:700;text-align:center}
</style></head><body>
<div class="badge">${esc(data.badge || data.sector || '')}</div>
<div class="title">${esc(data.title)}</div>
<div class="sub">${esc(data.subtitle || '')}</div>
<div class="items">${items}</div>
${data.callout ? `<div class="callout">${esc(data.callout)}</div>` : ''}
</body></html>`
}

// ── Prompts Haiku par template ──────────────────────────────────────────────

function getHaikuPrompt(templateType: string, postContent: string, sector: string): string {
  const base = 'Analyse ce post LinkedIn et extrais les elements cles. Reponds UNIQUEMENT en JSON strict sans markdown.\n\nPOST : "' + postContent.slice(0, 1000) + '"\nSECTEUR : "' + (sector || 'deduis-le du post') + '"\n\n'

  switch (templateType) {
    case 'stat':
      return base + 'Renvoie ce JSON :\n{\n  "title": "titre 3 mots MAX, MAJUSCULES",\n  "subtitle": "accroche 8 mots MAX",\n  "stat": "UN chiffre cle ex 70% ou 3x",\n  "statLabel": "contexte du chiffre, phrase courte 5 mots MAX",\n  "sector": "secteur en 1-2 mots"\n}'

    case 'comparaison':
      return base + 'Renvoie ce JSON :\n{\n  "title": "titre comparatif 4 mots MAX ex Expert vs SOC",\n  "subtitle": "sous-titre 6 mots MAX",\n  "leftTitle": "nom option A, 2 mots MAX",\n  "leftPoints": ["point negatif 1", "point negatif 2", "point negatif 3"],\n  "rightTitle": "nom option B, 2 mots MAX",\n  "rightPoints": ["point positif 1", "point positif 2", "point positif 3"]\n}'

    case 'citation':
      return base + 'Renvoie ce JSON :\n{\n  "quote": "phrase forte extraite du post, percutante, 15 mots MAX. Mets le mot cle entre <em> et </em>",\n  "context": "contexte en 3 mots MAX ex RETOUR EXPERIENCE ou MANAGEMENT"\n}'

    case 'liste':
      return base + 'Renvoie ce JSON :\n{\n  "title": "titre 3 mots MAX",\n  "subtitle": "accroche 8 mots MAX",\n  "items": [{"text": "point principal 3 mots", "detail": "explication 5 mots MAX"}, {"text":"...", "detail":"..."}, {"text":"...", "detail":"..."}],\n  "callout": "phrase de conclusion percutante 8 mots MAX ou vide",\n  "sector": "secteur 1-2 mots"\n}'

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

  // ── Étape 2 : Générer le HTML ─────────────────────────────────────────────
  let html = ''
  switch (type) {
    case 'stat': html = templateStat(data, brandAccent, brandSecondary); break
    case 'comparaison': html = templateComparaison(data, brandAccent, brandSecondary); break
    case 'citation': html = templateCitation(data, brandAccent, brandSecondary); break
    case 'liste': html = templateListe(data, brandAccent, brandSecondary); break
    default: html = templateStat(data, brandAccent, brandSecondary)
  }

  // ── Étape 3 : Browserless screenshot → PNG ────────────────────────────────
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
        waitForTimeout: 1000,
      }),
    })

    if (!browserlessRes.ok) {
      const err = await browserlessRes.text()
      console.error('[browserless]', err)
      return res.status(500).json({ error: 'Erreur capture visuel' })
    }

    let pngBuffer: Buffer = Buffer.from(await browserlessRes.arrayBuffer()) as Buffer

    // ── Étape 4 : Logo Ecrira via Sharp ───────────────────────────────────────
    if (!hideWatermark) {
      const logoPath = path.join(process.cwd(), 'public', 'logo-ecrira-horizontal-400.png')
      if (fs.existsSync(logoPath)) {
        const logoResized = await sharp(logoPath)
          .resize({ width: 120, withoutEnlargement: true })
          .png()
          .toBuffer()
        const { width: lw = 120, height: lh = 30 } = await sharp(logoResized).metadata()
        const margin = 28
        const withLogo = await sharp(pngBuffer)

          .composite([{ input: logoResized, left: 1080 - lw - margin, top: 1080 - lh - margin, blend: 'over' }])
          .png()
          .toBuffer()
        pngBuffer = withLogo as unknown as Buffer
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
