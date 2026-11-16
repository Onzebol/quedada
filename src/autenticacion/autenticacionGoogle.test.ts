import { beforeEach, describe, expect, it } from 'vitest'
import { borrarSesion, guardarSesion, leerSesion, usuarioDeInfo } from './autenticacionGoogle'

describe('respuesta userinfo de Google', () => {
  it('extrae id, nombre y foto', () => {
    expect(usuarioDeInfo({ sub: '123', name: 'Ana Pérez', picture: 'https://f/x.png', email: 'a@b.c' })).toEqual({
      id: '123',
      nombre: 'Ana Pérez',
      foto: 'https://f/x.png',
    })
  })

  it('no guarda el correo (solo lo mínimo)', () => {
    expect(JSON.stringify(usuarioDeInfo({ sub: '1', name: 'A', email: 'a@b.c' }))).not.toContain('a@b.c')
  })

  it('sin nombre usa el correo como nombre visible, sin guardarlo aparte', () => {
    expect(usuarioDeInfo({ sub: '1', email: 'ana@b.c' })).toEqual({ id: '1', nombre: 'ana', foto: null })
  })

  it('devuelve null si falta el identificador o no es un objeto', () => {
    expect(usuarioDeInfo({ name: 'sin sub' })).toBeNull()
    expect(usuarioDeInfo(null)).toBeNull()
    expect(usuarioDeInfo('texto')).toBeNull()
  })
})

describe('sesión guardada', () => {
  beforeEach(() => localStorage.clear())

  it('recupera la sesión guardada mientras no haya caducado', () => {
    guardarSesion({ id: '1', nombre: 'Ana', foto: null }, 0)
    expect(leerSesion(1000)?.nombre).toBe('Ana')
  })

  it('descarta la sesión caducada', () => {
    guardarSesion({ id: '1', nombre: 'Ana', foto: null }, 0)
    expect(leerSesion(31 * 24 * 60 * 60 * 1000)).toBeNull()
    expect(localStorage.length).toBe(0)
  })

  it('borra la sesión y tolera datos corruptos', () => {
    guardarSesion({ id: '1', nombre: 'Ana', foto: null }, 0)
    borrarSesion()
    expect(leerSesion(1000)).toBeNull()
    localStorage.setItem('quedada.sesion', '{no es json')
    expect(leerSesion(1000)).toBeNull()
  })
})
