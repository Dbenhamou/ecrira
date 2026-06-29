import type { NextApiRequest, NextApiResponse } from 'next'
import Anthropic from '@anthropic-ai/sdk'
import { requireAuth } from '../../lib/auth-helper'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const imgRateLimit = new Map<string, {count: number, reset: number}>()
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

  const { postContent, postTopic, profile } = req.body
  if (!postContent?.trim()) return res.status(400).json({ error: 'Contenu du post manquant' })

  const isPro = profile?.plan === 'pro' || profile?.plan === 'trial'
  if (!isPro) return res.status(403).json({ error: 'PRO_ONLY', message: 'Les visuels IA sont réservés au plan Pro.' })

  const brandAccent = profile?.brand_accent || '#3D52A0'
  const brandSecondary = profile?.brand_color2 || '#32458A'
  const sector = profile?.sector || ''

  // Étape 1 : Claude analyse le post (généraliste, tous secteurs) et prépare le brief visuel
  let visualTitle = postTopic || ''
  let visualPoints: string[] = []
  let layout = 'trois-points'
  let bgDescription = ''
  let postType = 'conseil'
  try {
    const extract = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: `Tu es directeur artistique pour des infographies LinkedIn professionnelles, tous secteurs confondus (tech, immobilier, finance, coaching, RH, santé, etc.). Tu analyses un post et prépares un brief visuel adapté au secteur ET au type de contenu. Réponds UNIQUEMENT en JSON strict, sans markdown.`,
      messages: [{
        role: 'user',
        content: `Analyse ce post LinkedIn et prépare le brief d'une infographie pro.

POST : "${postContent.slice(0, 800)}"
SECTEUR DE L'AUTEUR : "${sector || 'non précisé — déduis-le du post'}"

Renvoie ce JSON :
{
  "title": "titre accrocheur, 6 mots MAX",
  "postType": "un parmi: alerte | statistique | conseil | comparaison | storytelling",
  "layout": "un parmi: heros-chiffre (un grand chiffre central) | comparaison (2 colonnes opposées) | trois-points (3 éléments) | citation (une phrase forte centrale)",
  "points": [{"label":"3 mots max","value":"8 mots max"}],
  "bgDescription": "description courte EN ANGLAIS d'une image d'ambiance professionnelle et abstraite liée au SECTEUR du post (ex pour la tech: 'abstract data center with soft blue light'; pour l'immobilier: 'modern architecture soft daylight'). Doit rester subtile, pas chargée, pour servir de fond avec du texte par-dessus."
}

Le nombre de points dépend du layout : heros-chiffre=1 ou 2, comparaison=2, trois-points=3, citation=0.`,
      }],
    })
    const txt = (extract.content[0] as { text: string }).text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(txt)
    if (parsed.title) visualTitle = parsed.title
    if (parsed.layout) layout = parsed.layout
    if (parsed.postType) postType = parsed.postType
    if (parsed.bgDescription) bgDescription = parsed.bgDescription
    if (Array.isArray(parsed.points)) visualPoints = parsed.points.map((p: {label:string,value:string}) => `${p.label} — ${p.value}`)
  } catch (e) {
    console.error('[extract]', e)
  }

  const pointsBlock = visualPoints.length ? visualPoints.map((p,i)=>`${i+1}. ${p}`).join('\n') : ''

  // Layout-specific composition guidance
  const layoutGuide: Record<string,string> = {
    'heros-chiffre': 'Composition centrée sur UN grand chiffre/statistique dominant, énorme, au centre. Le titre au-dessus, une courte explication en dessous.',
    'comparaison': 'Deux colonnes ou deux zones opposées (vs), avec un contraste visuel clair entre les deux côtés.',
    'trois-points': 'Trois éléments alignés avec icônes minimalistes, espacés et aérés.',
    'citation': 'Une phrase forte centrale en grand, traitée comme une citation premium, beaucoup d\'espace négatif.',
  }

  const designPrompt = `Crée une infographie LinkedIn PREMIUM et professionnelle, format carré 1:1 (1080x1080), en FRANÇAIS.

TITRE (en grand, dominant) : "${visualTitle}"

CONTENU À AFFICHER (uniquement ça, rien de plus) :
${pointsBlock || '(pas de points, mets en valeur le titre comme une citation)'}

COMPOSITION (layout "${layout}") :
${layoutGuide[layout] || layoutGuide['trois-points']}

IMAGE DE FOND (subtile, en arrière-plan, faible opacité pour garder le texte lisible) :
${bgDescription || 'fond abstrait professionnel, dégradé doux'}

RÈGLES GRAPHIQUES (premium, niveau magazine pro) :
- Vraie profondeur : image d'ambiance en fond + overlay pour la lisibilité du texte
- Composition éditoriale travaillée, hiérarchie visuelle forte
- Icônes minimalistes et élégantes
- Beaucoup d'espace négatif, aéré, AUCUNE surcharge de texte
- Rendu haut de gamme, pas "template générique"

PALETTE OBLIGATOIRE (STRICTE) :
- Couleur dominante : ${brandAccent}
- Couleur secondaire : ${brandSecondary}
- N'utilise QUE ces teintes + neutres (blanc, gris, noir). Pas de cyan, pas de vert non demandés.

Texte FRANÇAIS parfaitement orthographié et lisible. Format carré 1:1.`

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
    const imagePart = parts.find((p: { inlineData?: { data: string, mimeType?: string } }) => p.inlineData?.data)
    if (!imagePart) {
      return res.status(500).json({ error: 'Aucune image générée' })
    }

    res.status(200).json({ image: imagePart.inlineData.data, mimeType: imagePart.inlineData.mimeType || 'image/png', layout, postType })
  } catch (err) {
    console.error('[generate-image-ai]', err)
    res.status(500).json({ error: 'Erreur génération image IA' })
  }
}
