import { describe, expect, it } from 'vitest'
import { enlaceQuedada, quedadaDeHash } from './ruta'

describe('ruta de la quedada', () => {
  it('lee el id de #/quedada/<id>', () => {
    expect(quedadaDeHash('#/quedada/abc-123')).toBe('abc-123')
  })

  it('devuelve null si el hash no es de una quedada', () => {
    expect(quedadaDeHash('')).toBeNull()
    expect(quedadaDeHash('#/otra/cosa')).toBeNull()
    expect(quedadaDeHash('#/quedada/')).toBeNull()
  })

  it('decodifica ids con caracteres especiales', () => {
    expect(quedadaDeHash(`#/quedada/${encodeURIComponent('a b/ñ')}`)).toBe('a b/ñ')
  })

  it('construye el enlace con la base de la página y un hash', () => {
    expect(enlaceQuedada('https://onzebol.github.io/quedada/', 'q1')).toBe('https://onzebol.github.io/quedada/#/quedada/q1')
    expect(enlaceQuedada('https://x.es/quedada/?a=1#/viejo', 'a b')).toBe('https://x.es/quedada/?a=1#/quedada/a%20b')
  })
})
