import { describe, expect, it } from 'vitest'
import { producto, quedada } from './fabrica'
import { balances, liquidacion, liquidar, repartirProporcional } from './liquidacion'
import type { Grupo, Participante, Producto } from './tipos'

const comida: Grupo = { id: 'comida', nombre: 'Cena', orden: 1 }
const casa: Grupo = { id: 'casa', nombre: 'Casa', orden: 2, reparto: 'casa' }

function persona(id: string, parcial: Partial<Participante> = {}): Participante {
  return { id, nombre: id, ...parcial }
}

function compra(grupoId: string, compradorId: string, euros: number): Producto {
  return producto({
    id: `${grupoId}-${compradorId}-${euros}`,
    grupoId,
    compradorId,
    cantidad: 1,
    precioUnidad: euros,
  })
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
    const q = quedada({
      participantes: [persona('a'), persona('b')],
      grupos: [comida],
      productos: [compra('comida', 'a', 10), compra('comida', 'b', 10)],
    })
    expect(balances(q)).toEqual({ a: 0, b: 0 })
  })

  it('una sola persona paga todo: el resto le debe su parte', () => {
    const q = quedada({
      participantes: [persona('a'), persona('b'), persona('c')],
      grupos: [comida],
      productos: [compra('comida', 'a', 30)],
    })
    expect(balances(q)).toEqual({ a: 2000, b: -1000, c: -1000 })
  })

  it('aplica el descuento del producto', () => {
    const q = quedada({
      participantes: [persona('a'), persona('b')],
      grupos: [comida],
      productos: [
        producto({ grupoId: 'comida', compradorId: 'a', cantidad: 2, precioUnidad: 10, descuento: -4 }),
      ],
    })
    expect(balances(q)).toEqual({ a: 800, b: -800 })
  })

  it('la comida se reparte por porcentaje de cada participante', () => {
    const q = quedada({
      participantes: [
        persona('a'),
        persona('b'),
        persona('nino', { porcentajeComida: 50 }),
        persona('bebe', { porcentajeComida: 0 }),
      ],
      grupos: [comida],
      productos: [compra('comida', 'a', 25)],
    })
    // pesos 100, 100, 50, 0 → 10 €, 10 €, 5 €, 0 €
    expect(balances(q)).toEqual({ a: 1500, b: -1000, nino: -500, bebe: 0 })
  })

  it('los gastos de la casa se reparten entre todos aunque no vengan, salvo quien no paga', () => {
    const q = quedada({
      participantes: [
        persona('a'),
        persona('b'),
        persona('c', { porcentajeComida: 0 }),
        persona('nino', { pagaCasa: false }),
      ],
      grupos: [casa],
      productos: [compra('casa', 'a', 90)],
    })
    // casa entre a, b y c (c aunque no coma): 30 € cada uno; el niño no paga
    expect(balances(q)).toEqual({ a: 6000, b: -3000, c: -3000, nino: 0 })
  })

  it('combina casa y comida', () => {
    const q = quedada({
      participantes: [persona('a'), persona('b', { porcentajeComida: 0 })],
      grupos: [comida, casa],
      productos: [compra('comida', 'a', 20), compra('casa', 'b', 100)],
    })
    // comida: a paga 20 € y le toca 20 €. casa: 50 € cada uno, la paga b.
    expect(balances(q)).toEqual({ a: -5000, b: 5000 })
  })

  it('un grupo sin tipo cuenta como comida', () => {
    const q = quedada({
      participantes: [persona('a'), persona('b', { porcentajeComida: 0 })],
      grupos: [{ id: 'comida', nombre: 'x', orden: 1 }],
      productos: [compra('comida', 'a', 10)],
    })
    expect(balances(q)).toEqual({ a: 0, b: 0 })
  })

  it('ignora los productos sin comprador', () => {
    const q = quedada({
      participantes: [persona('a'), persona('b')],
      grupos: [comida],
      productos: [producto({ grupoId: 'comida', compradorId: null, precioUnidad: 50 })],
    })
    expect(balances(q)).toEqual({ a: 0, b: 0 })
  })

  it('la suma de balances es cero aunque el reparto no sea exacto', () => {
    const q = quedada({
      participantes: [persona('a'), persona('b'), persona('c')],
      grupos: [comida, casa],
      productos: [compra('comida', 'a', 10.01), compra('casa', 'b', 0.07), compra('comida', 'c', 3.33)],
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
      grupos: [comida],
      productos: Object.entries(pagado).map(([id, cts]) => compra('comida', id, cts / 100)),
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
      grupos: [comida, casa],
      productos: [compra('casa', 'ana', 100), compra('comida', 'luis', 40)],
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
  const pago = (id: string, familiaId: string, importe: number) => ({ id, familiaId, importe, concepto: '' })
  const con = (pagos: ReturnType<typeof pago>[], extra = {}) =>
    quedada({ participantes: personas, asistentes: familias, casa, pagos, ...extra })

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
