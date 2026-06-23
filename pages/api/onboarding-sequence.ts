import type { NextApiRequest, NextApiResponse } from 'next'
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).end()
  const { email, name } = req.body
  if (!email||!process.env.RESEND_API_KEY) return res.status(200).end()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ecrira.com'
  try {
    await fetch('https://api.resend.com/emails', { method:'POST', headers:{'Authorization':`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'}, body:JSON.stringify({
      from:'David chez Ecrira <notifications@ecrira.com>', to:[email],
      subject:'✦ Bienvenue — voici comment tirer le max de tes 7 jours Pro',
      html:`<div style="font-family:'Inter',sans-serif;max-width:520px;margin:0 auto;background:#FAF9F7;"><div style="background:#3D52A0;padding:24px 32px;"><span style="color:white;font-size:20px;font-weight:600;">Ecrira</span></div><div style="padding:32px;"><h2 style="margin:0 0 16px;font-size:18px;color:#1F2421;">Bienvenue${name?` ${name}`:''}! 🎉</h2><p style="font-size:14px;color:#4A4F49;line-height:1.7;">Tu bénéficies de <strong>7 jours Pro gratuits</strong>. 3 étapes pour ton premier post :</p><div style="background:white;border-radius:12px;padding:20px;margin:16px 0;border:1px solid #E3DED7;"><p style="margin:0 0 10px;font-size:13px;color:#4A4F49;"><strong>1.</strong> Complète ton profil</p><p style="margin:0 0 10px;font-size:13px;color:#4A4F49;"><strong>2.</strong> Connecte LinkedIn</p><p style="margin:0;font-size:13px;color:#4A4F49;"><strong>3.</strong> Génère ton premier post</p></div><a href="${appUrl}" style="display:inline-block;background:#3D52A0;color:white;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600;">Commencer →</a></div><div style="padding:16px 32px;background:#F5F3EF;border-top:1px solid #E3DED7;font-size:11px;color:#9EA39C;text-align:center;">Ecrira · <a href="${appUrl}/unsubscribe" style="color:#9EA39C;">Se désabonner</a></div></div>`,
    })})
  } catch(e) { console.error('[onboarding]',e) }
  res.status(200).end()
}
