import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import Head from 'next/head';

const pricingT = {
  fr: {
    tab_title: 'Tarifs — Ecrira',
    eyebrow: 'Tarifs simples',
    title: 'Choisissez votre plan',
    subtitle: '{T.subtitle}',
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
        <link href="https://fonts.googleapis.com/css2?family=Clash+Display:wght@400;600;700&family=Inter:wght@400;500&display=swap" rel="stylesheet" />
      </Head>

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
          <p style={{ color: '#516756', fontSize: '18px', maxWidth: '480px', margin: '0 auto', lineHeight: 1.6 }}>
            Commencez gratuitement, passez au Pro quand vous êtes prêt.
          </p>
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
              <span style={{ fontFamily: "'Clash Display', sans-serif", fontSize: '48px', fontWeight: 700, color: '#FAF9F7' }}>19,90€</span>
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
            <button
              disabled
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                border: '1.5px dashed #B7C0B8',
                background: 'transparent',
                color: '#B7C0B8',
                fontFamily: "'Clash Display', sans-serif",
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'not-allowed',
              }}
            >
{T.team_cta}
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
