import Head from 'next/head'
import { useEffect } from 'react'
import { useRouter } from 'next/router'
export default function Success() {
  const router = useRouter()
  useEffect(() => { const t = setTimeout(() => router.push('/app'), 5000); return () => clearTimeout(t) }, [router])
  return (
    <>
      <Head><title>Abonnement activé — Ecrira</title></Head>
      <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#FAF9F7',fontFamily:"'Inter',sans-serif"}}>
        <div style={{textAlign:'center',maxWidth:440,padding:'40px 24px'}}>
          <div style={{width:64,height:64,borderRadius:'50%',background:'rgba(61,82,160,0.1)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px',fontSize:28}}>✓</div>
          <h1 style={{fontSize:22,fontWeight:600,color:'#1F2421',marginBottom:12}}>Bienvenue dans le plan Pro ! 🎉</h1>
          <p style={{fontSize:14,color:'#6B7069',lineHeight:1.6,marginBottom:8}}>Votre abonnement est actif. Posts illimités, visuels et calendrier débloqués.</p>
          <p style={{fontSize:12,color:'#9EA39C',marginBottom:28}}>Redirection dans 5 secondes…</p>
          <a href="/" style={{display:'inline-block',background:'#3D52A0',color:'white',padding:'12px 28px',borderRadius:12,textDecoration:'none',fontSize:14,fontWeight:500}}>Commencer →</a>
        </div>
      </div>
    </>
  )
}
