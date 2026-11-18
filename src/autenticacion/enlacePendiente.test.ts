import { afterEach, describe, expect, it } from 'vitest'
import { guardarEnlacePendiente, recuperarEnlacePendiente, restaurarEnlacePendiente, type AlmacenClaves } from './enlacePendiente'

function almacen(): AlmacenClaves & { datos: Map<string, string> } {
  const datos = new Map<string, string>()
  return {
    datos,
    getItem: (k) => datos.get(k) ?? null,
    setItem: (k, v) => void datos.set(k, v),
    removeItem: (k) => void datos.delete(k),
  }
}

describe('enlace pendiente al pasar por el login', () => {
  it('guarda una invitación y la recupera al volver, a la raíz', () => {
    const a = almacen()
    guardarEnlacePendiente('#/unirse/abc123', a)
    expect(recuperarEnlacePendiente('', a)).toBe('#/unirse/abc123')
  })

  it('guarda también el enlace a una quedada', () => {
    const a = almacen()
    guardarEnlacePendiente('#/q1', a)
    expect(recuperarEnlacePendiente('#/', a)).toBe('#/q1')
  })

  it('se usa una sola vez', () => {
    const a = almacen()
    guardarEnlacePendiente('#/unirse/abc123', a)
    recuperarEnlacePendiente('', a)
    expect(recuperarEnlacePendiente('', a)).toBeNull()
  })

  it('no guarda nada si el hash es otra cosa, y borra lo que hubiera de antes', () => {
    const a = almacen()
    guardarEnlacePendiente('#/unirse/abc123', a)
    guardarEnlacePendiente('', a)
    expect(a.datos.size).toBe(0)
    guardarEnlacePendiente('#/algo/raro', a)
    expect(a.datos.size).toBe(0)
  })

  it('no pisa un hash que ya apunta a algo', () => {
    const a = almacen()
    guardarEnlacePendiente('#/unirse/abc123', a)
    expect(recuperarEnlacePendiente('#/q9', a)).toBeNull()
  })

  it('caduca a la hora', () => {
    const a = almacen()
    const t0 = 1_000_000
    guardarEnlacePendiente('#/unirse/abc123', a, t0)
    expect(recuperarEnlacePendiente('', a, t0 + 61 * 60 * 1000)).toBeNull()
    guardarEnlacePendiente('#/unirse/abc123', a, t0)
    expect(recuperarEnlacePendiente('', a, t0 + 59 * 60 * 1000)).toBe('#/unirse/abc123')
  })

  it('un contenido corrupto se ignora', () => {
    const a = almacen()
    a.setItem('quedada:enlace-pendiente', 'no es json')
    expect(recuperarEnlacePendiente('', a)).toBeNull()
    a.setItem('quedada:enlace-pendiente', JSON.stringify({ hash: '#/otra/cosa', cuando: Date.now() }))
    expect(recuperarEnlacePendiente('', a)).toBeNull()
  })

  it('si el almacenamiento falla, no rompe nada', () => {
    const roto: AlmacenClaves = {
      getItem: () => {
        throw new Error('bloqueado')
      },
      setItem: () => {
        throw new Error('bloqueado')
      },
      removeItem: () => {
        throw new Error('bloqueado')
      },
    }
    expect(() => guardarEnlacePendiente('#/unirse/abc123', roto)).not.toThrow()
    expect(recuperarEnlacePendiente('', roto)).toBeNull()
  })
})

describe('restaurarEnlacePendiente', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/')
    window.localStorage.clear()
  })

  it('devuelve el enlace guardado a la URL, sin tocar la ruta ni la consulta', () => {
    guardarEnlacePendiente('#/unirse/abc123')
    window.history.replaceState(null, '', '/quedada/?code=xyz')
    restaurarEnlacePendiente()
    expect(window.location.pathname + window.location.search + window.location.hash).toBe('/quedada/?code=xyz#/unirse/abc123')
  })

  it('sin nada guardado no cambia la URL', () => {
    window.history.replaceState(null, '', '/quedada/')
    restaurarEnlacePendiente()
    expect(window.location.hash).toBe('')
  })
})
