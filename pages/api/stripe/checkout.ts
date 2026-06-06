import { NextApiRequest, NextApiResponse } from 'next';
import { stripe } from '../../../lib/stripe';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { userId, email } = req.body;

  if (!userId || !email) return res.status(400).json({ error: 'Missing userId or email' });

  try {
    // Créer ou récupérer le customer Stripe
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({ email });
      customerId = customer.id;
      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', userId);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/?upgrade=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
      metadata: { userId },
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la création de la session' });
  }
}
