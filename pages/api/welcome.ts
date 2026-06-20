import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const { email, name } = req.body
  if (!email || !process.env.RESEND_API_KEY) return res.status(200).end()

  const { data: profile } = await supabase.from('profiles').select('created_at').eq('email', email).single()
  if (!profile) return res.status(200).end()
  if (Date.now() - new Date(profile.created_at).getTime() > 60_000) return res.status(200).end()

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Ecrira <notifications@ecrira.com>',
        to: [email],
        subject: '🎉 Bienvenue sur Ecrira !',
        html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#FAF9F7;font-family:'Inter',sans-serif;"><div style="max-width:520px;margin:40px auto;background:white;border-radius:16px;border:1px solid #E3DED7;overflow:hidden;"><div style="background:#3D52A0;padding:24px 32px;"><span style="color:white;font-size:20px;font-weight:600;">Ecrira</span></div><div style="padding:32px;"><h2 style="margin:0 0 16px;font-size:18px;color:#1F2421;">Bienvenue${name ? `, ${name}` : ''} ! 🎉</h2><div style="font-size:14px;color:#4A4F49;line-height:1.6;"><p>Votre compte est prêt. Voici ce que vous pouvez faire dès maintenant :</p><ul style="margin:16px 0;padding-left:20px;line-height:2;"><li>✦ 10 idées de posts LinkedIn par jour</li><li>✦ Rédigez un post en 30 secondes</li><li>✦ Planifiez et publiez directement sur LinkedIn</li><li>✦ Visuels professionnels 1080px</li></ul><p><a href="https://ecrira.com" style="display:inline-block;background:#3D52A0;color:white;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600;">Commencer →</a></p></div></div><div style="padding:16px 32px;background:#F5F3EF;border-top:1px solid #E3DED7;font-size:11px;color:#9EA39C;text-align:center;">Ecrira · <a href="https://ecrira.com/unsubscribe" style="color:#9EA39C;">Se désabonner</a></div></div></body></html>`
      }),
    })
  } catch(e) { console.error('[welcome]', e) }
  res.status(200).end()
}
