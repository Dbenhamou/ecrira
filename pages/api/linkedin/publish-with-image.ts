import type { NextApiRequest, NextApiResponse } from 'next'
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

  const { content, svgContent } = req.body
  if (!content) return res.status(400).json({ error: 'Contenu manquant' })

  const { data: profile } = await supabase
    .from('profiles')
    .select('linkedin_token, linkedin_token_expiry, linkedin_id')
    .eq('id', userId)
    .single()

  if (!profile?.linkedin_token) {
    return res.status(401).json({ error: 'LinkedIn non connecté.' })
  }

  const expiryWithMargin = new Date(new Date(profile.linkedin_token_expiry).getTime() - 5 * 60 * 1000)
  if (expiryWithMargin < new Date()) {
    return res.status(401).json({ error: 'Token LinkedIn expiré. Reconnecte ton compte.' })
  }

  const token = profile.linkedin_token
  const authorUrn = `urn:li:person:${profile.linkedin_id}`

  try {
    // Si pas de visuel — publication texte simple
    if (!svgContent) {
      const postRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify({
          author: authorUrn,
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
      if (postRes.ok) return res.status(200).json({ success: true })
      const err = await postRes.json()
      return res.status(500).json({ error: err.message || 'Erreur LinkedIn' })
    }

    // Avec visuel — convertir SVG en PNG puis uploader
    const { Resvg } = await import('@resvg/resvg-js')
    const resvg = new Resvg(svgContent, { fitTo: { mode: 'width', value: 1080 } })
    const pngData = resvg.render()
    const pngBuffer = pngData.asPng()

    // 1. Initialiser l'upload image LinkedIn
    const registerRes = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify({
        registerUploadRequest: {
          recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
          owner: authorUrn,
          serviceRelationships: [{
            relationshipType: 'OWNER',
            identifier: 'urn:li:userGeneratedContent',
          }],
        },
      }),
    })

    const registerData = await registerRes.json()
    const uploadUrl = registerData.value?.uploadMechanism?.['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']?.uploadUrl
    const asset = registerData.value?.asset

    if (!uploadUrl || !asset) {
      return res.status(500).json({ error: 'Impossible d\'initialiser l\'upload LinkedIn' })
    }

    // 2. Uploader le PNG
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'image/png',
      },
      body: pngBuffer as unknown as BodyInit,
    })

    if (!uploadRes.ok) {
      return res.status(500).json({ error: 'Erreur upload image LinkedIn' })
    }

    // 3. Publier le post avec l'image
    const postRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify({
        author: authorUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: content },
            shareMediaCategory: 'IMAGE',
            media: [{
              status: 'READY',
              description: { text: 'Visuel généré par Ecrira' },
              media: asset,
              title: { text: 'Post LinkedIn' },
            }],
          },
        },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
      }),
    })

    if (postRes.ok) {
      res.status(200).json({ success: true, withImage: true })
    } else {
      const err = await postRes.json()
      res.status(500).json({ error: err.message || 'Erreur publication LinkedIn' })
    }

  } catch (err: any) {
    console.error('publish-with-image error:', err)
    res.status(500).json({ error: err.message || 'Erreur serveur' })
  }
}
