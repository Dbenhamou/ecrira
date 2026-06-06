import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { sendNotification } from '../../lib/notify'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Non autorisé' })
  }

  const now = new Date().toISOString()
  const { data: posts, error } = await supabase
    .from('scheduled_posts')
    .select('*, profiles(linkedin_token, linkedin_token_expiry, linkedin_id)')
    .eq('status', 'pending')
    .lte('scheduled_at', now)

  if (error) return res.status(500).json({ error: error.message })
  if (!posts?.length) return res.status(200).json({ message: 'Aucun post à publier' })

  let published = 0
  let failed = 0

  for (const post of posts) {
    try {
      const profile = (post as any).profiles
      if (!profile?.linkedin_token) {
        await supabase.from('scheduled_posts').update({ status: 'error' }).eq('id', post.id)
        await sendNotification({ userId: post.user_id, type: 'post_error', title: 'LinkedIn non connecté', body: 'Reconnectez votre compte LinkedIn', userEmail: profile?.email }).catch(()=>{})
        failed++
        continue
      }

      const expiryWithMargin = new Date(new Date(profile.linkedin_token_expiry).getTime() - 5 * 60 * 1000)
      if (expiryWithMargin < new Date()) {
        await supabase.from('scheduled_posts').update({ status: 'error' }).eq('id', post.id)
        failed++
        continue
      }

      const authorUrn = `urn:li:person:${profile.linkedin_id}`
      const token = profile.linkedin_token

      // Avec image si svg_content disponible
      if (post.svg_content) {
        // Upload image LinkedIn
        const registerRes = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Restli-Protocol-Version': '2.0.0' },
          body: JSON.stringify({
            registerUploadRequest: {
              recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
              owner: authorUrn,
              serviceRelationships: [{ relationshipType: 'OWNER', identifier: 'urn:li:userGeneratedContent' }],
            },
          }),
        })
        const registerData = await registerRes.json()
        const uploadUrl = registerData.value?.uploadMechanism?.['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']?.uploadUrl
        const asset = registerData.value?.asset

        if (uploadUrl && asset) {
          const pngBuffer = Buffer.from(post.svg_content, 'base64')
          await fetch(uploadUrl, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'image/png' },
            body: pngBuffer as unknown as BodyInit,
          })

          const postRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Restli-Protocol-Version': '2.0.0' },
            body: JSON.stringify({
              author: authorUrn,
              lifecycleState: 'PUBLISHED',
              specificContent: {
                'com.linkedin.ugc.ShareContent': {
                  shareCommentary: { text: post.content },
                  shareMediaCategory: 'IMAGE',
                  media: [{ status: 'READY', media: asset, title: { text: post.topic || 'Post' } }],
                },
              },
              visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
            }),
          })

          if (postRes.ok) {
            await supabase.from('scheduled_posts').update({ status: 'published' }).eq('id', post.id)
            published++
            await sendNotification({ userId: post.user_id, type: 'post_published', title: 'Post publié sur LinkedIn ✅', body: post.content?.substring(0,80), userEmail: profile.email }).catch(()=>{})
          } else {
            await supabase.from('scheduled_posts').update({ status: 'error' }).eq('id', post.id)
            failed++
            await sendNotification({ userId: post.user_id, type: 'post_error', title: 'Erreur de publication', body: 'Échec publication avec visuel', userEmail: profile.email }).catch(()=>{})
          }
          continue
        }
      }

      // Sans image
      const postRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Restli-Protocol-Version': '2.0.0' },
        body: JSON.stringify({
          author: authorUrn,
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: { text: post.content },
              shareMediaCategory: 'NONE',
            },
          },
          visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
        }),
      })

      if (postRes.ok) {
        await supabase.from('scheduled_posts').update({ status: 'published' }).eq('id', post.id)
        published++
        await sendNotification({ userId: post.user_id, type: 'post_published', title: 'Post publié sur LinkedIn ✅', body: post.content?.substring(0,80), userEmail: profile.email }).catch(()=>{})
      } else {
        await supabase.from('scheduled_posts').update({ status: 'error' }).eq('id', post.id)
        failed++
        await sendNotification({ userId: post.user_id, type: 'post_error', title: 'Erreur de publication', userEmail: profile.email }).catch(()=>{})
      }
    } catch (err) {
      console.error(`Erreur post ${post.id}:`, err)
      await supabase.from('scheduled_posts').update({ status: 'error' }).eq('id', post.id)
      failed++
    }
  }

  res.status(200).json({ message: `${published} publié(s), ${failed} erreur(s)` })
}
