import { NextApiRequest, NextApiResponse } from 'next';
import { stripe } from '../../../lib/stripe';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const config = { api: { bodyParser: false } };

async function getRawBody(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function updateProfile(
  filter: { column: 'id' | 'stripe_customer_id'; value: string },
  data: Record<string, unknown>,
  context: string
) {
  const { error } = await supabase
    .from('profiles')
    .update(data)
    .eq(filter.column, filter.value);

  if (error) {
    console.error(`[webhook] ${context} — Supabase error:`, error);
    throw error;
  }
  console.log(`[webhook] ${context} — OK (${filter.column}=${filter.value})`);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const rawBody = await getRawBody(req);
  const sig = req.headers['stripe-signature']!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error('[webhook] Signature invalide:', err);
    return res.status(400).send('Webhook Error');
  }

  console.log(`[webhook] Event reçu : ${event.type}`);

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        if (!userId) {
          console.error('[webhook] checkout.session.completed — userId manquant dans metadata');
          break;
        }
        await updateProfile(
          { column: 'id', value: userId },
          {
            plan: 'pro',
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
          },
          'checkout.session.completed'
        );
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const isActive = sub.status === 'active' || sub.status === 'trialing';
        await updateProfile(
          { column: 'stripe_customer_id', value: sub.customer as string },
          {
            plan: isActive ? 'pro' : 'free',
            stripe_subscription_id: isActive ? sub.id : null,
          },
          `customer.subscription.updated (status=${sub.status})`
        );
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await updateProfile(
          { column: 'stripe_customer_id', value: sub.customer as string },
          {
            plan: 'free',
            stripe_subscription_id: null,
          },
          'customer.subscription.deleted'
        );
        break;
      }

      default:
        console.log(`[webhook] Event ignoré : ${event.type}`);
    }
  } catch (err) {
    console.error('[webhook] Erreur de traitement:', err);
    return res.status(500).json({ error: 'Erreur interne' });
  }

  res.status(200).json({ received: true });
}