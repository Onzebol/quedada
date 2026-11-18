import { describe, expect, it } from 'vitest'
import { producto, quedada } from './fabrica'
import { balances, liquidacion, liquidar, repartirProporcional } from './liquidacion'
import type { Gasto, Pago, Participante } from './tipos'

function persona(id: string, parcial: Partial<Participante> = {}): Participante {
  return { id, nombre: id, ...parcial }
}

function gasto(pagadorId: string, euros: number, concepto = 'Compra'): Gasto {
  return { id: `${pagadorId}-${concepto}-${euros}`, pagadorId, concepto, importe: Math.round(euros * 100) }
}

function suma(valores: Record<string, number>): number {
  return Object.values(valores).reduce((a, b) => a + b, 0)
}

describe('repartirProporcional', () => {
  it('reparte a partes iguales cuando los pesos coinciden', () => {
    expect(repartirProporcional(3000, { a: 1, b: 1, c: 1 })).toEqual({ a: 1000, b: 1000, c: 1000 })
  })

  it('no pierde ni crea céntimos cuando no es exacto', () => {
    const partes = repartirProporcional(1000, { a: 1, b: 1, c: 1 })
    expect(suma(partes)).toBe(1000)
    expect(Object.values(partes).sort()).toEqual([333, 333, 334])
  })

  it('respeta los pesos y da 0 a quien pesa 0', () => {
    expect(repartirProporcional(1500, { a: 100, b: 50, c: 0 })).toEqual({ a: 1000, b: 500, c: 0 })
  })

  it('es determinista: el resto va a los primeros', () => {
    expect(repartirProporcional(1, { a: 1, b: 1 })).toEqual({ a: 1, b: 0 })
  })

  it('con todos los pesos a 0 reparte a partes iguales', () => {
    expect(repartirProporcional(1000, { a: 0, b: 0 })).toEqual({ a: 500, b: 500 })
  })

  it('con total negativo (descuento neto) también cuadra', () => {
    expect(suma(repartirProporcional(-1000, { a: 1, b: 1, c: 1 }))).toBe(-1000)
  })
})

describe('balances', () => {
  it('todos pagan igual: nadie debe nada', () => {
    const q = quedada({ participantes: [persona('a'), persona('b')], gastos: [gasto('a', 10), gasto('b', 10)] })
    expect(balances(q)).toEqual({ a: 0, b: 0 })
  })

  it('una sola persona paga todo: el resto le debe su parte', () => {
    const q = quedada({ participantes: [persona('a'), persona('b'), persona('c')], gastos: [gasto('a', 30)] })
    expect(balances(q)).toEqual({ a: 2000, b: -1000, c: -1000 })
  })

  it('los gastos se reparten por porcentaje de cada participante', () => {
    const q = quedada({
      participantes: [
        persona('a'),
        persona('b'),
        persona('nino', { porcentajeComida: 50 }),
        persona('bebe', { porcentajeComida: 0 }),
      ],
      gastos: [gasto('a', 25)],
    })
    // pesos 100, 100, 50, 0 → 10 €, 10 €, 5 €, 0 €
    expect(balances(q)).toEqual({ a: 1500, b: -1000, nino: -500, bebe: 0 })
  })

  it('los productos de la lista no cuentan: solo los gastos', () => {
    const q = quedada({
      participantes: [persona('a'), persona('b')],
      grupos: [{ id: 'comida', nombre: 'Cena', orden: 1 }, { id: 'casa', nombre: 'Casa', orden: 2, reparto: 'casa' }],
      productos: [
        producto({ grupoId: 'comida', compradorId: 'a', cantidad: 2, precioUnidad: 10, descuento: -4 }),
        producto({ id: 'p2', grupoId: 'casa', compradorId: 'b', precioUnidad: 99 }),
      ],
      gastos: [gasto('b', 6)],
    })
    expect(balances(q)).toEqual({ a: -300, b: 300 })
  })

  it('un gasto sin productos ni lista entra en las cuentas', () => {
    const q = quedada({ participantes: [persona('a'), persona('b')], gastos: [gasto('a', 20, 'Gasolina')] })
    expect(balances(q)).toEqual({ a: 1000, b: -1000 })
  })

  it('suma varios gastos de la misma persona', () => {
    const q = quedada({ participantes: [persona('a'), persona('b')], gastos: [gasto('a', 10), gasto('a', 5)] })
    expect(liquidacion(q).pagado).toEqual({ a: 1500 })
  })

  it('combina el alquiler (por % casa) y los gastos (por % comida)', () => {
    const q = quedada({
      participantes: [
        { id: 'a', nombre: 'a', familiaId: 'fa' },
        { id: 'b', nombre: 'b', familiaId: 'fb', porcentajeComida: 0 },
      ],
      asistentes: [
        { id: 'fa', familia: 'A', personas: 1, llegada: null },
        { id: 'fb', familia: 'B', personas: 1, llegada: null },
      ],
      casa: { titulo: '', descripcion: '', direccion: '', latitud: null, longitud: null, precio: 10000 },
      pagos: [{ id: 'pg', familiaId: 'fb', importe: 10000, concepto: '', pagado: true }],
      gastos: [gasto('a', 20)],
    })
    // gastos: a paga 20 € y le tocan todos. casa: 50 € cada uno, la paga la familia de b.
    expect(balances(q)).toEqual({ a: -5000, b: 5000 })
  })

  it('la suma de balances es cero aunque el reparto no sea exacto', () => {
    const q = quedada({
      participantes: [persona('a'), persona('b'), persona('c')],
      gastos: [gasto('a', 10.01), gasto('b', 0.07), gasto('c', 3.33)],
    })
    expect(suma(balances(q))).toBe(0)
  })
})

describe('liquidar', () => {
  it('sin deudas no hay transferencias', () => {
    expect(liquidar({ a: 0, b: 0 })).toEqual([])
  })

  it('un deudor paga a un acreedor', () => {
    expect(liquidar({ a: 500, b: -500 })).toEqual([{ de: 'b', a: 'a', importe: 500 }])
  })

  it('usa como mucho n-1 transferencias y deja todo a cero', () => {
    const saldos = { a: 1000, b: 700, c: -400, d: -900, e: -400 }
    const transferencias = liquidar(saldos)
    expect(transferencias.length).toBeLessThanOrEqual(4)
    const final: Record<string, number> = { ...saldos }
    for (const t of transferencias) {
      expect(t.importe).toBeGreaterThan(0)
      final[t.de] += t.importe
      final[t.a] -= t.importe
    }
    expect(Object.values(final).every((v) => v === 0)).toBe(true)
  })

  it('empareja primero al mayor deudor con el mayor acreedor', () => {
    expect(liquidar({ a: 300, b: 100, c: -250, d: -150 })).toEqual([
      { de: 'c', a: 'a', importe: 250 },
      { de: 'd', a: 'b', importe: 100 },
      { de: 'd', a: 'a', importe: 50 },
    ])
  })
})

describe('liquidacion', () => {
  it('con los datos de 2025 cuadra el total y las transferencias saldan todo', () => {
    const pagado = {
      josu: 166741,
      motxi: 48867,
      nerin: 36051,
      arpon: 30342,
      cesar: 13461,
      kosku: 13332,
      mizar: 9447,
    }
    const q = quedada({
      participantes: Object.keys(pagado).map((id) => persona(id)),
      gastos: Object.entries(pagado).map(([id, cts]) => gasto(id, cts / 100)),
    })
    const r = liquidacion(q)
    expect(r.total).toBe(318241)
    expect(r.pagado).toEqual(pagado)
    expect(suma(r.balances)).toBe(0)
    const final: Record<string, number> = { ...r.balances }
    for (const t of r.transferencias) {
      final[t.de] += t.importe
      final[t.a] -= t.importe
    }
    expect(Object.values(final).every((v) => v === 0)).toBe(true)
    expect(r.transferencias.length).toBeLessThanOrEqual(6)
  })
})

describe('reparto y asistentes (#7)', () => {
  it('la regla de #4 no depende de las familias apuntadas como asistentes', () => {
    const base = quedada({
      participantes: [persona('ana'), persona('luis')],
      gastos: [gasto('ana', 100), gasto('luis', 40)],
    })
    const conAsistentes = {
      ...base,
      asistentes: [{ id: 'a1', familia: 'Pérez', personas: 9, llegada: null }],
    }
    expect(liquidacion(conAsistentes)).toEqual(liquidacion(base))
  })
})

describe('alquiler de la casa (pagos por familia)', () => {
  const casa = { titulo: '', descripcion: '', direccion: '', latitud: null, longitud: null, precio: 90000 }
  const familias = [
    { id: 'f1', familia: 'Ana y Beto', personas: 2, llegada: null },
    { id: 'f2', familia: 'Cris', personas: 1, llegada: null },
  ]
  const personas = [
    { id: 'a', nombre: 'Ana', familiaId: 'f1' },
    { id: 'b', nombre: 'Beto', familiaId: 'f1' },
    { id: 'c', nombre: 'Cris', familiaId: 'f2' },
  ]
  const pago = (id: string, familiaId: string, importe: number): Pago => ({ id, familiaId, importe, concepto: '', pagado: true })
  const con = (pagos: Pago[], extra = {}) =>
    quedada({ participantes: personas, asistentes: familias, casa, pagos, ...extra })

  it('un pago sin marcar como pagado no cuenta en las cuentas (la reserva puede estar sin pagar)', () => {
    const sinPagar = { ...pago('1', 'f1', 60000), pagado: false }
    const sinCampo: Pago = { id: '2', familiaId: 'f2', importe: 30000, concepto: '' }
    const l = liquidacion(con([sinPagar, sinCampo, pago('3', 'f2', 3000)]))
    expect(l.total).toBe(3000)
    expect(l.balances).toEqual({ a: -1000, b: -1000, c: 2000 })
  })

  it('si cada familia paga según sus personas, nadie debe nada', () => {
    const l = liquidacion(con([pago('1', 'f1', 60000), pago('2', 'f2', 30000)]))
    expect(l.total).toBe(90000)
    expect(l.balances).toEqual({ a: 0, b: 0, c: 0 })
    expect(l.transferencias).toEqual([])
  })

  it('si una familia lo paga todo, las demás le deben su parte', () => {
    const l = liquidacion(con([pago('1', 'f1', 90000)]))
    expect(l.balances).toEqual({ a: 15000, b: 15000, c: -30000 })
    expect(l.transferencias.reduce((s, t) => s + t.importe, 0)).toBe(30000)
  })

  it('el pago de una familia se acredita a sus componentes según su porcentaje de casa', () => {
    const q = con([pago('1', 'f1', 90000)], {
      participantes: [{ ...personas[0], porcentajeCasa: 50 }, personas[1], personas[2]],
    })
    expect(liquidacion(q).pagado).toMatchObject({ a: 30000, b: 60000 })
  })

  it('con un pago parcial solo se reparte lo pagado, no el precio', () => {
    const l = liquidacion(con([pago('1', 'f1', 30000), pago('2', 'f2', 10000)]))
    expect(l.total).toBe(40000)
    expect(Object.values(l.balances).reduce((s, v) => s + v, 0)).toBe(0)
  })

  it('sin pagos el precio no entra en las cuentas', () => {
    const l = liquidacion(con([]))
    expect(l.total).toBe(0)
    expect(l.transferencias).toEqual([])
  })

  it('una familia sin componentes figura ella misma como pagadora (y no debe nada)', () => {
    const l = liquidacion(
      con([pago('1', 'f3', 5000)], { asistentes: [...familias, { id: 'f3', familia: 'Sola', personas: 1, llegada: null }] }),
    )
    expect(l.pagado.f3).toBe(5000)
    expect(l.balances.f3).toBe(5000)
  })
})
