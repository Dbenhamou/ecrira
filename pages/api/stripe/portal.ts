import { NextApiRequest, NextApiResponse } from 'next'
import { stripe } from '../../../lib/stripe'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth-helper'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const userId = await requireAuth(req, res)
  if (!userId) return

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single()

  if (!profile?.stripe_customer_id) {
    return res.status(400).json({ error: 'Aucun abonnement trouvé pour ce compte.' })
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://ecrira.com'}/app`,
    })
    res.status(200).json({ url: session.url })
  } catch (e) {
    console.error('[portal]', e)
    res.status(500).json({ error: 'Erreur portail de facturation' })
  }
}
