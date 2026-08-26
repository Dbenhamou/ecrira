import type { NextApiRequest, NextApiResponse } from 'next'
import Anthropic from '@anthropic-ai/sdk'
import { requireAuth } from '../../lib/auth-helper'
import { rateLimitHit } from '../../lib/rateLimit'
import sharp from 'sharp'
import path from 'path'
import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Logo Ecrira blanc (inline) — watermark fiable sur serverless + visible sur photo sombre
const ECRIRA_WHITE_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAMgAAAArCAYAAAA9iMeyAAAQdElEQVR42u2de7DcZXnHP8/uniQEE2KLEYlIuQwyVbzQ0tYiFBTLQGVGFKWiDkqnZIBYLFVEyogwA4JARDFFtG0QnahUwEK4qCAKeAOJFyJYoEGjBAgBEwmXnN39ffvHPq+8+fH+Lrtn9yTafWZ+8zu7+7u8l+f6fZ73PVBCkkxSizGN6f8pWYlwNM2s63/PAnYB/gp4KaDofiWeV/VdURsyoAVsAC40syclmZlpPFVj2moERFLDzDJJ84FjgLcCewET09Sux4GXmdnDYwEZ05akVt6lAhpm1pV0BHAOsFtOw4+SWbvepoeBjePpGdNWIyAuHObCcTpwuluYDtCIjumwaveZ2cZgycbTNKatwYI0IuH4iGvz51iZEZNcQFZUxUhjGtP0caXU9PORkjJJHT9PJ4X3bpT08hALjWdnTFuSGs6EmaQdgI9HWnu6tXcHaAJfMLOVY/dqTFuFgHjcIeAfgBdFjNqva6Tc59Q1+WvlgX+bHkL2beAUj4fGyNWYtjiZuzLzgDvoIVaqGYxnkZANg24A3jNVaDeADdExDMry1szf0xzBnCh6p/rse7Okzwp5rcR9owRg5O8emTcQ0NeCvmdTeXcIwPcCdu9TOMJ1k1NgxE3APcCXgIvN7OlBXKtogHAmGLn1cebtjDg2DJNeS1iKBKDGfVmk8EbNxEMVlohfuhWKIxtE6QYB2TNi/GYNjdAAVgHnAv/jz1GfWqUJrAVWhgFzy9GvcISMf8j6bwPsDLzEz9vmXDor6I8SfZDf/x0zu9UnGTOTpF2Bw909tMSzU9UGlmtL3gJnwK+AR4EHzGxNghGSzOdteiPwMuCpqE9hntcAV5nZpsR9+wGvAZ7O9cEK+pIaw1RFxCN+rDaz+6I5ag4qzCnhkDQD+Bvn40bEx78Fvm9md8f9HeRFpzmS1KlAmrqONq2UtNuwNIukZmC+fgYnoFySZkl6g6RLJf1c0qM1+tIPLfH3tKJ3HjhCRO8pSaslXe3I4owYbSxBIW+oeO6Buetbfv7ECPuySdIjkm6VdJKkl0TzZ1O0rkh6lT97suD967x/E85rNogFqSvNQTMsN7P/lTQz0qAD9bPKPFaYVSQdDpzoGiSv1abqboX+3pkAH9ZF7uUwEb8msA2wkx+HATdL+qCZ3VGhfZ9wt6/D5vmrLjDDNezNifueLLhvGCDQDGC+H68FTpJ0upn9x6Ba3YVDknYBrvZx6ha4vH8M/BMwCziBPqtBWgNCuvJGdgpck1H6sk1PaL6IHiz9Nm9/N+qLRcw2KIWylw3AjQkBafjvww5ulTsADgS+LukEM1tW4m41ozltJVyl2SVCmbpvmKBDQCwXAP8uaW9XbAOVL7lreLYLR9vbbQVKLgOOBa4xs+X9uHj9DkZowC8iJtEUGb523OGM0ZW0J/BVepXFWUnslEWMZhUwdH5SQ2HmWWa2OvJ3GxX+d0ydkhiE3HeNnHBb7jnzgKWSHjazbxYIiSrmTjXnt0hhiOLq7Hw/U/1pRHNyPLDGzM7qh2GjeXgN8GZ/3kSFFQt0sqRvAO26lmtQ7feC4BqZWTbVo8+B2Rn4bxeOUCfWLJjMRqQdm9HRqjgm6BVLnmZmF0whadnKvS/17mZkiawATWpFbtI5kmb5WFgfDD4M169VMob5flqB69yIfvuQpD+jl6hu1FGmgEmaAM7y8ajr6nWB/YC3+1w2RmFBwkPfK2l/IAStqtCkqd+C1j/XzK6vQmmioHIJsAfPJhdTmi4IzF3Aj4H7HRlq1rR4Au5wn98GEI7gTpwD/BKYWfLeDNgReDXwOo8/UuPV9Gv38euuiyZ+VBQYaRPwMWC1ty8rsTLzfX4OBrYv6Etwz7cFjjGzO2sGz8GDeLfHnN2ccgxxZ7AqlrBwp0laDjxWx4oM6mLNB94wpElYA1wfmd+k9jKzjqSjgb/zwZ0omNAmvYz8+cANZjZwrqKm6bcSZXKZmd3bx/v+GljmEHWRUjHXhNcx+nKg8PxngGVm9vM++rIrsBTYP8HIsXu+r1uETg3rkUnaDnh/gl/COy5yy3JC7r1BmexGLyF9nqN53WEKSF5Sp2Lau97oR8v8Zx+YrqTZwEkUJzPDYHwaeJ+ZbXJYL/aFy3IVeWuXDQGrn+uT0Ix878Lcgpl9V9JHnLFSTBX6sWMEltg0uFgGzPG+5HNGlhu30JdVkhYCPwDmFAi8uZWZa2ZVGj1Yj39xNC4en/DsDcCF/v27E9Y4tO84ScuAh6rc58YUBizvfw5ytOglGisACxPwF8DLo2AvZTluAd7rwtE0M3mc0zWzTnTuRJ9T33VquFVzKhjSPEbrAh23ZAHS7kbgQvg7rP+/l82Tl6kgfJRlIYXuVkjIRn3J9yf0V24VHnLo2Uqsk6jI4kfgzB7AcWxeyRG7gkvMbLWZPQB8MmFlwuddgEV1XOctVU4epHoTcFPF5IQ2HpCwXPGz2sCZ7oq1hpGprXA7diwJqvPXWtCOJUfbGe8tURBrBWO3cQAG76dvpdeU9cU1WtfM2vQqDRZErmEKzn4Q2FATVTo1EdcE4XgEWBIlAy8Gfp2Yo6B4jvdlFSoDCAbNg0yVQgxxFXBvhZkLg7ZHCcM0XPP+KHK3Rk3tumMXbX4xu4Qxd3bhWOR9apUgQNfm8gHTYUFSfSlyUXcAjgBOLgFvQhL2NkfkkvFAlPd6LfCOgsC8AZxvZmtClYCZ/UrSpcBpiXCgC8wFTjGzd9YRkPYAA5kvW7cCjDzlq07Qy6V8uEZgFu5fUDGpG+lltqeLnqmRB7EoYL3IXcROwm+HXsZ3boVATgC3ATe4xh22IqhyGZG0E7DY0bR2LucRGH87708ZgtnwMby0Ot7XBHBGBHfn49h76CUff+dSOe9cBLwd2DXXjnDd4ZL2NbPvFAEyQUBW9eFy5YVhELodONbM7iuzHq4dQ5s2VUzqNkzfrit1rW/47Xjg0JrARbNEONYCJ7obmYpRBi75qXFNaNcxbh3qgjAp4Qi8dkq0OK7Mehzl0HY+IRz48NNmtt6vz6J710q6APi3XHuC2zUb+BDwxqIxCJP84hraMB7Ite7fNR2FCi+fH7lPv6VXHarIDD4OXANcbmbtmjmG0J6fAQcV/C6H73aStJ56WeOpuiG/KPCtU/TTiNEbBWgOpBOeTR/PB4GjzGzFCFZbWh/9/p5b6lYJv6TWymSRtekAHzCzTxRp7qjeai7wwYQgByt0P3BZQNgiVM/8uyuB97mLHiuggCweKuktZnZFIazfRzVv28+LJT1P0vNzz5knaVs/T1QhEzXx9FC1+eZo7XqeQrs/5ddOTKVStGZ7XhlVN6fW18uzxKFy9fTot6zPyt6lkv6kaNyi6tyrcvOUH5+TcteHat5zC+4L7dwQ+uLXL4ye2e2jL11Jt0k6tIoHojZ+uIA3w+d31ZizQ7xv3QJ+vkXSzFSFcStn9qymplnp2/I0406a2foKIbAIMsz61Ni3uNVakNBcQRsslHSzmV0RBCWRf8io3u2RPipM61jchpmdIekp4OwISWmUuLC/AT5KL9l5VwR3jnJhk9Vgtgkzu8Qt9efoVQlUlW603c25FrjFYfiyyomwT8KuEWhhCfftdiDM9QuBfXO8HFypYIF3zrW15Z/3Aw4zs6/kwYJWn75oaGTwgRvBVYoCo8LnDTK5IQ4xs3WSLqeXLEyVZQezvtQH9mIzGxgOjTfRqxmTlTGa3Hyf54z1mQj/bxQgPLOAWWZ2l2t61WzLSFEseknblpl9WdKTwOfpFVIWxU8BkdseuNHnc4aZTZZPu2WSTgVekHh2YP4LzewpV4SXAX9bEROVxdlnSPo68EQMObf61CBhQud6B2ZGGGMdpiuKHyqXQzrDfhz4e89B5JkrtH0OvbqhIyVdSa8W6zF65Qdd1yTBf54s8aEf9ABxkFVoz8nY+3i1zOyzzvCf5NnaMCsAHc70sv5FLmRVbbEKwR1GLEKUa1ru63G+4qhVSuCDFn8HsKOkox2CbVYE5vsCRyaeGYTlJuDKaHP1UO/WLoiPipY+hBKUP3Xg6PznQM6STs2tGCyi4PddF1a5DdO3L4sbIp/0bdEeWt2S/bViv/cJSU9LetJXt6314+HE8ZCff+Dbr27mKvYZg+ydu8civ/89UR+K+hFWyV3i7myzIga5cooxSKcqBsmNRbj/IEnrC96db8OKaFVhs4APGpKuTbQp87HqRKsjw2rL1/v3g+zpFubx15J2iFcetgqSbkUaMfj6h9BbwHOTI1oL3BRmiZxHkdVo0itFuAf4oZmtCkyU0pKuVRpmdrlr1QtzEGje1YrXiTwv+n12TZl9IfBfkhaZ2ZJh+P9howfXkkudQT4Tadm8RQw+8rF+/8JQX1bQlulwsVKW5EZXJl9yS5Jyt5ruGr8auEbSm8zsgdx/EQjW4zDnsTysGz5fD9zm49f28bhJ0mLgAyXuHhVWZIFbkTM3syKRBWkXaLKsQLMMi9ZLOi9kmmtakoWSHo80QLsEUckKjm7iyKLnZZIe8wVaRMWPSNqrxvv2ToEVOUtydKR9iyxJO7Ykee3bhwX55wEtyHpJf14DRdtb0qqaluRHnnQMa/3NLcc8ST8pQa66vtQib5nNkdU7ayKyKSvSdQ9j97BXQiOn8Yv8cUtkzcMa4HAOR9uPTskR/x4yr+93PHvbMiGJLMkl9NYEXMHmy19Dm+KCQBUcpciTP+uPoiRfzBzzAmARvScuPizcFsjrloIl+RzwJs8RNXLtziKr3nFLskzSdiE+SrQ9KzlaJbFlqg/h79JydG9Ly8xWeNLtfn/XZOLZ5t+/yi3Jnl6DFpJ8xwGviCoOwn1ttwpXu/X4nRV1y9xwUOZEz9A3E3NTdoT4Zj5w/GZejKRFNTDtUe7Vm/nuF5L0qSJfO6W1/O+DJX1R0i9H1L7/jDRd0Fr7V9xzs2s0q7CIQYsfEFnEKrpV0osjrRs0+LUV9x1RYEEuqLjv275zjNW07ntJurtmX9ZJOtjv290tdhH9Jtq3uVny/qM85hyUnpa0TxyDrKiRFbbommEn4cxRpgz4R+CzZvaTijKUbsi2mtnXgK/5ctx96JXGLwCe7xphUN+862jSY7l8ER4/3Z6zKgHS/D5wtueKSpGnyJJ8yxNoJzte3ymIByfpFQMuMrNTcgz7TUf4JqNcS5i3a4DluRqu0K5VwEp6u5vkGe9WYLGZPVMVh/mcNB2aPshzPq+keOebNr1VhSdK+pZb6kfdAuU331gHfNRLU5J1aJF3sUzSg14W89I+45Gut+kA4I7gv810nzCr4buN0pIEv/Vfi7RECQL2e/2/FPvdyb6qUuH3rC8Wx3c14P6qa5pD6IMFn7rhu+0tjmKLqjUOo6pzClrvL/tBVXxRVCe4G8FFG1W5SU2B7YtJQsl33Tb7eovazDPI5nzRfYP0xereF60nySqEqFF3C9ZB2l1YSeETOiHp4hwqlNWwJMO0KCEGulvSnLoaY0xjGhW1Ik3doVeWPemZ2/i3onzGJM9u8TIMHD6LchWz6S3XHNOYtgq/0aK/D5F0eR+oyrBpnRefjS3ImLYoWUJILFp0shO9HSS2T8Ql+d28w36y/e70nqcmvUrWS7wQbfxvoMe01VmTKQU4YxrTHwr9H+PPrWaml1GTAAAAAElFTkSuQmCC'

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

  const { postContent, postTopic, profile, hideWatermark } = req.body
  if (!postContent?.trim()) return res.status(400).json({ error: 'Contenu du post manquant' })

  // Plan lu en base (jamais depuis le body : sinon contournable)
  const { data: dbProfile } = await supabaseAdmin.from('profiles').select('plan, trial_ends_at').eq('id', userId).single()
  const trialActive = dbProfile?.plan === 'trial' && !!dbProfile?.trial_ends_at && new Date(dbProfile.trial_ends_at) > new Date()
  const isPro = dbProfile?.plan === 'pro' || trialActive
  if (!isPro) return res.status(403).json({ error: 'PRO_ONLY', message: 'Les visuels IA sont réservés au plan Pro.' })

  const imgLimit = trialActive ? 3 : 10
  if (!(await rateLimitHit('img:' + userId, imgLimit, 3600))) {
    return res.status(429).json({ error: 'RATE_LIMIT', message: 'Limite de ' + imgLimit + ' visuels par heure atteinte.' })
  }

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
          '- 2 a 3 mots MAX, MAJUSCULES, SANS accents, SANS ponctuation',
          '- INTERDIT : le titre ne contient AUCUN chiffre (le chiffre va dans stat, jamais dans le titre)',
          '- INTERDIT : ne repete pas dans le titre le mot-cle principal deja present dans statLabel',
          '- Si comparaison entre 2 options : format "X VS Y" ex "SOC VS EXPERT"',
          '- Sinon un angle court et impactant ex "MENACE REELLE", "SESSIONS OUVERTES", "ROI PROUVE"',
          '',
          'Renvoie ce JSON :',
          '{',
          '  "title": "3 mots MAX voir regles",',
          '  "stat": "UN chiffre cle ex 70% ou 3x ou 10k, vide si aucun dans le post",',
          '  "statLabel": "phrase courte qui explique le chiffre, extraite DIRECTEMENT du post, 6 mots MAX. Doit avoir du sens seul. Ex: des ransomwares frappent la nuit, des PME ont subi une attaque, de gain de productivite. Accepte les accents et apostrophes.",',
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
    // Anti-repetition : retirer le chiffre du titre (le chiffre est reserve au grand nombre)
    if (stat) {
      const digits = stat.replace(/[^0-9]/g, '')
      if (digits && title.includes(digits)) {
        title = title.split(' ').filter((w) => !w.includes(digits)).join(' ').replace(/\s+/g, ' ').trim()
      }
      if (!title) title = toAscii(sector || 'EXPERTISE').toUpperCase().split(' ').slice(0, 2).join(' ')
    }
    if (parsed.statLabel) statLabel = parsed.statLabel
    if (parsed.bgPhoto) bgPhoto = parsed.bgPhoto
    if (parsed.postType) postType = parsed.postType
  } catch (e) {
    console.error('[haiku]', e)
  }

  // ── Étape 2 : Gemini — visuel photo réaliste plein écran ─────────────────
  const textBlock = stat
    ? [
        'TITLE "' + title + '" — TOP 15% of image. BOLD weight, white, clean sans-serif, font size 10-12% of image height. Compact, not oversized.',
        'STAT "' + stat + '" — VERTICAL CENTER (42-62%) of image. BOLD weight, white, font size 28-32% of image height. Dominant and impactful.',
        'LABEL "' + statLabel + '" — just below stat, 65-70% from top. LIGHT or REGULAR weight, white, UPPERCASE, wide letter-spacing (0.15em+), font size 3-4% of image height. Elegant and understated.',
        'Generous empty space between elements. Never cluster them.',
      ].join(' ')
    : [
        'TITLE "' + title + '" — positioned in the TOP 25% of the image. Bold weight, white, font size approximately 12-14% of image height.',
        'Leave the rest of the image clean with generous negative space.',
      ].join(' ')

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
    '- Typography: title in BOLD weight sans-serif, stat number in REGULAR or MEDIUM weight (lighter than title), label in LIGHT weight with wide letter-spacing',
    '- Premium editorial magazine style — NOT a street poster. Elegant and proportional.',
    '- Semi-transparent dark overlay behind text for readability',
    '- Generous empty space — never cramped',
    '- Accent color ' + brandAccent + ' for underlines, highlights or stat color',
    '- Secondary color ' + brandSecondary + ' for gradient or secondary accents',
    '',
    'ABSOLUTE RULES:',
    '- Photorealistic background, NOT flat design, NOT illustration',
    '- Do NOT add any text other than what is specified above',
    '- Do NOT add a black bar, dark strip or solid color band at the top or bottom of the image',
    '- Do NOT put any box, frame, rectangle, panel or semi-transparent overlay behind ANY text element — not behind the title, not behind the stat, not behind the label',
    '- All text must float directly on the photo background with only a subtle text shadow for readability — NO containers',
    '- The photo must fill the ENTIRE image edge to edge, no borders, no bands, no letterboxing',
    '- Stat and title color must use ONLY ' + brandAccent + ' or white — no random blue, no purple',
    '- Do NOT write watermark, copyright, footer, logo or any label',
    '- Do NOT add colored blocks, frames or zones not described above',
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
    const topCrop = Math.round(H * 0.04)
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

    // Watermark Ecrira — logo blanc inline (fiable sur serverless, visible sur photo sombre)
    if (!hideWatermark) {
      try {
        const logoResized = await sharp(Buffer.from(ECRIRA_WHITE_B64, 'base64'))
          .resize({ width: 150, withoutEnlargement: true })
          .png()
          .toBuffer()
        const lm = await sharp(logoResized).metadata()
        const lw = lm.width || 150
        const lh = lm.height || 32
        const margin = 22
        composited = await sharp(composited)
          .composite([{ input: logoResized, left: W - lw - margin, top: W - lh - margin, blend: 'over' }])
          .png()
          .toBuffer()
      } catch (e) { console.error('[watermark]', e) }
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
