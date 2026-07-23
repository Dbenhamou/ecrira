// lib/emails/pro-welcome.ts
// Email de bienvenue envoye lors du passage en plan Pro / Pro Agency.

const INDIGO = '#3D52A0'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://ecrira.com'

type PlanLabel = 'pro' | 'pro_agency' | 'trial' | string

function planName(plan: PlanLabel): string {
  if (plan === 'pro_agency') return 'Pro Agency'
  if (plan === 'trial') return 'essai Pro'
  return 'Pro'
}

function buildHtml(firstName: string | null, plan: PlanLabel): string {
  const name = firstName ? ` ${firstName}` : ''
  const label = planName(plan)

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Bienvenue sur Ecrira ${label}</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F6FA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F6FA;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(16,24,40,0.08);">

          <tr>
            <td style="background-color:${INDIGO};padding:32px 32px 28px 32px;">
              <div style="color:#FFFFFF;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Ecrira</div>
              <div style="color:rgba(255,255,255,0.82);font-size:14px;margin-top:6px;">Votre compte ${label} est actif</div>
            </td>
          </tr>

          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px 0;font-size:22px;line-height:1.3;color:#101828;font-weight:700;">
                Bienvenue${name} 👋
              </h1>
              <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#475467;">
                Votre passage en <strong style="color:${INDIGO};">${label}</strong> est confirme. Vous avez desormais acces a l'ensemble des fonctionnalites d'Ecrira.
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8F9FC;border-radius:12px;padding:20px;margin:0 0 24px 0;">
                <tr>
                  <td style="font-size:14px;line-height:1.9;color:#344054;">
                    <strong style="color:#101828;">Ce qui vous attend :</strong><br />
                    1. Generation illimitee de posts LinkedIn<br />
                    2. Visuels IA generes automatiquement<br />
                    3. Calendrier editorial et planification directe<br />
                    4. Style d'ecriture personnalise<br />
                    5. Variantes multiples a chaque generation
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 28px 0;">
                <tr>
                  <td style="background-color:${INDIGO};border-radius:10px;">
                    <a href="${APP_URL}/app" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;">
                      Ouvrir Ecrira
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:14px;line-height:1.6;color:#667085;">
                Une question ? Repondez simplement a cet email, on vous lit.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 32px 28px 32px;border-top:1px solid #EAECF0;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#98A2B3;">
                Ecrira &middot; <a href="${APP_URL}" style="color:${INDIGO};text-decoration:none;">ecrira.com</a><br />
                Vous recevez cet email suite a l'activation de votre abonnement.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function sendProWelcomeEmail(
  to: string,
  plan: PlanLabel = 'pro',
  firstName: string | null = null
): Promise<boolean> {
  if (!to) {
    console.error('[pro-welcome] pas d email destinataire')
    return false
  }
  if (!process.env.RESEND_API_KEY) {
    console.error('[pro-welcome] RESEND_API_KEY manquante')
    return false
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Ecrira <contact@ecrira.com>',
        to: [to],
        reply_to: 'contact@ecrira.com',
        subject: `Bienvenue sur Ecrira ${planName(plan)} 🎉`,
        html: buildHtml(firstName, plan),
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[pro-welcome] Resend error:', err)
      return false
    }

    console.log('[pro-welcome] email envoye a', to)
    return true
  } catch (e) {
    console.error('[pro-welcome] exception:', e)
    return false
  }
}

export default sendProWelcomeEmail
