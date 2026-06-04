import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Sécurité cron
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Non autorisé' })
  }

  // Récupère les posts planifiés dont l'heure est passée
  const now = new Date().toISOString()
  const { data: posts, error } = await supabase
    .from('scheduled_posts')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_at', now)

  if (error) return res.status(500).json({ error: error.message })
  if (!posts?.length) return res.status(200).json({ message: 'Aucun post à publier' })

  let published = 0

  for (const post of posts) {
    try {
      // Envoie le webhook à Zapier
      const zapRes = await fetch(post.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: post.content,
          published_at: new Date().toISOString(),
          source: 'Postoria',
        }),
      })

      if (zapRes.ok) {
        // Marque comme publié
        await supabase
          .from('scheduled_posts')
          .update({ status: 'published' })
          .eq('id', post.id)
        published++
      } else {
        await supabase
          .from('scheduled_posts')
          .update({ status: 'error' })
          .eq('id', post.id)
      }
    } catch (err) {
      console.error(`Erreur post ${post.id}:`, err)
    }
  }

  res.status(200).json({ message: `${published} post(s) publié(s)` })
}
