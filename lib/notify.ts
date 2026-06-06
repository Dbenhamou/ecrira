import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type NotifType = 'post_published' | 'post_error' | 'post_scheduled' | 'ideas_ready'

interface NotifPayload {
  userId: string
  type: NotifType
  title: string
  body?: string
  userEmail?: string
}

const EMAIL_SUBJECTS: Record<NotifType, string> = {
  post_published: '✅ Votre post a été publié sur LinkedIn',
  post_error: '⚠️ Erreur lors de la publication de votre post',
  post_scheduled: '📅 Votre post est planifié',
  ideas_ready: '✦ Vos idées LinkedIn du jour sont prêtes',
}

const EMAIL_BODIES: Record<NotifType, (body?: string) => string> = {
  post_published: (body) => `
    <p>Bonne nouvelle — votre post LinkedIn a été publié avec succès.</p>
    ${body ? `<p style="color:#666;font-style:italic;">"${body.substring(0, 120)}…"</p>` : ''}
    <p><a href="https://ecrira.com" style="color:#516756;font-weight:600;">Ouvrir Ecrira →</a></p>
  `,
  post_error: (body) => `
    <p>Une erreur s'est produite lors de la publication de votre post planifié.</p>
    ${body ? `<p style="color:#c0392b;">Détail : ${body}</p>` : ''}
    <p>Reconnectez votre compte LinkedIn si le token a expiré.</p>
    <p><a href="https://ecrira.com" style="color:#516756;font-weight:600;">Ouvrir Ecrira →</a></p>
  `,
  post_scheduled: (body) => `
    <p>Votre post a bien été planifié${body ? ` pour le <strong>${body}</strong>` : ''}.</p>
    <p><a href="https://ecrira.com" style="color:#516756;font-weight:600;">Voir le calendrier →</a></p>
  `,
  ideas_ready: () => `
    <p>Vos nouvelles idées de posts LinkedIn pour aujourd'hui sont disponibles.</p>
    <p><a href="https://ecrira.com" style="color:#516756;font-weight:600;">Découvrir les idées →</a></p>
  `,
}

function buildEmailHtml(type: NotifType, title: string, body?: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#FAF9F7;font-family:'Inter',system-ui,sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:white;border-radius:16px;border:1px solid #E3DED7;overflow:hidden;">
    <div style="background:#516756;padding:24px 32px;">
      <img src="https://ecrira.com/logo-ecrira-white.png" alt="Ecrira" style="height:32px;" onerror="this.style.display='none'"/>
      <span style="color:white;font-size:20px;font-weight:600;font-family:'Clash Display',sans-serif;">Ecrira</span>
    </div>
    <div style="padding:32px;">
      <h2 style="margin:0 0 16px;font-size:18px;color:#1F2421;">${title}</h2>
      <div style="font-size:14px;color:#4A4F49;line-height:1.6;">
        ${EMAIL_BODIES[type](body)}
      </div>
    </div>
    <div style="padding:16px 32px;background:#F5F3EF;border-top:1px solid #E3DED7;font-size:11px;color:#9EA39C;text-align:center;">
      Ecrira · Vous recevez cet email car vous avez un compte actif.
    </div>
  </div>
</body>
</html>
  `.trim()
}

export async function sendNotification({ userId, type, title, body, userEmail }: NotifPayload) {
  // 1. Créer la notif en base
  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    type,
    title,
    body: body || null,
  })
  if (error) console.error('[notify] DB error:', error)

  // 2. Envoyer l'email (sauf post_scheduled — pas d'email)
  if (type === 'post_scheduled' || !userEmail || !process.env.RESEND_API_KEY) return

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Ecrira <notifications@ecrira.com>',
        to: [userEmail],
        subject: EMAIL_SUBJECTS[type],
        html: buildEmailHtml(type, title, body),
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      console.error('[notify] Resend error:', err)
    }
  } catch (err) {
    console.error('[notify] Email send failed:', err)
  }
}
