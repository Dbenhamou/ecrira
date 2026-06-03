import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code, error } = req.query
  if (error || !code) return res.redirect('/?linkedin=error')

  const clientId = process.env.LINKEDIN_CLIENT_ID!
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET!
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/linkedin/callback`

  try {
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

    const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const profileData = await profileRes.json()
    const linkedinId = profileData.sub

    // Get user from auth header or cookie
    const authHeader = req.headers.authorization
    const token = authHeader?.replace('Bearer ', '')
    if (!token) return res.redirect('/?linkedin=error')

    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return res.redirect('/?linkedin=error')

    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
    await supabase.from('profiles').update({
      linkedin_token: tokenData.access_token,
      linkedin_token_expiry: expiresAt,
      linkedin_id: linkedinId,
    }).eq('id', user.id)

    res.redirect('/?linkedin=success')
  } catch (err) {
    console.error(err)
    res.redirect('/?linkedin=error')
  }
}
