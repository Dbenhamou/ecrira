import { readFileSync } from 'node:fs'
try {
  const raw = readFileSync('.env.local', 'utf8')
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (!m) continue
    let val = m[2].trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1)
    if (!process.env[m[1]]) process.env[m[1]] = val
  }
  console.log('📄 .env.local chargé\n')
} catch { console.log('⚠️  Pas de .env.local — je lis les variables du shell.\n') }

const env = process.env, results = [], TIMEOUT = 15000
function fetchT(url, opts = {}) {
  const c = new AbortController(); const id = setTimeout(() => c.abort(), TIMEOUT)
  return fetch(url, { ...opts, signal: c.signal }).finally(() => clearTimeout(id))
}
async function test(name, fn) {
  process.stdout.write(`⏳ ${name} ... `)
  try { const msg = await fn(); results.push({ name, ok: true }); console.log(`✅ ${msg || 'OK'}`) }
  catch (e) { results.push({ name, ok: false, msg: e.message }); console.log(`❌ ${e.message}`) }
}
function need(...keys) { for (const k of keys) if (!env[k]) throw new Error(`variable ${k} absente`) }

await test('Anthropic (Haiku)', async () => {
  need('ANTHROPIC_API_KEY')
  const r = await fetchT('https://api.anthropic.com/v1/messages', { method:'POST',
    headers:{'x-api-key':env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01','content-type':'application/json'},
    body: JSON.stringify({ model:'claude-haiku-4-5-20251001', max_tokens:1, messages:[{role:'user',content:'ping'}] }) })
  if (!r.ok) throw new Error(`HTTP ${r.status} — ${(await r.text()).slice(0,160)}`)
  return 'clé + Haiku OK'
})
await test('Anthropic (Sonnet)', async () => {
  need('ANTHROPIC_API_KEY')
  const r = await fetchT('https://api.anthropic.com/v1/messages', { method:'POST',
    headers:{'x-api-key':env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01','content-type':'application/json'},
    body: JSON.stringify({ model:'claude-sonnet-4-6', max_tokens:1, messages:[{role:'user',content:'ping'}] }) })
  if (!r.ok) throw new Error(`HTTP ${r.status} — ${(await r.text()).slice(0,160)}`)
  return 'Sonnet OK'
})
await test('Gemini (image)', async () => {
  need('GOOGLE_AI_API_KEY')
  const r = await fetchT(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image?key=${env.GOOGLE_AI_API_KEY}`)
  if (!r.ok) throw new Error(`HTTP ${r.status} — ${(await r.text()).slice(0,160)}`)
  return 'clé + modèle image OK'
})
await test('Stripe', async () => {
  need('STRIPE_SECRET_KEY','STRIPE_PRICE_ID')
  const r = await fetchT(`https://api.stripe.com/v1/prices/${env.STRIPE_PRICE_ID}`, { headers:{ Authorization:`Bearer ${env.STRIPE_SECRET_KEY}` } })
  if (!r.ok) throw new Error(`HTTP ${r.status} — ${(await r.text()).slice(0,160)}`)
  const j = await r.json(); return `price ${j.active?'actif':'INACTIF'} (${j.unit_amount/100}${(j.currency||'').toUpperCase()})`
})
await test('Resend', async () => {
  need('RESEND_API_KEY')
  const r = await fetchT('https://api.resend.com/domains', { headers:{ Authorization:`Bearer ${env.RESEND_API_KEY}` } })
  if (!r.ok) throw new Error(`HTTP ${r.status} — ${(await r.text()).slice(0,160)}`)
  return 'clé OK'
})
await test('Supabase', async () => {
  need('NEXT_PUBLIC_SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY')
  const r = await fetchT(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?select=id&limit=1`,
    { headers:{ apikey:env.SUPABASE_SERVICE_ROLE_KEY, Authorization:`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` } })
  if (!r.ok) throw new Error(`HTTP ${r.status} — ${(await r.text()).slice(0,160)}`)
  return 'DB + table profiles OK'
})
await test('NewsAPI', async () => {
  need('NEWS_API_KEY')
  const r = await fetchT(`https://newsapi.org/v2/everything?q=cyber&language=fr&pageSize=1&apiKey=${env.NEWS_API_KEY}`)
  const b = await r.text()
  if (r.status === 426) throw new Error('426 = plan gratuit interdit en prod (échoue sur Vercel)')
  if (!r.ok) throw new Error(`HTTP ${r.status} — ${b.slice(0,160)}`)
  return 'OK en local ⚠️ (free = 426 en prod Vercel, à confirmer serveur)'
})
await test('Browserless (SVG→PNG)', async () => {
  need('BROWSERLESS_API_KEY')
  const r = await fetchT(`https://production-sfo.browserless.io/screenshot?token=${env.BROWSERLESS_API_KEY}`, { method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ html:'<!DOCTYPE html><html><body style="width:100px;height:100px;background:#3D52A0"></body></html>',
      options:{ type:'png', clip:{ x:0,y:0,width:100,height:100 } }, viewport:{ width:100,height:100 } }) })
  if (!r.ok) throw new Error(`HTTP ${r.status} — ${(await r.text()).slice(0,160)}`)
  const buf = await r.arrayBuffer(); return `PNG généré (${buf.byteLength} octets)`
})
await test('LinkedIn (config)', async () => {
  need('LINKEDIN_CLIENT_ID','LINKEDIN_CLIENT_SECRET')
  const r = await fetchT('https://api.linkedin.com/v2/userinfo', { headers:{ Authorization:'Bearer test_invalid' } })
  if (r.status === 401) return 'clés présentes, endpoint vivant — publi réelle non testable ici (token requis)'
  return `endpoint HTTP ${r.status} — publi à tester connecté`
})

console.log('\n' + '─'.repeat(50))
const ko = results.filter(r => !r.ok)
console.log(`RÉSUMÉ : ${results.length - ko.length}/${results.length} OK`)
if (ko.length) { console.log('\n❌ À corriger :'); for (const r of ko) console.log(`   • ${r.name} → ${r.msg}`) }
console.log('─'.repeat(50))
process.exit(ko.length ? 1 : 0)
