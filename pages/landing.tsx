import Head from 'next/head'
import { useRouter } from 'next/router'
import { useState } from 'react'

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
  const F = '#3D52A0'

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
        <link rel="icon" href="/logo-ecrira-icon-bleu.png" type="image/png"/>
        <link rel="apple-touch-icon" href="/logo-ecrira-icon-bleu.png"/>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/>
        <script defer data-domain="ecrira.com" src="https://plausible.io/js/pa-JoffvncprLIz4FmqjAnDr.js"></script>
      </Head>

      <div style={{fontFamily:"'Inter',system-ui,sans-serif", background:'#FAF9F7', minHeight:'100vh'}}>

        {/* ── NAV ── */}
        <div style={{position:'sticky',top:0,zIndex:100,background:'rgba(250,249,247,0.95)',backdropFilter:'blur(8px)',borderBottom:'1px solid #E3DED7',padding:'12px 40px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <img src="/logo-ecrira-horizontal-400.png" alt="Ecrira" style={{height:36,width:'auto'}}/>
          <div style={{display:'flex',gap:10,alignItems:'center'}}>
            <button onClick={()=>router.push('/login')} style={{padding:'8px 18px',borderRadius:8,border:'1px solid rgba(61,82,160,0.3)',background:'transparent',color:F,fontSize:13,cursor:'pointer',fontFamily:'inherit',fontWeight:500}}>Se connecter</button>
            <button onClick={()=>router.push('/login')} style={{padding:'8px 18px',borderRadius:8,background:F,border:'none',fontSize:13,color:'white',cursor:'pointer',fontWeight:600,fontFamily:'inherit'}}>Essai gratuit 7 jours →</button>
          </div>
        </div>

        {/* ── HERO 2 colonnes ── */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:48,alignItems:'center',padding:'72px 56px 64px',maxWidth:1160,margin:'0 auto'}}>
          {/* Gauche */}
          <div>
            <div style={{display:'inline-block',background:'rgba(61,82,160,0.08)',color:F,fontSize:11,fontWeight:600,padding:'4px 14px',borderRadius:20,letterSpacing:'0.07em',marginBottom:24}}>✦ 7 JOURS GRATUITS · SANS CB</div>
            <h1 style={{fontFamily:"'Inter',sans-serif",fontSize:'clamp(34px,4vw,50px)',fontWeight:700,color:'#1F2421',lineHeight:1.1,marginBottom:18,letterSpacing:'-1.5px'}}>
              Votre expertise mérite<br/>d&apos;être <span style={{color:F}}>vue.</span>
            </h1>
            <p style={{fontSize:15,color:'#6B7069',lineHeight:1.75,marginBottom:32,maxWidth:420}}>Ecrira génère vos posts LinkedIn en 30 secondes — personnalisés pour votre secteur, dans votre style.</p>
            <div style={{display:'flex',gap:12,marginBottom:12,flexWrap:'wrap' as const}}>
              <button onClick={()=>router.push('/login')} style={{padding:'13px 28px',borderRadius:10,background:F,border:'none',fontSize:14,color:'white',fontWeight:600,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 4px 16px rgba(61,82,160,0.25)'}}>Commencer gratuitement →</button>
              <button onClick={()=>document.getElementById('demo-section')?.scrollIntoView({behavior:'smooth'})} style={{padding:'13px 20px',borderRadius:10,border:'1px solid #E3DED7',background:'transparent',fontSize:14,color:'#1F2421',cursor:'pointer',fontFamily:'inherit'}}>Tester la démo ↓</button>
            </div>
            <p style={{fontSize:12,color:'#9EA39C'}}>Sans carte bancaire · Sans engagement</p>
          </div>

          {/* Droite — mockup app */}
          <div style={{background:'white',borderRadius:16,border:'1px solid #E3DED7',overflow:'hidden',boxShadow:'0 16px 48px rgba(31,36,33,0.1)'}}>
            {/* Mini header */}
            <div style={{height:44,background:'#FAF9F7',borderBottom:'0.5px solid #E3DED7',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 16px',flexShrink:0}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <img src="/logo-ecrira-icon-bleu.png" alt="Ecrira" style={{width:22,height:22,borderRadius:5}}/>
                <div>
                  <div style={{fontSize:8,fontWeight:600,color:F,letterSpacing:'0.1em'}}>ECRIRA</div>
                  <div style={{fontSize:9,color:'#9A9490',fontStyle:'italic'}}>{activePage==='apercu'?'Tableau de bord':activePage==='idees'?'Idées du jour':activePage==='rediger'?'Rédiger':activePage==='calendrier'?'Calendrier':'Profil'}</div>
                </div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <div style={{padding:'3px 8px',borderRadius:20,border:'0.5px solid #E3DED7',fontSize:9,color:'#9A9490',background:'white'}}>Rechercher ⌘K</div>
                <div style={{width:22,height:22,borderRadius:'50%',background:F,display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:9,fontWeight:700}}>AB</div>
                <div style={{fontSize:7,fontWeight:700,padding:'2px 5px',borderRadius:10,background:F,color:'white'}}>PRO</div>
              </div>
            </div>

            {/* Contenu mockup */}
            <div style={{padding:20,minHeight:400,position:'relative'}}>
              {showTooltip && <div style={{position:'absolute',bottom:56,left:'50%',transform:'translateX(-50%)',background:'#1F2421',color:'white',fontSize:11,padding:'6px 14px',borderRadius:20,whiteSpace:'nowrap',zIndex:10}}>Navigation uniquement — créez un compte pour agir</div>}

              {activePage === 'apercu' && (
                <div>
                  <div style={{fontSize:10,fontWeight:600,color:'#B7C0B8',letterSpacing:'0.08em',marginBottom:4}}>TABLEAU DE BORD</div>
                  <div style={{fontSize:20,fontWeight:700,color:'#1F2421',letterSpacing:'-0.5px'}}>Bonjour, Antoine.</div>
                  <div style={{width:32,height:2,background:'#D9C8A3',margin:'8px 0 14px'}}/>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:14}}>
                    {[['Posts sauvegardés','18','dans la bibliothèque'],['Posts générés','41','ce mois'],['Secteur actif','Growth','Scale-up SaaS']].map(([l,v,n],i)=>(
                      <div key={i} style={{background:'white',borderRadius:10,border:'1px solid #E3DED7',padding:10}}>
                        <div style={{fontSize:9,color:'#9EA39C',marginBottom:3}}>{l}</div>
                        <div style={{fontSize:i===2?12:18,fontWeight:700,color:'#1F2421'}}>{v}</div>
                        <div style={{fontSize:9,color:'#B7C0B8',marginTop:2}}>{n}</div>
                      </div>
                    ))}
                  </div>
                  <div style={cardStyle}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                      <span style={{fontSize:10,fontWeight:600,color:'#9EA39C',letterSpacing:'0.07em'}}>IDÉES DU JOUR</span>
                      <button style={{padding:'4px 10px',background:F,border:'none',borderRadius:6,color:'white',fontSize:10,cursor:'default',fontFamily:'inherit'}}>✦ Générer</button>
                    </div>
                    {[
                      {tag:'LEADERSHIP',title:"Ce que j'ai appris en recrutant mes 10 premiers collaborateurs"},
                      {tag:'PRODUCTIVITÉ',title:"La règle des 3 tâches qui a changé ma façon de travailler"}
                    ].map((idea,i)=>(
                      <div key={i} style={{borderRadius:8,border:'1px solid #E3DED7',padding:'8px 10px',marginBottom:i===0?6:0}}>
                        <span style={{display:'inline-block',background:'rgba(61,82,160,0.08)',color:F,fontSize:9,fontWeight:600,padding:'2px 8px',borderRadius:10,marginBottom:4,letterSpacing:'0.05em'}}>{idea.tag}</span>
                        <div style={{fontSize:11,fontWeight:600,color:'#1F2421',lineHeight:1.4}}>{idea.title}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activePage === 'idees' && (
                <div>
                  <div style={{fontSize:10,fontWeight:600,color:'#B7C0B8',letterSpacing:'0.08em',marginBottom:4}}>CONTENU</div>
                  <div style={{fontSize:20,fontWeight:700,color:'#1F2421',letterSpacing:'-0.5px'}}>Idées du jour</div>
                  <div style={{width:32,height:2,background:'#D9C8A3',margin:'8px 0 14px'}}/>
                  <div style={cardStyle}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                      <span style={{fontSize:10,fontWeight:600,color:'#9EA39C',letterSpacing:'0.07em'}}>{"AUJOURD'HUI · 10 IDÉES"}</span>
                      <button style={{padding:'4px 10px',background:F,border:'none',borderRadius:6,color:'white',fontSize:10,cursor:'default',fontFamily:'inherit'}}>✦ Régénérer</button>
                    </div>
                    {[
                      {tag:'ENTREPRENEURIAT',title:"Pourquoi j'ai failli arrêter après 6 mois"},
                      {tag:'MANAGEMENT',title:"Déléguer ne veut pas dire abandonner"},
                      {tag:'TENDANCE',title:"Le retour du bureau tue la culture d'entreprise"},
                    ].map((idea,i)=>(
                      <div key={i} style={{borderRadius:8,border:'1px solid #E3DED7',padding:'8px 10px',marginBottom:i<2?6:0}}>
                        <span style={{display:'inline-block',background:'rgba(61,82,160,0.08)',color:F,fontSize:9,fontWeight:600,padding:'2px 8px',borderRadius:10,marginBottom:4,letterSpacing:'0.05em'}}>{idea.tag}</span>
                        <div style={{fontSize:11,fontWeight:600,color:'#1F2421',lineHeight:1.4}}>{idea.title}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activePage === 'rediger' && (
                <div>
                  <div style={{fontSize:10,fontWeight:600,color:'#B7C0B8',letterSpacing:'0.08em',marginBottom:4}}>CRÉATION</div>
                  <div style={{fontSize:20,fontWeight:700,color:'#1F2421',letterSpacing:'-0.5px'}}>Rédiger</div>
                  <div style={{width:32,height:2,background:'#D9C8A3',margin:'8px 0 14px'}}/>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                    <div style={cardStyle}>
                      <div style={{fontSize:9,fontWeight:600,color:'#9EA39C',letterSpacing:'0.07em',marginBottom:6}}>SUJET</div>
                      <div style={{padding:'8px 10px',borderRadius:7,border:'1px solid #E3DED7',background:'#FAF9F7',fontSize:11,color:'#1F2421',marginBottom:8}}>Le management bienveillant en scale-up</div>
                      <div style={{fontSize:9,fontWeight:600,color:'#9EA39C',letterSpacing:'0.07em',marginBottom:5}}>FORMAT</div>
                      <div style={{display:'flex',gap:4,flexWrap:'wrap' as const,marginBottom:8}}>
                        {['Storytelling','Liste','Conseil'].map((f,i)=>(
                          <span key={i} style={{padding:'2px 8px',borderRadius:20,fontSize:10,border:'1px solid '+(i===0?'rgba(61,82,160,0.3)':'#E3DED7'),background:i===0?'rgba(61,82,160,0.08)':'transparent',color:i===0?F:'#6B7069'}}>{f}</span>
                        ))}
                      </div>
                      <button style={{width:'100%',padding:'8px',background:F,border:'none',borderRadius:7,color:'white',fontSize:11,fontWeight:600,cursor:'default',fontFamily:'inherit'}}>✦ Générer le post</button>
                    </div>
                    <div style={cardStyle}>
                      <div style={{fontSize:9,fontWeight:600,color:'#9EA39C',letterSpacing:'0.07em',marginBottom:6}}>APERÇU</div>
                      <div style={{fontSize:10,color:'#1F2421',lineHeight:1.8,whiteSpace:'pre-line' as const}}>{"On parle souvent de bienveillance.\n\nMais rarement de ce que ça implique.\n\nEn 3 ans, j'ai fait 2 erreurs majeures…"}</div>
                    </div>
                  </div>
                </div>
              )}

              {activePage === 'calendrier' && (
                <div>
                  <div style={{fontSize:10,fontWeight:600,color:'#B7C0B8',letterSpacing:'0.08em',marginBottom:4}}>PLANIFICATION</div>
                  <div style={{fontSize:20,fontWeight:700,color:'#1F2421',letterSpacing:'-0.5px'}}>Calendrier</div>
                  <div style={{width:32,height:2,background:'#D9C8A3',margin:'8px 0 14px'}}/>
                  <div style={cardStyle}>
                    <div style={{fontSize:9,fontWeight:600,color:'#9EA39C',letterSpacing:'0.07em',marginBottom:8}}>JUIN 2026</div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3}}>
                      {['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map(d=>(
                        <div key={d} style={{fontSize:9,color:'#B7C0B8',textAlign:'center',padding:'3px 0',fontWeight:600}}>{d}</div>
                      ))}
                      {[2,3,4,5,6,7,8,9,10,11,12,13,14,15].map((d)=>(
                        <div key={d} style={{borderRadius:5,padding:'5px 3px',textAlign:'center',minHeight:40,border:'1px solid '+([3,5,10,12].includes(d)?'rgba(61,82,160,0.3)':'#E3DED7'),background:[3,5,10,12].includes(d)?'rgba(61,82,160,0.04)':'white'}}>
                          <div style={{fontSize:9,fontWeight:600,color:'#1F2421',marginBottom:2}}>{d}</div>
                          {[3,5,10,12].includes(d) && <div style={{width:5,height:5,borderRadius:'50%',background:F,margin:'0 auto'}}/>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activePage === 'profil' && (
                <div>
                  <div style={{fontSize:10,fontWeight:600,color:'#B7C0B8',letterSpacing:'0.08em',marginBottom:4}}>PARAMÈTRES</div>
                  <div style={{fontSize:20,fontWeight:700,color:'#1F2421',letterSpacing:'-0.5px'}}>Mon profil</div>
                  <div style={{width:32,height:2,background:'#D9C8A3',margin:'8px 0 14px'}}/>
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
                    <div style={{width:40,height:40,borderRadius:'50%',background:F,display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:700,fontSize:14}}>AB</div>
                    <div>
                      <div style={{fontSize:14,fontWeight:700,color:'#1F2421'}}>Antoine Bernard</div>
                      <div style={{fontSize:11,color:'#6B7069'}}>Head of Growth · Nexflow</div>
                    </div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                    {[['RÔLE','Head of Growth'],['ENTREPRISE','Nexflow'],['SECTEUR','SaaS B2B'],['AUDIENCE','Fondateurs']].map(([l,v])=>(
                      <div key={l}>
                        <div style={{fontSize:9,fontWeight:600,color:'#9EA39C',letterSpacing:'0.06em',marginBottom:3}}>{l}</div>
                        <div style={{padding:'6px 8px',borderRadius:5,border:'1px solid #E3DED7',fontSize:11,color:'#1F2421',background:'white'}}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Floating pill nav */}
            <div style={{display:'flex',justifyContent:'center',padding:'8px 0',borderTop:'0.5px solid #E3DED7',background:'#FAF9F7'}}>
              <div style={{display:'flex',alignItems:'center',gap:3,background:'white',border:'0.5px solid #E3DED7',borderRadius:30,padding:'4px 7px',boxShadow:'0 2px 8px rgba(0,0,0,0.08)'}}>
                {navItems.map((item)=>(
                  <div key={item.id} onClick={()=>handleNav(item.id)} style={{width:28,height:28,borderRadius:'50%',background:activePage===item.id?F:'transparent',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'background 0.15s'}}>
                    <div style={{width:8,height:8,borderRadius:'50%',background:activePage===item.id?'white':'#B7C0B8'}}/>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── STATS BAND ── */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',borderTop:'1px solid #E3DED7',borderBottom:'1px solid #E3DED7',background:'white'}}>
          {[['30s','pour générer un post'],['+2 400','utilisateurs actifs'],['×4','plus de visibilité LinkedIn']].map(([num,lbl],i)=>(
            <div key={i} style={{textAlign:'center',padding:'32px 20px',borderRight:i<2?'1px solid #E3DED7':'none'}}>
              <div style={{fontSize:32,fontWeight:700,color:F,letterSpacing:'-1px',marginBottom:6}}>{num}</div>
              <div style={{fontSize:12,color:'#6B7069'}}>{lbl}</div>
            </div>
          ))}
        </div>

        {/* ── FEATURES alternées ── */}
        <div style={{maxWidth:1100,margin:'0 auto',padding:'72px 56px'}}>

          {/* Feature 1 — Idées */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:64,alignItems:'center',marginBottom:80}}>
            <div>
              <div style={{fontSize:11,fontWeight:600,color:F,letterSpacing:'0.08em',marginBottom:10}}>IDÉES DU JOUR</div>
              <h2 style={{fontSize:26,fontWeight:700,color:'#1F2421',letterSpacing:'-0.5px',marginBottom:12,lineHeight:1.2}}>Ne manquez plus jamais d&apos;inspiration</h2>
              <p style={{fontSize:14,color:'#6B7069',lineHeight:1.75}}>Chaque matin, 10 idées de posts générées selon votre secteur, votre style et l&apos;actualité. Développez celles qui vous parlent en un clic.</p>
            </div>
            <div style={{background:'white',borderRadius:14,border:'1px solid #E3DED7',padding:20,boxShadow:'0 8px 24px rgba(31,36,33,0.06)'}}>
              {[
                {tag:'LEADERSHIP',title:"Ce que j'ai appris en recrutant mes 10 premiers collaborateurs"},
                {tag:'PRODUCTIVITÉ',title:"La règle des 3 tâches qui a changé ma façon de travailler"},
                {tag:'TENDANCE',title:"Le retour du bureau tue la culture d'entreprise"},
              ].map((idea,i)=>(
                <div key={i} style={{borderRadius:8,border:'1px solid #E3DED7',padding:'10px 12px',marginBottom:i<2?8:0}}>
                  <span style={{display:'inline-block',background:'rgba(61,82,160,0.08)',color:F,fontSize:9,fontWeight:600,padding:'2px 8px',borderRadius:10,marginBottom:5,letterSpacing:'0.05em'}}>{idea.tag}</span>
                  <div style={{fontSize:12,fontWeight:600,color:'#1F2421',lineHeight:1.4}}>{idea.title}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Feature 2 — Calendrier (inversé) */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:64,alignItems:'center',marginBottom:80}}>
            <div style={{background:'white',borderRadius:14,border:'1px solid #E3DED7',padding:20,boxShadow:'0 8px 24px rgba(31,36,33,0.06)'}}>
              <div style={{fontSize:10,fontWeight:600,color:'#9EA39C',letterSpacing:'0.07em',marginBottom:12}}>JUILLET 2026</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:4}}>
                {['L','M','M','J','V','S','D'].map((d,i)=>(
                  <div key={i} style={{fontSize:10,color:'#B7C0B8',textAlign:'center',padding:'3px 0',fontWeight:600}}>{d}</div>
                ))}
                {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21].map((d)=>(
                  <div key={d} style={{borderRadius:6,padding:'5px 3px',textAlign:'center',border:'1px solid '+([2,5,9,14,16].includes(d)?'rgba(61,82,160,0.3)':'#E3DED7'),background:[2,5,9,14,16].includes(d)?'rgba(61,82,160,0.05)':'white'}}>
                    <div style={{fontSize:10,fontWeight:600,color:'#1F2421'}}>{d}</div>
                    {[2,5,9,14,16].includes(d) && <div style={{width:5,height:5,borderRadius:'50%',background:F,margin:'2px auto 0'}}/>}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:600,color:F,letterSpacing:'0.08em',marginBottom:10}}>CALENDRIER ÉDITORIAL</div>
              <h2 style={{fontSize:26,fontWeight:700,color:'#1F2421',letterSpacing:'-0.5px',marginBottom:12,lineHeight:1.2}}>Planifiez et publiez directement sur LinkedIn</h2>
              <p style={{fontSize:14,color:'#6B7069',lineHeight:1.75}}>Programmez vos posts à l&apos;avance, visualisez votre rythme de publication et publiez directement sans quitter Ecrira.</p>
            </div>
          </div>

          {/* Feature 3 — Visuels */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:64,alignItems:'center'}}>
            <div>
              <div style={{fontSize:11,fontWeight:600,color:F,letterSpacing:'0.08em',marginBottom:10}}>VISUELS IA</div>
              <h2 style={{fontSize:26,fontWeight:700,color:'#1F2421',letterSpacing:'-0.5px',marginBottom:12,lineHeight:1.2}}>Des visuels pro générés en un clic</h2>
              <p style={{fontSize:14,color:'#6B7069',lineHeight:1.75}}>Générez des visuels LinkedIn 1080×1080 adaptés à votre secteur et vos couleurs de marque — prêts à publier.</p>
            </div>
            <div style={{background:'white',borderRadius:14,border:'1px solid #E3DED7',padding:20,boxShadow:'0 8px 24px rgba(31,36,33,0.06)'}}>
              <div style={{borderRadius:10,overflow:'hidden',background:'linear-gradient(135deg,#1a2a6c,#3D52A0)',padding:24,minHeight:160,display:'flex',flexDirection:'column' as const,justifyContent:'flex-end'}}>
                <div style={{fontSize:10,fontWeight:600,color:'rgba(255,255,255,0.6)',letterSpacing:'0.1em',marginBottom:6}}>CYBERSÉCURITÉ</div>
                <div style={{fontSize:22,fontWeight:700,color:'white',lineHeight:1.2,letterSpacing:'-0.5px'}}>43% des PME<br/>attaquées en 2024</div>
                <div style={{fontSize:11,color:'rgba(255,255,255,0.7)',marginTop:8}}>Êtes-vous vraiment protégé ?</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── DEMO ── */}
        <div id="demo-section" style={{padding:'64px 40px',background:'white',borderTop:'1px solid #E3DED7',borderBottom:'1px solid #E3DED7'}}>
          <div style={{maxWidth:580,margin:'0 auto',textAlign:'center'}}>
            <div style={{display:'inline-block',background:'rgba(61,82,160,0.08)',color:F,fontSize:11,fontWeight:600,padding:'4px 14px',borderRadius:20,letterSpacing:'0.07em',marginBottom:20}}>✦ DÉMO GRATUITE</div>
            <h2 style={{fontSize:30,fontWeight:700,color:'#1F2421',marginBottom:10,letterSpacing:'-0.5px'}}>Testez en 30 secondes</h2>
            <p style={{fontSize:14,color:'#6B7069',marginBottom:32,lineHeight:1.6}}>Entrez votre email et un sujet — recevez un post LinkedIn prêt à publier.</p>
            <div style={{background:'#FAF9F7',border:'1px solid #E3DED7',borderRadius:16,padding:24,textAlign:'left'}}>
              {!emailSent ? (
                <>
                  <div style={{fontSize:10,fontWeight:600,color:'#9EA39C',letterSpacing:'0.07em',marginBottom:8}}>VOTRE EMAIL</div>
                  <div style={{display:'flex',gap:8,marginBottom:8}}>
                    <input value={email} onChange={e=>{setEmail(e.target.value);setEmailError(false)}} placeholder="votre@email.com" type="email" onKeyDown={e=>e.key==='Enter'&&handleEmail()} style={{flex:1,padding:'11px 14px',borderRadius:8,border:`1px solid ${emailError?'#c0392b':'#E3DED7'}`,fontSize:13,color:'#1F2421',fontFamily:'inherit',background:'white',outline:'none'}}/>
                    <button onClick={handleEmail} style={{padding:'11px 20px',borderRadius:8,background:F,border:'none',color:'white',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap' as const}}>Continuer →</button>
                  </div>
                  {emailError && <p style={{fontSize:11,color:'#c0392b',marginBottom:8}}>Entrez une adresse email valide.</p>}
                  <p style={{fontSize:11,color:'#B7C0B8'}}>Votre email ne sera pas partagé.</p>
                </>
              ) : (
                <>
                  <div style={{fontSize:10,fontWeight:600,color:'#9EA39C',letterSpacing:'0.07em',marginBottom:8}}>SUJET DE VOTRE POST</div>
                  <div style={{display:'flex',gap:8,marginBottom:16}}>
                    <input value={topic} onChange={e=>setTopic(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleGenerate()} placeholder="Ex : leadership, recrutement, productivité…" style={{flex:1,padding:'11px 14px',borderRadius:8,border:'1px solid #E3DED7',fontSize:13,color:'#1F2421',fontFamily:'inherit',background:'white',outline:'none'}}/>
                    <button onClick={handleGenerate} disabled={generating||!topic.trim()} style={{padding:'11px 20px',borderRadius:8,background:F,border:'none',color:'white',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap' as const,opacity:generating||!topic.trim()?0.6:1}}>
                      {generating ? '…' : '✦ Générer'}
                    </button>
                  </div>
                  <div style={{fontSize:10,fontWeight:600,color:'#9EA39C',letterSpacing:'0.07em',marginBottom:8}}>VOTRE POST</div>
                  <div style={{background:'white',border:'1px solid #E3DED7',borderRadius:8,padding:14,minHeight:100,fontSize:13,color:demoPost?'#1F2421':'#B7C0B8',lineHeight:1.8,whiteSpace:'pre-line' as const,fontStyle:demoPost?'normal':'italic'}}>
                    {demoPost || (generating ? 'Génération en cours…' : 'Votre post apparaîtra ici…')}
                  </div>
                </>
              )}
              <p style={{textAlign:'center',marginTop:16,fontSize:11,color:'#9EA39C'}}>Résultat limité · <a href="/login" style={{color:F,textDecoration:'none'}}>Créer un compte gratuit</a> pour toutes les fonctionnalités</p>
            </div>
          </div>
        </div>

        {/* ── TÉMOIGNAGES ── */}
        <div style={{padding:'64px 56px',background:'#FAF9F7',borderBottom:'1px solid #E3DED7'}}>
          <div style={{textAlign:'center',marginBottom:40}}>
            <h2 style={{fontSize:26,fontWeight:700,color:'#1F2421',letterSpacing:'-0.5px',marginBottom:8}}>Ils publient avec Ecrira</h2>
            <p style={{fontSize:13,color:'#6B7069'}}>Plus de 2 400 professionnels font confiance à Ecrira</p>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20,maxWidth:1100,margin:'0 auto'}}>
            {[
              {initials:'SL',name:'Sophie L.',role:'DRH · Groupe Énergies',text:'"En 2 semaines j\'ai multiplié mes vues par 4. Les posts sont vraiment dans mon style, pas génériques."'},
              {initials:'TM',name:'Thomas M.',role:'Fondateur · SaaS B2B',text:'"Je passais 1h par post. Maintenant 5 minutes. Et les résultats sont meilleurs."'},
              {initials:'AR',name:'Amélie R.',role:'Consultante RH indépendante',text:'"Le calendrier éditorial a tout changé. Je planifie 2 semaines à l\'avance en 30 minutes."'},
            ].map((t,i)=>(
              <div key={i} style={{background:'white',borderRadius:14,border:'1px solid #E3DED7',padding:24}}>
                <div style={{color:'#D9A840',fontSize:13,marginBottom:10}}>★★★★★</div>
                <p style={{fontSize:13,color:'#1F2421',lineHeight:1.7,marginBottom:16}}>{t.text}</p>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <div style={{width:32,height:32,borderRadius:'50%',background:F,color:'white',fontSize:11,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center'}}>{t.initials}</div>
                  <div>
                    <div style={{fontSize:12,fontWeight:600,color:'#1F2421'}}>{t.name}</div>
                    <div style={{fontSize:11,color:'#9EA39C'}}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── CTA FINALE ── */}
        <div style={{padding:'72px 40px',textAlign:'center',background:F}}>
          <h2 style={{fontSize:30,fontWeight:700,color:'white',marginBottom:10,letterSpacing:'-0.5px'}}>Prêt à être vu sur LinkedIn ?</h2>
          <p style={{fontSize:14,color:'rgba(255,255,255,0.65)',marginBottom:32}}>Sans carte bancaire · Sans engagement · 7 jours offerts</p>
          <button onClick={()=>router.push('/login')} style={{padding:'14px 36px',borderRadius:12,background:'white',border:'none',fontSize:15,color:F,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Commencer gratuitement →</button>
        </div>

        {/* ── FOOTER ── */}
        <div style={{padding:'20px 40px',borderTop:'1px solid #E3DED7',background:'#FAF9F7',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <img src="/logo-ecrira-horizontal-400.png" alt="Ecrira" style={{height:28,width:'auto'}}/>
          <div style={{display:'flex',gap:20,fontSize:11,color:'#9EA39C'}}>
            <a href="/cgu" style={{color:'#9EA39C',textDecoration:'none'}}>CGU</a>
            <a href="/mentions-legales" style={{color:'#9EA39C',textDecoration:'none'}}>Mentions légales</a>
            <a href="https://www.linkedin.com/company/ecrira/" target="_blank" rel="noopener noreferrer" style={{color:'#9EA39C',textDecoration:'none'}}>LinkedIn</a>
          </div>
        </div>

      </div>
    </>
  )
}
