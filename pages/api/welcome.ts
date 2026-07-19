import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Passe à false pour revenir au nom en texte si le logo ne s'affiche pas chez certains clients mail.
const USE_LOGO_IMAGE = true
const LOGO_URL = 'https://ecrira.com/logo-ecrira-horizontal-400.png'

function buildWelcomeEmail(name?: string): string {
  const greeting = name ? `Bienvenue, ${name} ! 🎉` : 'Bienvenue ! 🎉'
  const header = USE_LOGO_IMAGE
    ? `<img src="${LOGO_URL}" alt="Ecrira" width="150" style="display:block;margin:0 auto;height:auto;max-width:150px;" />`
    : `<div style="color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.02em;">Ecrira</div>`

  const card = (title: string, desc: string) =>
    `<td width="50%" style="background:#FAF9F7;border:1px solid #EDE9E3;border-radius:12px;padding:16px;vertical-align:top;">
      <div style="font-size:14px;font-weight:600;color:#1F2421;margin-bottom:4px;">${title}</div>
      <div style="font-size:12px;color:#6B7069;line-height:1.45;">${desc}</div>
    </td>`

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#E8E6E1;font-family:-apple-system,'Inter',Arial,sans-serif;">
<div style="max-width:520px;margin:32px auto;background:#ffffff;border-radius:18px;border:1px solid #E3DED7;overflow:hidden;">

  <div style="background:#3D52A0;background:linear-gradient(135deg,#3D52A0 0%,#32458A 100%);padding:28px 32px;text-align:center;">
    ${header}
    <div style="color:rgba(255,255,255,0.72);font-size:12px;margin-top:8px;letter-spacing:0.04em;">Votre présence LinkedIn, pilotée par l'IA</div>
  </div>

  <div style="padding:36px 32px 8px;">
    <h1 style="margin:0 0 12px;font-size:22px;color:#1F2421;font-weight:700;line-height:1.3;">${greeting}</h1>
    <p style="margin:0;font-size:15px;color:#6B7069;line-height:1.6;">Votre compte est prêt. Et bonne nouvelle&nbsp;: vous démarrez avec <strong style="color:#1F2421;">7 jours de Pro offerts</strong>.</p>
  </div>

  <div style="padding:16px 32px 8px;">
    <div style="display:inline-block;background:rgba(217,168,64,0.14);border:1px solid rgba(217,168,64,0.35);color:#B7841C;font-size:12px;font-weight:600;padding:8px 16px;border-radius:24px;letter-spacing:0.02em;">
      &#10022; Essai Pro &middot; 7 jours gratuits
    </div>
  </div>

  <div style="padding:20px 32px 8px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:8px;">
      <tr>
        ${card('10 idées / jour', 'Des sujets LinkedIn adaptés à votre secteur')}
        ${card('Post en 30 s', 'Rédigé dans votre style, &times;3 variantes')}
      </tr>
      <tr>
        ${card('Planification', 'Publiez directement sur LinkedIn')}
        ${card('Visuels IA', 'Images pro 1080px générées pour vous')}
      </tr>
    </table>
  </div>

  <div style="padding:20px 32px 32px;text-align:center;">
    <a href="https://ecrira.com" style="display:inline-block;background:#3D52A0;color:#ffffff;padding:15px 40px;border-radius:12px;text-decoration:none;font-weight:600;font-size:15px;">Créer mon premier post &rarr;</a>
    <p style="margin:16px 0 0;font-size:12px;color:#9EA39C;">Aucune carte requise pendant l'essai.</p>
  </div>

  <div style="padding:20px 32px;background:#F5F3EF;border-top:1px solid #E3DED7;font-size:11px;color:#9EA39C;text-align:center;line-height:1.6;">
    Ecrira &middot; Écrivez mieux sur LinkedIn<br>
    <a href="https://ecrira.com/unsubscribe" style="color:#9EA39C;text-decoration:underline;">Se désabonner</a>
  </div>

</div>
</body></html>`
}

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
        html: buildWelcomeEmail(name),
      }),
    })
  } catch(e) { console.error('[welcome]', e) }
  res.status(200).end()
}
