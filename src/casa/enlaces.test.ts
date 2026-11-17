import { describe, expect, it } from 'vitest'
import { partirEnlaces } from './enlaces'

describe('partirEnlaces', () => {
  it('devuelve el texto tal cual si no hay enlaces', () => {
    expect(partirEnlaces('Casa con jardín')).toEqual([{ tipo: 'texto', valor: 'Casa con jardín' }])
  })

  it('separa los enlaces http y https del texto', () => {
    expect(partirEnlaces('Mira https://casa.es/a?b=1 y http://x.org, ok')).toEqual([
      { tipo: 'texto', valor: 'Mira ' },
      { tipo: 'enlace', valor: 'https://casa.es/a?b=1' },
      { tipo: 'texto', valor: ' y ' },
      { tipo: 'enlace', valor: 'http://x.org' },
      { tipo: 'texto', valor: ', ok' },
    ])
  })

  it('no incluye la puntuación final en el enlace', () => {
    expect(partirEnlaces('(https://casa.es).')).toEqual([
      { tipo: 'texto', valor: '(' },
      { tipo: 'enlace', valor: 'https://casa.es' },
      { tipo: 'texto', valor: ').' },
    ])
  })

  it('no convierte en enlace otros esquemas', () => {
    expect(partirEnlaces('javascript:alert(1) ftp://x.es')).toEqual([{ tipo: 'texto', valor: 'javascript:alert(1) ftp://x.es' }])
  })

  it('vacío no da trozos', () => {
    expect(partirEnlaces('')).toEqual([])
  })
})
