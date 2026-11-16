import { describe, expect, it } from 'vitest'
import { nombreCorto } from './nombreCorto'

describe('nombreCorto', () => {
  it('con nombre y dos apellidos (4 palabras o más) quita los dos últimos', () => {
    expect(nombreCorto('Luis Miguel Arpón Izquierdo')).toBe('Luis Miguel')
    expect(nombreCorto('Ana María José Pérez López')).toBe('Ana María José')
  })

  it('con menos de 4 palabras se queda con la primera', () => {
    expect(nombreCorto('Ana Pérez')).toBe('Ana')
    expect(nombreCorto('Ana Pérez López')).toBe('Ana')
    expect(nombreCorto('luis')).toBe('luis')
  })

  it('ignora espacios de más', () => {
    expect(nombreCorto('  Luis   Miguel  Arpón Izquierdo ')).toBe('Luis Miguel')
  })
})
