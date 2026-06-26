import Head from 'next/head'
export default function MentionsLegales() {
  return (
    <>
      <Head><title>Mentions Légales — Ecrira</title></Head>
      <div style={{maxWidth:720,margin:'0 auto',padding:'60px 24px',fontFamily:"'Inter',system-ui,sans-serif",color:'#1F2421',lineHeight:1.7}}>
        <a href="/" style={{fontSize:13,color:'#3D52A0',textDecoration:'none',marginBottom:32,display:'block'}}>← Retour</a>
        <h1 style={{fontSize:28,fontWeight:700,marginBottom:8}}>Mentions Légales</h1>
        <h2 style={{fontSize:18,fontWeight:600,marginTop:32,marginBottom:8}}>Éditeur</h2>
        <p>David Benhamou — <a href="mailto:contact@ecrira.com" style={{color:'#3D52A0'}}>contact@ecrira.com</a></p>
        <h2 style={{fontSize:18,fontWeight:600,marginTop:32,marginBottom:8}}>Hébergement</h2>
        <p>Vercel Inc. — 340 Pine Street, San Francisco, CA 94104</p>
        <h2 style={{fontSize:18,fontWeight:600,marginTop:32,marginBottom:8}}>Base de données</h2>
        <p>Supabase — région UE (Francfort)</p>
        <h2 style={{fontSize:18,fontWeight:600,marginTop:32,marginBottom:8}}>RGPD</h2>
        <p>Demandes : <a href="mailto:contact@ecrira.com" style={{color:'#3D52A0'}}>contact@ecrira.com</a></p>
      </div>
    </>
  )
}
