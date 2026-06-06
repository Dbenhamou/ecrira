import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code, error, state } = req.query
  if (error || !code) return res.redirect('/?linkedin=error')

  // Extract userId from state
  let userId = ''
  try {
    const decoded = JSON.parse(Buffer.from(decodeURIComponent(state as string), 'base64').toString())
    userId = decoded.userId
  } catch { return res.redirect('/?linkedin=error') }

  if (!userId) return res.redirect('/?linkedin=error')

  const clientId = process.env.LINKEDIN_CLIENT_ID!
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET!
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/linkedin/callback`

  try {
    // Exchange code for token
    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    })
    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) return res.redirect('/?linkedin=error')

    // Get LinkedIn profile info
    const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const li = await profileRes.json()

    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString()

    // Build profile update — only fill fields that are empty
    const { data: existing } = await supabase
      .from('profiles')
      .select('name, linkedin_token')
      .eq('id', userId)
      .single()

    const updates: Record<string, any> = {
      linkedin_token: tokenData.access_token,
      linkedin_token_expiry: expiresAt,
      linkedin_id: li.sub,
    }

    // Enrich name only if empty
    if (!existing?.name && li.given_name) {
      updates.name = `${li.given_name}${li.family_name ? ' ' + li.family_name : ''}`
    }

    await supabase.from('profiles').update(updates).eq('id', userId)

    res.redirect('/?linkedin=success')
  } catch (err) {
    console.error(err)
    res.redirect('/?linkedin=error')
  }
}
