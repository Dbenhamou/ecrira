import { useEffect, useState } from 'react'
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride'

type Props = { run: boolean; lang?: string; onDone: () => void }

export default function OnboardingTour({ run, lang = 'fr', onDone }: Props) {
  const isEn = lang === 'en'
  const [ready, setReady] = useState(false)

  // Laisse le dashboard se monter avant de cibler les elements.
  useEffect(() => {
    if (run) {
      const t = setTimeout(() => setReady(true), 400)
      return () => clearTimeout(t)
    }
    setReady(false)
  }, [run])

  const stepsFr: Step[] = [
    {
      target: 'body',
      placement: 'center',
      disableBeacon: true,
      title: 'Bienvenue sur Ecrira 👋',
      content: "En 30 secondes, voici comment creer et publier tes posts LinkedIn.",
    },
    {
      target: '[data-tour="stats"]',
      disableBeacon: true,
      title: 'Ton tableau de bord',
      content: "Tes posts en un coup d'oeil, et surtout ton « secteur actif » : c'est lui qui personnalise toutes tes idees et tes posts.",
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
      title: 'Planifier & publier',
      content: "Planifie tes posts et publie-les directement sur LinkedIn depuis ton calendrier.",
    },
    {
      target: 'body',
      placement: 'center',
      disableBeacon: true,
      title: 'A toi de jouer ✍️',
      content: "Commence par completer ton profil (menu en haut a droite) pour des posts vraiment sur-mesure. Bonne redaction !",
    },
  ]

  const stepsEn: Step[] = [
    { target: 'body', placement: 'center', disableBeacon: true, title: 'Welcome to Ecrira 👋', content: "In 30 seconds, here is how to create and publish your LinkedIn posts." },
    { target: '[data-tour="stats"]', disableBeacon: true, title: 'Your dashboard', content: "Your posts at a glance, and above all your « active sector » — it personalises every idea and post." },
    { target: '[data-tour="ideas"]', disableBeacon: true, title: 'Ideas of the day', content: "Every day, Ecrira suggests post ideas tailored to your sector. Click to see them all." },
    { target: '[data-tour="nav-rediger"]', disableBeacon: true, title: 'Write a post', content: "Generate a post in one click, edit it, and get up to 3 variants." },
    { target: '[data-tour="nav-calendrier"]', disableBeacon: true, title: 'Schedule & publish', content: "Schedule your posts and publish them straight to LinkedIn from your calendar." },
    { target: 'body', placement: 'center', disableBeacon: true, title: 'Over to you ✍️', content: "Start by completing your profile (top-right menu) for truly tailored posts. Happy writing!" },
  ]

  const handleCallback = (data: CallBackProps) => {
    const { status } = data
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) onDone()
  }

  return (
    <Joyride
      steps={isEn ? stepsEn : stepsFr}
      run={run && ready}
      continuous
      showProgress
      showSkipButton
      scrollToFirstStep
      callback={handleCallback}
      locale={
        isEn
          ? { back: 'Back', close: 'Close', last: 'Got it', next: 'Next', skip: 'Skip' }
          : { back: 'Retour', close: 'Fermer', last: "C'est parti !", next: 'Suivant', skip: 'Passer' }
      }
      styles={{
        options: {
          primaryColor: '#3D52A0',
          backgroundColor: '#ffffff',
          textColor: '#1F2951',
          arrowColor: '#ffffff',
          zIndex: 10000,
        },
      }}
    />
  )
}
