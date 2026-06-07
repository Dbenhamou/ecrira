import { useState, useEffect } from 'react'
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
  webhook_url: string
  brand_bg: string
  brand_text: string
  brand_accent: string
  writing_style: string
  linkedin_token?: string
  linkedin_token_expiry?: string
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
  webhook_url: '',
  brand_bg: '#F8F6F2',
  brand_text: '#232323',
  brand_accent: '#4F6754',
  writing_style: '',
}

export function useProfile() {
  const router = useRouter()
  const [profile, setProfileState] = useState<Profile>(DEFAULT_PROFILE)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/login')
        return
      }
      setUserId(session.user.id)
      loadProfile(session.user.id, session.user.email)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.replace('/login')
        return
      }
      if (event === 'SIGNED_IN' && session) {
        setUserId(session.user.id)
        loadProfile(session.user.id, session.user.email)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadProfile = async (uid: string, email?: string | null) => {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .single()

    if (error || !data) {
      // Profile doesn't exist yet — create it
      const defaultName = email ? email.split('@')[0] : 'Utilisateur'
      const newProfile: Profile = { ...DEFAULT_PROFILE, name: defaultName }
      await supabase.from('profiles').upsert({ id: uid, email, ...newProfile })
      setProfileState(newProfile)
    } else {
      setProfileState({
        name: data.name || '',
        role: data.role || '',
        company: data.company || '',
        sector: data.sector || '',
        audience: data.audience || '',
        tech_stack: data.tech_stack || '',
        lang: data.lang || 'fr',
        domain: data.domain || '',
        webhook_url: data.webhook_url || '',
        brand_bg: data.brand_bg || '#FAF9F7',
        brand_text: data.brand_text || '#1F2421',
        brand_accent: data.brand_accent || '#516756',
        writing_style: data.writing_style || '',
        linkedin_token: data.linkedin_token || '',
        linkedin_token_expiry: data.linkedin_token_expiry || '',
        linkedin_id: data.linkedin_id || '',
      })
    }
    setLoading(false)
  }

  const saveProfile = async (updated: Profile): Promise<boolean> => {
    if (!userId) return false
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: userId, ...updated })
    if (!error) {
      setProfileState(updated)
      return true
    }
    return false
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return { profile, setProfile: setProfileState, saveProfile, signOut, loading, userId }
}
