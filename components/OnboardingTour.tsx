import { useEffect, useState } from 'react'
import Joyride, { CallBackProps, STATUS, Step, TooltipRenderProps } from 'react-joyride'

const LS_KEY = 'ecrira_onboarding_done'

type Props = { run: boolean; lang?: string; onDone: () => void }

// Bulle custom aux tokens Ecrira (Clash Display + Inter, var(--...)).
function EcriraTooltip({
  index,
  size,
  step,
  backProps,
  primaryProps,
  skipProps,
  tooltipProps,
}: TooltipRenderProps) {
  return (
    <div
      {...tooltipProps}
      style={{
        width: 344,
        maxWidth: '90vw',
        background: 'var(--white)',
        border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow)',
        padding: '22px 24px 18px',
        fontFamily: "'Inter', system-ui, sans-serif",
        color: 'var(--text1)',
      }}
    >
      {/* Progression */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 15 }}>
        {Array.from({ length: size }).map((_, i) => (
          <span
            key={i}
            style={{
              height: 5,
              width: i === index ? 20 : 5,
              borderRadius: 3,
              background: i === index ? 'var(--indigo)' : 'var(--sand)',
              transition: 'width 0.3s ease, background 0.3s ease',
            }}
          />
        ))}
        <span
          style={{
            marginLeft: 'auto',
            fontSize: 11,
            color: 'var(--text3)',
            fontWeight: 500,
            letterSpacing: '0.02em',
          }}
        >
          {index + 1} / {size}
        </span>
      </div>

      {step.title && (
        <div
          style={{
            fontFamily: "'Clash Display', 'Inter', sans-serif",
            fontSize: 18,
            fontWeight: 600,
            lineHeight: 1.3,
            color: 'var(--text1)',
            marginBottom: 8,
          }}
        >
          {step.title}
        </div>
      )}

      <div style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--text2)' }}>{step.content}</div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 20,
        }}
      >
        <button
          {...skipProps}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: "'Inter', sans-serif",
            fontSize: 12,
            color: 'var(--text3)',
            padding: 4,
          }}
        >
          {skipProps.title}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {index > 0 && (
            <button
              {...backProps}
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--text2)',
                padding: '8px 14px',
                borderRadius: 10,
              }}
            >
              {backProps.title}
            </button>
          )}
          <button
            {...primaryProps}
            style={{
              background: 'var(--indigo)',
              border: 'none',
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              fontWeight: 600,
              color: '#ffffff',
              padding: '8px 18px',
              borderRadius: 10,
              boxShadow: '0 2px 10px rgba(61,82,160,0.25)',
            }}
          >
            {primaryProps.title}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function OnboardingTour({ run, lang = 'fr', onDone }: Props) {
  const isEn = lang === 'en'
  const [ready, setReady] = useState(false)
  const [done, setDone] = useState(false)

  // Verrou navigateur : si le tour a deja ete vu ici, on ne le relance jamais.
  useEffect(() => {
    try {
      if (localStorage.getItem(LS_KEY) === '1') setDone(true)
    } catch {}
  }, [])

  useEffect(() => {
    if (run && !done) {
      const t = setTimeout(() => setReady(true), 450)
      return () => clearTimeout(t)
    }
    setReady(false)
  }, [run, done])

  const stepsFr: Step[] = [
    {
      target: 'body',
      placement: 'center',
      disableBeacon: true,
      title: 'Bienvenue sur Ecrira',
      content: "En 30 secondes, voici comment creer et publier tes posts LinkedIn.",
    },
    {
      target: '[data-tour="stats"]',
      disableBeacon: true,
      title: 'Ton tableau de bord',
      content: "Tes posts en un coup d'oeil, et surtout ton secteur actif : c'est lui qui personnalise toutes tes idees et tes posts.",
    },
    {
      target: '[data-tour="ideas"]',
      disableBeacon: true,
      title: 'Les idees du jour',
      content: "Chaque jour, Ecrira te propose des idees de posts adaptees a ton secteur. Clique pour toutes les voir.",
    },
    {
      target: '[data-tour="nav-rediger"]',
      disableBeacon: true,
      title: 'Rediger un post',
      content: "Ici tu generes un post en un clic, tu l'edites, et tu obtiens jusqu'a 3 variantes.",
    },
    {
      target: '[data-tour="nav-calendrier"]',
      disableBeacon: true,
      title: 'Planifier et publier',
      content: "Planifie tes posts et publie-les directement sur LinkedIn depuis ton calendrier.",
    },
    {
      target: 'body',
      placement: 'center',
      disableBeacon: true,
      title: 'A toi de jouer',
      content: "Complete ton profil (menu en haut a droite) pour des posts vraiment sur-mesure. Bonne redaction !",
    },
  ]

  const stepsEn: Step[] = [
    { target: 'body', placement: 'center', disableBeacon: true, title: 'Welcome to Ecrira', content: "In 30 seconds, here is how to create and publish your LinkedIn posts." },
    { target: '[data-tour="stats"]', disableBeacon: true, title: 'Your dashboard', content: "Your posts at a glance, and above all your active sector — it personalises every idea and post." },
    { target: '[data-tour="ideas"]', disableBeacon: true, title: 'Ideas of the day', content: "Every day, Ecrira suggests post ideas tailored to your sector. Click to see them all." },
    { target: '[data-tour="nav-rediger"]', disableBeacon: true, title: 'Write a post', content: "Generate a post in one click, edit it, and get up to 3 variants." },
    { target: '[data-tour="nav-calendrier"]', disableBeacon: true, title: 'Schedule and publish', content: "Schedule your posts and publish them straight to LinkedIn from your calendar." },
    { target: 'body', placement: 'center', disableBeacon: true, title: 'Over to you', content: "Complete your profile (top-right menu) for truly tailored posts. Happy writing!" },
  ]

  const handleCallback = (data: CallBackProps) => {
    const { status } = data
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      // Verrou immediat cote navigateur + latch local, puis persistance DB.
      try { localStorage.setItem(LS_KEY, '1') } catch {}
      setDone(true)
      onDone()
    }
  }

  return (
    <Joyride
      steps={isEn ? stepsEn : stepsFr}
      run={run && ready && !done}
      continuous
      showSkipButton
      scrollToFirstStep
      disableOverlayClose
      spotlightPadding={8}
      tooltipComponent={EcriraTooltip}
      callback={handleCallback}
      floaterProps={{ disableAnimation: false, styles: { floater: { transition: 'opacity 0.25s ease' } } }}
      locale={
        isEn
          ? { back: 'Retour', close: 'Fermer', last: 'Got it', next: 'Next', skip: 'Skip' }
          : { back: 'Retour', close: 'Fermer', last: "C'est parti", next: 'Suivant', skip: 'Passer' }
      }
      styles={{
        options: {
          zIndex: 10000,
          arrowColor: 'var(--white)',
          overlayColor: 'rgba(31,36,33,0.5)',
        },
        spotlight: { borderRadius: 14 },
      }}
    />
  )
}
