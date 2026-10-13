// scripts/test-idees.ts
// Essai a blanc du prompt d'idees sur un PANEL de comptes de secteurs
// differents (le prompt sert tous les clients, pas un seul profil).
// N'ECRIT RIEN en base (ni idees du jour, ni historique).
// Le resultat complet est enregistre dans ~/Downloads/ecrira_test_idees.txt
//
//   npx -y tsx scripts/test-idees.ts                -> panel de 5 comptes actifs, secteurs differents
//   npx -y tsx scripts/test-idees.ts <profile_id>   -> un seul compte
//   npx -y tsx scripts/test-idees.ts --prompt       -> ajoute au fichier le prompt envoye a l'IA

import { loadEnvConfig } from '@next/env'
import { writeFileSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
loadEnvConfig(process.cwd())

const PANEL_SIZE = 5
const OUT_FILE = join(homedir(), 'Downloads', 'ecrira_test_idees.txt')

function plain(s: string): string {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// Champs du profil que le prompt exploite : sert a montrer si un compte est
// bien renseigne ou presque vide.
const FIELDS = ['role', 'company', 'sector', 'audience', 'summary', 'keywords', 'tech_stack', 'pain_points', 'content_themes', 'tone', 'writing_style']

function filled(profile: any): string[] {
  return FIELDS.filter((f) => (profile[f] || '').toString().trim().length > 0)
}

// Panel : comptes actifs recemment, un seul par secteur, en melangeant
// profils complets et profils presque vides.
function pickPanel(profiles: any[]): any[] {
  const withSector = profiles
    .filter((p) => (p.sector || '').toString().trim())
    .sort((a, b) => new Date(b.last_seen_at || 0).getTime() - new Date(a.last_seen_at || 0).getTime())
  const seen = new Set<string>()
  const distinct: any[] = []
  for (const p of withSector) {
    const key = plain(p.sector).replace(/[^a-z\s]/g, ' ').split(/\s+/).filter((w) => w.length > 3)[0]?.slice(0, 6) || plain(p.sector)
    if (seen.has(key)) continue
    seen.add(key)
    distinct.push(p)
  }
  const panel = distinct.slice(0, PANEL_SIZE)
  // Garantit au moins un profil peu renseigne s'il en existe un.
  const sparse = distinct.find((p) => filled(p).length <= 4)
  if (sparse && !panel.includes(sparse)) panel[panel.length - 1] = sparse
  return panel
}

async function main() {
  const args = process.argv.slice(2)
  const showPrompt = args.includes('--prompt')
  const profileId = args.find((a) => !a.startsWith('--'))

  // Node 20 n'a pas de WebSocket natif et la librairie Supabase le reclame au
  // demarrage. Ce script n'utilise pas le temps reel : un substitut vide suffit.
  const g = globalThis as any
  if (typeof g.WebSocket === 'undefined') g.WebSocket = class {}

  const { createClient } = await import('@supabase/supabase-js')
  const { generateIdeas } = await import('../lib/ideas')

  // Diagnostic de la configuration locale (.env.local). Aucune cle n'est affichee.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  let keyRole = 'absente'
  if (key) {
    keyRole = key.startsWith('sb_secret_') ? 'service_role' : key.startsWith('sb_publishable_') ? 'anon' : 'inconnue'
    try {
      keyRole = JSON.parse(Buffer.from(key.split('.')[1], 'base64').toString('utf8')).role || keyRole
    } catch {}
  }
  if (!url || !key) throw new Error('Variables Supabase absentes de .env.local (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).')
  if (keyRole !== 'service_role') throw new Error('SUPABASE_SERVICE_ROLE_KEY dans .env.local n est pas la cle service_role (role detecte : ' + keyRole + ').')
  if (!(process.env.ANTHROPIC_API_KEY || '').startsWith('sk-ant-')) throw new Error('ANTHROPIC_API_KEY absente ou masquee dans .env.local.')

  const supabase = createClient(url, key)
  const { data: all, error, status } = await supabase.from('profiles').select('*')
  if (error) throw new Error('Lecture des profils impossible (HTTP ' + status + ') : ' + error.message)

  const targets = profileId ? (all || []).filter((p: any) => p.id === profileId) : pickPanel(all || [])
  if (!targets.length) throw new Error(profileId ? 'Profil introuvable : ' + profileId : 'Aucun profil avec un secteur renseigne.')

  console.log(`Essai sur ${targets.length} compte(s), en parallele. Compter 2 a 3 minutes...`)
  const started = Date.now()

  const reports = await Promise.all(targets.map(async (profile: any, n: number) => {
    const out: string[] = []
    const ok = filled(profile)
    out.push('='.repeat(78))
    out.push(`COMPTE ${n + 1} : ${(profile.role || '?').trim()} | ${(profile.sector || '?').trim()}`)
    out.push(`Audience : ${(profile.audience || 'non renseignee').trim()}`)
    out.push(`Profil renseigne : ${ok.length}/${FIELDS.length} champs` + (ok.length < FIELDS.length ? ` (vides : ${FIELDS.filter((f) => !ok.includes(f)).join(', ')})` : ''))
    out.push(`Vouvoiement / tutoiement : ${profile.formality || 'non renseigne'}`)
    out.push('')
    try {
      const { ideas, newsCount, freshCount } = await generateIdeas({
        supabase,
        userId: profile.id,
        profile,
        onDebug: (info) => {
          if (info.news) {
            out.push(`ACTUS ENVOYEES A L'IA : ${info.news.length}`)
            info.news.forEach((a, i) => out.push(`  ${i + 1}. ${a.title} (${a.source})`))
            out.push('')
          }
          if (showPrompt && info.system) out.push('----- SYSTEM -----', info.system, '', '----- USER -----', info.user || '', '')
          if (info.raw) {
            const analyse = info.raw.match(/<analyse>([\s\S]*?)<\/analyse>/i)?.[1]?.trim()
            if (analyse) out.push('ANALYSE DE L\'IA :', analyse, '')
            const retenues = info.raw.match(/<actus_retenues>([\s\S]*?)<\/actus_retenues>/i)?.[1]?.trim()
            if (retenues !== undefined) out.push('ACTUS RETENUES PAR L\'IA : ' + (retenues || '[]'), '')
          }
        },
      })
      out.push(`${ideas.length} IDEES (${newsCount} actu, ${freshCount} neuves)`)
      out.push('')
      ideas.forEach((idea, i) => {
        out.push(`${i + 1}. [${idea.theme || idea.topic}] ${idea.title}`)
        out.push(`   Accroche : ${idea.hook}`)
        out.push(`   Plan : ${idea.angle.split('\n').join(' / ')}`)
        out.push('')
      })
      console.log(`  compte ${n + 1} termine (${ideas.length} idees, ${newsCount} actu)`)
    } catch (e: any) {
      out.push('ERREUR : ' + (e?.message || e))
      console.log(`  compte ${n + 1} en erreur : ${e?.message || e}`)
    }
    return out.join('\n')
  }))

  const header = `ESSAI A BLANC DU PROMPT D'IDEES - ${new Date().toLocaleString('fr-FR')} - ${targets.length} compte(s) - ${Math.round((Date.now() - started) / 1000)} s\nRien n'a ete enregistre en base.\n`
  writeFileSync(OUT_FILE, header + '\n' + reports.join('\n\n') + '\n', 'utf8')
  console.log('\nTermine. Rien n\'a ete enregistre en base.')
  console.log('Resultat complet : ' + OUT_FILE)
}

main().catch((e) => {
  console.error('ERREUR :', e?.message || e)
  process.exit(1)
})
