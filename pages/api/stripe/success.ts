import { NextApiRequest, NextApiResponse } from 'next';
import { stripe } from '../../../lib/stripe';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' });

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid') {
      return res.status(200).json({ success: true });
    }

    res.status(400).json({ error: 'Payment not completed' });
  } catch (error) {
    console.error('[success] Erreur récupération session Stripe:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}