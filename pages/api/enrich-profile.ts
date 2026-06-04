import type { NextApiRequest, NextApiResponse } from 'next'
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
    const uniqueColors = [...new Set(colorMatches)].slice(0, 20)

    if (uniqueColors.length < 2) return { bg: '#FAF9F7', text: '#1F2421', accent: '#516756' }

    // Utiliser Claude Haiku pour identifier bg/text/accent
    const colorMsg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      messages: [{
        role: 'user',
        content: `Parmi ces couleurs extraites d'un site web: ${uniqueColors.join(', ')}
Identifie les 3 couleurs les plus probables pour: fond principal, texte principal, couleur accent/CTA.
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

  const { domain } = req.body
  if (!domain) return res.status(400).json({ error: 'Domaine manquant' })

  const base = domain.startsWith('http') ? domain : `https://${domain}`

  const [homeText, aboutText, colors] = await Promise.all([
    scrapePage(base),
    scrapePage(`${base}/about`).then(t => t || scrapePage(`${base}/a-propos`)),
    extractColors(base),
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
        content: `Analyse ce contenu de site web et extrais les informations suivantes :

${content}

Réponds avec ce JSON exact :
{
  "company": "nom de l'entreprise",
  "sector": "secteur d'activité en 5-8 mots",
  "audience": "cible client principale en 8-12 mots",
  "tech_stack": "technologies/outils mentionnés si pertinent, sinon vide",
  "summary": "résumé du positionnement en 1 phrase max 20 mots"
}`,
      }],
    })

    const raw = (message.content[0] as { text: string }).text
    const clean = raw.replace(/```json|```/g, '').trim()
    const suggestions = JSON.parse(clean)

    res.status(200).json({ suggestions, colors })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur analyse du site' })
  }
}
