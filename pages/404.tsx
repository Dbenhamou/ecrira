import Head from 'next/head'
import { useRouter } from 'next/router'
export default function NotFound() {
  const router = useRouter()
  return (
    <>
      <Head><title>Page introuvable — Ecrira</title></Head>
      <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#FAF9F7',fontFamily:"'Inter',system-ui,sans-serif"}}>
        <div style={{textAlign:'center',maxWidth:420,padding:'40px 24px'}}>
          <div style={{fontFamily:"'Clash Display',sans-serif",fontSize:72,fontWeight:700,color:'#3D52A0',lineHeight:1,marginBottom:16}}>404</div>
          <h1 style={{fontSize:20,fontWeight:600,color:'#1F2421',marginBottom:10}}>Page introuvable</h1>
          <p style={{fontSize:14,color:'#6B7069',lineHeight:1.6,marginBottom:28}}>La page que vous cherchez n'existe pas ou a été déplacée.</p>
          <div style={{display:'flex',gap:10,justifyContent:'center'}}>
            <button onClick={()=>router.back()} style={{padding:'10px 20px',borderRadius:10,border:'1px solid #E3DED7',background:'transparent',color:'#3D52A0',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>← Retour</button>
            <a href="/" style={{padding:'10px 20px',borderRadius:10,background:'#3D52A0',color:'white',fontSize:13,textDecoration:'none',fontWeight:500}}>Accueil →</a>
          </div>
        </div>
      </div>
    </>
  )
}
