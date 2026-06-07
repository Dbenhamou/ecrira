import type { NextApiRequest, NextApiResponse } from 'next'
import Anthropic from '@anthropic-ai/sdk'
import { requireAuth } from '../../lib/auth-helper'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const userId = await requireAuth(req, res)
  if (!userId) return

  const {
    postContent,
    postTopic,
    profile,
    visualType = 'classique',
    hideWatermark = false,
    hideUserInfo = false,
    customPoints = '',
    visualCustomTitle = '',
  } = req.body

  const isPro = profile?.plan === 'pro'
  const showWatermark = !isPro || !hideWatermark
  if (!postContent?.trim()) return res.status(400).json({ error: 'Contenu du post manquant' })

  const sector = profile?.sector || 'B2B'
  const company = profile?.company || ''
  const name = profile?.name || ''
  const role = profile?.role || ''
  const brandBg = profile?.brand_bg || '#FAF9F7'
  const brandAccent = profile?.brand_accent || '#516756'

  const lines = postContent
    .split('\n')
    .map((l: string) => l.trim())
    .filter((l: string) => l.length > 20 && l.length < 120)
    .slice(0, 3)
  const keyPoints = lines.length > 0 ? lines : [postContent.substring(0, 100)]

  // Build conditional parts without nested backticks
  const watermarkLine = showWatermark
    ? '   text "ecrira.com" fill=#9EA39C font-size=14 x=980 y=1338 text-anchor=end opacity=0.6'
    : ''
  const footerClassique = hideUserInfo ? '' : ` Cercle ${brandAccent}40 r=32 + initiales blanches bold. Nom blanc bold 27px + role #B7C0B8 20px. Badge LinkedIn ${brandAccent} droite rx=20.`
  const footerSimple = hideUserInfo ? '' : ` Nom blanc bold 26px + role #B7C0B8 19px.`
  const footerSimple2 = hideUserInfo ? '' : ` Nom blanc 26px + role #B7C0B8 18px.`
  const footerCitation = hideUserInfo ? '' : ` Cercle initiales + nom blanc 26px + role #B7C0B8 19px.`
  const authorLine = hideUserInfo ? '' : `${name}${role ? ' - ' + role + (company ? ' · ' + company : '') : ''}`
  const titleLine = visualCustomTitle || postTopic || 'Post LinkedIn'
  const pointsLine = customPoints
    ? customPoints.split('\n').filter((p: string) => p.trim()).slice(0, 4).join(' | ')
    : keyPoints.slice(0, 3).join(' | ')

  const prompt = `Tu es un expert en design graphique SVG pour LinkedIn. Tu crées des visuels IMPACTANTS, EPURES et PROFESSIONNELS.

${hideUserInfo ? 'IMPORTANT : NE PAS ajouter de footer sombre (#1F2421). La zone en bas du visuel doit continuer le fond general du design sans rect supplementaire.' : ''}

REGLES ABSOLUES :
- SVG 1080x1350px viewBox="0 0 1080 1350"
- font-family="Arial, Helvetica, sans-serif" UNIQUEMENT
- Elements : rect, text, circle, line, path, defs, linearGradient, stop, polygon
- PAS de foreignObject, PAS @import, PAS filter complexe
- Texte long = plusieurs balises text separees
- Tous textes entre x=72 et x=1008

DONNEES :
- Titre : ${titleLine}
- Points : ${pointsLine}
- Accent : ${brandAccent}
- Fond : ${brandBg}
- Auteur : ${authorLine}
- Type demande : ${visualType.toUpperCase()}

---
SI CLASSIQUE :
1. HEADER (0-170px) : dégradé linearGradient ${brandAccent} vers version +20% sombre. Texte bold blanc 52px x=72 y=110. Badge secteur droite rx=24 fond blanc 25% texte blanc bold 20px x=900.
2. TITRE (170-490px) : fond ${brandBg}. Rect ${brandAccent} 6px haut w=88 rx=3 y=182. Titre ${brandAccent} bold 58px y=290 et y=362 (max 2 lignes). Sous-titre italic #555 25px y=430.
3. SÉPARATEUR (490-510px) : ligne #E0DAD4 pleine largeur + cercle ${brandAccent} r=5 centré + 2 cercles stroke ${brandAccent} 30% r=3 à ±40px.
4. POINTS CLÉS (510-1080px) : fond blanc. Label "POINTS CLÉS" #B0A898 12px letter-spacing=5 centré y=548. 3 cards (x=56 w=968 rx=16) fond ${brandBg} avec bordure gauche rect ${brandAccent} 5px large rx=3. Cercle ${brandAccent} r=28 fill=${brandAccent} + numéro blanc bold 22px. Titre bold 28px #1F2421. Description ${brandAccent} 20px opacity=0.85.
5. STAT (1085-1200px) : fond ${brandAccent} opacity=0.12. Chiffre ${brandAccent} bold 68px centré. Label #1F2421 bold 22px centré.
6. FOOTER (1200-1350px) : fond #1F2421.${footerClassique}
${watermarkLine}

---
SI TIMELINE :
1. HEADER (0-160px) : fond ${brandAccent}. Titre bold blanc 52px centré y=95. Sous-titre blanc 75% 23px centré y=135.
2. FRISE (160-1090px) : fond blanc. Ligne verticale centrale stroke=${brandAccent} strokeWidth=6 x1=540 x2=540 y1=195 y2=1040.
   MAX 4 ETAPES (pas plus) espacées régulièrement : cercle fill=${brandAccent} r=42 + numéro blanc bold 26px centré. Cards alternées gauche (x=72 w=420 rx=16) / droite (x=588 w=420 rx=16) fond ${brandBg} avec bordure gauche ou droite ${brandAccent} 5px. Ligne connectrice horizontale stroke=${brandAccent} strokeWidth=3 entre cercle et card. Titre card bold 28px #1F2421. Description 20px #555 max 2 lignes.
3. CONCLUSION (1090-1210px) : fond ${brandAccent}. Texte clé blanc bold 30px centré. Sous-texte blanc 75% 21px centré.
4. FOOTER (1210-1350px) : fond #1F2421.${footerSimple}
${watermarkLine}

---
SI STAT :
1. FOND (0-1350px) : rect ${brandBg}.
2. BANDES DÉCO : rect ${brandAccent} x=0 y=0 width=12 height=1350. Rect ${brandAccent} x=1068 y=0 width=12 height=1350.
3. CERCLES DÉCO CONCENTRIQUES : 3 cercles stroke=${brandAccent} strokeWidth=3 opacity=0.08/0.12/0.18 r=380/280/180 cx=540 cy=600.
4. TITRE SUJET (y=140-230px) : texte #1F2421 bold 32px centré y=185.
5. LE CHIFFRE (y=350-620px) : stat clé du post ${brandAccent} bold font-size=220 centré cx=540 y=600. Unité si applicable font-size=100 alignée.
6. LABEL CHIFFRE (y=640px) : label #1F2421 bold 36px centré.
7. CONTEXTE (y=710-900px) : 2-3 lignes #555 25px centré (max 44 chars/ligne).
8. TITRE ENCADRÉ (y=940-1080px) : rect ${brandAccent} rx=20 x=72 w=936. Titre italic blanc bold 32px centré y=1018. Sous-texte blanc 75% 22px centré y=1055.
9. FOOTER (1200-1350px) : fond #1F2421.${footerSimple}
${watermarkLine}

---
SI CITATION :
1. FOND (0-1350px) : rect ${brandBg}.
2. GUILLEMETS DÉCO MONUMENTAUX : text '«' fill=${brandAccent} opacity=0.22 font-size=500 font-weight=bold x=30 y=520. Text '»' fill=${brandAccent} opacity=0.22 font-size=500 font-weight=bold x=620 y=920.
3. BANDE ACCENT (0-8px large) : rect ${brandAccent} x=0 y=0 w=8 h=1350.
4. CITATION (y=220-700px) : phrase clé principale du post en #1F2421 bold font-size=58 centré, max 3 lignes, bien aéré (line-height émulé via y espacés de 80px).
5. TRAIT (y=720px) : rect ${brandAccent} w=120 h=7 rx=4 centré.
6. AUTEUR/CONTEXTE (y=770-870px) : texte italic ${brandAccent} 28px centré max 2 lignes.
7. ENCADRÉ IMPACT (y=920-1130px) : rect fill=${brandAccent} rx=22 x=56 w=968. Texte blanc bold 34px centré y=995. Sous-texte blanc 78% 23px centré y=1040 et y=1075.
8. FOOTER (1160-1350px) : fond #1F2421.${footerCitation}
${watermarkLine}

---
SI LISTE :
1. HEADER (0-160px) : fond ${brandAccent}. Titre bold blanc 48px x=72 y=100. Badge contexte droite.
2. SOUS-TITRE (160-230px) : fond ${brandBg}. Italic #666 24px x=72 y=205.
3. ITEMS (230-1110px) : fond blanc. 3-4 items :
   Chaque item (hauteur ~200px) : rect ${brandBg} rx=16 x=56 w=968. Carre arrondi ${brandAccent} 58x58 rx=14 x=80 + numero blanc bold 30px centre. Titre bold 29px #1F2421 x=162. Description 21px #666 x=162.
4. CTA (1110-1220px) : rect ${brandAccent} x=0 w=1080. Texte blanc bold 30px centre.
5. FOOTER (1220-1350px) : fond #1F2421.${footerSimple2}
${watermarkLine}

Reponds UNIQUEMENT avec le code SVG complet, commencant par <svg et finissant par </svg>. Aucun texte avant ou apres.`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      messages: [{
        role: 'user',
        content: prompt,
      }],
    })

    const svgRaw = (message.content[0] as { text: string }).text

    // Nettoyer les backticks markdown
    const svgCleaned = svgRaw
      .replace(/^```(?:svg|xml)?\s*/m, '')
      .replace(/\s*```\s*$/m, '')
      .trim()

    let svgClean = ''
    const svgMatch = svgCleaned.match(/<svg[\s\S]*/i)
    if (!svgMatch) {
      console.error('Pas de SVG trouve apres nettoyage')
      return res.status(500).json({ error: 'Generation SVG invalide' })
    }
    svgClean = svgMatch[0]
    if (!svgClean.includes('</svg>')) svgClean += '</svg>'

    // Sanitisation SVG : supprimer scripts, event handlers, liens javascript
    const svgSafe = svgClean
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/data:text\/html/gi, '')

    res.status(200).json({ svgContent: svgSafe })
  } catch (err) {
    console.error('[generate-visual] Error:', err)
    res.status(500).json({ error: 'Erreur generation visuel' })
  }
}
