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

// --- Quotas (réduits pour maîtriser le coût) ---
const HOURLY_LIMIT = 40             // messages assistant / heure (anti-abus)
const MONTHLY_LIMIT_PRO = 150       // messages / mois plan Pro
const MONTHLY_LIMIT_AGENCY = 500    // messages / mois plan Pro Agency
const MONTH_MS = 30 * 24 * 3600 * 1000

type Msg = { role: 'user' | 'assistant'; content: string }

// Retire tout Markdown pour un rendu LinkedIn brut et uniforme
function cleanMarkdown(s: string): string {
  if (!s) return s
  return s
    .replace(/\*\*([\s\S]*?)\*\*/g, '$1')
    .replace(/__([\s\S]*?)__/g, '$1')
    .replace(/`{1,3}([^`]*)`{1,3}/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s*[-*_]{3,}\s*$/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .replace(/[—–]/g, '-')
    .replace(/\*/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const userId = await requireAuth(req, res)
  if (!userId) return

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
  // Historique court pour limiter les tokens réinjectés
  const cleanMessages: Msg[] = messages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-8)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }))

  const { data: p } = await supabaseAdmin
    .from('profiles')
    .select('role, company, sector, audience, summary, keywords, tone, content_themes, pain_points, tech_stack, lang, formality, writing_style, plan, trial_ends_at, assistant_messages_this_month, assistant_count_reset_at')
    .eq('id', userId)
    .single()

  const trialActive = p?.plan === 'trial' && !!p?.trial_ends_at && new Date(p.trial_ends_at) > new Date()
  const isPro = p?.plan === 'pro' || p?.plan === 'pro_agency' || trialActive

  if (!isPro) {
    return res.status(403).json({
      error: 'PRO_ONLY',
      message: "L'assistant Ecrira fait partie du plan Pro. Passe au plan Pro pour discuter avec ton copilote LinkedIn.",
    })
  }

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
    (p?.pain_points ? 'Problèmes résolus : ' + p.pain_points + '\n' : '')

  // 1 seul exemple de style, tronqué, pour limiter les tokens
  let refPosts: string[] = []
  const ws = (p?.writing_style || '').trim()
  if (ws) { try { refPosts = JSON.parse(ws) } catch { refPosts = [ws] } }
  refPosts = refPosts.slice(0, 1).map((x) => String(x).slice(0, 500))
  const styleBlock = refPosts.length
    ? '\n=== STYLE D\'ÉCRITURE (à imiter) ===\n' + refPosts[0] + '\n'
    : ''

  const postBlock = currentPost && currentPost.trim()
    ? '\n=== POST ACTUEL DANS L\'ÉDITEUR ===\n' + currentPost.slice(0, 1500) + '\n=== FIN ===\n'
    : ''

  const systemPrompt =
    "Tu es l'assistant Ecrira : le copilote LinkedIn de l'utilisateur. " +
    "Ghostwriter B2B expert, chaleureux, direct et concis.\n\n" +
    "Tu aides sur tout ce qui touche à LinkedIn : réécrire/améliorer des posts, trouver des idées, " +
    "structurer un calendrier, réagir à l'actu du secteur, conseiller sur les visuels et le personal branding.\n\n" +
    profileBlock + styleBlock + postBlock + '\n' +
    "Date : " + todayStr + " (année " + currentYear + ").\n\n" +
    "=== RÈGLES DE FORMAT (STRICTES) ===\n" +
    "1. Réponds en " + lang + ".\n" +
    "2. " + (formality === 'tutoiement' ? "Tutoie l'utilisateur." : "Vouvoie l'utilisateur.") + "\n" +
    "3. TEXTE BRUT UNIQUEMENT — aucun Markdown : jamais de ** ni * ni #, pas de puces markdown, pas de ---. " +
    "Listes avec • ou numéros. Que des tirets simples (-).\n" +
    "4. Posts LinkedIn : hook fort dès les 2 premières lignes, phrases courtes, 3-5 hashtags à la fin, chiffres vérifiables uniquement.\n" +
    "5. Sois bref et actionnable.\n" +
    "6. Quand tu produis un post finalisé prêt à publier, encadre-le EXACTEMENT entre ===POST=== et ===POST=== " +
    "(sur leurs propres lignes) pour que l'app propose un bouton « Appliquer ». Seulement pour un post complet."

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1200,
      system: systemPrompt,
      messages: cleanMessages.map((m) => ({ role: m.role, content: m.content })),
    })

    const reply = cleanMarkdown((message.content[0] as { text: string }).text || '')

    const match = reply.match(/===POST===\s*([\s\S]*?)\s*===POST===/)
    const postSuggestion = match ? cleanMarkdown(match[1].trim()) : null

    await supabaseAdmin
      .from('profiles')
      .update({
        assistant_messages_this_month: used + 1,
        ...(needReset ? { assistant_count_reset_at: new Date().toISOString() } : {}),
      })
      .eq('id', userId)

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
