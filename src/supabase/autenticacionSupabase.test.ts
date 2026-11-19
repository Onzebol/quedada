import { describe, expect, it, vi } from 'vitest'
import type { ProveedorIdGoogle } from './autenticacionSupabase'
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

describe('AutenticacionSupabase con el botón de Google (#148)', () => {
  function conBoton(sesion: { user: typeof supabaseUser } | null = null, error: { message: string } | null = null) {
    const signInWithIdToken = vi.fn(async () => ({ error, data: { session: { user: supabaseUser } } }))
    const cliente = {
      auth: { getSession: async () => ({ data: { session: sesion } }), signInWithOAuth: vi.fn(), signOut: vi.fn(), signInWithIdToken },
    } as unknown as ClienteAuth
    let alToken: (t: string) => void = () => {}
    let nonceHash = ''
    const proveedor: ProveedorIdGoogle = (_c, hash, cb) => {
      nonceHash = hash
      alToken = cb
    }
    return { cliente, signInWithIdToken, proveedor, token: (t: string) => alToken(t), hash: () => nonceHash }
  }

  it('sin proveedor no ofrece el botón y se mantiene la redirección', async () => {
    const auth = await AutenticacionSupabase.abrir(clienteFalso(null).cliente, 'https://web/')
    expect(auth.montarBoton).toBeUndefined()
  })

  it('con el token de Google abre sesión en Supabase con el nonce sin hashear y avisa', async () => {
    const t = conBoton()
    const auth = await AutenticacionSupabase.abrir(t.cliente, 'https://web/', t.proveedor)
    const alEntrar = vi.fn()
    await auth.montarBoton!(document.createElement('div'), alEntrar, vi.fn())
    expect(t.hash()).toMatch(/^[0-9a-f]{64}$/)
    t.token('id-token')
    await vi.waitFor(() => expect(alEntrar).toHaveBeenCalledOnce())
    const llamada = (t.signInWithIdToken.mock.calls[0] as unknown[])[0] as { provider: string; token: string; nonce: string }
    expect(llamada).toMatchObject({ provider: 'google', token: 'id-token' })
    expect(llamada.nonce).not.toBe(t.hash())
    expect(auth.actual()).toMatchObject({ id: 'u1' })
  })

  it('si Supabase rechaza el token, avisa del fallo', async () => {
    const t = conBoton(null, { message: 'mal' })
    const auth = await AutenticacionSupabase.abrir(t.cliente, 'https://web/', t.proveedor)
    const alFallar = vi.fn()
    await auth.montarBoton!(document.createElement('div'), vi.fn(), alFallar)
    t.token('id-token')
    await vi.waitFor(() => expect(alFallar).toHaveBeenCalledOnce())
  })
})
