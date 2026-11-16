import { describe, expect, it } from 'vitest'
import { producto, quedada } from './fabrica'
import { totalGrupo, totalLinea, totalPorComprador, totalQuedada } from './totales'

describe('totalLinea', () => {
  it('multiplica cantidad por precio y lo expresa en céntimos', () => {
    expect(totalLinea(producto({ cantidad: 2, precioUnidad: 10.99 }))).toBe(2198)
  })

  it('suma el descuento (negativo) como en el Excel', () => {
    expect(totalLinea(producto({ cantidad: 2, precioUnidad: 2.59, descuento: -1.04 }))).toBe(414)
  })

  it('admite cantidades decimales y redondea al céntimo', () => {
    // 4,558 kg × 6,49 €/kg = 29,58142 €
    expect(totalLinea(producto({ cantidad: 4.558, precioUnidad: 6.49 }))).toBe(2958)
  })

  it('vale 0 si no hay precio', () => {
    expect(totalLinea(producto({ cantidad: 3, precioUnidad: null }))).toBe(0)
  })

  it('vale 0 si no hay cantidad', () => {
    expect(totalLinea(producto({ cantidad: null, precioUnidad: 5 }))).toBe(0)
  })

  it('no arrastra errores de coma flotante', () => {
    expect(totalLinea(producto({ cantidad: 3, precioUnidad: 0.1 }))).toBe(30)
  })
})

describe('totales de la quedada', () => {
  const q = quedada({
    productos: [
      producto({ id: 'a', grupoId: 'viernes', compradorId: 'josu', cantidad: 2, precioUnidad: 10 }),
      producto({ id: 'b', grupoId: 'viernes', compradorId: 'motxi', cantidad: 1, precioUnidad: 23 }),
      producto({ id: 'c', grupoId: 'desayunos', compradorId: 'josu', cantidad: 1, precioUnidad: 7.99 }),
      producto({ id: 'd', grupoId: 'desayunos', compradorId: null, cantidad: 1, precioUnidad: 2 }),
    ],
  })

  it('totalGrupo suma solo las líneas del grupo', () => {
    expect(totalGrupo(q, 'viernes')).toBe(4300)
    expect(totalGrupo(q, 'desayunos')).toBe(999)
  })

  it('totalGrupo de un grupo sin productos es 0', () => {
    expect(totalGrupo(q, 'inexistente')).toBe(0)
  })

  it('totalPorComprador agrupa por quien compra e ignora lo sin asignar', () => {
    expect(totalPorComprador(q)).toEqual({ josu: 2799, motxi: 2300 })
  })

  it('totalQuedada incluye también lo sin asignar', () => {
    expect(totalQuedada(q)).toBe(5299)
  })

  it('una quedada vacía suma 0', () => {
    expect(totalQuedada(quedada())).toBe(0)
    expect(totalPorComprador(quedada())).toEqual({})
  })
})
