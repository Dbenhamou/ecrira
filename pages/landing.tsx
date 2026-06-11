import Head from 'next/head'
import { useRouter } from 'next/router'

export default function Landing() {
  const router = useRouter()
  return (
    <>
      <Head>
        <title>Ecrira — Générateur de posts LinkedIn par IA</title>
        <meta name="description" content="Générez des posts LinkedIn percutants en 30 secondes. Idées du jour, visuels 1080px, calendrier éditorial, publication directe." />
        <meta property="og:title" content="Ecrira — Générateur de posts LinkedIn par IA" />
        <meta property="og:description" content="Votre expertise mérite d'être vue. Ecrira la met en mots en 30 secondes." />
        <meta property="og:image" content="https://ecrira.com/og-image.png" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <script defer data-domain="ecrira.com" src="https://plausible.io/js/pa-JoffvncprLIz4FmqjAnDr.js"></script>
      </Head>
      <div style={{fontFamily:"'Inter',system-ui,sans-serif",background:'#FAF9F7',minHeight:'100vh'}}>
        {/* Header */}
        <div style={{position:'sticky',top:0,zIndex:100,background:'rgba(250,249,247,0.95)',backdropFilter:'blur(8px)',borderBottom:'1px solid #E3DED7',padding:'14px 24px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <img src="/logo-ecrira.png" alt="Ecrira" style={{height:24,width:'auto'}} />
          <div style={{display:'flex',gap:10}}>
            <button onClick={()=>router.push('/login')} style={{padding:'7px 16px',borderRadius:8,border:'1px solid rgba(81,103,86,0.3)',background:'transparent',color:'#516756',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>Se connecter</button>
            <button onClick={()=>router.push('/login')} style={{padding:'7px 16px',borderRadius:8,background:'#516756',color:'white',border:'none',fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:'inherit'}}>Essai gratuit 7 jours →</button>
          </div>
        </div>
        {/* Hero */}
        <div style={{maxWidth:760,margin:'0 auto',padding:'80px 24px 60px',textAlign:'center'}}>
          <div style={{display:'inline-block',background:'rgba(81,103,86,0.08)',color:'#516756',fontSize:12,fontWeight:600,padding:'5px 14px',borderRadius:20,marginBottom:20,letterSpacing:'0.05em'}}>✦ 7 JOURS GRATUITS · SANS CB</div>
          <h1 style={{fontFamily:"'Clash Display',sans-serif",fontSize:'clamp(36px,6vw,64px)',fontWeight:700,color:'#1F2421',lineHeight:1.15,marginBottom:20}}>Votre expertise mérite<br/>d'être vue.</h1>
          <p style={{fontSize:18,color:'#6B7069',lineHeight:1.7,maxWidth:520,margin:'0 auto 36px'}}>Ecrira génère vos posts LinkedIn en 30 secondes — personnalisés pour votre secteur, dans votre style.</p>
          <button onClick={()=>router.push('/login')} style={{padding:'16px 36px',borderRadius:14,background:'#516756',color:'white',border:'none',fontSize:16,fontWeight:600,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 4px 20px rgba(81,103,86,0.3)'}}>Commencer gratuitement →</button>
          <p style={{fontSize:12,color:'#9EA39C',marginTop:12}}>Sans carte bancaire · Sans engagement</p>
        </div>
        {/* Features */}
        <div style={{maxWidth:960,margin:'0 auto',padding:'0 24px 80px',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:20}}>
          {[
            {icon:'💡',title:'10 idées par jour',desc:"Générées selon votre secteur et l'actualité du moment."},
            {icon:'⚡',title:'Post en 30 secondes',desc:'Générez, éditez et publiez directement sur LinkedIn.'},
            {icon:'🖼',title:'Visuels 1080px',desc:'Créez des images professionnelles pour chaque post.'},
            {icon:'📅',title:'Calendrier éditorial',desc:'Planifiez et publiez automatiquement.'},
          ].map((f,i)=>(
            <div key={i} style={{background:'white',borderRadius:16,padding:'24px',border:'1px solid #E3DED7'}}>
              <div style={{fontSize:28,marginBottom:12}}>{f.icon}</div>
              <div style={{fontWeight:600,color:'#1F2421',marginBottom:6,fontSize:15}}>{f.title}</div>
              <div style={{fontSize:13,color:'#6B7069',lineHeight:1.6}}>{f.desc}</div>
            </div>
          ))}
        </div>
        {/* CTA */}
        <div style={{background:'#516756',padding:'60px 24px',textAlign:'center'}}>
          <h2 style={{fontFamily:"'Clash Display',sans-serif",fontSize:32,fontWeight:700,color:'white',marginBottom:12}}>Prêt à booster votre présence LinkedIn ?</h2>
          <p style={{fontSize:16,color:'rgba(255,255,255,0.8)',marginBottom:28}}>7 jours Pro gratuits — aucune carte bancaire requise.</p>
          <button onClick={()=>router.push('/login')} style={{padding:'14px 32px',borderRadius:12,background:'white',color:'#516756',border:'none',fontSize:15,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Commencer maintenant →</button>
        </div>
        {/* Footer */}
        <div style={{background:'#1F2421',padding:'32px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:16}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <img src="/logo-ecrira-icon.png" alt="Ecrira" style={{height:28,filter:'brightness(0) invert(1)'}} />
            <span style={{fontSize:12,color:'rgba(255,255,255,0.4)'}}>© 2026 Ecrira</span>
          </div>
          <div style={{display:'flex',gap:20}}>
            <a href="/pricing" style={{fontSize:12,color:'rgba(255,255,255,0.5)',textDecoration:'none'}}>Tarifs</a>
            <a href="/cgu" style={{fontSize:12,color:'rgba(255,255,255,0.5)',textDecoration:'none'}}>CGU</a>
            <a href="/mentions-legales" style={{fontSize:12,color:'rgba(255,255,255,0.5)',textDecoration:'none'}}>Mentions légales</a>
            <a href="https://www.linkedin.com/company/ecrira/" target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:'rgba(255,255,255,0.5)',textDecoration:'none'}}>LinkedIn</a>
          </div>
        </div>
      </div>
    </>
  )
}
