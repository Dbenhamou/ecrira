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

// Finalise l'onboarding conversationnel :
//  - enregistre le ton + (optionnel) un post référent dans writing_style
//  - marque onboarding_done = true
//  - génère le tout premier post LinkedIn de l'utilisateur
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const userId = await requireAuth(req, res)
  if (!userId) return

  if (!(await rateLimitHit('onboarding:' + userId, 10, 3600))) {
    return res.status(429).json({ error: 'RATE_LIMIT', message: 'Trop de tentatives, réessaie plus tard.' })
  }

  const { role, goal, tone, samplePost } = req.body as {
    role?: string
    goal?: string
    tone?: string
    samplePost?: string
  }

  const { data: p } = await supabaseAdmin
    .from('profiles')
    .select('role, company, sector, audience, lang, formality, writing_style')
    .eq('id', userId)
    .single()

  const isEn = (p?.lang || 'fr') === 'en'
  const lang = isEn ? 'English' : 'Français'
  const formality = p?.formality || 'vouvoiement'
  const effectiveRole = (role && role.trim()) || p?.role || 'Professionnel'
  const now = new Date()
  const currentYear = now.getFullYear()
  const todayStr = now.toISOString().slice(0, 10)

  const cleanSample = (samplePost || '').trim().slice(0, 1500)

  const systemPrompt =
    "Tu es l'assistant Ecrira, ghostwriter LinkedIn B2B expert. " +
    "Tu écris le TOUT PREMIER post LinkedIn d'un nouvel utilisateur pour lui montrer la valeur d'Ecrira.\n\n" +
    "=== PROFIL ===\n" +
    'Rôle : ' + effectiveRole + (p?.company ? ' chez ' + p.company : '') + '\n' +
    'Secteur : ' + (p?.sector || 'Non précisé') + '\n' +
    'Audience : ' + (p?.audience || 'Professionnels LinkedIn') + '\n' +
    'Objectif LinkedIn : ' + (goal || 'développer sa visibilité') + '\n' +
    'Ton souhaité : ' + (tone || 'expert et accessible') + '\n' +
    (cleanSample ? '\n=== EXEMPLE DE SON STYLE (à imiter) ===\n' + cleanSample + '\n' : '') +
    '\n=== DATE ===\nNous sommes le ' + todayStr + ' (année ' + currentYear + ').\n\n' +
    '=== RÈGLES DE FORMAT (STRICTES) ===\n' +
    '1. Écris en ' + lang + '. ' + (formality === 'tutoiement' ? 'Tutoie le lecteur.' : 'Vouvoie le lecteur.') + '\n' +
    '2. TEXTE BRUT UNIQUEMENT — AUCUN Markdown : jamais de ** ni * (gras/italique), jamais de #, ' +
    'jamais de puces markdown, jamais de séparateurs ---. Que des tirets simples (-), jamais de tirets longs (— ou –).\n' +
    '3. Hook fort dès la 1re ligne, phrases courtes, 3-5 hashtags à la fin.\n' +
    '4. Choisis un angle pertinent et engageant pour son audience et son objectif. Rends-le publiable tel quel.\n' +
    '5. Encadre le post EXACTEMENT entre ===POST=== et ===POST=== (sur leurs propres lignes), sans aucun autre texte autour.'

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      system: systemPrompt,
      messages: [{ role: 'user', content: "Écris mon premier post LinkedIn." }],
    })
    const raw = (message.content[0] as { text: string }).text || ''
    const match = raw.match(/===POST===\s*([\s\S]*?)\s*===POST===/)
    const firstPost = cleanMarkdown((match ? match[1] : raw).trim())

    const update: Record<string, any> = { onboarding_done: true }
    if (tone && tone.trim()) update.tone = tone.trim()
    if (cleanSample && !(p?.writing_style || '').trim()) {
      update.writing_style = JSON.stringify([cleanSample])
    }
    await supabaseAdmin.from('profiles').update(update).eq('id', userId)

    return res.status(200).json({ firstPost })
  } catch (err) {
    console.error('onboarding error', err)
    await supabaseAdmin.from('profiles').update({ onboarding_done: true }).eq('id', userId)
    return res.status(500).json({ error: 'Erreur génération du premier post' })
  }
}
