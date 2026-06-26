import Head from 'next/head'
export default function Unsubscribe() {
  return (
    <>
      <Head><title>Désabonnement — Ecrira</title></Head>
      <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#FAF9F7',fontFamily:"'Inter',sans-serif"}}>
        <div style={{textAlign:'center',maxWidth:400,padding:'40px 24px'}}>
          <div style={{fontSize:32,marginBottom:16}}>✓</div>
          <h1 style={{fontSize:20,fontWeight:600,color:'#1F2421',marginBottom:12}}>Désabonnement pris en compte</h1>
          <p style={{fontSize:14,color:'#6B7069',lineHeight:1.6,marginBottom:24}}>Vous ne recevrez plus d'emails de notification d'Ecrira.</p>
          <a href="/" style={{display:'inline-block',background:'#3D52A0',color:'white',padding:'10px 20px',borderRadius:10,textDecoration:'none',fontSize:13,fontWeight:500}}>Retour à Ecrira</a>
        </div>
      </div>
    </>
  )
}
