/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Client ID de OAuth de Google (público, no es un secreto). Sin él no se ofrece entrar. */
  readonly VITE_GOOGLE_CLIENT_ID?: string
  /** URL del proyecto Supabase (pública). */
  readonly VITE_SUPABASE_URL?: string
  /** Clave pública («publishable»/anon) de Supabase; la seguridad la dan las políticas RLS, no la clave. */
  readonly VITE_SUPABASE_CLAVE_PUBLICA?: string
}
