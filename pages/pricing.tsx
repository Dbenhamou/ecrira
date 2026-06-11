import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import Head from 'next/head';

const pricingT = {
  fr: {
    tab_title: 'Tarifs — Ecrira',
    eyebrow: 'Tarifs simples',
    title: 'Choisissez votre plan',
    subtitle: 'Commencez gratuitement, passez au Pro quand vous êtes prêt.',
    per_month: '/mois',
    free_tagline: 'Pour découvrir Ecrira',
    free_features: ['5 posts générés à vie', 'Génération IA basique', "Style d'écriture personnalisé", 'Visuels LinkedIn', 'Calendrier éditorial', 'Publication directe'],
    free_cta: 'Commencer gratuitement',
    popular: 'Populaire',
    pro_tagline: 'Pour les créateurs sérieux',
    pro_features: ['Posts illimités', 'Génération IA avancée', "Style d'écriture personnalisé", 'Visuels LinkedIn', 'Calendrier éditorial', 'Publication directe LinkedIn'],
    pro_cta: 'Passer en Pro',
    loading: 'Chargement...',
    team_tagline: 'Multi-comptes & collaboration',
    team_features: ['Tout le plan Pro', 'Plusieurs utilisateurs', 'Tableau de bord partagé', 'Facturation centralisée'],
    team_cta: 'Bientôt disponible',
  },
  en: {
    tab_title: 'Pricing — Ecrira',
    eyebrow: 'Simple pricing',
    title: 'Choose your plan',
    subtitle: 'Start for free, upgrade to Pro when you are ready.',
    per_month: '/month',
    free_tagline: 'To discover Ecrira',
    free_features: ['5 posts included', 'Basic AI generation', 'Custom writing style', 'LinkedIn visuals', 'Editorial calendar', 'Direct publishing'],
    free_cta: 'Get started for free',
    popular: 'Popular',
    pro_tagline: 'For serious creators',
    pro_features: ['Unlimited posts', 'Advanced AI generation', 'Custom writing style', 'LinkedIn visuals', 'Editorial calendar', 'Direct LinkedIn publishing'],
    pro_cta: 'Upgrade to Pro',
    loading: 'Loading...',
    team_tagline: 'Multi-accounts & collaboration',
    team_features: ['Everything in Pro', 'Multiple users', 'Shared dashboard', 'Centralized billing'],
    team_cta: 'Coming soon',
  },
}

export default function Pricing() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [lang, setLang] = useState<'fr'|'en'>('fr');
  const [annual, setAnnual] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistSent, setWaitlistSent] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    // Détecter la langue depuis le profil Supabase ou navigator
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data } = await supabase.from('profiles').select('lang').eq('id', session.user.id).single();
        if (data?.lang) { setLang(data.lang as 'fr'|'en'); return; }
      }
      const browserLang = navigator.language.startsWith('fr') ? 'fr' : 'en';
      setLang(browserLang);
    });
  }, []);

  const T = pricingT[lang];

  const handleUpgrade = async () => {
    if (!user) { router.push('/login'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      });
      const { url } = await res.json();
      window.location.href = url;
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>{T.tab_title}</title>
        <script defer data-domain="ecrira.com" src="https://plausible.io/js/pa-JoffvncprLIz4FmqjAnDr.js"></script>
        <meta name="description" content={lang==='fr'?"Ecrira génère vos posts LinkedIn en quelques secondes grâce à l'IA. Commencez gratuitement.":"Ecrira generates your LinkedIn posts in seconds with AI. Start for free."} />
        <meta property="og:title" content="Ecrira — Générateur de posts LinkedIn par IA" />
        <meta property="og:description" content="Générez des posts LinkedIn percutants en 30 secondes." />
        <meta property="og:image" content="https://ecrira.com/og-image.png" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <link href="https://fonts.googleapis.com/css2?family=Clash+Display:wght@400;600;700&family=Inter:wght@400;500&display=swap" rel="stylesheet" />
      </Head>
      {/* Header navigation */}
      <div style={{position:'sticky',top:0,zIndex:100,background:'white',borderBottom:'1px solid #E3DED7',padding:'12px 24px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <a href="/" style={{display:'flex',alignItems:'center',gap:8,textDecoration:'none'}}>
          <img src="/logo-ecrira.png" alt="Ecrira" style={{height:24,width:'auto'}} />
        </a>
        <div style={{display:'flex',gap:10}}>
          {user ? (
            <a href="/" style={{fontSize:13,color:'white',textDecoration:'none',padding:'7px 14px',borderRadius:8,background:'#516756',fontFamily:"'Inter',sans-serif",fontWeight:500}}>{lang==='fr'?'Accéder à mon compte':'Go to my account'}</a>
          ) : (
            <>
              <a href="/login" style={{fontSize:13,color:'#516756',textDecoration:'none',padding:'7px 14px',borderRadius:8,border:'1px solid rgba(81,103,86,0.3)',fontFamily:"'Inter',sans-serif"}}>{lang==='fr'?'Se connecter':'Sign in'}</a>
              <a href="/login" style={{fontSize:13,color:'white',textDecoration:'none',padding:'7px 14px',borderRadius:8,background:'#516756',fontFamily:"'Inter',sans-serif",fontWeight:500}}>{lang==='fr'?'Commencer gratuitement':'Start for free'}</a>
            </>
          )}
        </div>
      </div>

      <main style={{
        minHeight: '100vh',
        background: '#FAF9F7',
        fontFamily: "'Inter', sans-serif",
        padding: '60px 20px',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <p style={{ color: '#516756', fontFamily: "'Clash Display', sans-serif", fontSize: '14px', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '12px' }}>
{T.eyebrow}
          </p>
          <h1 style={{ fontFamily: "'Clash Display', sans-serif", fontSize: '48px', fontWeight: 700, color: '#1F2421', margin: '0 0 16px' }}>
{T.title}
          </h1>
          <p style={{ color: '#516756', fontSize: '18px', maxWidth: '480px', margin: '0 auto', lineHeight: 1.6 }}>{T.subtitle}</p>
          <div style={{display:'flex',alignItems:'center',gap:12,justifyContent:'center',marginTop:24}}>
            <span style={{fontSize:14,color:!annual?'#1F2421':'#B7C0B8',fontWeight:!annual?600:400}}>{lang==='fr'?'Mensuel':'Monthly'}</span>
            <div onClick={()=>setAnnual(v=>!v)} style={{width:46,height:26,borderRadius:13,background:annual?'#516756':'#E3DED7',cursor:'pointer',position:'relative',transition:'background 0.2s'}}>
              <div style={{position:'absolute',top:3,left:annual?23:3,width:20,height:20,borderRadius:'50%',background:'white',transition:'left 0.2s',boxShadow:'0 1px 4px rgba(0,0,0,0.15)'}}/>
            </div>
            <span style={{fontSize:14,color:annual?'#1F2421':'#B7C0B8',fontWeight:annual?600:400}}>{lang==='fr'?'Annuel':'Annual'}<span style={{marginLeft:6,fontSize:11,background:'#D9C8A3',color:'#1F2421',padding:'2px 7px',borderRadius:20,fontWeight:600}}>-20%</span></span>
          </div>
        </div>

        {/* Cards */}
        <div style={{
          display: 'flex',
          gap: '24px',
          maxWidth: '1000px',
          margin: '0 auto',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
          {/* Free */}
          <div style={{
            flex: '1',
            minWidth: '280px',
            maxWidth: '320px',
            background: '#fff',
            border: '1.5px solid #B7C0B8',
            borderRadius: '20px',
            padding: '40px 32px',
          }}>
            <p style={{ fontFamily: "'Clash Display', sans-serif", fontSize: '13px', letterSpacing: '2px', textTransform: 'uppercase', color: '#516756', marginBottom: '8px' }}>Free</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '8px' }}>
              <span style={{ fontFamily: "'Clash Display', sans-serif", fontSize: '48px', fontWeight: 700, color: '#1F2421' }}>0€</span>
              <span style={{ color: '#B7C0B8', fontSize: '15px' }}>{T.per_month}</span>
            </div>
            <p style={{ color: '#516756', fontSize: '14px', marginBottom: '32px' }}>{T.free_tagline}</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 40px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                ...T.free_features.map((f,i) => i < 3 ? f : '✗ ' + f),
              ].map((f, i) => (
                <li key={i} style={{ fontSize: '14px', color: f.startsWith('✗') ? '#B7C0B8' : '#1F2421', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {!f.startsWith('✗') && <span style={{ color: '#516756', fontSize: '16px' }}>✓</span>}
                  {f.startsWith('✗') && <span style={{ color: '#B7C0B8', fontSize: '16px' }}>✗</span>}
                  {f.replace('✗ ', '')}
                </li>
              ))}
            </ul>
            <button
              onClick={() => !user && router.push('/login')}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                border: '1.5px solid #B7C0B8',
                background: 'transparent',
                color: '#516756',
                fontFamily: "'Clash Display', sans-serif",
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
{T.free_cta}
            </button>
          </div>

          {/* Pro */}
          <div style={{
            flex: '1',
            minWidth: '280px',
            maxWidth: '320px',
            background: '#1F2421',
            border: '1.5px solid #1F2421',
            borderRadius: '20px',
            padding: '40px 32px',
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute',
              top: '-14px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#D9C8A3',
              color: '#1F2421',
              fontSize: '12px',
              fontFamily: "'Clash Display', sans-serif",
              fontWeight: 700,
              letterSpacing: '2px',
              textTransform: 'uppercase',
              padding: '6px 18px',
              borderRadius: '20px',
            }}>
{T.popular}
            </div>
            <p style={{ fontFamily: "'Clash Display', sans-serif", fontSize: '13px', letterSpacing: '2px', textTransform: 'uppercase', color: '#D9C8A3', marginBottom: '8px' }}>Pro</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '8px' }}>
              <span style={{ fontFamily: "'Clash Display', sans-serif", fontSize: '48px', fontWeight: 700, color: '#FAF9F7' }}>{annual?'12,90€':'15,90€'}</span>
              <span style={{ color: '#B7C0B8', fontSize: '15px' }}>{T.per_month}</span>
            </div>
            <p style={{ color: '#B7C0B8', fontSize: '14px', marginBottom: '32px' }}>{T.pro_tagline}</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 40px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                ...T.pro_features,
              ].map((f, i) => (
                <li key={i} style={{ fontSize: '14px', color: '#FAF9F7', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: '#D9C8A3', fontSize: '16px' }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={handleUpgrade}
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                border: 'none',
                background: '#D9C8A3',
                color: '#1F2421',
                fontFamily: "'Clash Display', sans-serif",
                fontSize: '15px',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? T.loading : T.pro_cta}
            </button>
          </div>

          {/* Team */}
          <div style={{
            flex: '1',
            minWidth: '280px',
            maxWidth: '320px',
            background: '#fff',
            border: '1.5px dashed #B7C0B8',
            borderRadius: '20px',
            padding: '40px 32px',
            opacity: 0.7,
          }}>
            <p style={{ fontFamily: "'Clash Display', sans-serif", fontSize: '13px', letterSpacing: '2px', textTransform: 'uppercase', color: '#516756', marginBottom: '8px' }}>Team</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '8px' }}>
              <span style={{ fontFamily: "'Clash Display', sans-serif", fontSize: '48px', fontWeight: 700, color: '#B7C0B8' }}>—</span>
            </div>
            <p style={{ color: '#B7C0B8', fontSize: '14px', marginBottom: '32px' }}>{T.team_tagline}</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 40px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {T.team_features.map((f, i) => (
                <li key={i} style={{ fontSize: '14px', color: '#B7C0B8', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '16px' }}>◦</span>
                  {f}
                </li>
              ))}
            </ul>
            {waitlistSent ? (
              <div style={{textAlign:'center',padding:'14px',background:'rgba(81,103,86,0.08)',borderRadius:12,fontSize:13,color:'#516756',fontWeight:500}}>✓ {lang==='fr'?"Inscrit sur la liste d'attente !":"Added to waitlist!"}</div>
            ) : (
              <div style={{display:'flex',gap:8}}>
                <input type="email" placeholder={lang==='fr'?'Votre email':'Your email'} value={waitlistEmail} onChange={e=>setWaitlistEmail(e.target.value)} style={{flex:1,padding:'10px 14px',borderRadius:10,border:'1px solid #E3DED7',fontSize:13,fontFamily:"'Inter',sans-serif",outline:'none'}}/>
                <button onClick={async()=>{if(!waitlistEmail)return;await fetch('/api/waitlist',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:waitlistEmail,userId:'anonymous'})}).catch(()=>{});setWaitlistSent(true)}} style={{padding:'10px 16px',borderRadius:10,background:'#516756',color:'white',border:'none',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:"'Inter',sans-serif"}}>{lang==='fr'?"M'avertir":"Notify me"}</button>
              </div>
            )}
          </div>
        </div>

        <div style={{maxWidth:680,margin:'60px auto 0',padding:'0 20px'}}>
          <h2 style={{fontFamily:"'Clash Display',sans-serif",fontSize:28,fontWeight:700,color:'#1F2421',textAlign:'center',marginBottom:32}}>{lang==='fr'?'Questions fréquentes':'FAQ'}</h2>
          {[
            {q:lang==='fr'?'Puis-je annuler à tout moment ?':'Can I cancel anytime?',a:lang==='fr'?"Oui, sans engagement. Votre accès Pro reste actif jusqu'à la fin de la période en cours.":"Yes, no commitment. Your Pro access stays active until the end of the current period."},
            {q:lang==='fr'?'Fonctionne pour tous les secteurs ?':'Does it work for all industries?',a:lang==='fr'?"Oui. Ecrira s'adapte à votre secteur : cybersécurité, finance, immobilier, marketing, RH et bien d'autres.":"Yes. Ecrira adapts to your industry: cybersecurity, finance, real estate, marketing, HR and many more."},
            {q:lang==='fr'?'Mes posts sont-ils uniques ?':'Are my posts truly unique?',a:lang==='fr'?'Chaque post est généré selon votre profil et votre style. Deux utilisateurs ne reçoivent jamais le même post.':'Each post is generated based on your profile and style. No two users receive the same post.'},
            {q:lang==='fr'?'Mes données sont-elles sécurisées ?':'Is my data secure?',a:lang==='fr'?'Vos données sont stockées sur Supabase (UE) et ne sont jamais revendues.':'Your data is stored on Supabase (EU) and is never sold.'},
          ].map((faq,i)=>(
            <details key={i} style={{borderBottom:'1px solid #E3DED7',padding:'16px 0'}}>
              <summary style={{fontSize:15,fontWeight:600,color:'#1F2421',cursor:'pointer',listStyle:'none',display:'flex',justifyContent:'space-between',alignItems:'center'}}>{faq.q}<span style={{fontSize:18,color:'#516756',flexShrink:0,marginLeft:12}}>+</span></summary>
              <p style={{fontSize:14,color:'#6B7069',lineHeight:1.7,marginTop:10,paddingRight:24}}>{faq.a}</p>
            </details>
          ))}
        </div>
      </main>
      <footer style={{background:'#1F2421',padding:'40px 24px',marginTop:60}}>
        <div style={{maxWidth:1000,margin:'0 auto',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:20}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <img src="/logo-ecrira-icon.png" alt="Ecrira" style={{height:32,width:'auto',filter:'brightness(0) invert(1)'}}/>
            <span style={{fontSize:12,color:'rgba(255,255,255,0.4)'}}>© 2026 Ecrira · Tous droits réservés</span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:20}}>
            <a href="/cgu" style={{fontSize:12,color:'rgba(255,255,255,0.5)',textDecoration:'none'}}>CGU</a>
            <a href="/mentions-legales" style={{fontSize:12,color:'rgba(255,255,255,0.5)',textDecoration:'none'}}>Mentions légales</a>
            <a href="mailto:contact@ecrira.com" style={{fontSize:12,color:'rgba(255,255,255,0.5)',textDecoration:'none'}}>Contact</a>
            <a href="https://www.linkedin.com/company/ecrira/" target="_blank" rel="noopener noreferrer" style={{display:'flex',alignItems:'center',justifyContent:'center',width:34,height:34,borderRadius:'50%',background:'rgba(255,255,255,0.1)',color:'white',textDecoration:'none'}}>
              <svg viewBox="0 0 24 24" fill="currentColor" style={{width:16,height:16}}><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
