import Head from 'next/head'
export default function CGU() {
  return (
    <>
      <Head><title>CGU — Ecrira</title></Head>
      <div style={{maxWidth:720,margin:'0 auto',padding:'60px 24px',fontFamily:"'Inter',system-ui,sans-serif",color:'#1F2421',lineHeight:1.7}}>
        <a href="/" style={{fontSize:13,color:'#3D52A0',textDecoration:'none',marginBottom:32,display:'block'}}>← Retour</a>
        <h1 style={{fontSize:28,fontWeight:700,marginBottom:8}}>Conditions Générales d'Utilisation</h1>
        <p style={{fontSize:13,color:'#6B7069',marginBottom:40}}>Dernière mise à jour : juin 2026</p>
        <h2 style={{fontSize:18,fontWeight:600,marginTop:32,marginBottom:8}}>1. Objet</h2>
        <p>Les présentes CGU régissent l'accès et l'utilisation du service Ecrira, accessible à ecrira.com.</p>
        <h2 style={{fontSize:18,fontWeight:600,marginTop:32,marginBottom:8}}>2. Plans tarifaires</h2>
        <p>Plan gratuit limité à 5 posts à vie. Plan Pro à 19,90€/mois sans engagement, résiliable à tout moment. Paiement traité par Stripe.</p>
        <h2 style={{fontSize:18,fontWeight:600,marginTop:32,marginBottom:8}}>3. Propriété intellectuelle</h2>
        <p>Les contenus générés appartiennent à l'utilisateur. Ecrira ne revendique aucun droit sur les posts générés.</p>
        <h2 style={{fontSize:18,fontWeight:600,marginTop:32,marginBottom:8}}>4. Données personnelles</h2>
        <p>Données stockées sur Supabase (UE). Non revendues. Droits RGPD : <a href="mailto:contact@ecrira.com" style={{color:'#3D52A0'}}>contact@ecrira.com</a></p>
        <h2 style={{fontSize:18,fontWeight:600,marginTop:32,marginBottom:8}}>5. Contact</h2>
        <p><a href="mailto:contact@ecrira.com" style={{color:'#3D52A0'}}>contact@ecrira.com</a></p>
      </div>
    </>
  )
}
