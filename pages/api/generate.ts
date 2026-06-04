import type { NextApiRequest, NextApiResponse } from 'next'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { topic, format, length, tone, profile, seed } = req.body

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
  const lang = (profile?.lang || 'fr') === 'en' ? 'English' : 'Français'
  const langInstruction = (profile?.lang || 'fr') === 'en' ? 'Write the post in English.' : 'Rédige le post en français.'
  const writingStyle = profile?.writing_style || ''

  // Parse writing_style — supports JSON array (new) or plain string (legacy)
  let refPosts: string[] = []
  if (writingStyle.trim()) {
    try { refPosts = JSON.parse(writingStyle) } catch { refPosts = [writingStyle] }
  }

  // Build style section
  let styleSection: string
  if (refPosts.length > 0) {
    const postsBlock = refPosts
      .map((p, i) => '--- Post referent ' + (i + 1) + ' ---\n' + p)
      .join('\n\n')

    styleSection = 'Style de redaction personnalise — IMPERATIF :\n'
      + "L'utilisateur a fourni " + refPosts.length + ' exemple' + (refPosts.length > 1 ? 's' : '') + ' de ses propres posts LinkedIn.\n'
      + 'Analyse attentivement ces exemples et imite EXACTEMENT :\n'
      + '- La longueur et structure des phrases\n'
      + "- L'utilisation des emojis et symboles\n"
      + '- Le ton et le vocabulaire\n'
      + "- La facon d'accrocher en debut de post\n"
      + "- La facon de conclure et d'utiliser les hashtags\n"
      + '- Les formulations caracteristiques\n\n'
      + postsBlock + '\n---\n\n'
      + "Tu DOIS produire un post qui ressemble stylistiquement a ces exemples. Un lecteur habituel de ses posts doit reconnaitre son style."
  } else {
    styleSection = 'Style obligatoire :\n'
      + '- Phrases courtes et percutantes\n'
      + '- Structure avec emojis et fleches (→, ↳, ▸)\n'
      + '- Numeros pour les listes d\'actions\n'
      + '- Hook fort dans les 2 premieres lignes\n'
      + '- 3 a 5 hashtags seulement a la toute fin\n'
      + "- Adapte le vocabulaire et les exemples au secteur de l'utilisateur"
  }

  const systemPrompt = 'Tu es un expert en personal branding LinkedIn.\n'
    + 'Utilisateur : ' + role + (company ? ' chez ' + company : '') + '.\n'
    + 'Secteur : ' + (sector || 'Non precise') + '.\n'
    + 'Audience : ' + audience + '.\n'
    + (techStack ? 'Stack : ' + techStack + '.\n' : '')
    + 'Langue : ' + lang + '. ' + langInstruction + '\n\n'
    + styleSection + '\n\n'
    + "- N'utilise JAMAIS de Markdown : pas de **, pas de __, pas de ##, pas de *\n"
    + "- N'utilise JAMAIS de tirets longs (—, –) ni doubles tirets (--)\n"
    + "- N'utilise pas de caracteres Unicode gras (𝐚, 𝐛, 𝐜...) — c'est l'utilisateur qui les applique lui-meme\n"
    + "- Verifie les accords grammaticaux francais : genre (ton/ta, son/sa) et nombre\n"
    + "- Relis le post avant de repondre et corrige toute faute d'orthographe ou de frappe\n"
    + '- Le texte doit etre brut, pret a coller sur LinkedIn tel quel\n\n'
    + (seed ? 'Seed de variation : ' + seed + ' — utilise cet angle unique, different des posts habituels sur ce sujet.\n' : '')
    + 'Reponds UNIQUEMENT avec le post LinkedIn, sans introduction ni commentaire.'

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: 'Redige un ' + (formatMap[format] || formatMap.educational) + ' sur : "' + topic + '"\nLongueur : ' + (lengthMap[length] || lengthMap.medium) + '\nTon : ' + (tone || 'expert'),
      }],
    })

    const content = (message.content[0] as { text: string }).text
    res.status(200).json({ content })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur generation post' })
  }
}
