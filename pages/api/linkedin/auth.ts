import type { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const clientId = process.env.LINKEDIN_CLIENT_ID!
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/linkedin/callback`
  // w_member_social sera ajouté une fois "Share on LinkedIn" approuvé par LinkedIn
  const scope = 'openid profile email'
  const state = Math.random().toString(36).substring(2)

  const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}`

  res.redirect(url)
}
