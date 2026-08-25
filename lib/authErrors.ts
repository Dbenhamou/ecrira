// Traduit les messages d'erreur Supabase Auth en français.
const MAP: Record<string, string> = {
  'Invalid login credentials': 'Email ou mot de passe incorrect.',
  'Email not confirmed': 'Confirmez votre email avant de vous connecter.',
  'User already registered': 'Un compte existe déjà avec cet email.',
  'Password should be at least 6 characters': 'Le mot de passe doit contenir au moins 6 caractères.',
  'Unable to validate email address: invalid format': 'Adresse email invalide.',
  'Signup requires a valid password': 'Mot de passe requis.',
  'Email rate limit exceeded': 'Trop d’emails envoyés. Réessayez plus tard.',
}

export function frAuthError(msg?: string | null): string {
  if (!msg) return 'Une erreur est survenue.'
  if (MAP[msg]) return MAP[msg]
  const m = msg.toLowerCase()
  if (m.includes('invalid login')) return 'Email ou mot de passe incorrect.'
  if (m.includes('already registered') || m.includes('already exists')) return 'Un compte existe déjà avec cet email.'
  if (m.includes('not confirmed')) return 'Confirmez votre email avant de vous connecter.'
  if (m.includes('rate limit') || m.includes('after 60 seconds') || m.includes('after')) return 'Trop de tentatives. Réessayez dans une minute.'
  if (m.includes('password')) return 'Mot de passe invalide (au moins 6 caractères).'
  if (m.includes('email')) return 'Adresse email invalide.'
  return 'Une erreur est survenue. Réessayez.'
}
