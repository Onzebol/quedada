import { describe, expect, it } from 'vitest'
import { quedada } from './fabrica'
import { resumenPorFamilia } from './resumen'
import type { Asistente, Gasto, Pago, Participante } from './tipos'

const persona = (id: string, parcial: Partial<Participante> = {}): Participante => ({ id, nombre: id, ...parcial })
const familia = (id: string, nombre: string): Asistente => ({ id, familia: nombre, personas: 1, llegada: null })
const gasto = (pagadorId: string, importe: number): Gasto => ({ id: `g-${pagadorId}-${importe}`, pagadorId, concepto: 'Compra', importe })
const pago = (familiaId: string, importe: number): Pago => ({ id: `p-${familiaId}`, familiaId, concepto: 'Reserva', importe, pagado: true })

describe('resumenPorFamilia', () => {
  it('agrupa por familia: lo pagado, lo que toca (casa y gastos) y el saldo suman lo de sus componentes', () => {
    const q = quedada({
      asistentes: [familia('f1', 'Pérez'), familia('f2', 'Gómez')],
      participantes: [
        persona('ana', { familiaId: 'f1' }),
        persona('beto', { familiaId: 'f1' }),
        persona('cris', { familiaId: 'f2' }),
        persona('dani', { familiaId: 'f2' }),
      ],
      casa: { ...quedada().casa, precio: 40000 },
      pagos: [pago('f1', 40000)],
      gastos: [gasto('cris', 4000)],
    })
    const { grupos } = resumenPorFamilia(q)
    expect(grupos.map((g) => g.nombre)).toEqual(['Gómez', 'Pérez'])
    const [gomez, perez] = grupos
    expect(gomez).toMatchObject({ pagado: 4000, casaPagada: 0, casa: 20000, gastos: 2000, balance: -18000 })
    expect(perez).toMatchObject({ pagado: 40000, casaPagada: 40000, casa: 20000, gastos: 2000, balance: 18000 })
    expect(perez.personas.map((p) => p.nombre)).toEqual(['ana', 'beto'])
    expect(perez.personas[0]).toMatchObject({ pagado: 20000, casa: 10000, gastos: 1000, balance: 9000 })
  })

  it('los saldos de todos los grupos suman 0', () => {
    const q = quedada({
      asistentes: [familia('f1', 'A'), familia('f2', 'B')],
      participantes: [persona('x', { familiaId: 'f1' }), persona('y', { familiaId: 'f2' }), persona('z')],
      pagos: [pago('f1', 10001)],
      gastos: [gasto('z', 3333)],
    })
    const { grupos } = resumenPorFamilia(q)
    expect(grupos.reduce((s, g) => s + g.balance, 0)).toBe(0)
  })

  it('una persona sin familia sale como grupo propio y sin personas dentro', () => {
    const q = quedada({ participantes: [persona('ana'), persona('beto')], gastos: [gasto('ana', 1000)] })
    const { grupos } = resumenPorFamilia(q)
    expect(grupos.map((g) => [g.nombre, g.personas.length])).toEqual([['ana', 0], ['beto', 0]])
    expect(grupos[0]).toMatchObject({ pagado: 1000, gastos: 500, balance: 500 })
  })

  it('una familia sin componentes figura ella misma con lo que pagó', () => {
    const q = quedada({ asistentes: [familia('f1', 'Gómez')], participantes: [persona('ana')], gastos: [gasto('f1', 1000)] })
    const { grupos } = resumenPorFamilia(q)
    expect(grupos.find((g) => g.nombre === 'Gómez')).toMatchObject({ pagado: 1000, gastos: 0, balance: 1000, personas: [] })
  })

  it('un menor sale con lo que le toca aunque no pague', () => {
    const q = quedada({
      participantes: [persona('ana'), persona('nico', { adulto: false })],
      gastos: [gasto('ana', 1000)],
    })
    const { grupos } = resumenPorFamilia(q)
    expect(grupos.find((g) => g.nombre === 'nico')).toMatchObject({ pagado: 0, gastos: 500, balance: -500 })
  })

  it('totales: pagado, casa pagada y gastos', () => {
    const q = quedada({
      participantes: [persona('ana')],
      asistentes: [familia('f1', 'A')],
      casa: { ...quedada().casa, precio: 50000 },
      pagos: [pago('f1', 20000)],
      gastos: [gasto('ana', 3000)],
    })
    expect(resumenPorFamilia(q).totales).toEqual({ pagado: 23000, casaPagada: 20000, casaFalta: 30000, gastos: 3000 })
  })

  it('las transferencias son entre familias (o personas sueltas), no entre personas de una familia', () => {
    const q = quedada({
      asistentes: [familia('f1', 'Pérez'), familia('f2', 'Gómez')],
      participantes: [
        persona('ana', { familiaId: 'f1' }),
        persona('beto', { familiaId: 'f1' }),
        persona('cris', { familiaId: 'f2' }),
        persona('dani', { familiaId: 'f2' }),
      ],
      casa: { ...quedada().casa, precio: 40000 },
      pagos: [pago('f1', 40000)],
      gastos: [gasto('cris', 4000)],
    })
    expect(resumenPorFamilia(q).transferencias).toEqual([{ de: 'f2', a: 'f1', importe: 18000 }])
  })

  it('lo que falta de la casa no cuenta los pagos sin marcar como pagados, ni baja de 0, ni sale sin precio', () => {
    const base = quedada({ asistentes: [familia('f1', 'A')], participantes: [persona('ana', { familiaId: 'f1' })] })
    const conPrecio = (precio: number | null, pagos: Pago[]) => ({ ...base, casa: { ...base.casa, precio }, pagos })
    const sinMarcar = { ...pago('f1', 30000), id: 'x', pagado: false }
    expect(resumenPorFamilia(conPrecio(50000, [pago('f1', 20000), sinMarcar])).totales.casaFalta).toBe(30000)
    expect(resumenPorFamilia(conPrecio(10000, [pago('f1', 20000)])).totales.casaFalta).toBe(0)
    expect(resumenPorFamilia(conPrecio(null, [pago('f1', 20000)])).totales.casaFalta).toBeNull()
  })

  it('la casa pagada de una familia solo cuenta los pagos marcados como pagados', () => {
    const q = quedada({
      asistentes: [familia('f1', 'Pérez')],
      participantes: [persona('ana', { familiaId: 'f1' })],
      pagos: [pago('f1', 30000), { ...pago('f1', 5000), id: 'sin-pagar', pagado: false }],
      gastos: [gasto('ana', 2000)],
    })
    expect(resumenPorFamilia(q).grupos[0]).toMatchObject({ casaPagada: 30000, pagado: 32000 })
  })
})
