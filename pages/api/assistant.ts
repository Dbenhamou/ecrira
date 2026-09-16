import type { NextApiRequest, NextApiResponse } from 'next'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../lib/auth-helper'
import { rateLimitHit } from '../../lib/rateLimit'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// --- Quotas ---
const HOURLY_LIMIT = 40            // messages assistant / heure (anti-abus)
const MONTHLY_LIMIT_PRO = 300      // messages / mois plan Pro
const MONTHLY_LIMIT_AGENCY = 1000  // messages / mois plan Pro Agency
const MONTH_MS = 30 * 24 * 3600 * 1000

type Msg = { role: 'user' | 'assistant'; content: string }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const userId = await requireAuth(req, res)
  if (!userId) return

  // Rate limit horaire (table rate_limits, comme /generate)
  if (!(await rateLimitHit('assistant:' + userId, HOURLY_LIMIT, 3600))) {
    return res.status(429).json({ error: 'RATE_LIMIT', message: 'Trop de messages. Réessaie dans une heure.' })
  }

  const { messages, conversationId, currentPost } = req.body as {
    messages?: Msg[]
    conversationId?: string
    currentPost?: string
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages requis' })
  }
  // Garde-fous taille
  const cleanMessages: Msg[] = messages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 6000) }))

  // --- Profil + plan + quota ---
  const { data: p } = await supabaseAdmin
    .from('profiles')
    .select('role, company, sector, audience, summary, keywords, tone, content_themes, pain_points, tech_stack, lang, formality, writing_style, plan, trial_ends_at, assistant_messages_this_month, assistant_count_reset_at')
    .eq('id', userId)
    .single()

  const trialActive = p?.plan === 'trial' && !!p?.trial_ends_at && new Date(p.trial_ends_at) > new Date()
  const isPro = p?.plan === 'pro' || p?.plan === 'pro_agency' || trialActive

  // Gating Pro
  if (!isPro) {
    return res.status(403).json({
      error: 'PRO_ONLY',
      message: "L'assistant Ecrira fait partie du plan Pro. Passe au plan Pro pour discuter avec ton copilote LinkedIn.",
    })
  }

  // Quota mensuel (reset glissant sur 30 jours)
  const resetAt = p?.assistant_count_reset_at ? new Date(p.assistant_count_reset_at).getTime() : 0
  let used = p?.assistant_messages_this_month ?? 0
  let needReset = false
  if (!resetAt || Date.now() - resetAt > MONTH_MS) {
    used = 0
    needReset = true
  }
  const monthlyCap = p?.plan === 'pro_agency' ? MONTHLY_LIMIT_AGENCY : MONTHLY_LIMIT_PRO
  if (used >= monthlyCap) {
    return res.status(429).json({
      error: 'MONTHLY_LIMIT',
      message: `Tu as atteint ta limite mensuelle de ${monthlyCap} messages avec l'assistant.`,
    })
  }

  // --- System prompt ---
  const isEn = (p?.lang || 'fr') === 'en'
  const lang = isEn ? 'English' : 'Français'
  const formality = p?.formality || 'vouvoiement'
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  const currentYear = now.getFullYear()

  const profileBlock =
    '=== PROFIL DE L\'UTILISATEUR ===\n' +
    'Rôle : ' + (p?.role || 'Professionnel') + (p?.company ? ' chez ' + p.company : '') + '\n' +
    'Secteur : ' + (p?.sector || 'Non précisé') + '\n' +
    'Audience cible : ' + (p?.audience || 'Professionnels LinkedIn') + '\n' +
    (p?.summary ? 'Positionnement : ' + p.summary + '\n' : '') +
    (p?.keywords ? 'Expertise clé : ' + p.keywords + '\n' : '') +
    (p?.pain_points ? 'Problèmes résolus : ' + p.pain_points + '\n' : '') +
    (p?.tech_stack ? 'Outils/Stack : ' + p.tech_stack + '\n' : '')

  // Style référent (writing_style : JSON array ou string)
  let refPosts: string[] = []
  const ws = (p?.writing_style || '').trim()
  if (ws) { try { refPosts = JSON.parse(ws) } catch { refPosts = [ws] } }
  refPosts = refPosts.slice(0, 3).map((x) => String(x).slice(0, 800))
  const styleBlock = refPosts.length
    ? '\n=== STYLE D\'ÉCRITURE DE L\'UTILISATEUR (à imiter) ===\n' +
      refPosts.map((x, i) => '--- Exemple ' + (i + 1) + ' ---\n' + x).join('\n\n') + '\n'
    : ''

  const postBlock = currentPost && currentPost.trim()
    ? '\n=== POST ACTUELLEMENT DANS L\'ÉDITEUR ===\n' + currentPost.slice(0, 4000) + '\n=== FIN DU POST ===\n'
    : ''

  const systemPrompt =
    "Tu es l'assistant Ecrira : le copilote LinkedIn de l'utilisateur, intégré dans l'app Ecrira. " +
    "Tu es un ghostwriter B2B expert, chaleureux, direct et concis.\n\n" +
    "TON RÔLE : aider l'utilisateur sur tout ce qui touche à LinkedIn — réécrire et améliorer ses posts, " +
    "trouver des idées de contenu, structurer un calendrier éditorial, réagir à l'actualité de son secteur, " +
    "conseiller sur ses visuels et son personal branding.\n\n" +
    profileBlock + styleBlock + postBlock + '\n' +
    "=== DATE ===\nNous sommes le " + todayStr + " (année en cours : " + currentYear + "). " +
    "Toute référence temporelle porte sur " + currentYear + ".\n\n" +
    "=== RÈGLES ===\n" +
    "1. Réponds en " + lang + ".\n" +
    "2. " + (formality === 'tutoiement' ? "Tutoie l'utilisateur." : "Vouvoie l'utilisateur.") + "\n" +
    "3. Posts LinkedIn : phrases courtes, hook fort dans les 2 premières lignes, jamais de Markdown (pas de **), " +
    "texte brut, 3 à 5 hashtags maximum à la fin, chiffres vérifiables uniquement.\n" +
    "4. Sois bref et actionnable. Va droit au but.\n" +
    "5. IMPORTANT : quand tu produis un post LinkedIn finalisé et prêt à publier, encadre-le EXACTEMENT entre " +
    "les balises ===POST=== et ===POST=== (sur leurs propres lignes) pour que l'app propose un bouton « Appliquer ». " +
    "N'utilise ces balises que pour un post complet prêt à l'emploi, pas pour un brouillon ou une explication."

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: systemPrompt,
      messages: cleanMessages.map((m) => ({ role: m.role, content: m.content })),
    })

    const reply = (message.content[0] as { text: string }).text || ''

    // Extraction éventuelle d'un post prêt à l'emploi
    const match = reply.match(/===POST===\s*([\s\S]*?)\s*===POST===/)
    const postSuggestion = match ? match[1].trim() : null

    // --- Incrément quota ---
    await supabaseAdmin
      .from('profiles')
      .update({
        assistant_messages_this_month: used + 1,
        ...(needReset ? { assistant_count_reset_at: new Date().toISOString() } : {}),
      })
      .eq('id', userId)

    // --- Persistance conversation ---
    const fullThread = [...cleanMessages, { role: 'assistant' as const, content: reply }]
    let convId = conversationId || null
    if (convId) {
      await supabaseAdmin
        .from('assistant_conversations')
        .update({ messages: fullThread })
        .eq('id', convId)
        .eq('user_id', userId)
    } else {
      const firstUser = cleanMessages.find((m) => m.role === 'user')
      const title = (firstUser?.content || 'Conversation').slice(0, 60)
      const { data: created } = await supabaseAdmin
        .from('assistant_conversations')
        .insert({ user_id: userId, title, messages: fullThread })
        .select('id')
        .single()
      convId = created?.id || null
    }

    return res.status(200).json({
      reply,
      postSuggestion,
      conversationId: convId,
      remaining: Math.max(0, monthlyCap - (used + 1)),
    })
  } catch (err) {
    console.error('assistant error', err)
    return res.status(500).json({ error: 'Erreur assistant' })
  }
}
