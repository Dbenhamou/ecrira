import type { NextApiRequest, NextApiResponse } from 'next'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { topic, format, length, tone, profile } = req.body

  const formatMap: Record<string, string> = {
    educational: 'post éducatif avec conseil actionnable',
    alert: "post d'alerte sur une menace ou actualité récente",
    opinion: 'post prise de position tranchée',
    story: 'post storytelling basé sur un cas concret',
    list: 'post liste numérotée',
  }
  const lengthMap: Record<string, string> = {
    short: '400 caractères maximum',
    medium: 'entre 600 et 900 caractères',
    long: 'entre 1000 et 1400 caractères',
  }

  const role = profile?.role || 'Professionnel'
  const company = profile?.company || ''
  const sector = profile?.sector || ''
  const audience = profile?.audience || 'Professionnels LinkedIn'
  const techStack = profile?.tech_stack || ''
  const lang = profile?.lang === 'en' ? 'Anglais' : 'Français'

  const systemPrompt = `Tu es un expert en personal branding LinkedIn.
Utilisateur : ${role}${company ? ` chez ${company}` : ''}.
Secteur : ${sector || 'Non précisé'}.
Audience : ${audience}.
${techStack ? `Stack : ${techStack}.` : ''}
Langue : ${lang}.

Style obligatoire :
- Phrases courtes et percutantes
- Structure avec emojis et flèches (→, ↳, ▸)
- Numéros pour les listes d'actions
- Hook fort dans les 2 premières lignes
- 3 à 5 hashtags seulement à la toute fin
- Adapte le vocabulaire et les exemples au secteur de l'utilisateur

Réponds UNIQUEMENT avec le post LinkedIn, sans introduction ni commentaire.`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: `Rédige un ${formatMap[format] || formatMap.educational} sur : "${topic}"\nLongueur : ${lengthMap[length] || lengthMap.medium}\nTon : ${tone || 'expert'}`,
      }],
    })

    const content = (message.content[0] as { text: string }).text
    res.status(200).json({ content })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur génération post' })
  }
}
