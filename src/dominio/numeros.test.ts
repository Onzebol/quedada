import { describe, expect, it } from 'vitest'
import { formatearCantidad, formatearEuros, parsearCantidad, parsearEuros } from './numeros'

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

describe('parsearEuros', () => {
  it('lee importes con coma o punto decimal y con signo', () => {
    expect(parsearEuros('3,5')).toBe(3.5)
    expect(parsearEuros('2.25')).toBe(2.25)
    expect(parsearEuros('-4,50')).toBe(-4.5)
    expect(parsearEuros(' 7 ')).toBe(7)
  })

  it('devuelve null si está vacío o no es un número', () => {
    expect(parsearEuros('')).toBeNull()
    expect(parsearEuros('abc')).toBeNull()
    expect(parsearEuros('1,2,3')).toBeNull()
  })
})

describe('formatearEuros', () => {
  const normal = (t: string) => t.replace(/\s/g, ' ')

  it('formatea céntimos con coma decimal y símbolo', () => {
    expect(normal(formatearEuros(48867))).toBe('488,67 €')
    expect(normal(formatearEuros(5))).toBe('0,05 €')
  })

  it('separa los miles y admite negativos', () => {
    expect(normal(formatearEuros(166741))).toBe('1.667,41 €')
    expect(normal(formatearEuros(-250))).toBe('-2,50 €')
  })
})
