import type { Autenticacion, Usuario } from '../autenticacion/tipos'

interface UsuarioSupabase {
  id: string
  email?: string
  user_metadata?: Record<string, unknown>
}

/** La parte de `SupabaseClient` que usa la autenticación, para poder probarla con un cliente falso. */
export interface ClienteAuth {
  auth: {
    getSession(): PromiseLike<{ data: { session: { user: UsuarioSupabase } | null } }>
    signInWithOAuth(opciones: {
      provider: 'google'
      options: { redirectTo: string; queryParams?: Record<string, string> }
    }): PromiseLike<{ error: { message: string } | null }>
    signInWithIdToken?(credenciales: {
      provider: 'google'
      token: string
      nonce: string
    }): PromiseLike<{ error: { message: string } | null; data: { session: { user: UsuarioSupabase } | null } }>
    signOut(): PromiseLike<{ error: { message: string } | null }>
  }
}

/**
 * Pinta el botón de Google en `contenedor` y llama a `alToken` con el ID token. `nonceHash` es el
 * SHA-256 (hex) del nonce que Supabase comprobará (ver `autenticacion/googleId.ts`).
 */
export type ProveedorIdGoogle = (contenedor: HTMLElement, nonceHash: string, alToken: (token: string) => void) => void | Promise<void>

async function sha256Hex(texto: string): Promise<string> {
  const huella = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto))
  return Array.from(new Uint8Array(huella), (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Lo mínimo de la cuenta: id, nombre visible, foto y correo (este solo se muestra). */
export function usuarioDeSupabase(u: UsuarioSupabase): Usuario {
  const meta = u.user_metadata ?? {}
  const nombreMeta = [meta.full_name, meta.name].find((n): n is string => typeof n === 'string' && n !== '')
  const nombre = nombreMeta ?? (u.email ? u.email.split('@')[0] : u.id)
  const foto = typeof meta.avatar_url === 'string' ? meta.avatar_url : null
  return u.email ? { id: u.id, nombre, foto, email: u.email } : { id: u.id, nombre, foto }
}

/**
 * Inicio de sesión con Google a través de Supabase Auth. `entrar` redirige a Google y la página se
 * recarga al volver, así que la sesión se resuelve una vez, antes de pintar (`abrir`).
 */
export class AutenticacionSupabase implements Autenticacion {
  private readonly cliente: ClienteAuth | null
  private readonly volverA: string
  private sesion: Usuario | null
  /** Solo existe con un proveedor del botón de Google (#148); si no, se entra por redirección. */
  readonly montarBoton?: (contenedor: HTMLElement, alEntrar: () => void, alFallar: () => void) => Promise<void>

  private constructor(cliente: ClienteAuth | null, volverA: string, sesion: Usuario | null, proveedor?: ProveedorIdGoogle) {
    this.cliente = cliente
    this.volverA = volverA
    this.sesion = sesion
    const signInWithIdToken = cliente?.auth.signInWithIdToken?.bind(cliente.auth)
    if (proveedor && signInWithIdToken) {
      this.montarBoton = async (contenedor, alEntrar, alFallar) => {
        const nonce = crypto.randomUUID()
        const hash = await sha256Hex(nonce)
        await proveedor(contenedor, hash, (token) => {
          void (async () => {
            try {
              const { error, data } = await signInWithIdToken({ provider: 'google', token, nonce })
              if (error || !data.session) return alFallar()
              this.sesion = usuarioDeSupabase(data.session.user)
              alEntrar()
            } catch {
              alFallar()
            }
          })()
        })
      }
    }
  }

  static async abrir(cliente: ClienteAuth | null, volverA: string, proveedor?: ProveedorIdGoogle): Promise<AutenticacionSupabase> {
    const user = cliente ? (await cliente.auth.getSession()).data.session?.user : undefined
    return new AutenticacionSupabase(cliente, volverA, user ? usuarioDeSupabase(user) : null, proveedor)
  }

  disponible() {
    return this.cliente !== null
  }

  actual() {
    return this.sesion
  }

  async entrar(): Promise<Usuario> {
    if (!this.cliente) throw new Error('Falta la configuración de Supabase')
    const { error } = await this.cliente.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: this.volverA, queryParams: { prompt: 'select_account' } } })
    if (error) throw new Error(error.message)
    // El navegador se va a Google: esta promesa no llega a resolverse en la práctica.
    return new Promise<Usuario>(() => {})
  }

  async salir() {
    await this.cliente?.auth.signOut()
    this.sesion = null
  }
}
