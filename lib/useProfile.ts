import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { supabase } from './supabase'

export type Profile = {
  id?: string
  name: string
  role: string
  company: string
  sector: string
  audience: string
  tech_stack: string
  lang: string
  domain: string
  company_logo: string
  webhook_url: string
  brand_bg: string
  brand_text: string
  brand_accent: string
  brand_color2?: string
  brand_color3?: string
  linkedin_picture?: string
  writing_style: string
  formality: string
  linkedin_token?: string
  linkedin_token_expiry?: string | null
  linkedin_id?: string
  summary?: string
  keywords?: string
  tone?: string
  content_themes?: string
  pain_points?: string
}

export const DEFAULT_PROFILE: Profile = {
  name: '',
  role: 'Account Executive (AE)',
  company: '',
  sector: '',
  audience: '',
  tech_stack: '',
  lang: 'fr',
  domain: '',
  company_logo: '',
  webhook_url: '',
  brand_bg: '#F8F6F2',
  brand_text: '#232323',
  brand_accent: '#4F6754',
  brand_color2: '#0099FF',
  brand_color3: '#302082',
  writing_style: '',
  formality: 'vouvoiement',
}

function mapRow(data: any): Profile {
  return {
    name: data.name || '',
    role: data.role || '',
    company: data.company || '',
    sector: data.sector || '',
    audience: data.audience || '',
    tech_stack: data.tech_stack || '',
    lang: data.lang || 'fr',
    domain: data.domain || '',
    company_logo: data.company_logo || '',
    webhook_url: data.webhook_url || '',
    brand_bg: data.brand_bg || '#FAF9F7',
    brand_text: data.brand_text || '#1F2421',
    brand_accent: data.brand_accent || '#516756',
    brand_color2: data.brand_color2 || '#0099FF',
    linkedin_picture: data.linkedin_picture || '',
    brand_color3: data.brand_color3 || '#302082',
    writing_style: data.writing_style || '',
    formality: data.formality || 'vouvoiement',
    linkedin_token: data.linkedin_token || '',
    linkedin_token_expiry: data.linkedin_token_expiry || null,
    linkedin_id: data.linkedin_id || '',
  }
}

export function useProfile() {
  const router = useRouter()
  const [profile, setProfileState] = useState<Profile>(DEFAULT_PROFILE)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Verrous : onAuthStateChange peut declencher plusieurs chargements
  // simultanes (INITIAL_SESSION, SIGNED_IN, TOKEN_REFRESHED).
  const inFlightRef = useRef(false)
  const loadedForRef = useRef<string | null>(null)
  // Tant qu'aucun profil n'a ete reellement charge depuis la base, on
  // interdit toute ecriture : sinon on sauvegarderait DEFAULT_PROFILE.
  const hydratedRef = useRef(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id)
        loadProfile(session.user.id, session.user.email)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUserId(session.user.id)
        loadProfile(session.user.id, session.user.email)
      } else if (event === 'SIGNED_OUT') {
        setUserId(null)
        loadedForRef.current = null
        hydratedRef.current = false
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadProfile = async (uid: string, email?: string | null) => {
    // Deja charge pour cet utilisateur, ou chargement en cours
    if (inFlightRef.current) return
    if (loadedForRef.current === uid && hydratedRef.current) return

    inFlightRef.current = true
    setLoading(true)

    try {
      // maybeSingle : renvoie data=null SANS erreur si la ligne n'existe pas.
      // C'est ce qui permet de distinguer "profil absent" d'une panne.
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .maybeSingle()

      if (error) {
        // Erreur reelle (reseau, RLS, timeout) : on ne cree RIEN et on
        // n'ecrase RIEN. Le profil existant reste intact en base.
        console.error('[useProfile] lecture impossible, aucune ecriture:', error)
        return
      }

      if (data) {
        setProfileState(mapRow(data))
        loadedForRef.current = uid
        hydratedRef.current = true
        return
      }

      // Ici, et seulement ici, le profil n'existe reellement pas.
      const defaultName = email ? email.split('@')[0] : 'Utilisateur'
      const newProfile: Profile = { ...DEFAULT_PROFILE, name: defaultName }
      const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

      // insert (et non upsert) : si une ligne existe malgre tout, l'insert
      // echoue au lieu de l'ecraser.
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({ id: uid, email, ...newProfile, plan: 'trial', trial_ends_at: trialEnd })

      if (insertError) {
        // Conflit : la ligne existait finalement, on la relit.
        const { data: retry } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', uid)
          .maybeSingle()
        if (retry) {
          setProfileState(mapRow(retry))
          loadedForRef.current = uid
          hydratedRef.current = true
        }
        return
      }

      try {
        await fetch('/api/onboarding-sequence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, name: defaultName }),
        })
      } catch {}

      setProfileState(newProfile)
      loadedForRef.current = uid
      hydratedRef.current = true
    } finally {
      inFlightRef.current = false
      setLoading(false)
    }
  }

  const saveProfile = async (updated: Profile): Promise<boolean> => {
    if (!userId) return false

    // Garde-fou : ne jamais ecrire un profil qui n'a pas ete charge.
    if (!hydratedRef.current) {
      console.warn('[useProfile] sauvegarde ignoree : profil non charge')
      return false
    }

    // linkedin_token_expiry is a timestamptz column — '' is not a valid value
    const payload = { ...updated, linkedin_token_expiry: updated.linkedin_token_expiry || null }

    // update (et non upsert) : le plan, trial_ends_at et les champs Stripe
    // ne sont jamais touches depuis le client.
    const { error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', userId)

    if (!error) {
      setProfileState(updated)
      return true
    }
    console.error('[useProfile] saveProfile error:', error)
    return false
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return { profile, setProfile: setProfileState, saveProfile, signOut, loading, userId }
}
