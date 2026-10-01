import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// ------------------------------------------------------------------
// Assistant Ecrira — panneau latéral conversationnel (Pro only)
// Nom modifiable en une ligne :
const ASSISTANT_NAME = 'Assistant Ecrira'
// ------------------------------------------------------------------

const INDIGO = '#3D52A0'
const INDIGO_LIGHT = '#EEF1FB'

// Styles responsive : le mobile (<= 768px) passe en plein ecran.
const CSS = `
.eca-fab{position:fixed;bottom:24px;right:24px;z-index:1000;width:60px;height:60px;border-radius:50%;border:none;
  background:${INDIGO};color:#fff;font-size:26px;cursor:pointer;box-shadow:0 6px 20px rgba(61,82,160,.45);
  display:flex;align-items:center;justify-content:center;transition:transform .15s ease}
.eca-fab:hover{transform:scale(1.06)}
.eca-panel{position:fixed;top:0;right:0;z-index:1001;height:100vh;height:100dvh;width:min(420px,100vw);background:#fff;
  box-shadow:-8px 0 30px rgba(0,0,0,.12);display:flex;flex-direction:column;font-family:Inter,system-ui,sans-serif;overscroll-behavior:contain}
.eca-head{padding:16px 18px;padding-top:calc(16px + env(safe-area-inset-top));flex-shrink:0}
.eca-chips{padding:12px 14px;display:flex;flex-wrap:wrap;gap:8px;border-bottom:1px solid #eee;flex-shrink:0}
.eca-chips button{font-size:12.5px;padding:6px 11px;border-radius:999px;border:1px solid ${INDIGO};background:${INDIGO_LIGHT};
  color:${INDIGO};font-weight:600;white-space:nowrap;flex-shrink:0}
.eca-msgs{flex:1;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding:16px 14px;background:#FAFAFB}
.eca-input{padding:12px;padding-bottom:calc(12px + env(safe-area-inset-bottom));border-top:1px solid #eee;display:flex;gap:8px;background:#fff;flex-shrink:0}
.eca-input textarea{flex:1;resize:none;border:1px solid #ddd;border-radius:10px;padding:10px 12px;font-size:14px;font-family:inherit;outline:none;max-height:120px}
@media (max-width:768px){
  .eca-fab{width:52px;height:52px;font-size:22px;right:16px;bottom:calc(92px + env(safe-area-inset-bottom))}
  .eca-panel{left:0;width:100vw;box-shadow:none}
  .eca-chips{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;padding:10px 12px}
  .eca-chips::-webkit-scrollbar{display:none}
  .eca-msgs{padding:14px 12px}
  .eca-input textarea{font-size:16px}
}
`

type Msg = { role: 'user' | 'assistant'; content: string; postSuggestion?: string | null }

const QUICK_ACTIONS: { label: string; prompt: string; needsPost?: boolean }[] = [
  { label: '✨ Améliorer mon post', prompt: 'Améliore le post actuellement dans mon éditeur : rends-le plus percutant tout en gardant mon style.', needsPost: true },
  { label: '💡 3 idées de posts', prompt: 'Propose-moi 3 idées de posts LinkedIn pertinentes pour mon audience cette semaine.' },
  { label: '🎣 Trouve un hook', prompt: 'Donne-moi 3 accroches (hooks) alternatives et plus fortes pour mon post.', needsPost: true },
  { label: '📰 Réagir à une actu', prompt: 'Quelle actualité récente de mon secteur pourrais-je commenter dans un post ? Propose un angle.' },
  { label: '✂️ Raccourcir', prompt: 'Raccourcis mon post pour le rendre plus dense et impactant, sans perdre le message clé.', needsPost: true },
  { label: '🎯 Ajouter un CTA', prompt: 'Ajoute un call-to-action naturel et efficace à la fin de mon post.', needsPost: true },
]

interface Props {
  currentPost?: string
  onApplyPost?: (text: string) => void
}

export default function AssistantPanel({ currentPost, onApplyPost }: Props) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [proBlocked, setProBlocked] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [copied, setCopied] = useState<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Mobile : la hauteur suit la zone visible (le clavier ne cache plus la saisie)
  // et la page derriere ne defile plus.
  const [vp, setVp] = useState<{ h: number; top: number } | null>(null)
  useEffect(() => {
    if (!open || typeof window === 'undefined') return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const vv = window.visualViewport
    const update = () => {
      if (vv && window.innerWidth <= 768) setVp({ h: Math.round(vv.height), top: Math.round(vv.offsetTop) })
      else setVp(null)
    }
    update()
    vv?.addEventListener('resize', update)
    vv?.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    return () => {
      document.body.style.overflow = prevOverflow
      vv?.removeEventListener('resize', update)
      vv?.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [open])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  const send = async (text: string) => {
    if (!text.trim() || loading) return
    setProBlocked(false)
    const newMessages: Msg[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) { window.location.href = '/login'; return }

      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          conversationId,
          currentPost: currentPost || '',
        }),
      })
      const data = await res.json()

      if (res.status === 403 && data.error === 'PRO_ONLY') {
        setProBlocked(true)
        setLoading(false)
        return
      }
      if (!res.ok) {
        setMessages((m) => [...m, { role: 'assistant', content: data.message || "Une erreur est survenue. Réessaie." }])
        setLoading(false)
        return
      }
      if (data.conversationId) setConversationId(data.conversationId)
      // On masque les balises ===POST=== dans l'affichage
      const cleanReply = (data.reply || '').replace(/===POST===/g, '').trim()
      setMessages((m) => [...m, { role: 'assistant', content: cleanReply, postSuggestion: data.postSuggestion }])
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: "Connexion impossible. Réessaie dans un instant." }])
    } finally {
      setLoading(false)
    }
  }

  const applyPost = (text: string, idx: number) => {
    if (onApplyPost) {
      onApplyPost(text)
    } else {
      navigator.clipboard?.writeText(text)
      setCopied(idx)
      setTimeout(() => setCopied(null), 1800)
    }
  }

  return (
    <>
      <style>{CSS}</style>
      {/* Bouton flottant */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Ouvrir l'assistant Ecrira"
          className="eca-fab"
        >
          ✨
        </button>
      )}

      {/* Panneau */}
      {open && (
        <div
          className="eca-panel"
          role="dialog"
          aria-label={ASSISTANT_NAME}
          style={vp ? { height: vp.h, top: vp.top } : undefined}
        >
          {/* Header */}
          <div className="eca-head" style={{ background: INDIGO, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 22 }}>✨</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{ASSISTANT_NAME}</div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>Ton copilote LinkedIn</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Fermer"
              style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 28, cursor: 'pointer', lineHeight: 1, width: 44, height: 44, marginRight: -10 }}>×</button>
          </div>

          {/* Chips */}
          <div className="eca-chips">
            {QUICK_ACTIONS.map((a) => (
              <button key={a.label} onClick={() => send(a.prompt)} disabled={loading}
                style={{ cursor: loading ? 'default' : 'pointer' }}>
                {a.label}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="eca-msgs">
            {messages.length === 0 && !proBlocked && (
              <div style={{ color: '#777', fontSize: 14, textAlign: 'center', marginTop: 30, lineHeight: 1.6 }}>
                Salut 👋 Je suis ton assistant Ecrira.<br />
                Choisis une action ci-dessus ou écris-moi directement.
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
                <div style={{ maxWidth: '85%' }}>
                  <div style={{
                    padding: '10px 13px', borderRadius: 14, fontSize: 14, lineHeight: 1.55, whiteSpace: 'pre-wrap',
                    background: m.role === 'user' ? INDIGO : '#fff',
                    color: m.role === 'user' ? '#fff' : '#222',
                    border: m.role === 'user' ? 'none' : '1px solid #eee',
                    borderBottomRightRadius: m.role === 'user' ? 4 : 14,
                    borderBottomLeftRadius: m.role === 'user' ? 14 : 4,
                  }}>
                    {m.content}
                  </div>
                  {m.postSuggestion && (
                    <button onClick={() => applyPost(m.postSuggestion!, i)}
                      style={{
                        marginTop: 6, fontSize: 13, fontWeight: 700, padding: '7px 14px', borderRadius: 8,
                        border: 'none', background: INDIGO, color: '#fff', cursor: 'pointer',
                      }}>
                      {onApplyPost
                        ? '→ Appliquer au post'
                        : copied === i ? '✓ Copié' : '⧉ Copier le post'}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}>
                <div style={{ padding: '10px 14px', borderRadius: 14, background: '#fff', border: '1px solid #eee', color: '#999', fontSize: 14 }}>
                  <span className="ecrira-dots">L'assistant réfléchit…</span>
                </div>
              </div>
            )}

            {proBlocked && (
              <div style={{ background: '#fff', border: `1.5px solid ${INDIGO}`, borderRadius: 14, padding: 18, textAlign: 'center', marginTop: 10 }}>
                <div style={{ fontSize: 30, marginBottom: 6 }}>🔒</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: INDIGO, marginBottom: 6 }}>Réservé au plan Pro</div>
                <div style={{ fontSize: 13.5, color: '#555', lineHeight: 1.55, marginBottom: 14 }}>
                  L'assistant Ecrira fait partie du plan Pro. Débloque ton copilote LinkedIn pour écrire 10× plus vite.
                </div>
                <a href="/app?upgrade=1" style={{
                  display: 'inline-block', background: INDIGO, color: '#fff', fontWeight: 700,
                  fontSize: 14, padding: '10px 22px', borderRadius: 8, textDecoration: 'none',
                }}>
                  Passer au plan Pro
                </a>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="eca-input">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }}
              placeholder="Écris à ton assistant…"
              rows={1}
              enterKeyHint="send"
            />
            <button onClick={() => send(input)} disabled={loading || !input.trim()}
              style={{
                background: input.trim() && !loading ? INDIGO : '#C7CFE8', color: '#fff', border: 'none',
                borderRadius: 10, padding: '0 16px', minWidth: 48, fontWeight: 700, fontSize: 15,
                cursor: input.trim() && !loading ? 'pointer' : 'default',
              }}>
              →
            </button>
          </div>
        </div>
      )}
    </>
  )
}
