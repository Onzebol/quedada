/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Client ID de OAuth de Google (público, no es un secreto). Sin él no se ofrece entrar. */
  readonly VITE_GOOGLE_CLIENT_ID?: string
}
