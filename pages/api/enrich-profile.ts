import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAuth } from '../../lib/auth-helper'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function scrapePage(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Ecrira/1.0)' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return ''
    const html = await res.text()
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 4000)
  } catch {
    return ''
  }
}

async function fetchFavicon(baseUrl: string): Promise<string> {
  try {
    // Try to find favicon URL from HTML first
    const res = await fetch(baseUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(5000) })
    if (!res.ok) return ''
    const html = await res.text()
    // Look for apple-touch-icon or icon link (higher quality)
    const iconMatch = html.match(/<link[^>]+rel=["'](?:apple-touch-icon|icon)["'][^>]+href=["']([^"']+)["']/i)
      || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:apple-touch-icon|icon)["']/i)
    let iconUrl = iconMatch ? iconMatch[1] : '/favicon.ico'
    if (!iconUrl.startsWith('http')) {
      iconUrl = iconUrl.startsWith('/') ? new URL(baseUrl).origin + iconUrl : baseUrl + '/' + iconUrl
    }
    const iconRes = await fetch(iconUrl, { signal: AbortSignal.timeout(4000) })
    if (!iconRes.ok) return ''
    const buffer = await iconRes.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    const mimeType = iconRes.headers.get('content-type') || 'image/png'
    const dataUri = `data:${mimeType};base64,${base64}`
    // Only return if reasonably sized (< 200KB)
    return base64.length < 200000 ? dataUri : ''
  } catch {
    return ''
  }
}

async function extractColors(url: string): Promise<{ bg: string; text: string; accent: string }> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Ecrira/1.0)' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return { bg: '#FAF9F7', text: '#1F2421', accent: '#516756' }
    const html = await res.text()

    // Extraire les couleurs hex du CSS inline + style tags
    const colorMatches = html.match(/#[0-9a-fA-F]{6}\b/g) || []
    const uniqueColors = Array.from(new Set(colorMatches)).slice(0, 20)

    if (uniqueColors.length < 2) return { bg: '#FAF9F7', text: '#1F2421', accent: '#516756' }

    // Utiliser Claude Haiku pour identifier bg/text/accent
    const colorMsg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      messages: [{
        role: 'user',
        content: `Parmi ces couleurs extraites d'un site web: ${uniqueColors.join(', ')}

Identifie :
- bg : la couleur de fond principale (souvent claire/blanche)
- text : la couleur de texte principale (souvent sombre)
- accent : la couleur de marque/CTA distinctive (PAS un gris, PAS #ffffff, PAS #f5f5f5, PAS #eeeeee — une vraie couleur de marque)

Réponds UNIQUEMENT avec ce JSON: {"bg":"#xxxxxx","text":"#xxxxxx","accent":"#xxxxxx"}`,
      }],
    })
    const raw = (colorMsg.content[0] as { text: string }).text
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())
    return parsed
  } catch {
    return { bg: '#FAF9F7', text: '#1F2421', accent: '#516756' }
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const userId = await requireAuth(req, res)
  if (!userId) return

  const { domain } = req.body
  if (!domain) return res.status(400).json({ error: 'Domaine manquant' })

  // Validation : bloquer IPs privées/locales (SSRF protection)
  const BLOCKED = /^https?:\/\/(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.|0\.0\.0\.0|169\.254\.)/i
  const base = domain.startsWith('http') ? domain : `https://${domain}`
  if (BLOCKED.test(base)) return res.status(400).json({ error: 'Domaine non autorisé' })
  // Valider que c'est bien une URL
  try { new URL(base) } catch { return res.status(400).json({ error: 'Domaine invalide' }) }

  const [homeText, aboutText, colors, logob64] = await Promise.all([
    scrapePage(base),
    scrapePage(`${base}/about`).then(t => t || scrapePage(`${base}/a-propos`)),
    extractColors(base),
    fetchFavicon(base),
  ])

  const content = [homeText, aboutText].filter(Boolean).join('\n\n')

  if (!content.trim()) {
    return res.status(200).json({ error: 'Impossible de lire le site. Vérifie le domaine ou remplis le profil manuellement.' })
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      system: `Tu es un expert en analyse de positionnement d'entreprise. 
Tu analyses le contenu d'un site web et tu en extrais des informations pour enrichir un profil LinkedIn.
Réponds UNIQUEMENT avec un JSON valide, sans markdown ni commentaire.`,
      messages: [{
        role: 'user',
        content: `Analyse ce contenu de site web et extrais les informations suivantes pour créer des posts LinkedIn ultra-pertinents :

${content}

Réponds avec ce JSON exact (tous les champs en français) :
{
  "company": "nom exact de l'entreprise/organisation",
  "sector": "secteur d'activité précis en 4-6 mots (ex: Presse événementielle B2B, Cybersécurité MSP, Conseil RH PME)",
  "audience": "cible client principale en 8-15 mots (ex: Directeurs communication grands groupes, MSP et revendeurs IT en France)",
  "summary": "positionnement différenciant en 1 phrase max 25 mots",
  "keywords": "5-8 mots-clés métier séparés par des virgules (termes du secteur, problématiques clients)",
  "tone": "ton éditorial recommandé: expert/inspirant/pédagogique/provocateur/storytelling",
  "content_themes": "3-5 thèmes de posts recommandés séparés par | (ex: Tendances presse|Coulisses événements|Chiffres clés secteur)",
  "pain_points": "2-3 problèmes clients principaux séparés par | que cette entreprise résout"
}`,
      }],
    })

    const raw = (message.content[0] as { text: string }).text
    const clean = raw.replace(/```json|```/g, '').trim()
    const suggestions = JSON.parse(clean)

    res.status(200).json({ suggestions, colors, logo_b64: logob64 || '' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur analyse du site' })
  }
}
