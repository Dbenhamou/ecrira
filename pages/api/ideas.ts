import type { NextApiRequest, NextApiResponse } from 'next'
import Anthropic from '@anthropic-ai/sdk'
import { requireAuth } from '../../lib/auth-helper'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function fetchNews(sector: string, isEn: boolean): Promise<string> {
  try {
    const query = encodeURIComponent(sector.split(' ').slice(0, 3).join(' '))
    // Fetch FR + EN en parallèle pour plus de fraîcheur
    const [resFr, resEn] = await Promise.all([
      fetch(`https://newsapi.org/v2/everything?q=${query}&language=fr&sortBy=publishedAt&pageSize=4&apiKey=${process.env.NEWS_API_KEY}`),
      fetch(`https://newsapi.org/v2/everything?q=${query}&language=en&sortBy=publishedAt&pageSize=4&apiKey=${process.env.NEWS_API_KEY}`),
    ])
    const [dataFr, dataEn] = await Promise.all([resFr.json(), resEn.json()])
    const articles = [
      ...(dataFr.articles || []),
      ...(dataEn.articles || []),
    ].slice(0, 6)
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

  // Seed rotatif — varie selon l'heure et le jour pour forcer la diversité
  const now = new Date()
  const seed = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${Math.floor(now.getHours()/4)}`

  // Angles rotatifs selon le jour de la semaine
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

  const systemPrompt = `${isEn ? 'You are a LinkedIn personal branding expert.' : 'Tu es un expert en personal branding LinkedIn.'}
Utilisateur : ${role}${company ? ` chez ${company}` : ''}.
Secteur : ${sector || 'Non précisé'}.
Audience : ${audience}.
${techStack ? `Stack : ${techStack}.` : ''}
${domain ? `Domaine entreprise : ${domain}.` : ''}
Langue : ${lang}.`

  const pastBlock = pastTitles?.length > 0
    ? `${isEn ? 'ALREADY GENERATED (do NOT repeat these subjects):' : 'DÉJÀ GÉNÉRÉS (ne répète PAS ces sujets)'}\n${pastTitles.map((t: string) => `- ${t}`).join('\n')}\n\n`
    : ''

  const userPrompt = `${news ? `${isEn ? 'Recent news:' : 'Actualités du secteur :'}\n${news}\n\n` : ''}${pastBlock}${isEn ? 'Generate exactly 10 FRESH LinkedIn post ideas for today.' : 'Génère exactement 10 idées de posts LinkedIn NOUVELLES pour aujourd\'hui.'}

Seed de variation : ${seed} — utilise ce seed pour varier l'angle et le style.
Angle du jour à privilégier pour au moins 3 idées : ${dayAngle}

Couvre des angles VARIÉS : actualité récente, ${dayAngle}, conseils pratiques, tendances, cas concrets, prises de position.
Les 2 premières idées doivent être les plus originales et percutantes.
Adapte chaque idée au secteur et à l'audience de l'utilisateur.
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
