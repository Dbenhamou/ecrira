import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../lib/auth-helper'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!['POST', 'PUT', 'DELETE'].includes(req.method!)) return res.status(405).end()

  const userId = await requireAuth(req, res)
  if (!userId) return

  // Supprimer un post planifié
  if (req.method === 'DELETE') {
    const { id } = req.body
    const { error } = await supabase
      .from('scheduled_posts')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true })
  }

  // Modifier un post planifié
  if (req.method === 'PUT') {
    const { id, content, scheduled_at, topic, svg_content } = req.body
    if (content && content.length > 3000) return res.status(400).json({ error: 'Contenu trop long (max 3000 car.)' })
    const { error } = await supabase
      .from('scheduled_posts')
      .update({ content, scheduled_at, topic, svg_content, status: 'pending' })
      .eq('id', id)
      .eq('user_id', userId)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true })
  }

  // Créer un post planifié
  const { content, scheduled_at, topic, svg_content } = req.body
  if (!content || !scheduled_at) return res.status(400).json({ error: 'Contenu et date requis' })
  if (content.length > 3000) return res.status(400).json({ error: 'Contenu trop long (max 3000 car.)' })
  if (topic && topic.length > 200) return res.status(400).json({ error: 'Sujet trop long (max 200 car.)' })

  const { data, error } = await supabase
    .from('scheduled_posts')
    .insert({
      user_id: userId,
      content,
      scheduled_at,
      topic: topic || '',
      svg_content: svg_content || null,
      status: 'pending',
    })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(200).json({ success: true, post: data })
}
