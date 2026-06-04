import type { NextApiRequest, NextApiResponse } from 'next'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function fetchNews(sector: string): Promise<string> {
  try {
    // Build a generic query from the sector
    const query = encodeURIComponent(sector.split(' ').slice(0, 3).join(' '))
    const res = await fetch(
      `https://newsapi.org/v2/everything?q=${query}&language=fr&sortBy=publishedAt&pageSize=5&apiKey=${process.env.NEWS_API_KEY}`
    )
    const data = await res.json()
    if (!data.articles?.length) return ''
    return data.articles
      .map((a: { title: string; description: string }) => `- ${a.title}: ${a.description || ''}`)
      .join('\n')
  } catch {
    return ''
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { profile } = req.body

  const role = profile?.role || 'Professionnel'
  const company = profile?.company || ''
  const sector = profile?.sector || ''
  const audience = profile?.audience || 'Professionnels LinkedIn'
  const techStack = profile?.tech_stack || ''
  const domain = profile?.domain || ''
  const lang = profile?.lang === 'en' ? 'Anglais' : 'Français'

  const news = await fetchNews(sector)

  const systemPrompt = `Tu es un expert en personal branding LinkedIn.
Utilisateur : ${role}${company ? ` chez ${company}` : ''}.
Secteur : ${sector || 'Non précisé'}.
Audience : ${audience}.
${techStack ? `Stack : ${techStack}.` : ''}
${domain ? `Domaine entreprise : ${domain}.` : ''}
Langue : ${lang}.`

  const userPrompt = `${news ? `Actualités du secteur :\n${news}\n\n` : ''}Génère exactement 10 idées de posts LinkedIn pour aujourd'hui.
Couvre : actualité récente, conseils pratiques, tendances du secteur, cas concrets, prises de position.
Les 2 premières idées doivent être les plus pertinentes et percutantes du moment.
Adapte chaque idée au secteur et à l'audience de l'utilisateur.

Format JSON strict (tableau de 10 objets) :
[{"topic":"étiquette courte","title":"titre accrocheur max 12 mots","hook":"première phrase percutante max 25 mots","recommended":true}]

Les 2 premiers objets ont "recommended":true, les 8 suivants ont "recommended":false.
Réponds UNIQUEMENT avec le JSON valide.`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
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
