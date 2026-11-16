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
      options: { redirectTo: string }
    }): PromiseLike<{ error: { message: string } | null }>
    signOut(): PromiseLike<{ error: { message: string } | null }>
  }
}

/** Lo mínimo que guardamos de la cuenta: id, nombre visible y foto. */
export function usuarioDeSupabase(u: UsuarioSupabase): Usuario {
  const meta = u.user_metadata ?? {}
  const nombreMeta = [meta.full_name, meta.name].find((n): n is string => typeof n === 'string' && n !== '')
  const nombre = nombreMeta ?? (u.email ? u.email.split('@')[0] : u.id)
  const foto = typeof meta.avatar_url === 'string' ? meta.avatar_url : null
  const pila = typeof meta.given_name === 'string' && meta.given_name !== '' ? { nombrePila: meta.given_name } : {}
  return { id: u.id, nombre, ...pila, foto }
}

/**
 * Inicio de sesión con Google a través de Supabase Auth. `entrar` redirige a Google y la página se
 * recarga al volver, así que la sesión se resuelve una vez, antes de pintar (`abrir`).
 */
export class AutenticacionSupabase implements Autenticacion {
  private readonly cliente: ClienteAuth | null
  private readonly volverA: string
  private sesion: Usuario | null

  private constructor(cliente: ClienteAuth | null, volverA: string, sesion: Usuario | null) {
    this.cliente = cliente
    this.volverA = volverA
    this.sesion = sesion
  }

  static async abrir(cliente: ClienteAuth | null, volverA: string): Promise<AutenticacionSupabase> {
    const user = cliente ? (await cliente.auth.getSession()).data.session?.user : undefined
    return new AutenticacionSupabase(cliente, volverA, user ? usuarioDeSupabase(user) : null)
  }

  disponible() {
    return this.cliente !== null
  }

  actual() {
    return this.sesion
  }

  async entrar(): Promise<Usuario> {
    if (!this.cliente) throw new Error('Falta la configuración de Supabase')
    const { error } = await this.cliente.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: this.volverA } })
    if (error) throw new Error(error.message)
    // El navegador se va a Google: esta promesa no llega a resolverse en la práctica.
    return new Promise<Usuario>(() => {})
  }

  async salir() {
    await this.cliente?.auth.signOut()
    this.sesion = null
  }
}
