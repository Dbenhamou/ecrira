import type { NextApiRequest, NextApiResponse } from 'next'
import Anthropic from '@anthropic-ai/sdk'
import { requireAuth } from '../../lib/auth-helper'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const userId = await requireAuth(req, res)
  if (!userId) return

  const { postContent, postTopic, profile, visualType = 'classique', hideWatermark = false, hideUserInfo = false, customPoints = '' } = req.body
  const isPro = profile?.plan === 'pro'
  const showWatermark = !isPro || !hideWatermark
  if (!postContent?.trim()) return res.status(400).json({ error: 'Contenu du post manquant' })

  const sector = profile?.sector || 'B2B'
  const company = profile?.company || ''
  const name = profile?.name || ''
  const role = profile?.role || ''
  const brandBg = profile?.brand_bg || '#FAF9F7'
  const brandAccent = profile?.brand_accent || '#516756'

  // Extraire les points clés du post (max 3)
  const lines = postContent
    .split('\n')
    .map((l: string) => l.trim())
    .filter((l: string) => l.length > 20 && l.length < 120)
    .slice(0, 3)

  const keyPoints = lines.length > 0 ? lines : [postContent.substring(0, 100)]

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      messages: [{
        role: 'user',
        content: `Tu es un expert en design graphique SVG pour LinkedIn. Tu crées des visuels IMPACTANTS, ÉPURÉS et PROFESSIONNELS.

RÈGLES ABSOLUES :
- SVG 1080x1350px viewBox="0 0 1080 1350"
- font-family="Arial, Helvetica, sans-serif" UNIQUEMENT
- Éléments : rect, text, circle, line, path, defs, linearGradient, stop, polygon
- PAS de foreignObject, PAS @import, PAS filter complexe
- Texte long = plusieurs balises text séparées
- Tous textes entre x=72 et x=1008

DONNÉES :
- Titre : ${visualCustomTitle || postTopic || 'Post LinkedIn'}
- Points : ${customPoints ? customPoints.split('\n').filter((p: string) => p.trim()).slice(0, 4).join(' | ') : keyPoints.slice(0, 3).join(' | ')}
- Accent : ${brandAccent}
- Fond : ${brandBg}
- Auteur : ${hideUserInfo ? '' : name}
- Rôle : ${hideUserInfo ? '' : (role + (company ? ' · ' + company : ''))}
- Type demandé : ${visualType.toUpperCase()}

---
SI CLASSIQUE :
1. HEADER (0-160px) : rect fond ${brandAccent} pleine largeur. Entreprise/auteur bold blanc 48px x=72 y=100. Badge secteur droite rx=20 fond blanc 20% texte blanc 19px.
2. TITRE (160-480px) : fond ${brandBg}. Rect ${brandAccent} 80px large 6px rx=3 y=176. Titre ${brandAccent} bold 56px y=275 et y=345 (2 lignes max). Sous-titre italic #666 24px y=415.
3. SÉPARATEUR : ligne #ddd + 3 cercles centrés y=470.
4. POINTS CLÉS (480-1090px) : fond blanc. Label "POINTS CLÉS" #aaa 13px letter-spacing=4 centré y=520. 3 cards rx=14 fond ${brandBg} (x=56 w=968). Cercle ${brandAccent} r=26 + numéro blanc bold 22px. Titre bold 27px #1F2421. Sous-titre ${brandAccent} 19px 75% opacité.
5. STAT (1090-1200px) : fond ${brandAccent}18. Chiffre clé ${brandAccent} bold 64px centré + label #1F2421 22px.
6. FOOTER (1200-1350px) : fond #1F2421.${hideUserInfo ? '' : ` Cercle ${brandAccent}40 r=32 + initiales blanches bold. Nom blanc bold 27px + rôle #B7C0B8 20px. Badge LinkedIn ${brandAccent} droite rx=20.`}
${showWatermark ? '   text "ecrira.com" fill=#9EA39C font-size=14 x=980 y=1338 text-anchor=end opacity=0.6' : ''}

---
SI TIMELINE :
1. HEADER (0-150px) : fond ${brandAccent}. Titre bold blanc 50px centré y=90. Sous-titre blanc 70% 22px centré y=130.
2. FRISE (150-1100px) : fond blanc. Ligne verticale centrale stroke=${brandAccent} strokeWidth=5 x1=540 x2=540 y1=180 y2=1060.
   4 ÉTAPES : cercle ${brandAccent} r=36 fill=${brandAccent} + numéro blanc bold 24px. Cards alternées gauche (x=72 w=400 rx=14) / droite (x=608 w=400). Ligne horizontale connectrice ${brandAccent} strokeWidth=3. Titre card bold 26px #1F2421. Description 19px #666.
3. CONCLUSION (1100-1210px) : fond ${brandAccent}15. Texte clé centré bold ${brandAccent} 28px.
4. FOOTER (1210-1350px) : fond #1F2421.${hideUserInfo ? '' : ` Nom blanc bold 26px + rôle #B7C0B8 19px.`}
${showWatermark ? '   text "ecrira.com" fill=#9EA39C font-size=14 x=980 y=1338 text-anchor=end opacity=0.6' : ''}

---
SI STAT :
1. FOND (0-1350px) : rect ${brandBg}.
2. BANDE GAUCHE : rect ${brandAccent} x=0 y=0 width=10 height=1350.
3. CERCLE DÉCO : cercle stroke=${brandAccent} strokeWidth=4 opacity=0.12 r=320 cx=540 cy=580.
4. LE CHIFFRE (y=450-700px) : 1 stat énorme ${brandAccent} bold font-size=200 centré cx=540. Unité si applicable font-size=90.
5. LABEL CHIFFRE (y=710px) : label court #1F2421 bold 34px centré.
6. CONTEXTE (y=780-950px) : 2-3 lignes #555 24px centré (max 44 chars/ligne).
7. TITRE ENCADRÉ (y=980-1100px) : rect ${brandAccent}12 rx=20 x=72 w=936. Titre italic ${brandAccent} bold 30px centré y=1055.
8. FOOTER (1200-1350px) : fond #1F2421.${hideUserInfo ? '' : ` Nom blanc bold 26px + rôle #B7C0B8 19px.`}
${showWatermark ? '   text "ecrira.com" fill=#9EA39C font-size=14 x=980 y=1338 text-anchor=end opacity=0.6' : ''}

---
SI CITATION :
1. FOND (0-1350px) : rect ${brandBg}.
2. GUILLEMETS DÉCO : text « #1F2421 opacity=0.07 font-size=400 x=40 y=400.
3. CITATION (y=200-720px) : texte de la phrase clé du post en #1F2421 bold font-size=54 centré, max 3 lignes 42px line-height.
4. TRAIT (y=740px) : rect ${brandAccent} w=100 h=6 rx=3 centré.
5. CONTEXTE (y=790-920px) : sous-texte italic ${brandAccent} 26px centré max 2 lignes.
6. ENCADRÉ CTA (y=950-1150px) : rect ${brandAccent} rx=20 x=72 w=936. Texte blanc bold 30px centré + sous-texte blanc 70% 21px.
7. FOOTER (1160-1350px) : fond #1F2421.${hideUserInfo ? '' : ` Cercle initiales + nom blanc 26px + rôle #B7C0B8 19px.`}
${showWatermark ? '   text "ecrira.com" fill=#9EA39C font-size=14 x=980 y=1338 text-anchor=end opacity=0.6' : ''}

---
SI LISTE :
1. HEADER (0-160px) : fond ${brandAccent}. Titre bold blanc 48px x=72 y=100. Badge contexte droite.
2. SOUS-TITRE (160-230px) : fond ${brandBg}. Italic #666 24px x=72 y=205.
3. ITEMS (230-1110px) : fond blanc. 3-4 items :
   Chaque item (hauteur ~200px) : rect ${brandBg} rx=16 x=56 w=968. Carré arrondi ${brandAccent} 58x58 rx=14 x=80 + numéro blanc bold 30px centré. Titre bold 29px #1F2421 x=162. Description 21px #666 x=162. Ligne séparatrice légère #eee.
4. CTA (1110-1220px) : rect ${brandAccent} x=0 w=1080. Texte blanc bold 30px centré.
5. FOOTER (1220-1350px) : fond #1F2421.${hideUserInfo ? '' : ` Nom blanc 26px + rôle #B7C0B8 18px.`}
${showWatermark ? '   text "ecrira.com" fill=#9EA39C font-size=14 x=980 y=1338 text-anchor=end opacity=0.6' : ''}

Réponds UNIQUEMENT avec le code SVG complet, commençant par <svg et finissant par </svg>. Aucun texte avant ou après.\`,
    })

    const svgRaw = (message.content[0] as { text: string }).text

    // Nettoyer les backticks markdown (```svg, ```xml, ```)
    const svgCleaned = svgRaw
      .replace(/^```(?:svg|xml)?\s*/m, '')
      .replace(/\s*```\s*$/m, '')
      .trim()

    // Extraire le SVG — avec ou sans closing tag (troncature possible)
    let svgClean = ''
    const svgMatch = svgCleaned.match(/<svg[\s\S]*/i)
    if (!svgMatch) {
      console.error('Pas de SVG trouvé après nettoyage')
      return res.status(500).json({ error: 'Génération SVG invalide' })
    }
    svgClean = svgMatch[0]
    // Ajouter </svg> si manquant
    if (!svgClean.includes('</svg>')) svgClean += '</svg>'

    // Sanitisation SVG : supprimer scripts, event handlers, liens javascript
    const svgSafe = svgClean
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/data:text\/html/gi, '')

    res.status(200).json({ svgContent: svgSafe })

  } catch (err: any) {
    console.error('Generate visual error:', err)
    res.status(500).json({ error: err.message || 'Erreur serveur' })
  }
}
