import Head from 'next/head'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Landing() {
  const router = useRouter()
  const [activePage, setActivePage] = useState<'apercu'|'idees'|'rediger'|'calendrier'|'profil'>('apercu')
  const [showTooltip, setShowTooltip] = useState(false)
  const [email, setEmail] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [topic, setTopic] = useState('')
  const [demoPost, setDemoPost] = useState('')
  const [generating, setGenerating] = useState(false)
  const [emailError, setEmailError] = useState(false)

  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authMode, setAuthMode] = useState<'login'|'signup'>('login')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/app')
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) router.replace('/app')
    })
    return () => subscription.unsubscribe()
  }, [router])

  const handleGoogle = async () => {
    setAuthLoading(true)
    setAuthError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/app` },
    })
    if (error) { setAuthError(error.message); setAuthLoading(false) }
  }

  const handleEmailAuth = async () => {
    if (!authEmail.trim() || !authPassword.trim()) { setAuthError('Email et mot de passe requis.'); return }
    setAuthLoading(true)
    setAuthError('')
    try {
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword })
        if (error) setAuthError(error.message)
      } else {
        const { error } = await supabase.auth.signUp({ email: authEmail, password: authPassword, options: { emailRedirectTo: `${window.location.origin}/app` } })
        if (error) setAuthError(error.message)
        else setAuthError('Vérifiez votre email pour confirmer votre compte.')
      }
    } catch { setAuthError('Erreur inattendue.') }
    setAuthLoading(false)
  }

  const navItems: {id: 'apercu'|'idees'|'rediger'|'calendrier'|'profil', label: string}[] = [
    {id:'apercu', label:'Aperçu'},
    {id:'idees', label:'Idées du jour'},
    {id:'rediger', label:'Rédiger'},
    {id:'calendrier', label:'Calendrier'},
    {id:'profil', label:'Mon profil'},
  ]

  const handleNav = (id: typeof activePage) => {
    setActivePage(id)
    setShowTooltip(true)
    setTimeout(() => setShowTooltip(false), 2000)
  }

  const handleEmail = () => {
    if (!email.trim() || !email.includes('@')) { setEmailError(true); return }
    setEmailError(false)
    setEmailSent(true)
  }

  const handleGenerate = async () => {
    if (!topic.trim()) return
    setGenerating(true)
    setDemoPost('')
    try {
      const res = await fetch('/api/demo', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ email, topic }) })
      const data = await res.json()
      if (data.post) setDemoPost(data.post)
      else setDemoPost('Une erreur est survenue. Réessayez.')
    } catch {
      setDemoPost('Une erreur est survenue. Réessayez.')
    }
    setGenerating(false)
  }

  const cardStyle = { background: 'white', borderRadius: 12, border: '1px solid #E3DED7', padding: '14px' }

  return (
    <>
      <Head>
        <title>Ecrira — Publiez sur LinkedIn en 30 secondes</title>
        <meta name="description" content="Ecrira génère vos posts LinkedIn en 30 secondes, personnalisés pour votre secteur et dans votre style. Idées du jour, visuels professionnels, calendrier éditorial, publication directe." />
        <meta property="og:title" content="Ecrira — Publiez sur LinkedIn en 30 secondes" />
        <meta property="og:description" content="Votre expertise mérite d'être vue. Ecrira la met en mots en 30 secondes." />
        <meta property="og:image" content="https://ecrira.com/og-image.png" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="icon" href="/logo-ecrira-icon.png" type="image/png"/>
        <link rel="apple-touch-icon" href="/logo-ecrira-icon.png"/>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet"/>
        <script defer data-domain="ecrira.com" src="https://plausible.io/js/pa-JoffvncprLIz4FmqjAnDr.js"></script>
      </Head>

      <div style={{fontFamily:"'Inter',system-ui,sans-serif", background:'#FAF9F7', minHeight:'100vh', overflowX:'hidden'}}>

        {/* NAV */}
        <div style={{position:'sticky',top:0,zIndex:100,background:'rgba(250,249,247,0.95)',backdropFilter:'blur(8px)',borderBottom:'1px solid #E3DED7',padding:'14px 32px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <img src="/logo-ecrira.png" alt="Ecrira" style={{height:46,width:'auto'}}/>
          <div style={{display:'flex',gap:10}}>
            <button onClick={()=>setShowAuthModal(true)} style={{padding:'7px 16px',borderRadius:8,border:'1px solid rgba(81,103,86,0.3)',background:'transparent',color:'#516756',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>Se connecter</button>
            <button onClick={()=>setShowAuthModal(true)} style={{padding:'7px 16px',borderRadius:8,background:'#516756',border:'none',fontSize:13,color:'white',cursor:'pointer',fontWeight:500,fontFamily:'inherit'}}>Essai gratuit 7 jours →</button>
          </div>
        </div>

        {/* HERO */}
        <div style={{padding:'80px 32px 64px',textAlign:'center',background:'#FAF9F7'}}>
          <div style={{display:'inline-block',background:'rgba(81,103,86,0.08)',color:'#516756',fontSize:11,fontWeight:600,padding:'4px 14px',borderRadius:20,letterSpacing:'0.07em',marginBottom:20}}>✦ 7 JOURS GRATUITS · SANS CB</div>
          <h1 style={{fontFamily:"'Inter',sans-serif",fontSize:'clamp(36px,5vw,52px)',fontWeight:700,color:'#1F2421',lineHeight:1.1,marginBottom:18,letterSpacing:'-1.5px'}}>
            Votre expertise mérite<br/>d&apos;être <span style={{color:'#516756'}}>vue.</span>
          </h1>
          <p style={{fontSize:16,color:'#6B7069',lineHeight:1.7,maxWidth:500,margin:'0 auto 36px'}}>Ecrira génère vos posts LinkedIn en 30 secondes — personnalisés pour votre secteur, dans votre style.</p>
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:12,marginBottom:10}}>
            <button onClick={()=>setShowAuthModal(true)} style={{padding:'14px 32px',borderRadius:12,background:'#516756',border:'none',fontSize:15,color:'white',fontWeight:600,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 4px 16px rgba(81,103,86,0.25)'}}>Commencer gratuitement →</button>
            <button onClick={()=>document.getElementById('demo-section')?.scrollIntoView({behavior:'smooth'})} style={{padding:'14px 20px',borderRadius:12,border:'1px solid #E3DED7',background:'transparent',fontSize:15,color:'#1F2421',cursor:'pointer',fontFamily:'inherit'}}>Voir la démo ↓</button>
          </div>
          <p style={{fontSize:12,color:'#9EA39C'}}>Sans carte bancaire · Sans engagement</p>
        </div>

        {/* APP MOCKUP */}
        <div style={{padding:'0 0 72px',maxWidth:960,margin:'0 auto'}}>
          <div style={{textAlign:'center',fontSize:11,fontWeight:600,color:'#B7C0B8',letterSpacing:'0.1em',marginBottom:16}}>APERÇU DE LA PLATEFORME — CLIQUEZ POUR NAVIGUER</div>
          <div style={{overflowX:'auto',padding:'0 24px',WebkitOverflowScrolling:'touch' as any}}><div style={{borderRadius:16,border:'1px solid #E3DED7',overflow:'hidden',boxShadow:'0 20px 60px rgba(31,36,33,0.1)',display:'flex',height:520,minWidth:680}}>
            <div style={{width:160,minWidth:120,background:'#1F2421',display:'flex',flexDirection:'column',flexShrink:0}}>
              <div style={{padding:'18px 16px 14px',borderBottom:'1px solid rgba(255,255,255,0.06)',display:'flex',alignItems:'center',gap:8}}>
                <img src="/logo-ecrira-icon.png" alt="Ecrira" style={{width:28,height:28,borderRadius:7}}/>
                <span style={{fontSize:14,fontWeight:600,color:'white',letterSpacing:'-0.2px'}}>Ecrira</span>
              </div>
              <div style={{padding:'12px 8px',flex:1}}>
                {navItems.map(item => (
                  <div key={item.id} onClick={()=>handleNav(item.id)} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',borderRadius:8,marginBottom:2,fontSize:12,color:activePage===item.id?'white':'rgba(255,255,255,0.45)',background:activePage===item.id?'rgba(81,103,86,0.3)':'transparent',cursor:'pointer',transition:'all 0.15s'}}>
                    <div style={{width:6,height:6,borderRadius:'50%',background:activePage===item.id?'#516756':'rgba(255,255,255,0.2)',flexShrink:0}}/>
                    {item.label}
                  </div>
                ))}
              </div>
              <div style={{padding:'12px',borderTop:'1px solid rgba(255,255,255,0.06)'}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <div style={{width:28,height:28,borderRadius:'50%',background:'#516756',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:11,fontWeight:700,flexShrink:0}}>AB</div>
                  <div style={{fontSize:11,color:'rgba(255,255,255,0.5)',lineHeight:1.4}}>Antoine B.<br/>Plan Pro</div>
                </div>
              </div>
            </div>

            <div style={{flex:1,background:'#FAF9F7',overflow:'hidden',padding:24,position:'relative'}}>
              {showTooltip && <div style={{position:'absolute',bottom:12,left:'50%',transform:'translateX(-50%)',background:'#1F2421',color:'white',fontSize:11,padding:'6px 14px',borderRadius:20,whiteSpace:'nowrap',zIndex:10}}>Navigation uniquement — créez un compte pour agir</div>}

              {activePage === 'apercu' && (
                <div>
                  <div style={{fontSize:10,fontWeight:600,color:'#B7C0B8',letterSpacing:'0.08em',marginBottom:4}}>TABLEAU DE BORD</div>
                  <div style={{fontSize:22,fontWeight:700,color:'#1F2421',letterSpacing:'-0.5px'}}>Bonjour, Antoine.</div>
                  <div style={{width:32,height:2,background:'#D9C8A3',margin:'10px 0 16px'}}/>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
                    {[['Posts sauvegardés','18','dans la bibliothèque'],['Posts générés','41','ce mois'],['Secteur actif','Growth','Scale-up SaaS']].map(([l,v,n],i)=>(
                      <div key={i} style={{background:'white',borderRadius:10,border:'1px solid #E3DED7',padding:12}}>
                        <div style={{fontSize:10,color:'#9EA39C',marginBottom:4}}>{l}</div>
                        <div style={{fontSize:i===2?14:20,fontWeight:700,color:'#1F2421',paddingTop:i===2?4:0}}>{v}</div>
                        <div style={{fontSize:10,color:'#B7C0B8',marginTop:2}}>{n}</div>
                      </div>
                    ))}
                  </div>
                  <div style={cardStyle}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                      <span style={{fontSize:10,fontWeight:600,color:'#9EA39C',letterSpacing:'0.07em'}}>IDÉES DU JOUR</span>
                      <button style={{padding:'5px 12px',background:'#516756',border:'none',borderRadius:6,color:'white',fontSize:11,cursor:'default',fontFamily:'inherit'}}>✦ Générer</button>
                    </div>
                    {[
                      {tag:'LEADERSHIP',title:"Ce que j'ai appris en recrutant mes 10 premiers collaborateurs",hook:"Les erreurs que 90% des managers font en phase de croissance."},
                      {tag:'PRODUCTIVITÉ',title:"La règle des 3 tâches qui a changé ma façon de travailler",hook:"Arrêtez les to-do lists infinies. Voici ce qui fonctionne vraiment."}
                    ].map((idea,i)=>(
                      <div key={i} style={{borderRadius:8,border:'1px solid #E3DED7',padding:'10px 12px',marginBottom:i===0?8:0}}>
                        <span style={{display:'inline-block',background:'rgba(81,103,86,0.08)',color:'#516756',fontSize:9,fontWeight:600,padding:'2px 8px',borderRadius:10,marginBottom:6,letterSpacing:'0.05em'}}>{idea.tag}</span>
                        <div style={{fontSize:12,fontWeight:600,color:'#1F2421',marginBottom:3,lineHeight:1.4}}>{idea.title}</div>
                        <div style={{fontSize:11,color:'#6B7069',lineHeight:1.5}}>{idea.hook}</div>
                        <div style={{display:'flex',gap:6,marginTop:8}}>
                          <button style={{padding:'3px 10px',background:'#516756',border:'none',borderRadius:6,color:'white',fontSize:10,cursor:'default',fontFamily:'inherit'}}>Développer</button>
                          <button style={{padding:'3px 10px',border:'1px solid #E3DED7',background:'transparent',borderRadius:6,color:'#6B7069',fontSize:10,cursor:'default',fontFamily:'inherit'}}>Copier</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activePage === 'idees' && (
                <div>
                  <div style={{fontSize:10,fontWeight:600,color:'#B7C0B8',letterSpacing:'0.08em',marginBottom:4}}>CONTENU</div>
                  <div style={{fontSize:22,fontWeight:700,color:'#1F2421',letterSpacing:'-0.5px'}}>Idées du jour</div>
                  <div style={{width:32,height:2,background:'#D9C8A3',margin:'10px 0 16px'}}/>
                  <div style={cardStyle}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                      <span style={{fontSize:10,fontWeight:600,color:'#9EA39C',letterSpacing:'0.07em'}}>{"AUJOURD'HUI · 10 IDÉES"}</span>
                      <button style={{padding:'5px 12px',background:'#516756',border:'none',borderRadius:6,color:'white',fontSize:11,cursor:'default',fontFamily:'inherit'}}>✦ Régénérer</button>
                    </div>
                    {[
                      {tag:'ENTREPRENEURIAT',title:"Pourquoi j'ai failli arrêter après 6 mois",hook:"Le moment où tout s'effondre avant de reconstruire."},
                      {tag:'MANAGEMENT',title:"Déléguer ne veut pas dire abandonner",hook:"3 erreurs que font tous les managers en croissance rapide."},
                      {tag:'TENDANCE',title:"Le retour du bureau tue la culture d'entreprise",hook:"Ce que les données disent vraiment sur le télétravail."},
                    ].map((idea,i)=>(
                      <div key={i} style={{borderRadius:8,border:'1px solid #E3DED7',padding:'10px 12px',marginBottom:i<2?8:0}}>
                        <span style={{display:'inline-block',background:'rgba(81,103,86,0.08)',color:'#516756',fontSize:9,fontWeight:600,padding:'2px 8px',borderRadius:10,marginBottom:6,letterSpacing:'0.05em'}}>{idea.tag}</span>
                        <div style={{fontSize:12,fontWeight:600,color:'#1F2421',marginBottom:3,lineHeight:1.4}}>{idea.title}</div>
                        <div style={{fontSize:11,color:'#6B7069',lineHeight:1.5}}>{idea.hook}</div>
                        <div style={{display:'flex',gap:6,marginTop:8}}>
                          <button style={{padding:'3px 10px',background:'#516756',border:'none',borderRadius:6,color:'white',fontSize:10,cursor:'default',fontFamily:'inherit'}}>Développer</button>
                          <button style={{padding:'3px 10px',border:'1px solid #E3DED7',background:'transparent',borderRadius:6,color:'#6B7069',fontSize:10,cursor:'default',fontFamily:'inherit'}}>Copier</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activePage === 'rediger' && (
                <div style={{overflow:'auto',height:'100%'}}>
                  <div style={{fontSize:10,fontWeight:600,color:'#B7C0B8',letterSpacing:'0.08em',marginBottom:4}}>CRÉATION</div>
                  <div style={{fontSize:22,fontWeight:700,color:'#1F2421',letterSpacing:'-0.5px'}}>Rédiger</div>
                  <div style={{width:32,height:2,background:'#D9C8A3',margin:'10px 0 12px'}}/>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                    <div style={cardStyle}>
                      <div style={{fontSize:10,fontWeight:600,color:'#9EA39C',letterSpacing:'0.07em',marginBottom:6}}>SUJET</div>
                      <div style={{padding:'7px 10px',borderRadius:8,border:'1px solid #E3DED7',background:'#FAF9F7',fontSize:11,color:'#1F2421',marginBottom:8}}>Management bienveillant en scale-up</div>
                      <div style={{fontSize:10,fontWeight:600,color:'#9EA39C',letterSpacing:'0.07em',marginBottom:4}}>FORMAT</div>
                      <div style={{display:'flex',gap:4,flexWrap:'wrap' as const,marginBottom:8}}>
                        {['Storytelling','Liste','Conseil'].map((f,i)=>(
                          <span key={i} style={{padding:'2px 8px',borderRadius:20,fontSize:10,border:'1px solid '+(i===0?'rgba(81,103,86,0.3)':'#E3DED7'),background:i===0?'rgba(81,103,86,0.08)':'transparent',color:i===0?'#516756':'#6B7069'}}>{f}</span>
                        ))}
                      </div>
                      <button style={{width:'100%',padding:'7px',background:'#516756',border:'none',borderRadius:8,color:'white',fontSize:11,fontWeight:600,cursor:'default',fontFamily:'inherit',marginBottom:8}}>✦ Générer le post</button>
                      <div style={{borderTop:'1px solid #E3DED7',paddingTop:8,marginTop:2}}>
                        <div style={{fontSize:10,fontWeight:600,color:'#9EA39C',letterSpacing:'0.07em',marginBottom:6}}>VISUEL LINKEDIN</div>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4,marginBottom:6}}>
                          {['Classique','Timeline','Stats','Citation'].map((t,i)=>(
                            <div key={i} style={{padding:'4px 6px',borderRadius:6,border:'1px solid '+(i===0?'rgba(81,103,86,0.3)':'#E3DED7'),background:i===0?'rgba(81,103,86,0.06)':'transparent',fontSize:9,color:i===0?'#516756':'#6B7069',textAlign:'center' as const,cursor:'default'}}>{t}</div>
                          ))}
                        </div>
                        <button style={{width:'100%',padding:'6px',background:'rgba(81,103,86,0.08)',border:'1px solid rgba(81,103,86,0.2)',borderRadius:8,color:'#516756',fontSize:10,fontWeight:600,cursor:'default',fontFamily:'inherit'}}>🖼 Générer le visuel</button>
                      </div>
                    </div>
                    <div>
                      <div style={{...cardStyle,marginBottom:8}}>
                        <div style={{fontSize:10,fontWeight:600,color:'#9EA39C',letterSpacing:'0.07em',marginBottom:6}}>APERÇU POST</div>
                        <div style={{fontSize:10,color:'#1F2421',lineHeight:1.8,whiteSpace:'pre-line' as const}}>{"On parle souvent de bienveillance.\n\nMais rarement de ce que ça implique.\n\nEn 3 ans, 2 erreurs majeures :\nConfondre bienveillance et laxisme.\nÉviter les conversations difficiles.\n\nLa vraie bienveillance ?\nDire la vérité avec respect."}</div>
                      </div>

                    </div>
                  </div>
                </div>
              )}

              {activePage === 'calendrier' && (
                <div>
                  <div style={{fontSize:10,fontWeight:600,color:'#B7C0B8',letterSpacing:'0.08em',marginBottom:4}}>PLANIFICATION</div>
                  <div style={{fontSize:22,fontWeight:700,color:'#1F2421',letterSpacing:'-0.5px'}}>Calendrier</div>
                  <div style={{width:32,height:2,background:'#D9C8A3',margin:'10px 0 12px'}}/>
                  <div style={cardStyle}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                      <div style={{fontSize:10,fontWeight:600,color:'#9EA39C',letterSpacing:'0.07em'}}>JUIN 2026</div>
                      <div style={{display:'flex',gap:4}}>
                        {['Semaine','Mois'].map((v,i)=>(
                          <span key={v} style={{padding:'2px 8px',borderRadius:6,fontSize:9,border:'1px solid '+(i===0?'rgba(81,103,86,0.3)':'#E3DED7'),background:i===0?'rgba(81,103,86,0.08)':'transparent',color:i===0?'#516756':'#9EA39C',cursor:'default',fontWeight:i===0?600:400}}>{v}</span>
                        ))}
                      </div>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3}}>
                      {['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map(d=>(
                        <div key={d} style={{fontSize:9,color:'#B7C0B8',textAlign:'center',padding:'3px 0',fontWeight:600}}>{d}</div>
                      ))}
                      {[2,3,4,5,6,7,8,9,10,11,12,13,14,15].map((d)=>{
                        const hasPost = [3,5,10,12].includes(d)
                        return (
                          <div key={d} style={{borderRadius:6,padding:'4px 3px',minHeight:52,border:'1px solid '+(hasPost?'rgba(81,103,86,0.25)':'#E3DED7'),background:hasPost?'rgba(81,103,86,0.03)':'white'}}>
                            <div style={{fontSize:9,fontWeight:600,color:'#1F2421',marginBottom:4,textAlign:'center' as const}}>{d}</div>
                            {hasPost && <div style={{width:6,height:6,borderRadius:'50%',background:'#516756',margin:'0 auto'}}/>}
                          </div>
                        )
                      })}
                    </div>
                    <div style={{marginTop:10,borderTop:'1px solid #E3DED7',paddingTop:8}}>
                      <div style={{fontSize:9,fontWeight:600,color:'#9EA39C',letterSpacing:'0.07em',marginBottom:6}}>POSTS PLANIFIÉS</div>
                      {[
                        {day:'Mar 3',title:'Management bienveillant en scale-up',time:'09:00',status:'Planifié'},
                        {day:'Jeu 5',title:'Recrutement : les 3 erreurs à éviter',time:'11:30',status:'Planifié'},
                      ].map((p,i)=>(
                        <div key={i} style={{display:'flex',alignItems:'center',gap:6,padding:'5px 0',borderBottom:i===0?'1px solid #E3DED7':'none'}}>
                          <div style={{width:6,height:6,borderRadius:'50%',background:'#516756',flexShrink:0}}/>
                          <div style={{flex:1}}>
                            <div style={{fontSize:10,fontWeight:500,color:'#1F2421'}}>{p.title}</div>
                            <div style={{fontSize:9,color:'#9EA39C'}}>{p.day} · {p.time}</div>
                          </div>
                          <span style={{fontSize:8,padding:'2px 6px',borderRadius:10,background:'rgba(81,103,86,0.08)',color:'#516756',fontWeight:600}}>{p.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activePage === 'profil' && (
                <div>
                  <div style={{fontSize:10,fontWeight:600,color:'#B7C0B8',letterSpacing:'0.08em',marginBottom:4}}>PARAMÈTRES</div>
                  <div style={{fontSize:22,fontWeight:700,color:'#1F2421',letterSpacing:'-0.5px'}}>Mon profil</div>
                  <div style={{width:32,height:2,background:'#D9C8A3',margin:'10px 0 16px'}}/>
                  <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:18}}>
                    <div style={{width:48,height:48,borderRadius:'50%',background:'#516756',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:700,fontSize:16}}>AB</div>
                    <div>
                      <div style={{fontSize:16,fontWeight:700,color:'#1F2421'}}>Antoine Bernard</div>
                      <div style={{fontSize:12,color:'#6B7069'}}>Head of Growth · Nexflow</div>
                    </div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                    {[['RÔLE','Head of Growth'],['ENTREPRISE','Nexflow'],['SECTEUR','SaaS B2B, Growth'],['AUDIENCE','Fondateurs, managers']].map(([l,v])=>(
                      <div key={l}>
                        <div style={{fontSize:10,fontWeight:600,color:'#9EA39C',letterSpacing:'0.06em',marginBottom:4}}>{l}</div>
                        <div style={{padding:'7px 10px',borderRadius:6,border:'1px solid #E3DED7',fontSize:12,color:'#1F2421',background:'white'}}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div></div>

        {/* DEMO */}
        <div id="demo-section" style={{padding:'64px 32px',background:'white',borderTop:'1px solid #E3DED7',borderBottom:'1px solid #E3DED7'}}>
          <div style={{maxWidth:580,margin:'0 auto',textAlign:'center'}}>
            <div style={{display:'inline-block',background:'rgba(81,103,86,0.08)',color:'#516756',fontSize:11,fontWeight:600,padding:'4px 14px',borderRadius:20,letterSpacing:'0.07em',marginBottom:20}}>✦ DÉMO GRATUITE</div>
            <h2 style={{fontSize:32,fontWeight:700,color:'#1F2421',marginBottom:10,letterSpacing:'-0.5px'}}>Testez en 30 secondes</h2>
            <p style={{fontSize:14,color:'#6B7069',marginBottom:32,lineHeight:1.6}}>Entrez votre email et un sujet — recevez un post LinkedIn prêt à publier.</p>
            <div style={{background:'#FAF9F7',border:'1px solid #E3DED7',borderRadius:16,padding:24,textAlign:'left'}}>
              {!emailSent ? (
                <>
                  <div style={{fontSize:10,fontWeight:600,color:'#9EA39C',letterSpacing:'0.07em',marginBottom:8}}>VOTRE EMAIL</div>
                  <div style={{display:'flex',gap:8,marginBottom:8}}>
                    <input value={email} onChange={e=>{setEmail(e.target.value);setEmailError(false)}} placeholder="votre@email.com" type="email" onKeyDown={e=>e.key==='Enter'&&handleEmail()} style={{flex:1,padding:'11px 14px',borderRadius:8,border:`1px solid ${emailError?'#c0392b':'#E3DED7'}`,fontSize:13,color:'#1F2421',fontFamily:'inherit',background:'white',outline:'none'}}/>
                    <button onClick={handleEmail} style={{padding:'11px 20px',borderRadius:8,background:'#516756',border:'none',color:'white',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap' as const}}>Continuer →</button>
                  </div>
                  {emailError && <p style={{fontSize:11,color:'#c0392b',marginBottom:8}}>Entrez une adresse email valide.</p>}
                  <p style={{fontSize:11,color:'#B7C0B8'}}>Votre email ne sera pas partagé.</p>
                </>
              ) : (
                <>
                  <div style={{fontSize:10,fontWeight:600,color:'#9EA39C',letterSpacing:'0.07em',marginBottom:8}}>SUJET DE VOTRE POST</div>
                  <div style={{display:'flex',gap:8,marginBottom:16}}>
                    <input value={topic} onChange={e=>setTopic(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleGenerate()} placeholder="Ex : leadership, recrutement, productivité…" style={{flex:1,padding:'11px 14px',borderRadius:8,border:'1px solid #E3DED7',fontSize:13,color:'#1F2421',fontFamily:'inherit',background:'white',outline:'none'}}/>
                    <button onClick={handleGenerate} disabled={generating||!topic.trim()} style={{padding:'11px 20px',borderRadius:8,background:'#516756',border:'none',color:'white',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap' as const,opacity:generating||!topic.trim()?0.6:1}}>
                      {generating ? '…' : '✦ Générer'}
                    </button>
                  </div>
                  <div style={{fontSize:10,fontWeight:600,color:'#9EA39C',letterSpacing:'0.07em',marginBottom:8}}>VOTRE POST</div>
                  <div style={{background:'white',border:'1px solid #E3DED7',borderRadius:8,padding:14,minHeight:100,fontSize:13,color:demoPost?'#1F2421':'#B7C0B8',lineHeight:1.8,whiteSpace:'pre-line' as const,fontStyle:demoPost?'normal':'italic'}}>
                    {demoPost || (generating ? 'Génération en cours…' : 'Votre post apparaîtra ici…')}
                  </div>
                </>
              )}
              <p style={{textAlign:'center',marginTop:16,fontSize:11,color:'#9EA39C'}}>Résultat limité · <a href="/login" style={{color:'#516756',textDecoration:'none'}}>Créer un compte gratuit</a> pour toutes les fonctionnalités</p>
            </div>
          </div>
        </div>

        {/* FEATURES */}
        <style>{`@media (max-width: 640px) { .features-grid { grid-template-columns: repeat(2,1fr) !important; padding: 40px 16px !important; } }`}</style>
        <div className="features-grid" style={{padding:'64px 32px',maxWidth:960,margin:'0 auto',display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16}}>
          {[
            {icon:'💡',title:'10 idées par jour',desc:"Générées selon votre secteur et l'actualité du moment."},
            {icon:'⚡',title:'Post en 30 secondes',desc:'Rédigez, éditez et publiez directement sur LinkedIn.'},
            {icon:'🖼',title:'Visuels 1080px',desc:'Créez des images professionnelles pour chaque post.'},
            {icon:'📅',title:'Calendrier éditorial',desc:'Planifiez et publiez automatiquement.'},
          ].map((f,i)=>(
            <div key={i} style={{padding:20,borderRadius:12,border:'1px solid #E3DED7',background:'white'}}>
              <div style={{fontSize:24,marginBottom:10}}>{f.icon}</div>
              <div style={{fontSize:13,fontWeight:600,color:'#1F2421',marginBottom:5}}>{f.title}</div>
              <div style={{fontSize:12,color:'#6B7069',lineHeight:1.6}}>{f.desc}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{padding:'64px 32px',textAlign:'center',background:'#516756'}}>
          <h2 style={{fontSize:32,fontWeight:700,color:'white',marginBottom:10,letterSpacing:'-0.5px'}}>Prêt à publier enfin ?</h2>
          <p style={{fontSize:14,color:'rgba(255,255,255,0.65)',marginBottom:28}}>Sans carte bancaire · Sans engagement · 7 jours offerts</p>
          <button onClick={()=>setShowAuthModal(true)} style={{padding:'14px 36px',borderRadius:12,background:'#D9C8A3',border:'none',fontSize:15,color:'#1F2421',fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Commencer gratuitement →</button>
        </div>

        {/* FOOTER */}
        <div style={{padding:'20px 32px',borderTop:'1px solid #E3DED7',background:'#FAF9F7',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <img src="/logo-ecrira.png" alt="Ecrira" style={{height:20,width:'auto'}}/>
          <div style={{display:'flex',gap:20,fontSize:11,color:'#9EA39C'}}>
            <a href="/cgu" style={{color:'#9EA39C',textDecoration:'none'}}>CGU</a>
            <a href="/mentions-legales" style={{color:'#9EA39C',textDecoration:'none'}}>Mentions légales</a>
            <a href="https://www.linkedin.com/company/ecrira/" target="_blank" rel="noopener noreferrer" style={{color:'#9EA39C',textDecoration:'none'}}>LinkedIn</a>
          </div>
        </div>

      </div>

      {/* AUTH MODAL */}
      {showAuthModal && (
        <div onClick={()=>setShowAuthModal(false)} style={{position:'fixed',inset:0,zIndex:600,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(4px)',padding:20}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'white',borderRadius:20,width:'100%',maxWidth:420,boxShadow:'0 24px 64px rgba(0,0,0,0.2)',overflow:'hidden'}}>
            <div style={{background:'#516756',padding:'24px 28px 20px'}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
                <div style={{background:'white',borderRadius:10,width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <img src="/logo-ecrira-icon.png" alt="Ecrira" style={{height:22,width:'auto'}}/>
                </div>
                <span style={{fontFamily:"'Clash Display',sans-serif",fontSize:15,fontWeight:600,color:'white'}}>Ecrira</span>
              </div>
              <div style={{fontSize:20,fontWeight:700,color:'white',marginBottom:4}}>{authMode==='login'?'Connexion':'Créer un compte'}</div>
              <div style={{fontSize:13,color:'rgba(255,255,255,0.65)'}}>7 jours Pro gratuits · Sans carte bancaire</div>
            </div>
            <div style={{padding:'24px 28px 28px'}}>
              <button onClick={handleGoogle} disabled={authLoading} style={{width:'100%',padding:'11px',borderRadius:10,border:'1px solid #E3DED7',background:'white',display:'flex',alignItems:'center',justifyContent:'center',gap:10,fontSize:14,color:'#1F2421',cursor:'pointer',fontFamily:'inherit',marginBottom:16,fontWeight:500}}>
                <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Continuer avec Google
              </button>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
                <div style={{flex:1,height:1,background:'#E3DED7'}}/>
                <span style={{fontSize:12,color:'#9EA39C'}}>ou</span>
                <div style={{flex:1,height:1,background:'#E3DED7'}}/>
              </div>
              <input value={authEmail} onChange={e=>setAuthEmail(e.target.value)} placeholder="Email" type="email" style={{width:'100%',padding:'11px 14px',borderRadius:8,border:'1px solid #E3DED7',fontSize:13,color:'#1F2421',fontFamily:'inherit',background:'#FAF9F7',outline:'none',marginBottom:8,boxSizing:'border-box' as const}}/>
              <input value={authPassword} onChange={e=>setAuthPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleEmailAuth()} placeholder="Mot de passe" type="password" style={{width:'100%',padding:'11px 14px',borderRadius:8,border:'1px solid #E3DED7',fontSize:13,color:'#1F2421',fontFamily:'inherit',background:'#FAF9F7',outline:'none',marginBottom:12,boxSizing:'border-box' as const}}/>
              {authError && <p style={{fontSize:12,color:authError.includes('Vérifiez')?'#516756':'#c0392b',marginBottom:10}}>{authError}</p>}
              <button onClick={handleEmailAuth} disabled={authLoading} style={{width:'100%',padding:'12px',borderRadius:10,background:'#516756',border:'none',color:'white',fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit',marginBottom:12,opacity:authLoading?0.7:1}}>
                {authLoading?'Chargement…':authMode==='login'?'Se connecter':'Créer mon compte'}
              </button>
              <p style={{textAlign:'center',fontSize:12,color:'#9EA39C'}}>
                {authMode==='login'?'Pas encore de compte ? ':'Déjà un compte ? '}
                <span onClick={()=>{setAuthMode(authMode==='login'?'signup':'login');setAuthError('')}} style={{color:'#516756',cursor:'pointer',fontWeight:500}}>{authMode==='login'?"S'inscrire":'Se connecter'}</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
