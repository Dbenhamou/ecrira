import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// Bannière d'alerte : connexion LinkedIn qui expire ou a expiré.
// Auto-suffisante : lit le profil elle-même, aucun prop requis.
// Montée une fois dans app.tsx : <LinkedInTokenBanner />

const INDIGO = '#3D52A0'

export default function LinkedInTokenBanner() {
  const [status, setStatus] = useState<'none' | 'soon' | 'expired'>('none')
  const [days, setDays] = useState(0)
  const [userId, setUserId] = useState('')
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        setUserId(user.id)
        const { data } = await supabase
          .from('profiles')
          .select('linkedin_token, linkedin_token_expiry')
          .eq('id', user.id)
          .single()
        // Pas connecté à LinkedIn → on n'affiche rien
        if (!data?.linkedin_token || !data.linkedin_token_expiry) return
        const d = Math.ceil((new Date(data.linkedin_token_expiry).getTime() - Date.now()) / 86400000)
        if (d <= 0) { setStatus('expired'); setDays(0) }
        else if (d <= 7) { setStatus('soon'); setDays(d) }
      } catch { /* silencieux */ }
    })()
  }, [])

  if (status === 'none' || dismissed) return null

  const reconnect = () => { window.location.href = `/api/linkedin/auth?userId=${userId}` }

  const expired = status === 'expired'
  const accent = expired ? '#C0392B' : '#D9A840'
  const bg = expired ? '#FDECEA' : '#FCF6E8'
  const text = expired
    ? 'Ta connexion LinkedIn a expiré. Tes posts planifiés ne partiront pas tant que tu ne t\'es pas reconnecté.'
    : `Ta connexion LinkedIn expire dans ${days} jour${days > 1 ? 's' : ''}. Reconnecte-toi pour que tes posts planifiés continuent de partir.`

  return (
    <div
      style={{
        position: 'fixed', bottom: 24, left: 24, zIndex: 1000,
        width: 'min(380px, calc(100vw - 48px))',
        background: bg, border: `1.5px solid ${accent}`, borderRadius: 12,
        boxShadow: '0 6px 20px rgba(0,0,0,0.12)', padding: '14px 16px',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ fontSize: 20, lineHeight: 1.1 }}>{expired ? '🔴' : '⚠️'}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, color: '#333', lineHeight: 1.5, marginBottom: 10 }}>{text}</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={reconnect}
              style={{
                background: INDIGO, color: '#fff', border: 'none', borderRadius: 8,
                padding: '7px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}>
              Reconnecter LinkedIn
            </button>
            <button onClick={() => setDismissed(true)}
              style={{
                background: 'transparent', border: 'none', color: '#888',
                fontSize: 13, cursor: 'pointer', padding: '7px 6px',
              }}>
              Plus tard
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
