import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    // Redirect if already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/')
    })
    // Listen for OAuth callback
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) router.replace('/')
    })
    return () => subscription.unsubscribe()
  }, [router])

  const handleGoogle = async () => {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    })
    if (error) { setError(error.message); setLoading(false) }
  }

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) { setError('Email et mot de passe requis.'); return }
    setLoading(true)
    setError('')
    setMessage('')

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message); setLoading(false) }
      // redirect handled by onAuthStateChange
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) { setError(error.message) }
      else { setMessage('Compte créé. Vérifie ton email pour confirmer.') }
      setLoading(false)
    }
  }

  return (
    <>
      <Head><title>Ecrira · Connexion</title></Head>
      <div style={{
        minHeight: '100vh',
        background: '#F8F6F2',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', system-ui, sans-serif",
        padding: '24px',
      }}>
        <div style={{
          background: 'white',
          border: '1px solid #E5DFD5',
          borderRadius: 20,
          padding: '40px 36px',
          width: '100%',
          maxWidth: 400,
          boxShadow: '0 10px 40px rgba(0,0,0,0.05)',
        }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
            <div style={{
              width: 34, height: 34,
              background: '#4F6754',
              borderRadius: 9,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M6 4h8a4 4 0 0 1 0 8H6V4Z" fill="white" opacity=".9"/>
                <path d="M6 12h5l4 8H6v-8Z" fill="white" opacity=".5"/>
              </svg>
            </div>
            <span style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 16, fontWeight: 600,
              letterSpacing: '0.06em', color: '#232323',
            }}>ECRIRA</span>
          </div>

          <div style={{ marginBottom: 24 }}>
            <h1 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 22, fontWeight: 500,
              color: '#232323', marginBottom: 6,
            }}>
              {mode === 'login' ? 'Connexion' : 'Créer un compte'}
            </h1>
            <p style={{ fontSize: 13, color: '#727272', lineHeight: 1.5 }}>
              {mode === 'login'
                ? 'Accède à ton espace Ecrira.'
                : 'Rejoins Ecrira pour créer tes posts LinkedIn.'}
            </p>
          </div>

          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            style={{
              width: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              padding: '10px 16px',
              background: 'white',
              border: '1px solid #E5DFD5',
              borderRadius: 11,
              fontSize: 13, fontWeight: 500,
              color: '#232323',
              cursor: 'pointer',
              marginBottom: 18,
              transition: 'border-color 0.2s',
              opacity: loading ? 0.5 : 1,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84Z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z" fill="#EA4335"/>
            </svg>
            Continuer avec Google
          </button>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            marginBottom: 18, color: '#A8A49C', fontSize: 11,
          }}>
            <div style={{ flex: 1, height: 1, background: '#E5DFD5' }}/>
            <span>ou par email</span>
            <div style={{ flex: 1, height: 1, background: '#E5DFD5' }}/>
          </div>

          {/* Email */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#727272', marginBottom: 5 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="david@cyna.fr"
              style={{
                width: '100%',
                background: '#F8F6F2',
                border: '1px solid #E5DFD5',
                borderRadius: 9,
                padding: '9px 13px',
                fontSize: 13, color: '#232323',
                fontFamily: "'Inter', sans-serif",
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onKeyDown={e => e.key === 'Enter' && handleEmailAuth()}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#727272', marginBottom: 5 }}>
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                background: '#F8F6F2',
                border: '1px solid #E5DFD5',
                borderRadius: 9,
                padding: '9px 13px',
                fontSize: 13, color: '#232323',
                fontFamily: "'Inter', sans-serif",
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onKeyDown={e => e.key === 'Enter' && handleEmailAuth()}
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(192,57,43,0.07)',
              border: '1px solid rgba(192,57,43,0.2)',
              borderRadius: 9, padding: '9px 13px',
              fontSize: 12, color: '#c0392b',
              marginBottom: 14,
            }}>{error}</div>
          )}

          {message && (
            <div style={{
              background: 'rgba(79,103,84,0.07)',
              border: '1px solid rgba(79,103,84,0.2)',
              borderRadius: 9, padding: '9px 13px',
              fontSize: 12, color: '#4F6754',
              marginBottom: 14,
            }}>{message}</div>
          )}

          <button
            onClick={handleEmailAuth}
            disabled={loading}
            style={{
              width: '100%',
              background: '#4F6754', color: 'white',
              border: 'none',
              borderRadius: 11,
              padding: '10px 18px',
              fontSize: 13, fontWeight: 500,
              cursor: 'pointer',
              opacity: loading ? 0.5 : 1,
              marginBottom: 16,
              fontFamily: "'Inter', sans-serif",
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {loading && (
              <span style={{
                width: 13, height: 13,
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: 'white',
                borderRadius: '50%',
                display: 'inline-block',
                animation: 'spin 0.7s linear infinite',
              }}/>
            )}
            {mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
          </button>

          <p style={{ textAlign: 'center', fontSize: 12, color: '#A8A49C' }}>
            {mode === 'login' ? "Pas encore de compte ? " : "Déjà un compte ? "}
            <span
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMessage('') }}
              style={{ color: '#4F6754', cursor: 'pointer', fontWeight: 500 }}
            >
              {mode === 'login' ? "S'inscrire" : 'Se connecter'}
            </span>
          </p>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}
