import type { NextApiRequest, NextApiResponse } from 'next'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../lib/auth-helper'

const DAILY_LIMIT = 20
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Rate limiting — max 20 générations par heure par user
const generateRateLimit = new Map<string, {count: number, reset: number}>()
function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const limit = generateRateLimit.get(userId)
  if (!limit || now > limit.reset) {
    generateRateLimit.set(userId, { count: 1, reset: now + 3600_000 })
    return true
  }
  if (limit.count >= 20) return false
  limit.count++
  return true
}

async function fetchNews(sector: string, topic: string, isEn: boolean): Promise<string> {
  try {
    const queryTopic = encodeURIComponent(topic.split(' ').slice(0, 4).join(' '))
    const querySector = encodeURIComponent(sector.split(' ').slice(0, 2).join(' '))
    const [r1, r2] = await Promise.all([
      fetch(`https://newsapi.org/v2/everything?q=${queryTopic}&language=${isEn?'en':'fr'}&sortBy=publishedAt&pageSize=3&apiKey=${process.env.NEWS_API_KEY}`),
      fetch(`https://newsapi.org/v2/everything?q=${querySector}&language=${isEn?'en':'fr'}&sortBy=publishedAt&pageSize=2&apiKey=${process.env.NEWS_API_KEY}`),
    ])
    const [d1, d2] = await Promise.all([r1.json(), r2.json()])
    const seen = new Set<string>()
    const articles = [...(d1.articles||[]), ...(d2.articles||[])]
      .filter((a: {title:string}) => { if(seen.has(a.title)) return false; seen.add(a.title); return true; })
      .slice(0, 4)
    if (!articles.length) return ''
    return articles.map((a: {title:string; description:string; source:{name:string}}) =>
      `- [${a.source?.name||'Source'}] ${a.title}${a.description ? ' : ' + a.description.slice(0,120) : ''}`
    ).join('\n')
  } catch { return '' }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const userId = await requireAuth(req, res)
  if (!userId) return

  if (!checkRateLimit(userId)) return res.status(429).json({ error: 'RATE_LIMIT', message: 'Limite de 20 générations par heure atteinte.' })

  const { topic, format, length, tone, profile, seed, improvement, previousPost, variant = 0 } = req.body
  if (topic && topic.length > 500) return res.status(400).json({ error: 'Sujet trop long (max 500 car.)' })

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
  const summary = profile?.summary || ''
  const keywords = profile?.keywords || ''
  const profileTone = profile?.tone || ''
  const contentThemes = profile?.content_themes || ''
  const painPoints = profile?.pain_points || ''
  const techStack = profile?.tech_stack || ''
  const isEn = (profile?.lang || 'fr') === 'en'
  const formality = profile?.formality || 'vouvoiement'
  const formalityInstruction = isEn ? '' : formality === 'tutoiement' ? '\nTUTOIEMENT OBLIGATOIRE : tutoie systématiquement le lecteur dans tout le post (tu, ton, tes, toi). Jamais de vous/votre.' : '\nVOUVOIEMENT OBLIGATOIRE : vouvoie systématiquement le lecteur dans tout le post (vous, votre, vos). Jamais de tu/ton/tes.'
  const lang = isEn ? 'English' : 'Français'
  const langInstruction = isEn
    ? 'IMPORTANT: Write the ENTIRE post in English. Do not use any French words.'
    : 'Rédige le post en français.'
  const variantInstruction = variant ? `\nVariante ${variant}/3 : utilise un angle différent des autres variantes.` : ''
  const writingStyle = profile?.writing_style || ''

  // Parse writing_style — supports JSON array (new) or plain string (legacy)
  let refPosts: string[] = []
  if (writingStyle.trim()) {
    try { refPosts = JSON.parse(writingStyle) } catch { refPosts = [writingStyle] }
  }
  // Optimisation coûts : max 2 posts référents, tronqués à 400 chars chacun
  refPosts = refPosts.slice(0, 2).map(p => p.slice(0, 400))

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

  // Fetch actualités liées au sujet
  const newsContext = await fetchNews(sector, topic || '', isEn)
  const newsBlock = newsContext ? `=== ACTUALITÉS RÉCENTES SUR CE SUJET ===
Ces informations sont réelles et vérifiées. Tu PEUX t'en inspirer pour ancrer le post dans l'actualité.
${newsContext}
=== FIN ACTUALITÉS ===

` : ''


  const systemPrompt = 'Tu es un ghostwriter LinkedIn expert, spécialisé dans le personal branding B2B.\n\n' + newsBlock
    + '=== PROFIL AUTEUR ===\n'
    + 'Rôle : ' + role + (company ? ' chez ' + company : '') + '\n'
    + 'Secteur : ' + (sector || 'Non précisé') + '\n'
    + 'Audience cible : ' + audience + '\n'
    + (summary ? 'Positionnement : ' + summary + '\n' : '')
    + (keywords ? 'Expertise clé : ' + keywords + '\n' : '')
    + (painPoints ? 'Problèmes résolus pour les clients : ' + painPoints + '\n' : '')
    + (techStack ? 'Outils/Stack : ' + techStack + '\n' : '')
    + '\n=== RÈGLES ABSOLUES ===\n'
    + '1. AUDIENCE : Chaque phrase doit résonner avec "' + audience + '". Parle LEURS problèmes, LEUR vocabulaire, LEURS enjeux spécifiques.\n'
    + '2. CHIFFRES : Utilise uniquement des chiffres issus des actualités fournies ci-dessus ou de faits vérifiables. Si incertain, reformule sans chiffre plutôt que d\'inventer.\n'
    + '3. TENSION : Commence par un fait contre-intuitif, une statistique réelle ou une situation concrète. Jamais de généralités en ouverture.\n'
    + '4. VOIX : 1ère personne (je/nous). Point de vue tranché et assumé. Pas de conseils génériques.\n'
    + '5. FORMAT : Phrases courtes. Retours à la ligne fréquents. Jamais de ** ni Markdown. Texte brut LinkedIn.\n'
    + '6. HASHTAGS : 3-5 maximum, à la toute fin.\n'
    + formalityInstruction + '\n\n'
    + styleSection + '\n\n'
    + 'Langue : ' + lang + '. ' + langInstruction + variantInstruction + '\n'
    + (seed ? 'Angle : ' + seed + '\n' : '')
    + 'Réponds UNIQUEMENT avec le post LinkedIn, sans introduction ni commentaire.'

  // Vérification plan Free (5 posts à vie)
  const { data: userProfile } = await supabaseAdmin
    .from('profiles')
    .select('plan, posts_count_this_month')
    .eq('id', userId)
    .single()

  const isPro = userProfile?.plan === 'pro' || userProfile?.plan === 'trial'
  const postsCount = userProfile?.posts_count_this_month ?? 0

  if (!isPro && postsCount >= 5) {
    return res.status(403).json({ error: 'LIMIT_REACHED', message: 'Limite de 5 posts atteinte. Passez au plan Pro pour continuer.' })
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: 'Redige un ' + (formatMap[format] || formatMap.educational) + ' sur : "' + topic + '"\nLongueur : ' + (lengthMap[length] || lengthMap.medium) + '\nTon : ' + (tone || 'expert'),
      }],
    })

    const content = (message.content[0] as { text: string }).text

    // Incrémenter le compteur pour tous les users
    await supabaseAdmin
      .from('profiles')
      .update({ posts_count_this_month: postsCount + 1 })
      .eq('id', userId)

    res.status(200).json({ content })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur generation post' })
  }
}
