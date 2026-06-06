import { NextApiRequest, NextApiResponse } from 'next';
import { stripe } from '../../../lib/stripe';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' });

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid' && session.metadata?.userId) {
      await supabase.from('profiles').update({
        plan: 'pro',
        stripe_subscription_id: session.subscription as string,
        stripe_customer_id: session.customer as string,
      }).eq('id', session.metadata.userId);

      return res.status(200).json({ success: true });
    }

    res.status(400).json({ error: 'Payment not completed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}
