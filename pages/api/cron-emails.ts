import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).end()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ecrira.com'
  const now = new Date(); let sent = 0
  const w = (d: number) => ({ s: new Date(now.getTime()-d*86400000-1800000).toISOString(), e: new Date(now.getTime()-d*86400000+1800000).toISOString() })
  const send = async (to: string, subject: string, html: string) => {
    await fetch('https://api.resend.com/emails', { method:'POST', headers:{'Authorization':`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'}, body:JSON.stringify({ from:'David chez Ecrira <notifications@ecrira.com>', to:[to], subject, html }) }).catch(()=>{})
  }
  const {data:j3} = await supabase.from('profiles').select('email,name,posts_count_this_month,trial_ends_at').gte('created_at',w(3).s).lte('created_at',w(3).e)
  for (const u of (j3||[])) {
    if (!u.email||(u.posts_count_this_month||0)>0) continue
    const d = u.trial_ends_at?Math.ceil((new Date(u.trial_ends_at).getTime()-Date.now())/86400000):0
    await send(u.email,"💡 Tu n'as pas encore essayé Ecrira",`<div style="font-family:'Inter',sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#FAF9F7;"><p>Bonjour${u.name?` ${u.name}`:''} 👋</p><p>Tu t'es inscrit il y a 3 jours mais n'as pas encore généré de post. Il te reste <strong>${d} jours</strong> d'essai Pro.</p><ul><li>📌 Une leçon apprise cette semaine</li><li>📌 Ton avis sur une tendance</li><li>📌 Un problème résolu</li></ul><a href="${appUrl}" style="display:inline-block;background:#3D52A0;color:white;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600;">Générer mon premier post →</a><p style="font-size:11px;color:#9EA39C;margin-top:24px;"><a href="${appUrl}/unsubscribe" style="color:#9EA39C;">Se désabonner</a></p></div>`)
    sent++
  }
  const {data:j7} = await supabase.from('profiles').select('email,name,plan').gte('created_at',w(7).s).lte('created_at',w(7).e)
  for (const u of (j7||[])) {
    if (!u.email||u.plan==='pro') continue
    await send(u.email,"⏰ Ton essai Pro se termine aujourd'hui",`<div style="font-family:'Inter',sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#FAF9F7;"><p>Bonjour${u.name?` ${u.name}`:''} 👋</p><p>Ton essai Pro de 7 jours se termine aujourd'hui. Continue à <strong>15,90€/mois</strong> sans engagement.</p><a href="${appUrl}/pricing" style="display:inline-block;background:#3D52A0;color:white;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600;margin:16px 0;">Continuer avec Pro →</a><p style="font-size:11px;color:#9EA39C;margin-top:24px;"><a href="${appUrl}/unsubscribe" style="color:#9EA39C;">Se désabonner</a></p></div>`)
    sent++
  }
  res.status(200).json({sent})
}
