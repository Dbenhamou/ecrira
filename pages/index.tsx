import Head from 'next/head'
import { useRouter } from 'next/router'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export default function Landing() {
  const router = useRouter()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authMode, setAuthMode] = useState<'login'|'signup'>('login')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [demoEmail, setDemoEmail] = useState('')
  const [demoEmailSent, setDemoEmailSent] = useState(false)
  const [demoTopic, setDemoTopic] = useState('')
  const [demoTone, setDemoTone] = useState('pro')
  const [demoPost, setDemoPost] = useState('')
  const [demoLoading, setDemoLoading] = useState(false)
  const [demoEmailError, setDemoEmailError] = useState(false)
  const [faqOpen, setFaqOpen] = useState<number|null>(null)
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set())
  const [countersStarted, setCountersStarted] = useState(false)
  const [counter1, setCounter1] = useState(0)
  const [counter2, setCounter2] = useState(0)
  const counterRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/app')
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) router.replace('/app')
    })
    return () => subscription.unsubscribe()
  }, [router])

  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) setVisibleSections(prev => { const s = new Set(Array.from(prev)); s.add(e.target.id); return s; })
      })
    }, { threshold: 0.15 })
    document.querySelectorAll('[data-animate]').forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!counterRef.current) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !countersStarted) {
        setCountersStarted(true)
        let i = 0
        const timer = setInterval(() => {
          i++
          setCounter1(Math.min(Math.round(i * 62.5), 2400))
          setCounter2(Math.min(Math.round(i * 312.5), 12000))
          if (i >= 40) clearInterval(timer)
        }, 25)
      }
    }, { threshold: 0.5 })
    obs.observe(counterRef.current)
    return () => obs.disconnect()
  }, [countersStarted])

  const handleGoogle = async () => {
    setAuthLoading(true); setAuthError('')
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/app` } })
    if (error) { setAuthError(error.message); setAuthLoading(false) }
  }

  const handleEmailAuth = async () => {
    if (!authEmail.trim() || !authPassword.trim()) { setAuthError('Email et mot de passe requis.'); return }
    setAuthLoading(true); setAuthError('')
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

  const handleDemoEmail = () => {
    if (!demoEmail.trim() || !demoEmail.includes('@')) { setDemoEmailError(true); return }
    setDemoEmailError(false); setDemoEmailSent(true)
  }

  const handleDemoGenerate = async () => {
    if (!demoTopic.trim()) return
    setDemoLoading(true); setDemoPost('')
    try {
      const res = await fetch('/api/demo', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ email: demoEmail, topic: demoTopic, tone: demoTone }) })
      const data = await res.json()
      setDemoPost(data.post || 'Une erreur est survenue.')
    } catch { setDemoPost('Une erreur est survenue.') }
    setDemoLoading(false)
  }

  const F = '#516756'
  const C = '#D9C8A3'
  const CH = '#1F2421'
  const IV = '#FAF9F7'
  const BD = '#E3DED7'

  const tones = [
    { id:'pro', label:'Pro', desc:'Structuré, leçons' },
    { id:'story', label:'Storytelling', desc:'Personnel, narratif' },
    { id:'punch', label:'Punchy', desc:'Court, percutant' },
  ]

  const steps = [
    { n:'01', title:'Décrivez votre activité', desc:"Votre profil suffit. Ecrira capture votre positionnement, votre ton et votre audience cible." },
    { n:'02', title:'Recevez post + visuel', desc:"Un post LinkedIn prêt à publier, accompagné d'un visuel cohérent. Modifiable en un clic." },
    { n:'03', title:'Planifiez et publiez', desc:"Programmez aux heures de pic. Ecrira publie pour vous directement sur LinkedIn." },
  ]

  const features = [
    { icon:'💡', title:'Idées de posts illimitées', desc:"Ecrira analyse votre activité et propose des angles qui résonnent avec votre audience." },
    { icon:'⚡', title:'Rédaction en 30 secondes', desc:"Posts structurés, accroches qui stoppent le scroll, calls-to-action efficaces." },
    { icon:'🖼', title:'Visuels générés', desc:"Carrousels, citations, illustrations : un visuel cohérent avec chaque post, en un clic." },
    { icon:'📅', title:'Planification LinkedIn', desc:"Programmez vos posts aux heures de pic d'engagement. Automatisez sans perdre votre voix." },
  ]

  const testimonials = [
    { initials:'TR', name:'Thomas R.', role:'Freelance growth · B2B SaaS', time:'1 sem.', content:"J'ai annulé mon abonnement ghostwriter (1 800€/mois).\n\nEcrira fait 80% du job pour 15,90€.\n\n3 posts par semaine, publiés, planifiés, avec visuel.\nMon engagement a doublé en 6 semaines.\n\nGame changer.", likes:41, comments:23 },
    { initials:'SB', name:'Salma B.', role:'Coach business', time:'3 j.', content:"Je n'ai plus l'angoisse de la page blanche.\n\nJe décris ma semaine à Ecrira → il me sort 5 idées de posts → j'en garde 3.\n\nGain de temps : 4h par semaine. Constance : enfin.", likes:28, comments:14 },
    { initials:'AD', name:'Antoine D.', role:'Fondateur · agence', time:'5 j.', content:"On l'utilise pour les 12 consultants de l'agence.\n\nChacun a sa voix, ses sujets, son planning.\nEcrira respecte le ton de chaque profil.\n\nROI clair : +40% de leads inbound en 2 mois.", likes:52, comments:41 },
  ]

  const faqs = [
    { q:"Ecrira est-il vraiment gratuit ?", a:"Oui — 7 jours Pro offerts à l'inscription, sans carte bancaire. Après l'essai, vous pouvez continuer en Free (fonctionnalités limitées) ou passer à Pro à 15,90€/mois." },
    { q:"Quelle différence avec un ghostwriter LinkedIn humain ?", a:"Un ghostwriter coûte entre 500€ et 2 000€/mois. Ecrira fait 80% du travail pour 15,90€/mois. Vous gardez le contrôle de votre voix et publiez à votre rythme." },
    { q:"Comment fonctionne la planification de posts LinkedIn ?", a:"Connectez votre compte LinkedIn via OAuth. Choisissez une date et une heure, Ecrira publie automatiquement pour vous. Aucune manipulation manuelle." },
    { q:"Mon compte LinkedIn est-il en sécurité ?", a:"Oui. Nous utilisons l'API officielle LinkedIn via OAuth. Nous ne stockons jamais votre mot de passe LinkedIn." },
    { q:"Puis-je annuler mon abonnement à tout moment ?", a:"Oui, sans engagement ni frais de résiliation. L'annulation prend effet à la fin de la période en cours." },
  ]

  const scrollToDemo = () => document.getElementById('generateur')?.scrollIntoView({ behavior: 'smooth' })

  return (
    <>
      <Head>
        <title>Ecrira — Générateur de posts LinkedIn, gratuit</title>
        <meta name="description" content="Générez vos posts LinkedIn en 30 secondes. 7 jours Pro gratuits. Rédaction, visuels et planification — l'alternative au ghostwriting LinkedIn." />
        <meta property="og:title" content="Ecrira — Générateur de posts LinkedIn, gratuit" />
        <meta property="og:description" content="Générez vos posts LinkedIn en 30 secondes. L'alternative au ghostwriting, en 10x moins cher." />
        <meta property="og:image" content="https://ecrira.com/og-image.png" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="icon" href="/logo-ecrira-icon.png" type="image/png"/>
        <link rel="apple-touch-icon" href="/logo-ecrira-icon.png"/>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/>
        <script defer data-domain="ecrira.com" src="https://plausible.io/js/pa-JoffvncprLIz4FmqjAnDr.js"></script>
        <style>{`
          @keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
          @keyframes wordIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
          @keyframes pulse { 0%,100% { box-shadow:0 0 0 0 rgba(81,103,86,0.4); } 70% { box-shadow:0 0 0 8px rgba(81,103,86,0); } }
          @keyframes spin { to { transform:rotate(360deg); } }
          .hero-word { display:inline; opacity:0; animation:wordIn 0.4s forwards; }
          .animate-up { opacity:0; transform:translateY(24px); transition:opacity 0.5s, transform 0.5s; }
          .animate-up.visible { opacity:1; transform:translateY(0); }
          .card-stagger:nth-child(1) { transition-delay:0s; }
          .card-stagger:nth-child(2) { transition-delay:0.1s; }
          .card-stagger:nth-child(3) { transition-delay:0.2s; }
          .card-stagger:nth-child(4) { transition-delay:0.3s; }
          .btn-pulse { animation:pulse 2s infinite; }
          .spinner-white { width:14px;height:14px;border:2px solid rgba(255,255,255,0.3);border-top-color:white;border-radius:50%;animation:spin 0.7s linear infinite; }
          .card-hover { transition: transform 0.2s, box-shadow 0.2s; }
          .card-hover:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(31,36,33,0.10) !important; }
          .btn-hover { transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s; }
          .btn-hover:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(81,103,86,0.3); }
          .faq-hover:hover { background: rgba(81,103,86,0.03); }
          @media (max-width:640px) { .grid-4 { grid-template-columns:repeat(2,1fr)!important; } .grid-3 { grid-template-columns:1fr!important; } .hero-h1 { font-size:32px!important; } .mockup-wrap { display:none!important; } .story-grid { grid-template-columns:1fr!important; } .story-grid > div:nth-child(2) { display:none; } }
        `}</style>
      </Head>

      <div style={{fontFamily:"'Inter',system-ui,sans-serif", background:IV, minHeight:'100vh', overflowX:'hidden'}}>

        {/* ─── NAV ─────────────────────────────────────────────────── */}
        <nav style={{position:'sticky',top:0,zIndex:100,background:'rgba(250,249,247,0.95)',backdropFilter:'blur(8px)',borderBottom:`1px solid ${BD}`,padding:'0 32px',display:'flex',alignItems:'center',justifyContent:'space-between',height:60}}>
          <img src="/logo-ecrira.png" alt="Ecrira" style={{height:46,width:'auto'}}/>
          <div style={{display:'flex',alignItems:'center',gap:24}}>
            <a href="#fonctionnalites" style={{fontSize:13,color:'#6B7069',textDecoration:'none',display:'none'}}>Fonctionnalités</a>
            <a href="#tarifs" style={{fontSize:13,color:'#6B7069',textDecoration:'none'}}>Tarifs</a>
            <a href="#faq" style={{fontSize:13,color:'#6B7069',textDecoration:'none'}}>FAQ</a>
            <button onClick={()=>setShowAuthModal(true)} style={{padding:'7px 16px',borderRadius:8,border:`1px solid rgba(81,103,86,0.3)`,background:'transparent',color:F,fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>Se connecter</button>
            <button onClick={()=>{setAuthMode('signup');setShowAuthModal(true)}} style={{padding:'7px 16px',borderRadius:8,background:F,border:'none',fontSize:13,color:'white',cursor:'pointer',fontWeight:500,fontFamily:'inherit'}}>Essai gratuit 7 jours →</button>
          </div>
        </nav>

        {/* ─── HERO ────────────────────────────────────────────────── */}
        <section style={{padding:'80px 32px 64px',textAlign:'center',background:IV,maxWidth:800,margin:'0 auto'}}>
          <div style={{display:'inline-block',background:'rgba(81,103,86,0.08)',color:F,fontSize:11,fontWeight:600,padding:'4px 14px',borderRadius:20,letterSpacing:'0.07em',marginBottom:20}}>Générateur LinkedIn · 7 jours Pro gratuits</div>
          <h1 style={{fontSize:'clamp(32px,5vw,52px)',fontWeight:700,color:CH,lineHeight:1.1,marginBottom:18,letterSpacing:'-1.5px'}} className="hero-h1">
            <span className="hero-word" style={{animationDelay:'0s'}}>Générez </span>
            <span className="hero-word" style={{animationDelay:'0.1s'}}>vos </span>
            <span className="hero-word" style={{animationDelay:'0.2s'}}>posts </span>
            <span className="hero-word" style={{animationDelay:'0.3s'}}>LinkedIn</span>
            <br/>
            <span className="hero-word" style={{animationDelay:'0.5s',color:F}}>en 30 secondes. </span>
            <span className="hero-word" style={{animationDelay:'0.7s',color:F}}>Gratuitement.</span>
          </h1>
          <p style={{fontSize:16,color:'#6B7069',lineHeight:1.7,maxWidth:520,margin:'0 auto 12px',animation:'fadeUp 0.6s 1s both'}}>
            Ecrira écrit vos posts LinkedIn, crée vos visuels et planifie tout depuis votre activité.<br/>
            <strong style={{color:CH}}>L'alternative au ghostwriting, en 10x moins cher.</strong>
          </p>
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:12,marginBottom:16,animation:'fadeUp 0.6s 1.1s both',flexWrap:'wrap' as const}}>
            <button onClick={scrollToDemo} className="btn-pulse btn-hover" style={{padding:'14px 32px',borderRadius:12,background:F,border:'none',fontSize:15,color:'white',fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Générer mon 1er post gratuit</button>
            <button onClick={()=>{setAuthMode('signup');setShowAuthModal(true)}} style={{padding:'14px 20px',borderRadius:12,border:`1px solid ${BD}`,background:'transparent',fontSize:15,color:CH,cursor:'pointer',fontFamily:'inherit'}}>Créer mon compte freemium</button>
          </div>
          <div style={{animation:'fadeUp 0.6s 1.2s both',display:'flex',alignItems:'center',justifyContent:'center',gap:16,flexWrap:'wrap' as const}}>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <span style={{color:'#F59E0B',fontSize:14}}>★★★★★</span>
              <span style={{fontSize:13,fontWeight:600,color:CH}}>4.9/5</span>
            </div>
            <span style={{color:BD}}>·</span>
            <span style={{fontSize:13,color:'#6B7069'}}>2 400+ créateurs nous font confiance</span>
          </div>

          {/* First testimonial card in hero */}
          <div style={{marginTop:32,background:'white',borderRadius:16,border:`1px solid ${BD}`,padding:20,textAlign:'left',boxShadow:'0 4px 24px rgba(31,36,33,0.06)',maxWidth:480,margin:'32px auto 0',animation:'fadeUp 0.6s 1.3s both'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
              <div style={{width:40,height:40,borderRadius:'50%',background:F,display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:700,fontSize:14,flexShrink:0}}>ML</div>
              <div>
                <div style={{fontWeight:600,fontSize:13,color:CH}}>Marie L.</div>
                <div style={{fontSize:11,color:'#666'}}>Fondatrice · SaaS B2B</div>
              </div>
              <span style={{marginLeft:'auto',fontSize:11,color:'#666'}}>2 h</span>
            </div>
            <div style={{fontSize:13,color:CH,lineHeight:1.7,whiteSpace:'pre-line' as const}}>{`Personne ne te le dira mais :\n\nUn bon post LinkedIn, ce n'est pas du talent.\nC'est une méthode.\n\nJ'ai testé 90 jours avec Ecrira.\nRésultat : +3 200 abonnés et 14 leads qualifiés.`}</div>
            <div style={{display:'flex',gap:16,marginTop:12,paddingTop:10,borderTop:`1px solid ${BD}`,fontSize:12,color:'#666'}}>
              <span>👍 ❤️ 34</span><span style={{marginLeft:'auto'}}>24 commentaires</span>
            </div>
          </div>
        </section>

        {/* ─── LOGOS ───────────────────────────────────────────────── */}
        <section style={{padding:'24px 32px',borderTop:`1px solid ${BD}`,borderBottom:`1px solid ${BD}`,background:'white'}}>
          <p style={{textAlign:'center',fontSize:12,fontWeight:600,color:'#B7C0B8',letterSpacing:'0.08em',marginBottom:16}}>ILS ÉCRIVENT AVEC ECRIRA</p>
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:32,flexWrap:'wrap' as const}}>
            {['Nooma','Pivot','Loopstack','Fondly','Verso','Brickly'].map(name=>(
              <span key={name} style={{fontSize:14,fontWeight:600,color:'#B7C0B8',letterSpacing:'-0.3px'}}>{name}</span>
            ))}
          </div>
        </section>

        {/* ─── STORYTELLING ──────────────────────────────────────────── */}
        <section style={{padding:'72px 32px',background:IV,borderTop:`1px solid ${BD}`}}>
          <div style={{maxWidth:860,margin:'0 auto'}}>
            <div style={{textAlign:'center',marginBottom:48}}>
              <h2 style={{fontSize:32,fontWeight:700,color:CH,marginBottom:10,letterSpacing:'-0.5px'}}>Vous avez des idées. Vous ne publiez jamais.</h2>
              <p style={{fontSize:15,color:'#6B7069',lineHeight:1.7,maxWidth:500,margin:'0 auto'}}>La page blanche. Le manque de temps. La peur du jugement. Résultat : vos concurrents publient, vous regardez.</p>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:24,alignItems:'center'}} className="story-grid">
              {/* AVANT */}
              <div style={{background:'#FEF2F2',borderRadius:16,border:'1px solid #FECACA',padding:28}}>
                <div style={{fontSize:12,fontWeight:700,color:'#EF4444',letterSpacing:'0.08em',marginBottom:16}}>AVANT ECRIRA</div>
                {[
                  "3h par semaine à fixer une page blanche",
                  "Des posts qui restent en brouillon indéfiniment",
                  "Vos concurrents publient, vous regardez",
                  "0 leads générés via LinkedIn cette année",
                ].map((item,i)=>(
                  <div key={i} style={{display:'flex',gap:10,marginBottom:12,alignItems:'flex-start'}}>
                    <span style={{color:'#EF4444',flexShrink:0,marginTop:1}}>✕</span>
                    <span style={{fontSize:13,color:'#7F1D1D',lineHeight:1.5}}>{item}</span>
                  </div>
                ))}
              </div>
              {/* FLÈCHE */}
              <div style={{textAlign:'center' as const,fontSize:28,color:BD}}>→</div>
              {/* APRÈS */}
              <div style={{background:'rgba(81,103,86,0.06)',borderRadius:16,border:`1px solid rgba(81,103,86,0.2)`,padding:28}}>
                <div style={{fontSize:12,fontWeight:700,color:F,letterSpacing:'0.08em',marginBottom:16}}>APRÈS ECRIRA</div>
                {[
                  "30 secondes par post, 3 posts par semaine",
                  "Visuels professionnels générés automatiquement",
                  "Publication planifiée sans y penser",
                  "+40% de leads inbound en 2 mois en moyenne",
                ].map((item,i)=>(
                  <div key={i} style={{display:'flex',gap:10,marginBottom:12,alignItems:'flex-start'}}>
                    <span style={{color:F,flexShrink:0,marginTop:1}}>✓</span>
                    <span style={{fontSize:13,color:CH,lineHeight:1.5}}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{textAlign:'center' as const,marginTop:36}}>
              <button onClick={()=>{setAuthMode('signup');setShowAuthModal(true)}} style={{padding:'14px 32px',borderRadius:12,background:F,border:'none',fontSize:15,color:'white',fontWeight:600,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 4px 16px rgba(81,103,86,0.25)'}}>Passer à l'après →</button>
              <p style={{fontSize:12,color:'#9EA39C',marginTop:8}}>7 jours Pro gratuits · Sans carte bancaire</p>
            </div>
          </div>
        </section>

        {/* ─── DEMO ────────────────────────────────────────────────── */}
        <section id="generateur" style={{padding:'72px 32px',background:IV}}>
          <div style={{maxWidth:640,margin:'0 auto'}}>
            <div id="demo-section" data-animate style={{textAlign:'center',marginBottom:40}} className={`animate-up${visibleSections.has('demo-section')?' visible':''}`}>
              <div style={{display:'inline-block',background:'rgba(81,103,86,0.08)',color:F,fontSize:11,fontWeight:600,padding:'4px 14px',borderRadius:20,letterSpacing:'0.07em',marginBottom:16}}>Essai immédiat · sans inscription</div>
              <h2 style={{fontSize:32,fontWeight:700,color:CH,marginBottom:10,letterSpacing:'-0.5px'}}>Testez le générateur.</h2>
              <p style={{fontSize:14,color:'#6B7069',lineHeight:1.6}}>Décrivez votre activité. Ecrira écrit un post LinkedIn prêt à publier.</p>
            </div>
            <div style={{background:'white',borderRadius:20,border:`1px solid ${BD}`,padding:28,boxShadow:'0 4px 24px rgba(31,36,33,0.06)'}}>
              {!demoEmailSent ? (
                <>
                  <div style={{fontSize:11,fontWeight:600,color:'#9EA39C',letterSpacing:'0.07em',marginBottom:8}}>VOTRE EMAIL</div>
                  <div style={{display:'flex',gap:8,marginBottom:8}}>
                    <input value={demoEmail} onChange={e=>{setDemoEmail(e.target.value);setDemoEmailError(false)}} onKeyDown={e=>e.key==='Enter'&&handleDemoEmail()} placeholder="votre@email.com" type="email" style={{flex:1,padding:'11px 14px',borderRadius:8,border:`1px solid ${demoEmailError?'#c0392b':BD}`,fontSize:13,color:CH,fontFamily:'inherit',background:IV,outline:'none'}}/>
                    <button onClick={handleDemoEmail} style={{padding:'11px 20px',borderRadius:8,background:F,border:'none',color:'white',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap' as const}}>Continuer →</button>
                  </div>
                  {demoEmailError && <p style={{fontSize:11,color:'#c0392b',marginBottom:6}}>Email invalide.</p>}
                  <p style={{fontSize:11,color:'#B7C0B8'}}>Aucune carte requise · Résultat en 2 secondes</p>
                </>
              ) : (
                <>
                  <div style={{fontSize:11,fontWeight:600,color:'#9EA39C',letterSpacing:'0.07em',marginBottom:8}}>VOTRE ACTIVITÉ OU SUJET</div>
                  <textarea value={demoTopic} onChange={e=>setDemoTopic(e.target.value.slice(0,280))} placeholder="Ex: Je suis consultant cybersécurité pour les PME..." style={{width:'100%',padding:'12px 14px',borderRadius:8,border:`1px solid ${BD}`,fontSize:13,color:CH,fontFamily:'inherit',background:IV,outline:'none',resize:'none' as const,minHeight:80,boxSizing:'border-box' as const,marginBottom:4}} onKeyDown={e=>e.key==='Enter'&&e.ctrlKey&&handleDemoGenerate()}/>
                  <div style={{fontSize:11,color:'#B7C0B8',textAlign:'right' as const,marginBottom:12}}>{demoTopic.length}/280</div>
                  <div style={{fontSize:11,fontWeight:600,color:'#9EA39C',letterSpacing:'0.07em',marginBottom:8}}>TON DU POST</div>
                  <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap' as const}}>
                    {tones.map(t=>(
                      <button key={t.id} onClick={()=>setDemoTone(t.id)} style={{flex:1,padding:'8px 12px',borderRadius:8,border:`1px solid ${demoTone===t.id?F:BD}`,background:demoTone===t.id?'rgba(81,103,86,0.06)':'transparent',cursor:'pointer',fontFamily:'inherit',textAlign:'left' as const,minWidth:90}}>
                        <div style={{fontSize:12,fontWeight:600,color:demoTone===t.id?F:CH}}>{t.label}</div>
                        <div style={{fontSize:11,color:'#9EA39C'}}>{t.desc}</div>
                      </button>
                    ))}
                  </div>
                  <button onClick={handleDemoGenerate} disabled={demoLoading||!demoTopic.trim()} style={{width:'100%',padding:'13px',borderRadius:10,background:F,border:'none',color:'white',fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:8,opacity:demoLoading||!demoTopic.trim()?0.7:1,marginBottom:16}}>
                    {demoLoading ? <><div className="spinner-white"/>Génération en cours…</> : '✦ Générer mon post LinkedIn'}
                  </button>
                  {(demoPost || demoLoading) && (
                    <div style={{background:IV,border:`1px solid ${BD}`,borderRadius:8,padding:14,minHeight:80,fontSize:13,color:demoPost?CH:'#B7C0B8',lineHeight:1.8,whiteSpace:'pre-line' as const,fontStyle:demoPost?'normal':'italic'}}>
                      {demoPost || 'Génération en cours…'}
                    </div>
                  )}
                  {demoPost && (
                    <div style={{marginTop:12,background:`rgba(81,103,86,0.06)`,border:`1px solid rgba(81,103,86,0.2)`,borderRadius:10,padding:'14px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap' as const}}>
                      <div>
                        <div style={{fontSize:13,fontWeight:600,color:CH,marginBottom:2}}>Vous aimez ce résultat ?</div>
                        <div style={{fontSize:12,color:'#6B7069'}}>Créez votre compte pour accéder à toutes les fonctionnalités.</div>
                      </div>
                      <button onClick={()=>{setAuthMode('signup');setShowAuthModal(true)}} style={{padding:'10px 20px',borderRadius:8,background:F,border:'none',color:'white',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap' as const,flexShrink:0}}>Créer mon compte gratuit →</button>
                    </div>
                  )}
                </>
              )}
              <p style={{textAlign:'center' as const,marginTop:14,fontSize:11,color:'#9EA39C'}}>Résultat limité · <a href="#" onClick={e=>{e.preventDefault();setAuthMode('signup');setShowAuthModal(true)}} style={{color:F,textDecoration:'none'}}>Créer un compte gratuit</a> pour toutes les fonctionnalités</p>
            </div>
          </div>
        </section>

        {/* ─── 3 ÉTAPES ────────────────────────────────────────────── */}
        <section style={{padding:'72px 32px',background:'white',borderTop:`1px solid ${BD}`}}>
          <div style={{maxWidth:800,margin:'0 auto'}}>
            <div id="steps-title" data-animate style={{textAlign:'center',marginBottom:48}} className={`animate-up${visibleSections.has('steps-title')?' visible':''}`}>
              <h2 style={{fontSize:32,fontWeight:700,color:CH,marginBottom:10,letterSpacing:'-0.5px'}}>Un post LinkedIn de qualité en 3 étapes</h2>
              <p style={{fontSize:14,color:'#6B7069'}}>Pas de prompts à maîtriser, pas de tableaux Excel. Juste votre activité.</p>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:32}} className="grid-3">
              {steps.map((s,i)=>(
                <div key={i} id={`step-${i}`} data-animate style={{textAlign:'center'}} className={`animate-up${visibleSections.has(`step-${i}`)?' visible':''}`} >
                  <div style={{fontSize:36,fontWeight:700,color:BD,marginBottom:12,letterSpacing:'-1px'}}>{s.n}</div>
                  <h3 style={{fontSize:16,fontWeight:600,color:CH,marginBottom:8}}>{s.title}</h3>
                  <p style={{fontSize:13,color:'#6B7069',lineHeight:1.6}}>{s.desc}</p>
                  {i < 2 && <div style={{fontSize:24,color:BD,marginTop:16,display:'none'}}>→</div>}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── FEATURES ────────────────────────────────────────────── */}
        <section id="fonctionnalites" style={{padding:'72px 32px',background:IV,borderTop:`1px solid ${BD}`}}>
          <div style={{maxWidth:960,margin:'0 auto'}}>
            <div id="feat-title" data-animate style={{textAlign:'center',marginBottom:48}} className={`animate-up${visibleSections.has('feat-title')?' visible':''}`}>
              <h2 style={{fontSize:32,fontWeight:700,color:CH,marginBottom:10,letterSpacing:'-0.5px'}}>Tout pour automatiser vos posts LinkedIn</h2>
              <p style={{fontSize:14,color:'#6B7069'}}>De l'idée à la publication. Vous gardez votre voix, on s'occupe du reste.</p>
            </div>
            <div id="feats-grid" data-animate style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16}} className={`grid-4 animate-up${visibleSections.has('feats-grid')?' visible':''}`}>
              {features.map((f,i)=>(
                <div key={i} className="card-stagger card-hover" style={{padding:20,borderRadius:12,border:`1px solid ${BD}`,background:'white',transition:'opacity 0.4s, transform 0.4s, box-shadow 0.2s'}}>
                  <div style={{fontSize:28,marginBottom:12}}>{f.icon}</div>
                  <div style={{fontSize:14,fontWeight:600,color:CH,marginBottom:6}}>{f.title}</div>
                  <div style={{fontSize:13,color:'#6B7069',lineHeight:1.6}}>{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── COMPTEURS ───────────────────────────────────────────── */}
        <section ref={counterRef} style={{padding:'56px 32px',background:F}}>
          <div style={{maxWidth:700,margin:'0 auto',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:32,textAlign:'center'}} className="grid-3">
            <div><div style={{fontSize:40,fontWeight:700,color:C,lineHeight:1}}>{counter1.toLocaleString()}+</div><div style={{fontSize:13,color:'rgba(255,255,255,0.6)',marginTop:6}}>créateurs actifs</div></div>
            <div><div style={{fontSize:40,fontWeight:700,color:C,lineHeight:1}}>{counter2.toLocaleString()}</div><div style={{fontSize:13,color:'rgba(255,255,255,0.6)',marginTop:6}}>posts générés</div></div>
            <div><div style={{fontSize:40,fontWeight:700,color:C,lineHeight:1}}>30s</div><div style={{fontSize:13,color:'rgba(255,255,255,0.6)',marginTop:6}}>par post en moyenne</div></div>
          </div>
        </section>

        {/* ─── TÉMOIGNAGES ─────────────────────────────────────────── */}
        <section style={{padding:'72px 32px',background:IV,borderTop:`1px solid ${BD}`}}>
          <div style={{maxWidth:960,margin:'0 auto'}}>
            <div id="testi-title" data-animate style={{textAlign:'center',marginBottom:48}} className={`animate-up${visibleSections.has('testi-title')?' visible':''}`}>
              <h2 style={{fontSize:32,fontWeight:700,color:CH,marginBottom:10,letterSpacing:'-0.5px'}}>Ils ont remplacé leur ghostwriter LinkedIn</h2>
              <p style={{fontSize:14,color:'#6B7069'}}>2 400+ créateurs, freelances et fondateurs publient avec Ecrira chaque semaine.</p>
            </div>
            <div id="testi-grid" data-animate style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}} className={`grid-3 animate-up${visibleSections.has('testi-grid')?' visible':''}`}>
              {testimonials.map((t,i)=>(
                <div key={i} className="card-hover" style={{background:'white',borderRadius:16,border:`1px solid ${BD}`,padding:20,boxShadow:'0 2px 12px rgba(31,36,33,0.04)'}}>
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
                    <div style={{width:40,height:40,borderRadius:'50%',background:F,display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:700,fontSize:13,flexShrink:0}}>{t.initials}</div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:600,fontSize:13,color:CH}}>{t.name}</div>
                      <div style={{fontSize:11,color:'#666'}}>{t.role}</div>
                    </div>
                    <span style={{fontSize:11,color:'#666',flexShrink:0}}>{t.time}</span>
                  </div>
                  <div style={{fontSize:13,color:CH,lineHeight:1.7,whiteSpace:'pre-line' as const,marginBottom:12}}>{t.content}</div>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#666',paddingTop:10,borderTop:`1px solid ${BD}`}}>
                    <span>👍 ❤️ {t.likes}</span>
                    <span>{t.comments} commentaires</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── PRICING ─────────────────────────────────────────────── */}
        <section id="tarifs" style={{padding:'72px 32px',background:'white',borderTop:`1px solid ${BD}`}}>
          <div style={{maxWidth:860,margin:'0 auto'}}>
            <div id="pricing-title" data-animate style={{textAlign:'center',marginBottom:48}} className={`animate-up${visibleSections.has('pricing-title')?' visible':''}`}>
              <h2 style={{fontSize:32,fontWeight:700,color:CH,marginBottom:10,letterSpacing:'-0.5px'}}>Des tarifs simples. Commencez gratuitement.</h2>
              <p style={{fontSize:14,color:'#6B7069'}}>Aucune carte requise. Passez Pro quand vous voulez. Annulation en un clic.</p>
            </div>
            <div id="pricing-grid" data-animate style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}} className={`grid-3 animate-up${visibleSections.has('pricing-grid')?' visible':''}`}>
              {/* Free */}
              <div style={{padding:24,borderRadius:16,border:`1px solid ${BD}`,background:IV}}>
                <div style={{fontSize:14,fontWeight:600,color:CH,marginBottom:4}}>Free</div>
                <div style={{fontSize:12,color:'#6B7069',marginBottom:16}}>Testez sans engagement.</div>
                <div style={{fontSize:32,fontWeight:700,color:CH,marginBottom:4}}>0€</div>
                <div style={{fontSize:12,color:'#9EA39C',marginBottom:20}}>pour toujours</div>
                {['3 posts LinkedIn générés','3 visuels','Tous les tons','Export copier-coller'].map(f=>(
                  <div key={f} style={{fontSize:13,color:'#6B7069',marginBottom:8,display:'flex',gap:8}}><span style={{color:F,flexShrink:0}}>✓</span>{f}</div>
                ))}
                <button onClick={()=>{setAuthMode('signup');setShowAuthModal(true)}} style={{width:'100%',padding:'11px',borderRadius:10,border:`1px solid ${BD}`,background:'transparent',color:CH,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',marginTop:16}}>Commencer gratuitement</button>
              </div>
              {/* Pro */}
              <div style={{padding:24,borderRadius:16,border:`2px solid ${F}`,background:'white',position:'relative' as const}}>
                <div style={{position:'absolute' as const,top:-12,left:'50%',transform:'translateX(-50%)',background:F,color:'white',fontSize:11,fontWeight:600,padding:'3px 12px',borderRadius:20,whiteSpace:'nowrap' as const}}>Le plus populaire</div>
                <div style={{fontSize:14,fontWeight:600,color:CH,marginBottom:4}}>Pro</div>
                <div style={{fontSize:12,color:'#6B7069',marginBottom:16}}>Pour publier régulièrement.</div>
                <div style={{fontSize:32,fontWeight:700,color:CH,marginBottom:4}}>15,90€</div>
                <div style={{fontSize:12,color:'#9EA39C',marginBottom:20}}>/ mois</div>
                {['Posts illimités','Visuels illimités','Planification LinkedIn','Analyse de performances','Voix personnalisée','Support prioritaire'].map(f=>(
                  <div key={f} style={{fontSize:13,color:CH,marginBottom:8,display:'flex',gap:8}}><span style={{color:F,flexShrink:0}}>✓</span>{f}</div>
                ))}
                <button onClick={()=>{setAuthMode('signup');setShowAuthModal(true)}} style={{width:'100%',padding:'11px',borderRadius:10,background:F,border:'none',color:'white',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',marginTop:16}}>Démarrer Pro →</button>
              </div>
              {/* Agency */}
              <div style={{padding:24,borderRadius:16,border:`1px solid ${BD}`,background:IV}}>
                <div style={{fontSize:14,fontWeight:600,color:CH,marginBottom:4}}>Agency</div>
                <div style={{fontSize:12,color:'#6B7069',marginBottom:16}}>Pour gérer plusieurs profils.</div>
                <div style={{fontSize:32,fontWeight:700,color:CH,marginBottom:4}}>49,99€</div>
                <div style={{fontSize:12,color:'#9EA39C',marginBottom:20}}>/ mois</div>
                {["Tout Pro inclus","Jusqu'à 10 profils","Espaces de travail","Validation multi-utilisateurs","Account manager dédié"].map(f=>(
                  <div key={f} style={{fontSize:13,color:'#6B7069',marginBottom:8,display:'flex',gap:8}}><span style={{color:F,flexShrink:0}}>✓</span>{f}</div>
                ))}
                <button onClick={()=>{setAuthMode('signup');setShowAuthModal(true)}} style={{width:'100%',padding:'11px',borderRadius:10,border:`1px solid ${BD}`,background:'transparent',color:CH,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',marginTop:16}}>Démarrer Agency</button>
              </div>
            </div>
          </div>
        </section>

        {/* ─── FAQ ─────────────────────────────────────────────────── */}
        <section id="faq" style={{padding:'72px 32px',background:IV,borderTop:`1px solid ${BD}`}}>
          <div style={{maxWidth:680,margin:'0 auto'}}>
            <div id="faq-title" data-animate style={{textAlign:'center',marginBottom:40}} className={`animate-up${visibleSections.has('faq-title')?' visible':''}`}>
              <h2 style={{fontSize:32,fontWeight:700,color:CH,marginBottom:10,letterSpacing:'-0.5px'}}>Questions fréquentes</h2>
              <p style={{fontSize:14,color:'#6B7069'}}>Tout ce qu'il faut savoir avant de générer votre premier post.</p>
            </div>
            <div>
              {faqs.map((f,i)=>(
                <div key={i} style={{borderBottom:`1px solid ${BD}`,overflow:'hidden'}}>
                  <button onClick={()=>setFaqOpen(faqOpen===i?null:i)} className="faq-hover" style={{width:'100%',padding:'16px 0',display:'flex',alignItems:'center',justifyContent:'space-between',background:'transparent',border:'none',cursor:'pointer',fontFamily:'inherit',textAlign:'left' as const,borderRadius:8,transition:'background 0.15s'}}>
                    <span style={{fontSize:14,fontWeight:500,color:CH}}>{f.q}</span>
                    <span style={{fontSize:18,color:'#9EA39C',transform:faqOpen===i?'rotate(45deg)':'none',transition:'transform 0.2s',flexShrink:0,marginLeft:12}}>+</span>
                  </button>
                  {faqOpen===i && <div style={{paddingBottom:16,fontSize:13,color:'#6B7069',lineHeight:1.7}}>{f.a}</div>}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── CTA FINAL ───────────────────────────────────────────── */}
        <section style={{padding:'80px 32px',textAlign:'center',background:CH}}>
          <div id="cta-final" data-animate style={{maxWidth:560,margin:'0 auto'}} className={`animate-up${visibleSections.has('cta-final')?' visible':''}`}>
            <h2 style={{fontSize:36,fontWeight:700,color:'white',marginBottom:12,letterSpacing:'-0.8px',lineHeight:1.2}}>Votre prochain post LinkedIn est à 30 secondes d'ici.</h2>
            <p style={{fontSize:15,color:'rgba(255,255,255,0.55)',marginBottom:32,lineHeight:1.6}}>3 posts + 3 visuels gratuits. Sans carte. Sans engagement.</p>
            <button onClick={()=>{setAuthMode('signup');setShowAuthModal(true)}} style={{padding:'16px 40px',borderRadius:14,background:C,border:'none',fontSize:16,color:CH,fontWeight:700,cursor:'pointer',fontFamily:'inherit',letterSpacing:'-0.2px'}}>Créer mon compte gratuit →</button>
          </div>
        </section>

        {/* ─── FOOTER ──────────────────────────────────────────────── */}
        <footer style={{padding:'32px',borderTop:`1px solid ${BD}`,background:IV}}>
          <div style={{maxWidth:960,margin:'0 auto',display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr',gap:32,marginBottom:32}} className="grid-4">
            <div>
              <img src="/logo-ecrira.png" alt="Ecrira" style={{height:28,width:'auto',marginBottom:12}}/>
              <p style={{fontSize:12,color:'#9EA39C',lineHeight:1.6,maxWidth:240}}>Générez, illustrez et planifiez vos posts LinkedIn en quelques minutes.</p>
            </div>
            <div>
              <div style={{fontSize:12,fontWeight:600,color:CH,marginBottom:12}}>Produit</div>
              {['Fonctionnalités','Tarifs','Cas d\'usage'].map(l=>(
                <div key={l} style={{marginBottom:8}}><a href={`#${l.toLowerCase().replace(' ','').replace("'","")}`} style={{fontSize:13,color:'#6B7069',textDecoration:'none'}}>{l}</a></div>
              ))}
            </div>
            <div>
              <div style={{fontSize:12,fontWeight:600,color:CH,marginBottom:12}}>Ressources</div>
              {['Blog','FAQ'].map(l=>(
                <div key={l} style={{marginBottom:8}}><a href="#" style={{fontSize:13,color:'#6B7069',textDecoration:'none'}}>{l}</a></div>
              ))}
            </div>
            <div>
              <div style={{fontSize:12,fontWeight:600,color:CH,marginBottom:12}}>Légal</div>
              {['Mentions légales','Confidentialité','CGU'].map(l=>(
                <div key={l} style={{marginBottom:8}}><a href="#" style={{fontSize:13,color:'#6B7069',textDecoration:'none'}}>{l}</a></div>
              ))}
            </div>
          </div>
          <div style={{borderTop:`1px solid ${BD}`,paddingTop:20,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap' as const,gap:8}}>
            <span style={{fontSize:12,color:'#9EA39C'}}>© 2026 Ecrira. Tous droits réservés.</span>
            <span style={{fontSize:12,color:'#B7C0B8'}}>Fait avec ❤️ en France</span>
          </div>
        </footer>

        {/* ─── AUTH MODAL ──────────────────────────────────────────── */}
        {showAuthModal && (
          <div onClick={()=>setShowAuthModal(false)} style={{position:'fixed',inset:0,zIndex:600,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(4px)',padding:20}}>
            <div onClick={e=>e.stopPropagation()} style={{background:'white',borderRadius:20,width:'100%',maxWidth:420,boxShadow:'0 24px 64px rgba(0,0,0,0.2)',overflow:'hidden'}}>
              <div style={{background:F,padding:'24px 28px 20px'}}>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
                  <div style={{background:'white',borderRadius:10,width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <img src="/logo-ecrira-icon.png" alt="Ecrira" style={{height:22,width:'auto'}}/>
                  </div>
                  <span style={{fontSize:15,fontWeight:600,color:'white'}}>Ecrira</span>
                </div>
                <div style={{fontSize:20,fontWeight:700,color:'white',marginBottom:4}}>{authMode==='login'?'Connexion':'Créer un compte'}</div>
                <div style={{fontSize:13,color:'rgba(255,255,255,0.65)'}}>7 jours Pro gratuits · Sans carte bancaire</div>
              </div>
              <div style={{padding:'24px 28px 28px'}}>
                <button onClick={handleGoogle} disabled={authLoading} style={{width:'100%',padding:'11px',borderRadius:10,border:`1px solid ${BD}`,background:'white',display:'flex',alignItems:'center',justifyContent:'center',gap:10,fontSize:14,color:CH,cursor:'pointer',fontFamily:'inherit',marginBottom:16,fontWeight:500}}>
                  <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  Continuer avec Google
                </button>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
                  <div style={{flex:1,height:1,background:BD}}/><span style={{fontSize:12,color:'#9EA39C'}}>ou</span><div style={{flex:1,height:1,background:BD}}/>
                </div>
                <input value={authEmail} onChange={e=>setAuthEmail(e.target.value)} placeholder="Email" type="email" style={{width:'100%',padding:'11px 14px',borderRadius:8,border:`1px solid ${BD}`,fontSize:13,color:CH,fontFamily:'inherit',background:IV,outline:'none',marginBottom:8,boxSizing:'border-box' as const}}/>
                <input value={authPassword} onChange={e=>setAuthPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleEmailAuth()} placeholder="Mot de passe" type="password" style={{width:'100%',padding:'11px 14px',borderRadius:8,border:`1px solid ${BD}`,fontSize:13,color:CH,fontFamily:'inherit',background:IV,outline:'none',marginBottom:12,boxSizing:'border-box' as const}}/>
                {authError && <p style={{fontSize:12,color:authError.includes('Vérifiez')?F:'#c0392b',marginBottom:10}}>{authError}</p>}
                <button onClick={handleEmailAuth} disabled={authLoading} style={{width:'100%',padding:'12px',borderRadius:10,background:F,border:'none',color:'white',fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit',marginBottom:12,opacity:authLoading?0.7:1}}>
                  {authLoading?'Chargement…':authMode==='login'?'Se connecter':'Créer mon compte'}
                </button>
                <p style={{textAlign:'center' as const,fontSize:12,color:'#9EA39C'}}>
                  {authMode==='login'?'Pas encore de compte ? ':'Déjà un compte ? '}
                  <span onClick={()=>{setAuthMode(authMode==='login'?'signup':'login');setAuthError('')}} style={{color:F,cursor:'pointer',fontWeight:500}}>{authMode==='login'?"S'inscrire":'Se connecter'}</span>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
