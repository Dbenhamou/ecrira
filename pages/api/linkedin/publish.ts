import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { userId, content } = req.body
  if (!userId || !content) return res.status(400).json({ error: 'Paramètres manquants' })

  const { data: profile } = await supabase
    .from('profiles')
    .select('linkedin_token, linkedin_token_expiry, linkedin_id')
    .eq('id', userId)
    .single()

  if (!profile?.linkedin_token) {
    return res.status(401).json({ error: 'LinkedIn non connecté. Va dans Mon profil pour connecter ton compte.' })
  }

  if (new Date(profile.linkedin_token_expiry) < new Date()) {
    return res.status(401).json({ error: 'Token LinkedIn expiré. Reconnecte ton compte LinkedIn dans Mon profil.' })
  }

  try {
    const postRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${profile.linkedin_token}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify({
        author: `urn:li:person:${profile.linkedin_id}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: content },
            shareMediaCategory: 'NONE',
          },
        },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
      }),
    })

    if (postRes.ok) {
      res.status(200).json({ success: true })
    } else {
      const err = await postRes.json()
      console.error('LinkedIn API error:', err)
      res.status(500).json({ error: 'Erreur LinkedIn : ' + (err.message || JSON.stringify(err)) })
    }
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur réseau' })
  }
}
