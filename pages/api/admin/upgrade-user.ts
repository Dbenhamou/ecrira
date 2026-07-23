// pages/api/admin/upgrade-user.ts
// Upgrade manuel d'un utilisateur + envoi de l'email de bienvenue Pro.
//
// Usage :
//   curl -X POST https://ecrira.com/api/admin/upgrade-user \
//     -H "Authorization: Bearer $CRON_SECRET" \
//     -H "Content-Type: application/json" \
//     -d '{"email":"user@exemple.com","plan":"pro"}'

import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { sendProWelcomeEmail } from '../../../lib/emails/pro-welcome'

const ALLOWED_PLANS = ['free', 'trial', 'pro', 'pro_agency']

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const auth = req.headers.authorization || ''
  const token = auth.replace('Bearer ', '').trim()
  if (!process.env.CRON_SECRET || token !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { email, plan = 'pro', sendEmail = true } = req.body || {}

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'email requis' })
  }
  if (!ALLOWED_PLANS.includes(plan)) {
    return res.status(400).json({ error: `plan invalide (${ALLOWED_PLANS.join(', ')})` })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  )

  // Retrouve l'utilisateur auth par email
  const { data: usersList, error: listErr } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })
  if (listErr) {
    console.error('[upgrade-user] listUsers error:', listErr)
    return res.status(500).json({ error: 'Erreur Supabase (listUsers)' })
  }

  const target = usersList?.users?.find(
    (u: any) => (u.email || '').toLowerCase() === email.toLowerCase()
  )
  if (!target) {
    return res.status(404).json({ error: 'Utilisateur introuvable' })
  }

  const { error: updErr } = await supabase
    .from('profiles')
    .update({ plan })
    .eq('id', target.id)

  if (updErr) {
    console.error('[upgrade-user] update error:', updErr)
    return res.status(500).json({ error: 'Erreur mise a jour du profil' })
  }

  let emailSent = false
  if (sendEmail && (plan === 'pro' || plan === 'pro_agency')) {
    const firstName =
      (target.user_metadata && (target.user_metadata.first_name || target.user_metadata.full_name)) ||
      null
    emailSent = await sendProWelcomeEmail(
      target.email as string,
      plan,
      typeof firstName === 'string' ? firstName.split(' ')[0] : null
    )
  }

  return res.status(200).json({
    success: true,
    user_id: target.id,
    email: target.email,
    plan,
    email_sent: emailSent,
  })
}
