import type { NextApiRequest, NextApiResponse } from 'next'
import Anthropic from '@anthropic-ai/sdk'
import { requireAuth } from '../../lib/auth-helper'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const ECRIRA_LOGO = 'data:image/png;base64,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'


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
  const watermarkLine = showWatermark
    ? `   Logo Ecrira bas droite : <image x="860" y="1295" width="110" height="44" href="${ECRIRA_LOGO}" xlink:href="${ECRIRA_LOGO}" opacity="0.8" preserveAspectRatio="xMidYMid meet"/>`
    : ''
  if (!postContent?.trim()) return res.status(400).json({ error: 'Contenu du post manquant' })

  const sector = profile?.sector || 'B2B'
  const company = profile?.company || ''
  const name = profile?.name || ''
  const role = profile?.role || ''
  const brandBg = profile?.brand_bg || '#FAF9F7'
  const brandText = profile?.brand_text || '#1F2421'
  const brandAccent = profile?.brand_accent || '#516756'
  const brandPrimary = profile?.brand_accent || '#516756'
  const brandSecondary = profile?.brand_color2 || brandPrimary
  const brandAccentColor = profile?.brand_color3 || brandPrimary
  const paletteDesc = `Palette marque : fond=${brandBg}, texte=${brandText}, primaire=${brandPrimary}, secondaire=${brandSecondary}, accent=${brandAccentColor}`

  const lines = postContent
    .split('\n')
    .map((l: string) => l.trim())
    .filter((l: string) => l.length > 20 && l.length < 120)
    .slice(0, 3)
  const keyPoints = lines.length > 0 ? lines : [postContent.substring(0, 100)]


  const titleLine = visualCustomTitle || postTopic || 'Post LinkedIn'
  const pointsLine = customPoints
    ? customPoints.split('\n').filter((p: string) => p.trim()).slice(0, 4).join(' | ')
    : keyPoints.slice(0, 3).join(' | ')

  // Build type-specific instructions only
  const typeInstructions: Record<string, string> = {
    classique: `
1. HEADER (0-170px) : degrade linearGradient ${brandPrimary} vers version +20% sombre. Texte bold blanc 48px x=72 y=110 — largeur max 620px. Badge secteur rx=24 fond blanc 25% x=720 texte blanc bold 18px.
2. TITRE (170-490px) : fond ${brandBg}. Rect ${brandPrimary} 6px haut w=88 rx=3 y=182. Titre ${brandPrimary} bold 58px y=290 et y=362. Sous-titre italic #555 25px y=430.
3. SEPARATEUR (490-510px) : ligne #E0DAD4 pleine largeur + cercle ${brandPrimary} r=5 centre + 2 cercles stroke r=3 a +-40px.
4. POINTS CLES (510-1080px) : fond blanc. Label "POINTS CLES" #B0A898 12px centré y=548. 3 cards (x=56 w=968 rx=16) fond ${brandBg} avec bordure gauche rect ${brandPrimary} 5px. Cercle ${brandPrimary} r=28 + numero blanc bold 22px. Titre bold 28px #1F2421. Description ${brandPrimary} 20px.
5. STAT (1085-1200px) : fond ${brandPrimary} opacity=0.12. Chiffre ${brandPrimary} bold 68px centre. Label #1F2421 bold 22px.
`,

    timeline: `
1. HEADER (0-160px) : fond ${brandPrimary}. Titre bold blanc 48px centre y=95 max 2 lignes. Sous-titre blanc 75% 22px centre y=135.
2. FRISE (160-1090px) : fond blanc. Ligne verticale centrale stroke=${brandPrimary} strokeWidth=6 x1=540 x2=540 y1=195 y2=1040.
   MAX 4 ETAPES espacees : cercle fill=${brandPrimary} r=42 + numero blanc bold 26px. Cards alternees gauche (x=72 w=420 rx=16) / droite (x=588 w=420 rx=16) fond ${brandBg} bordure ${brandPrimary} 5px. Ligne connectrice stroke=${brandPrimary} strokeWidth=3. Titre card bold 28px #1F2421. Description 20px #555 max 2 lignes.
3. CONCLUSION (1090-1210px) : fond ${brandPrimary}. Texte blanc bold 30px centre. Sous-texte blanc 75% 21px.
`,

    stat: `
1. FOND (0-1350px) : rect ${brandBg}.
2. BANDES DECO : rect ${brandPrimary} x=0 y=0 width=12 height=1350. Rect ${brandPrimary} x=1068 y=0 width=12 height=1350.
3. CERCLES DECO : 3 cercles stroke=${brandPrimary} strokeWidth=3 opacity=0.08/0.12/0.18 r=380/280/180 cx=540 cy=600.
4. TITRE (y=140-230px) : texte #1F2421 bold 32px centre.
5. CHIFFRE (y=350-620px) : stat cle ${brandPrimary} bold font-size=220 centre. Unite font-size=100.
6. LABEL (y=640px) : #1F2421 bold 36px centre.
7. CONTEXTE (y=710-900px) : 2-3 lignes #555 25px centre.
8. ENCADRE (y=940-1080px) : rect ${brandPrimary} rx=20 x=72 w=936. Titre italic blanc bold 32px centre. Sous-texte blanc 75% 22px.
`,

    citation: `
1. FOND (0-1350px) : rect ${brandBg}.
2. GUILLEMETS MONUMENTAUX : text u+00AB fill=${brandPrimary} opacity=0.22 font-size=500 font-weight=bold x=30 y=520. Text u+00BB fill=${brandPrimary} opacity=0.22 font-size=500 font-weight=bold x=620 y=920.
3. BANDE ACCENT : rect ${brandPrimary} x=0 y=0 w=8 h=1350.
4. CITATION (y=220-700px) : phrase cle #1F2421 bold font-size=58 centre, max 3 lignes espacees de 80px.
5. TRAIT (y=720px) : rect ${brandPrimary} w=120 h=7 rx=4 centre.
6. CONTEXTE (y=770-870px) : italic ${brandPrimary} 28px centre.
7. ENCADRE (y=920-1130px) : rect fill=${brandPrimary} rx=22 x=56 w=968. Texte blanc bold 34px centre. Sous-texte blanc 78% 23px.
`,

    liste: `
1. HEADER (0-160px) : fond ${brandPrimary}. Titre bold blanc 46px x=72 y=105 largeur max 620px. Badge rx=24 fond blanc 25% x=720 texte blanc bold 17px.
2. SOUS-TITRE (160-230px) : fond ${brandBg}. Italic #666 24px x=72 y=205.
3. ITEMS (230-1110px) : fond blanc. 3-4 items (hauteur ~200px chacun) : rect ${brandBg} rx=16 x=56 w=968. Carre arrondi ${brandPrimary} 58x58 rx=14 x=80 + numero blanc bold 30px. Titre bold 29px #1F2421 x=162. Description 21px #666 x=162.
4. CTA (1110-1220px) : rect ${brandPrimary} x=0 w=1080. Texte blanc bold 30px centre.
`,
  }

  const selectedInstructions = typeInstructions[visualType] || typeInstructions['classique']

  const prompt = `Tu es un expert en design graphique SVG pour LinkedIn. Cree un visuel IMPACTANT et PROFESSIONNEL.

REGLES ABSOLUES :
- SVG 1080x1350px viewBox="0 0 1080 1350"
- font-family="Arial, Helvetica, sans-serif" UNIQUEMENT
- Palette obligatoire : ${paletteDesc} — utilise PLUSIEURS couleurs pour dégradés, titres, accents, blocs
- Elements : rect, text, circle, line, path, defs, linearGradient, stop, polygon, image
- PAS de foreignObject, PAS @import, PAS filter complexe
- Utilise TOUTES les couleurs de la palette fournie : fond, texte, et les 5 couleurs de marque pour les éléments visuels (titres, accents, dégradés, blocs)
- Texte long = plusieurs balises text separees
- Tous textes entre x=72 et x=1008
- INTERDIT : hashtags (#), mentions (@), URLs dans le visuel
- INTERDIT : footer sombre (#1F2421) en bas — PAS de bande noire/sombre en bas du visuel
- Le visuel se termine proprement sur le fond general, sans bandeau de pied de page
- Texte dans les cards : MAX 40 caractères par ligne, découpe en plusieurs balises text si nécessaire
- Ne jamais laisser du texte déborder hors des rectangles
- INTERDIT : reproduire le texte brut du post LinkedIn dans le visuel
- INTERDIT : afficher une année antérieure à ${new Date().getFullYear()} — si une année est nécessaire, utilise ${new Date().getFullYear()}

DONNEES :
- Titre : ${titleLine}
- Points : ${pointsLine}
- Accent : ${brandPrimary}
- Fond : ${brandBg}

STRUCTURE A RESPECTER :
${selectedInstructions}



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
    let svgSafe = svgClean
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/data:text\/html/gi, '')

    // Supprimer les hashtags générés par Claude dans le SVG
    svgSafe = svgSafe.replace(/<text[^>]*>[^<]*#\w+[^<]*<\/text>/gi, '')

    // Supprimer le footer texte généré par Claude (nom, rôle, entreprise en bas)
    // Supprimer tout rect #1F2421 (footer sombre)
    svgSafe = svgSafe.replace(/<rect[^>]+fill=["']#1[Ff]2421["'][^>]*\/>/gi, '')
    svgSafe = svgSafe.replace(/<rect[^>]+fill=["']#1[Ff]2421["'][^>]*>[^<]*<\/rect>/gi, '')
    // Supprimer les text dans la zone footer (y > 1260)
    svgSafe = svgSafe.replace(/<text[^>]+y=["']1[3-9]\d{2}["'][^>]*>[\s\S]*?<\/text>/gi, '')
    svgSafe = svgSafe.replace(/<text[^>]+y=["']12[7-9]\d["'][^>]*>[\s\S]*?<\/text>/gi, '')
    // Supprimer les circles dans la zone footer (cy > 1260)
    svgSafe = svgSafe.replace(/<circle[^>]+cy=["']1[3-9]\d{2}["'][^>]*\/>/gi, '')

    // Injecter le logo Ecrira programmatiquement (plus fiable que via le prompt)
    if (showWatermark) {
      // Inject logo bottom right, outside any dark footer
      const logoImg = `<image x="850" y="1270" width="200" height="50" href="${ECRIRA_LOGO}" xlink:href="${ECRIRA_LOGO}" opacity="0.85" preserveAspectRatio="xMidYMid meet"/>`
      svgSafe = svgSafe.replace('</svg>', logoImg + '</svg>')
    }


    res.status(200).json({ svgContent: svgSafe })
  } catch (err) {
    console.error('[generate-visual] Error:', err)
    res.status(500).json({ error: 'Erreur generation visuel' })
  }
}
