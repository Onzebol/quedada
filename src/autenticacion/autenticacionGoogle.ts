import type { Autenticacion, Usuario } from './tipos'

const CLAVE = 'quedada.sesion'
const DURACION_MS = 30 * 24 * 60 * 60 * 1000
const SCRIPT = 'https://accounts.google.com/gsi/client'
const USERINFO = 'https://www.googleapis.com/oauth2/v3/userinfo'

/** Convierte la respuesta `userinfo` de Google en lo mínimo que guardamos (sin correo). */
export function usuarioDeInfo(info: unknown): Usuario | null {
  if (typeof info !== 'object' || info === null) return null
  const { sub, name, email, picture } = info as Record<string, unknown>
  if (typeof sub !== 'string' || sub === '') return null
  const nombre = typeof name === 'string' && name !== '' ? name : typeof email === 'string' ? email.split('@')[0] : sub
  return { id: sub, nombre, foto: typeof picture === 'string' ? picture : null }
}

export function guardarSesion(usuario: Usuario, ahora = Date.now()): void {
  try {
    localStorage.setItem(CLAVE, JSON.stringify({ usuario, expira: ahora + DURACION_MS }))
  } catch {
    // Sin almacenamiento la sesión dura lo que la página abierta.
  }
}

export function borrarSesion(): void {
  try {
    localStorage.removeItem(CLAVE)
  } catch {
    // Nada que borrar.
  }
}

export function leerSesion(ahora = Date.now()): Usuario | null {
  try {
    const crudo = localStorage.getItem(CLAVE)
    if (crudo === null) return null
    const { usuario, expira } = JSON.parse(crudo) as { usuario: Usuario; expira: number }
    if (typeof expira !== 'number' || expira <= ahora || usuarioDeInfo({ sub: usuario?.id }) === null) {
      borrarSesion()
      return null
    }
    return usuario
  } catch {
    borrarSesion()
    return null
  }
}

interface ClienteToken {
  requestAccessToken(): void
}
interface RespuestaToken {
  access_token?: string
  error?: string
}
interface GoogleOauth2 {
  initTokenClient(c: {
    client_id: string
    scope: string
    callback: (r: RespuestaToken) => void
    error_callback?: () => void
  }): ClienteToken
}
declare global {
  interface Window {
    google?: { accounts: { oauth2: GoogleOauth2 } }
  }
}

function cargarScript(): Promise<void> {
  if (window.google) return Promise.resolve()
  return new Promise((resolver, rechazar) => {
    const s = document.createElement('script')
    s.src = SCRIPT
    s.async = true
    s.onload = () => resolver()
    s.onerror = () => rechazar(new Error('No se pudo cargar Google'))
    document.head.appendChild(s)
  })
}

/**
 * Inicio de sesión con Google Identity Services (ventana emergente OAuth). Solo pide `openid`,
 * `profile` y `email`; guarda id, nombre y foto. La sesión es del navegador: no hay servidor que
 * valide la identidad, así que sirve para saber «quién es quién» en la app, no para proteger datos.
 */
export class AutenticacionGoogle implements Autenticacion {
  private readonly clientId: string | undefined
  private sesion: Usuario | null

  constructor(clientId: string | undefined = import.meta.env.VITE_GOOGLE_CLIENT_ID) {
    this.clientId = clientId || undefined
    this.sesion = leerSesion()
  }

  disponible() {
    return this.clientId !== undefined
  }

  actual() {
    return this.sesion
  }

  async entrar(): Promise<Usuario> {
    if (this.clientId === undefined) throw new Error('Falta VITE_GOOGLE_CLIENT_ID')
    await cargarScript()
    const token = await new Promise<string>((resolver, rechazar) => {
      const cliente = window.google!.accounts.oauth2.initTokenClient({
        client_id: this.clientId!,
        scope: 'openid profile email',
        callback: (r) => (r.access_token ? resolver(r.access_token) : rechazar(new Error(r.error ?? 'sin token'))),
        error_callback: () => rechazar(new Error('cancelado')),
      })
      cliente.requestAccessToken()
    })
    const respuesta = await fetch(USERINFO, { headers: { Authorization: `Bearer ${token}` } })
    if (!respuesta.ok) throw new Error('Google rechazó la consulta')
    const usuario = usuarioDeInfo(await respuesta.json())
    if (usuario === null) throw new Error('Respuesta de Google no válida')
    this.sesion = usuario
    guardarSesion(usuario)
    return usuario
  }

  async salir() {
    this.sesion = null
    borrarSesion()
  }
}
