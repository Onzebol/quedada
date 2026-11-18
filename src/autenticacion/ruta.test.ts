import { describe, expect, it } from 'vitest'
import { enlaceQuedada, hashQuedada, quedadaDeHash } from './ruta'

describe('ruta de la quedada', () => {
  it('lee el id de #/<id>', () => {
    expect(quedadaDeHash('#/abc-123')).toBe('abc-123')
  })

  it('sigue entendiendo los enlaces antiguos #/quedada/<id>', () => {
    expect(quedadaDeHash('#/quedada/abc-123')).toBe('abc-123')
  })

  it('devuelve null si el hash no es de una quedada', () => {
    expect(quedadaDeHash('')).toBeNull()
    expect(quedadaDeHash('#')).toBeNull()
    expect(quedadaDeHash('#/')).toBeNull()
    expect(quedadaDeHash('#/quedada/')).toBeNull()
    expect(quedadaDeHash('#/otra/cosa')).toBeNull()
    expect(quedadaDeHash('#abc')).toBeNull()
  })

  it('un id con caracteres especiales da la vuelta completa', () => {
    const id = 'a b/ñ'
    expect(hashQuedada(id)).toBe(`#/${encodeURIComponent(id)}`)
    expect(quedadaDeHash(hashQuedada(id))).toBe(id)
  })

  it('un id que empieza por «quedada» no se confunde con el formato antiguo', () => {
    expect(quedadaDeHash(hashQuedada('quedada'))).toBe('quedada')
    expect(quedadaDeHash(hashQuedada('quedada-2026'))).toBe('quedada-2026')
  })

  it('el hash de una quedada no repite la palabra quedada', () => {
    expect(hashQuedada('284626d3-012c-48a6-ab15-07a8e9bf5b35')).toBe('#/284626d3-012c-48a6-ab15-07a8e9bf5b35')
  })

  it('construye el enlace con la base de la página y un hash', () => {
    expect(enlaceQuedada('https://onzebol.github.io/quedada/', 'q1')).toBe('https://onzebol.github.io/quedada/#/q1')
    expect(enlaceQuedada('https://x.es/quedada/?a=1#/viejo', 'a b')).toBe('https://x.es/quedada/?a=1#/a%20b')
  })
})

describe('ruta de la invitación', () => {
  it('lee el token de #/unirse/<token>', async () => {
    const { invitacionDeHash } = await import('./ruta')
    expect(invitacionDeHash('#/unirse/abc123')).toBe('abc123')
  })

  it('devuelve null si el hash no es una invitación', async () => {
    const { invitacionDeHash } = await import('./ruta')
    for (const h of ['', '#/', '#/unirse', '#/unirse/', '#/unirse/a/b', '#/abc', '#/quedada/unirse']) {
      expect(invitacionDeHash(h)).toBeNull()
    }
  })

  it('no confunde una invitación con una quedada', () => {
    expect(quedadaDeHash('#/unirse/abc123')).toBeNull()
  })

  it('construye el enlace de la invitación sin el hash anterior', async () => {
    const { enlaceInvitacion } = await import('./ruta')
    expect(enlaceInvitacion('https://x.es/quedada/#/otra', 'abc123')).toBe('https://x.es/quedada/#/unirse/abc123')
  })
})
