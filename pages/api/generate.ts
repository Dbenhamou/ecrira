import type { NextApiRequest, NextApiResponse } from 'next'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../lib/auth-helper'
import { fetchSectorNews, formatNewsBlock } from '../../lib/news'
import { rateLimitHit } from '../../lib/rateLimit'
import { keywordsOf } from '../../lib/themes'

const DAILY_LIMIT = 20
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const userId = await requireAuth(req, res)
  if (!userId) return

  if (!(await rateLimitHit('gen:' + userId, 20, 3600))) return res.status(429).json({ error: 'RATE_LIMIT', message: 'Limite de 20 générations par heure atteinte.' })

  const { topic, format, length, tone, profile, seed, hook, plan, variant = 0 } = req.body
  if (topic && topic.length > 500) return res.status(400).json({ error: 'Sujet trop long (max 500 car.)' })
  const ideaHook = typeof hook === 'string' ? hook.trim().slice(0, 300) : ''
  const ideaPlan = (typeof plan === 'string' ? plan : typeof seed === 'string' ? seed : '').trim().slice(0, 1200)

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
  const painPoints = profile?.pain_points || ''
  const techStack = profile?.tech_stack || ''
  const isEn = (profile?.lang || 'fr') === 'en'
  const now = new Date()
  const currentYear = now.getFullYear()
  const todayStr = now.toISOString().slice(0, 10)
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
  // Fidélité de style : jusqu'à 3 posts référents, tronqués à 1000 chars chacun
  refPosts = refPosts.slice(0, 3).map(p => String(p).slice(0, 1000))

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
      + '- Ecris comme un professionnel qui parle a un pair, pas comme une publicite\n'
      + '- Phrases courtes, mais rythme varie (pas une phrase par ligne tout le long)\n'
      + '- 0 a 2 emojis maximum dans tout le post, aucun symbole decoratif (pas de fleches ni de puces fantaisie)\n'
      + '- Numeros uniquement si le format est une liste\n'
      + '- Accroche forte dans les 2 premieres lignes\n'
      + '- 3 hashtags maximum a la toute fin\n'
      + "- Vocabulaire et exemples concrets du secteur de l'utilisateur"
  }

  // Actus : uniquement celles qui parlent vraiment du sujet du post
  // (au moins 2 mots significatifs en commun), sinon aucune.
  const topicWords = new Set(keywordsOf(`${topic || ''} ${ideaHook}`))
  const rawNews = topicWords.size
    ? await fetchSectorNews({ sector, keywords, lang: profile?.lang, days: 7, limit: 10 })
    : []
  const newsArticles = rawNews
    .filter((a) => keywordsOf(a.title).filter((w) => topicWords.has(w)).length >= 2)
    .slice(0, 3)
  const newsContext = formatNewsBlock(newsArticles)
  const newsBlock = newsContext ? `=== ACTUALITÉS LIÉES AU SUJET (facultatif) ===
Utilise une de ces actualités UNIQUEMENT si elle sert directement le sujet du post. Sinon, ignore-les complètement.
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
    + '\n=== DATE ===\n'
    + 'Nous sommes le ' + todayStr + ' (année en cours : ' + currentYear + ').\n'
    + 'Toute référence temporelle (bilan, tendances, prédictions, « cette année », « en ce moment ») doit porter sur ' + currentYear + '. '
    + 'N\'écris JAMAIS une année passée — surtout pas « 2025 », « bilan 2025 », « tendances 2025 » — sauf si le sujet demande explicitement une rétrospective. '
    + 'Pour le futur proche, parle de ' + currentYear + ' ou ' + (currentYear + 1) + '.\n'
    + '\n=== RÈGLES ABSOLUES ===\n'
    + '1. AUDIENCE : Chaque phrase doit résonner avec "' + audience + '". Parle LEURS problèmes, LEUR vocabulaire, LEURS enjeux spécifiques.\n'
    + '2. CHIFFRES : AUCUN chiffre, pourcentage, montant ou étude inventé. Un chiffre n\'est autorisé que s\'il figure dans les actualités ci-dessus. En cas de doute, pas de chiffre.\n'
    + '3. OUVERTURE : commence par une situation concrète, une observation de terrain ou une question précise. Jamais de généralité ni de statistique en ouverture.\n'
    + '4. VOIX : 1ère personne (je/nous), ton d\'un praticien qui partage son expérience. Pas de conseils génériques, pas de ton de coach.\n'
    + '5. FORMAT : texte brut LinkedIn, jamais de ** ni Markdown. Paragraphes de 1 à 3 phrases.\n'
    + '6. HASHTAGS : 3 maximum, à la toute fin.\n'
    + '7. SPÉCIFICITÉ : exemples concrets du métier (outils, situations clients, erreurs réelles). Ne cite une entreprise ou un produit que si le sujet en parle.\n'
    + '8. TICS INTERDITS (ils font « texte d\'IA ») : « dans un monde où », « aujourd\'hui plus que jamais », « à l\'ère de », « et si », « spoiler », « le vrai problème », « la vérité, c\'est que », « personne n\'en parle », « ce n\'est pas X, c\'est Y », « game changer », « levier », « véritable », « crucial », « en résumé », « Qu\'en pensez-vous ? » en conclusion. Pas de question rhétorique suivie de sa réponse. Pas de tirets cadratins (—).\n'
    + formalityInstruction + '\n\n'
    + styleSection + '\n\n'
    + 'Langue : ' + lang + '. ' + langInstruction + variantInstruction + '\n'
    + 'Réponds UNIQUEMENT avec le post LinkedIn, sans introduction ni commentaire.'

  // Vérification plan Free (5 posts à vie)
  const { data: userProfile } = await supabaseAdmin
    .from('profiles')
    .select('plan, posts_count_this_month, trial_ends_at')
    .eq('id', userId)
    .single()

  const trialActive = userProfile?.plan === 'trial' && !!userProfile?.trial_ends_at && new Date(userProfile.trial_ends_at) > new Date()
  const isPro = userProfile?.plan === 'pro' || userProfile?.plan === 'pro_agency' || trialActive
  const postsCount = userProfile?.posts_count_this_month ?? 0

  if (!isPro && postsCount >= 5) {
    return res.status(403).json({ error: 'LIMIT_REACHED', message: 'Limite de 5 posts atteinte. Passez au plan Pro pour continuer.' })
  }

  try {
    const nbVariants = Math.min(Math.max(Number((req.body as any)?.variants) || 1, 1), 3)
    const baseInstruction = 'Redige un ' + (formatMap[format] || formatMap.educational) + ' sur : "' + topic + '"\nLongueur : ' + (lengthMap[length] || lengthMap.medium) + '\nTon : ' + (tone || 'expert')
      + (ideaHook ? '\nAccroche proposee (tu peux l\'ameliorer, garde l\'idee) : ' + ideaHook : '')
      + (ideaPlan ? '\nPlan a suivre :\n' + ideaPlan.split('\n').map((l: string, i: number) => (i + 1) + '. ' + l.trim()).join('\n') : '')
    const userMessage = nbVariants > 1
      ? baseInstruction + '\n\nProduis ' + nbVariants + ' VARIANTES DISTINCTES de ce post, pensees ensemble pour ne PAS se ressembler : angle different, type d\'accroche different, structure differente (par ex. une prise de position tranchee, une histoire de terrain, une statistique choc). Chaque variante doit etre publiable telle quelle. Separe CHAQUE variante par une ligne contenant UNIQUEMENT :\n---VARIANTE---\nNe numerote pas, n\'ajoute ni titre ni commentaire : juste les posts separes par ce delimiteur.'
      : baseInstruction

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: Math.min(1200 * nbVariants, 4000),
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    const raw = (message.content[0] as { text: string }).text
    const variantsArr = nbVariants > 1
      ? raw.split(/^\s*-{2,}\s*VARIANTE\s*-{2,}\s*$/im).map((s) => s.trim()).filter(Boolean).slice(0, nbVariants)
      : [raw.trim()]
    const content = variantsArr[0] || raw.trim()

    // Incrémenter le compteur pour tous les users
    await supabaseAdmin
      .from('profiles')
      .update({ posts_count_this_month: postsCount + 1 })
      .eq('id', userId)

    res.status(200).json({ content, variants: variantsArr })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur generation post' })
  }
}
