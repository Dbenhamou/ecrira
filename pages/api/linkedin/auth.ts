import type { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const clientId = process.env.LINKEDIN_CLIENT_ID!
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/linkedin/callback`
  // w_member_social approuvé — publication directe activée
  const scope = 'openid profile email w_member_social'
  const userId = req.query.userId as string || ''
  const state = Buffer.from(JSON.stringify({ userId, nonce: Math.random().toString(36).substring(2) })).toString('base64')
  const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(state)}`
  res.redirect(url)
}
