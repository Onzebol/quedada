import { describe, expect, it } from 'vitest'
import { formatearCantidad, parsearCantidad } from './numeros'

describe('parsearCantidad', () => {
  it('lee enteros y decimales con punto o con coma', () => {
    expect(parsearCantidad('3')).toBe(3)
    expect(parsearCantidad('2.3')).toBe(2.3)
    expect(parsearCantidad('2,254')).toBe(2.254)
  })

  it('ignora los espacios alrededor', () => {
    expect(parsearCantidad('  1,5 ')).toBe(1.5)
  })

  it('devuelve null si está vacío o no es un número', () => {
    expect(parsearCantidad('')).toBeNull()
    expect(parsearCantidad('  ')).toBeNull()
    expect(parsearCantidad('mucho')).toBeNull()
  })

  it('no admite negativos', () => {
    expect(parsearCantidad('-2')).toBeNull()
  })
})

describe('formatearCantidad', () => {
  it('usa coma decimal y añade la unidad', () => {
    expect(formatearCantidad(2.3, 'kg')).toBe('2,3 kg')
  })

  it('no pone decimales de más ni ceros inútiles', () => {
    expect(formatearCantidad(2, '')).toBe('2')
    expect(formatearCantidad(2.254, 'kg')).toBe('2,254 kg')
    expect(formatearCantidad(1.23456, '')).toBe('1,235')
  })

  it('devuelve cadena vacía sin cantidad', () => {
    expect(formatearCantidad(null, 'kg')).toBe('')
  })
})
