import { describe, expect, it, vi } from 'vitest'
import { AutenticacionSupabase, usuarioDeSupabase, type ClienteAuth } from './autenticacionSupabase'

const supabaseUser = {
  id: 'u1',
  email: 'ana@ejemplo.com',
  user_metadata: { full_name: 'Ana Pérez', avatar_url: 'https://foto/ana.png' },
}

function clienteFalso(sesion: { user: typeof supabaseUser } | null, errorEntrada: { message: string } | null = null) {
  const signInWithOAuth = vi.fn(async () => ({ error: errorEntrada }))
  const signOut = vi.fn(async () => ({ error: null }))
  const cliente: ClienteAuth = {
    auth: { getSession: async () => ({ data: { session: sesion } }), signInWithOAuth, signOut },
  }
  return { cliente, signInWithOAuth, signOut }
}

describe('usuarioDeSupabase', () => {
  it('usa nombre completo y foto', () => {
    expect(usuarioDeSupabase(supabaseUser)).toMatchObject({ id: 'u1', nombre: 'Ana Pérez', foto: 'https://foto/ana.png' })
  })

  it('incluye el correo para mostrarlo (#113)', () => {
    expect(usuarioDeSupabase({ id: 'u2', email: 'luis@x.es' }).email).toBe('luis@x.es')
  })

  it('sin nombre usa lo anterior a la @ del correo y sin foto es null', () => {
    expect(usuarioDeSupabase({ id: 'u2', email: 'luis@x.es' })).toMatchObject({ id: 'u2', nombre: 'luis', foto: null })
  })

  it('sin nombre ni correo usa el id', () => {
    expect(usuarioDeSupabase({ id: 'u3' })).toEqual({ id: 'u3', nombre: 'u3', foto: null })
  })
})

describe('AutenticacionSupabase', () => {
  it('sin sesión no hay usuario actual', async () => {
    const auth = await AutenticacionSupabase.abrir(clienteFalso(null).cliente, 'https://web/')
    expect(auth.actual()).toBeNull()
    expect(auth.disponible()).toBe(true)
  })

  it('restaura la sesión existente', async () => {
    const auth = await AutenticacionSupabase.abrir(clienteFalso({ user: supabaseUser }).cliente, 'https://web/')
    expect(auth.actual()).toMatchObject({ id: 'u1', nombre: 'Ana Pérez', foto: 'https://foto/ana.png' })
  })

  it('entrar redirige a Google y vuelve a la página', async () => {
    const { cliente, signInWithOAuth } = clienteFalso(null)
    const auth = await AutenticacionSupabase.abrir(cliente, 'https://web/quedada/')
    void auth.entrar()
    await vi.waitFor(() =>
      expect(signInWithOAuth).toHaveBeenCalledWith({ provider: 'google', options: { redirectTo: 'https://web/quedada/', queryParams: { prompt: 'select_account' } } }),
    )
  })

  it('entrar rechaza si Supabase devuelve error', async () => {
    const auth = await AutenticacionSupabase.abrir(clienteFalso(null, { message: 'mal' }).cliente, 'https://web/')
    await expect(auth.entrar()).rejects.toThrow('mal')
  })

  it('salir cierra la sesión', async () => {
    const { cliente, signOut } = clienteFalso({ user: supabaseUser })
    const auth = await AutenticacionSupabase.abrir(cliente, 'https://web/')
    await auth.salir()
    expect(signOut).toHaveBeenCalled()
    expect(auth.actual()).toBeNull()
  })

  it('sin cliente de Supabase no está disponible', async () => {
    const auth = await AutenticacionSupabase.abrir(null, 'https://web/')
    expect(auth.disponible()).toBe(false)
    expect(auth.actual()).toBeNull()
    await expect(auth.entrar()).rejects.toThrow()
  })
})
