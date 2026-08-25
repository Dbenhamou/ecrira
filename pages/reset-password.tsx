import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import { frAuthError } from '../lib/authErrors'

export default function ResetPassword() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { if (session) setReady(true) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  const submit = async () => {
    if (password.length < 6) { setError('Le mot de passe doit contenir au moins 6 caractères.'); return }
    if (password !== confirm) { setError('Les deux mots de passe ne correspondent pas.'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(frAuthError(error.message)); setLoading(false); return }
    setDone(true)
    setTimeout(() => router.replace('/app'), 1600)
  }

  return (
    <>
      <Head><title>Réinitialiser le mot de passe — Ecrira</title><link rel="icon" href="/logo-ecrira-icon-bleu.png" type="image/png"/></Head>
      <div style={{minHeight:'100vh',background:'#FAF9F7',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Inter', system-ui, sans-serif",padding:24}}>
        <div style={{background:'white',border:'1px solid #E3DED7',borderRadius:20,padding:'40px 36px',width:'100%',maxWidth:400,boxShadow:'0 10px 40px rgba(0,0,0,0.05)'}}>
          <div style={{display:'flex',justifyContent:'center',marginBottom:28}}>
            <img src="/logo-ecrira-horizontal-400.png" alt="Ecrira" style={{height:80,width:'auto'}}/>
          </div>
          {done ? (
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:34,color:'#3D52A0',marginBottom:10}}>✓</div>
              <h1 style={{fontFamily:"'Clash Display','Inter',sans-serif",fontSize:20,fontWeight:500,color:'#1F2421',marginBottom:8}}>Mot de passe mis à jour</h1>
              <p style={{fontSize:13,color:'#6B7069'}}>Redirection vers votre espace…</p>
            </div>
          ) : (
            <>
              <h1 style={{fontFamily:"'Clash Display','Inter',sans-serif",fontSize:22,fontWeight:500,color:'#1F2421',marginBottom:6}}>Nouveau mot de passe</h1>
              <p style={{fontSize:13,color:'#6B7069',lineHeight:1.5,marginBottom:22}}>{ready ? 'Choisissez un nouveau mot de passe pour votre compte.' : 'Ouvrez cette page depuis le lien reçu par email pour réinitialiser votre mot de passe.'}</p>
              <div style={{position:'relative',marginBottom:12}}>
                <input type={show?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Nouveau mot de passe" disabled={!ready} style={{width:'100%',background:'#FAF9F7',border:'1px solid #E3DED7',borderRadius:9,padding:'10px 66px 10px 13px',fontSize:13,color:'#1F2421',fontFamily:"'Inter',sans-serif",outline:'none',boxSizing:'border-box'}}/>
                <button type="button" onClick={()=>setShow(v=>!v)} style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',padding:6,color:'#3D52A0',fontSize:11}}>{show?'Masquer':'Afficher'}</button>
              </div>
              <input type={show?'text':'password'} value={confirm} onChange={e=>setConfirm(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()} placeholder="Confirmer le mot de passe" disabled={!ready} style={{width:'100%',background:'#FAF9F7',border:'1px solid #E3DED7',borderRadius:9,padding:'10px 13px',fontSize:13,color:'#1F2421',fontFamily:"'Inter',sans-serif",outline:'none',boxSizing:'border-box',marginBottom:14}}/>
              {error && <p style={{fontSize:12,color:'#c0392b',marginBottom:12}}>{error}</p>}
              <button onClick={submit} disabled={!ready||loading} style={{width:'100%',padding:12,borderRadius:10,background:'#3D52A0',border:'none',color:'white',fontSize:14,fontWeight:600,cursor:ready?'pointer':'not-allowed',fontFamily:"'Inter',sans-serif",opacity:(!ready||loading)?0.6:1}}>{loading?'Mise à jour…':'Mettre à jour'}</button>
              <p style={{textAlign:'center',marginTop:16,fontSize:12,color:'#9EA39C'}}><a href="/login" style={{color:'#3D52A0',textDecoration:'none'}}>Retour à la connexion</a></p>
            </>
          )}
        </div>
      </div>
    </>
  )
}
