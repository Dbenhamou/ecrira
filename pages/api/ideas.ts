import type { NextApiRequest, NextApiResponse } from 'next'
import Anthropic from '@anthropic-ai/sdk'
import { requireAuth } from '../../lib/auth-helper'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function fetchNews(sector: string, isEn: boolean): Promise<string> {
  try {
    const queryBroad = encodeURIComponent(sector.split(' ').slice(0, 2).join(' '))
    const querySpecific = encodeURIComponent(sector.split(' ').slice(0, 3).join(' ') + ' 2026')
    const [resFr, resEn, resFr2, resEn2] = await Promise.all([
      fetch(`https://newsapi.org/v2/everything?q=${queryBroad}&language=fr&sortBy=publishedAt&pageSize=3&apiKey=${process.env.NEWS_API_KEY}`),
      fetch(`https://newsapi.org/v2/everything?q=${queryBroad}&language=en&sortBy=publishedAt&pageSize=3&apiKey=${process.env.NEWS_API_KEY}`),
      fetch(`https://newsapi.org/v2/everything?q=${querySpecific}&language=fr&sortBy=publishedAt&pageSize=2&apiKey=${process.env.NEWS_API_KEY}`),
      fetch(`https://newsapi.org/v2/everything?q=${querySpecific}&language=en&sortBy=publishedAt&pageSize=2&apiKey=${process.env.NEWS_API_KEY}`),
    ])
    const [dataFr, dataEn, dataFr2, dataEn2] = await Promise.all([resFr.json(), resEn.json(), resFr2.json(), resEn2.json()])
    const seen = new Set<string>()
    const articles = [
      ...(dataFr.articles || []),
      ...(dataEn.articles || []),
      ...(dataFr2.articles || []),
      ...(dataEn2.articles || []),
    ].filter((a: { title: string }) => {
      if (seen.has(a.title)) return false
      seen.add(a.title)
      return true
    }).slice(0, 8)
    if (!articles.length) return ''
    return articles
      .map((a: { title: string; description: string }) => `- ${a.title}: ${a.description || ''}`)
      .join('\n')
  } catch {
    return ''
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const userId = await requireAuth(req, res)
  if (!userId) return

  const { profile, pastTitles } = req.body
  if (profile?.role && profile.role.length > 200) return res.status(400).json({ error: 'Profil invalide' })

  const role = profile?.role || 'Professionnel'
  const company = profile?.company || ''
  const sector = profile?.sector || ''
  const audience = profile?.audience || 'Professionnels LinkedIn'
  const techStack = profile?.tech_stack || ''
  const domain = profile?.domain || ''
  const isEn = profile?.lang === 'en'
  const lang = isEn ? 'English' : 'Français'

  const now = new Date()
  const seed = `${now.getMonth()}-${now.getDate()}-${Math.floor(now.getHours()/4)}`

  const ANGLES_FR = [
    'controversé / prise de position forte',
    'chiffre clé ou statistique surprenante',
    'mythe à déconstruire dans le secteur',
    'prédiction ou tendance émergente',
    'coulisses / retour d\'expérience concret',
    'erreur fréquente à éviter',
    'comparaison avant/après ou ancienne vs nouvelle méthode',
  ]
  const ANGLES_EN = [
    'controversial / strong opinion',
    'surprising key stat or number',
    'industry myth to debunk',
    'prediction or emerging trend',
    'behind the scenes / real experience',
    'common mistake to avoid',
    'before/after or old vs new method comparison',
  ]
  const dayAngle = (isEn ? ANGLES_EN : ANGLES_FR)[now.getDay() % 7]

  const news = await fetchNews(sector, isEn)

  const keywords = profile?.keywords || techStack || ''
  const audienceIsExpert = audience.toLowerCase().match(/expert|rssi|dsi|cto|ciso|ingénieur|engineer|developer|technique|msp|mssp|analyst|architect/i)
  const audienceIsDecideur = audience.toLowerCase().match(/directeur|manager|ceo|coo|dg|pme|pmle|dirigeant|decision|business|commercial|vente/i)

  const techLevel = audienceIsExpert ? 'expert' : audienceIsDecideur ? 'decideur' : 'generaliste'

  const techLevelInstruction = techLevel === 'expert'
    ? (isEn
        ? `TECHNICAL DEPTH: Your audience are experts. Use precise technical terminology (${keywords || sector}). Titles and hooks must include specific technical terms, real tool names, concrete metrics. Avoid generic phrasing.`
        : `NIVEAU TECHNIQUE: Ton audience est composée d'experts. Utilise la terminologie technique précise (${keywords || sector}). Les titres et hooks doivent inclure des termes techniques spécifiques, des noms d'outils réels, des métriques concrètes. Évite les formulations génériques.`)
    : techLevel === 'decideur'
    ? (isEn
        ? `DEPTH: Your audience are business decision-makers. Translate technical concepts into business impact (ROI, risk, cost, time). Use concrete numbers and real-world examples.`
        : `NIVEAU: Ton audience est composée de décideurs business. Traduis les concepts techniques en impact business (ROI, risque, coût, temps). Utilise des chiffres concrets et des exemples réels.`)
    : (isEn
        ? `DEPTH: Balanced mix of accessible and expert content. Alternate between practical advice and deeper insights.`
        : `NIVEAU: Mix équilibré entre contenu accessible et expert. Alterne entre conseils pratiques et insights plus profonds.`)

  const systemPrompt = `${isEn ? 'You are a LinkedIn personal branding expert specialized in the user\'s sector.' : 'Tu es un expert en personal branding LinkedIn spécialisé dans le secteur de l\'utilisateur.'}
Utilisateur : ${role}${company ? ` chez ${company}` : ''}.
Secteur : ${sector || 'Non précisé'}.
Audience : ${audience}.
${keywords ? `Mots-clés métier : ${keywords}.` : ''}
${techStack ? `Stack/Outils : ${techStack}.` : ''}
${domain ? `Domaine entreprise : ${domain}.` : ''}
Langue : ${lang}.

${techLevelInstruction}`

  const pastBlock = pastTitles?.length > 0
    ? `${isEn ? 'ALREADY GENERATED (do NOT repeat these subjects):' : 'DÉJÀ GÉNÉRÉS (ne répète PAS ces sujets)'}\n${pastTitles.map((t: string) => `- ${t}`).join('\n')}\n\n`
    : ''

  const userPrompt = `${news ? `${isEn ? 'Recent news:' : 'Actualités du secteur :'}\n${news}\n\n` : ''}${pastBlock}${isEn ? 'Generate exactly 10 FRESH LinkedIn post ideas for today.' : "Génère exactement 10 idées de posts LinkedIn NOUVELLES pour aujourd'hui."}

Seed de variation : ${seed} — utilise ce seed pour varier l'angle et le style.
Année en cours : 2026. Ne cite jamais d'années antérieures à 2025 dans les titres ou hooks.
Angle du jour à privilégier pour au moins 3 idées : ${dayAngle}

RÈGLES ABSOLUES POUR LES TITRES ET HOOKS :
${isEn
  ? `- Titles must be specific and concrete: include real numbers, tool names, or sharp assertions
- Hooks must create immediate tension with a precise fact or provocative claim
- NEVER use generic phrases like "here's what you need to know"
- Use the actual keywords from the user profile: ${keywords || sector}
- Each idea must feel tailor-made for this exact professional profile`
  : `- Les titres doivent être spécifiques et concrets : vrais chiffres, noms d'outils, assertions tranchées
- Les hooks doivent créer une tension immédiate avec un fait précis ou une affirmation provocatrice
- Ne JAMAIS utiliser des formules génériques comme "voici ce que vous devez savoir"
- Utiliser les vrais mots-clés du profil : ${keywords || sector}
- Chaque idée doit sembler faite sur mesure pour ce profil exact`}

RÈGLE DE DIVERSITÉ THÉMATIQUE (obligatoire) :
${isEn
  ? `- Maximum 3 ideas out of 10 can use the direct keywords from the profile (${keywords || sector})
- MINIMUM 3 ideas out of 10 must be directly based on a recent news article provided above (real title, number or fact from the article)
- The other ideas must explore the PERIPHERY of the sector: regulation, macro trends, HR/business challenges, new use cases, cross-sector comparisons, AI impact, field feedback
- Think about sub-domains adjacent to "${sector}" and draw from them
- For news-based ideas: cite the real fact in the hook, do not invent it`
  : `- Maximum 3 idées sur 10 peuvent utiliser les mots-clés directs du profil (${keywords || sector})
- MINIMUM 3 idées sur 10 doivent être directement basées sur une actualité récente fournie ci-dessus (titre, chiffre ou fait réel de l'article)
- Les autres doivent explorer les PÉRIPHÉRIES du secteur : réglementation, tendances macro, enjeux RH/business, nouveaux usages, comparaisons sectorielles, impact IA, retours terrain
- Imagine les sous-domaines connexes au secteur "${sector}" et pioche dedans
- Pour les idées basées sur l'actualité : cite le fait réel dans le hook, ne l'invente pas`}

Couvre des angles VARIÉS : actualité récente, ${dayAngle}, conseils pratiques, tendances, cas concrets, prises de position.
Les 2 premières idées doivent être les plus originales et percutantes.
IMPORTANT : Chaque idée doit être DISTINCTE des précédentes par son angle, son format et son sujet.

Format JSON strict (tableau de 10 objets) :
[{"topic":"étiquette courte","title":"titre accrocheur max 12 mots","hook":"première phrase percutante max 25 mots","recommended":true}]

Les 2 premiers objets ont "recommended":true, les 8 suivants ont "recommended":false.
${isEn ? "IMPORTANT: Write ALL content (topic, title, hook) in English. Respond ONLY with valid JSON." : "Réponds UNIQUEMENT avec le JSON valide."}`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const raw = (message.content[0] as { text: string }).text
    const clean = raw.replace(/```json|```/g, '').trim()
    const ideas = JSON.parse(clean)

    res.status(200).json({ ideas, hasNews: !!news })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur génération idées' })
  }
}
