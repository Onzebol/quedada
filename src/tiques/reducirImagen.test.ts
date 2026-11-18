import { describe, expect, it } from 'vitest'
import { tamanoReducido } from './reducirImagen'

describe('tamanoReducido', () => {
  it('no toca las imágenes que ya caben', () => {
    expect(tamanoReducido(800, 600, 1600)).toEqual({ ancho: 800, alto: 600 })
  })

  it('reduce el lado mayor al máximo y mantiene la proporción', () => {
    expect(tamanoReducido(4000, 3000, 1600)).toEqual({ ancho: 1600, alto: 1200 })
    expect(tamanoReducido(3000, 4000, 1600)).toEqual({ ancho: 1200, alto: 1600 })
  })

  it('nunca devuelve un lado de cero píxeles', () => {
    expect(tamanoReducido(10000, 1, 1600)).toEqual({ ancho: 1600, alto: 1 })
  })
})
