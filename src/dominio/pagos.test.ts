import { describe, expect, it } from 'vitest'
import { borrarAsistente } from './asistentes'
import { anadirComponente } from './casa'
import { quedada } from './fabrica'
import { anadirPago, borrarPago, editarPago, marcarCasaEnviada, partesPorEnviar, pendienteDeLaCasa, repartirEntreFamilias, totalPagado } from './pagos'

const base = () =>
  quedada({
    casa: { titulo: '', descripcion: '', direccion: '', latitud: null, longitud: null, precio: 100000 },
    asistentes: [
      { id: 'f1', familia: 'García', personas: 2, llegada: null },
      { id: 'f2', familia: 'Pérez', personas: 1, llegada: null },
    ],
  })

describe('anadirPago', () => {
  it('añade un pago de una familia con concepto limpio', () => {
    const q = anadirPago(base(), { id: 'p1', familiaId: 'f1', importe: 20000, concepto: ' Reserva ' })
    expect(q.pagos).toEqual([{ id: 'p1', familiaId: 'f1', importe: 20000, concepto: 'Reserva' }])
  })

  it('ignora familias que no existen, importes no positivos o no numéricos e ids repetidos', () => {
    const q = anadirPago(base(), { id: 'p1', familiaId: 'f1', importe: 100, concepto: '' })
    expect(anadirPago(q, { id: 'p2', familiaId: 'nope', importe: 100, concepto: '' })).toBe(q)
    expect(anadirPago(q, { id: 'p2', familiaId: 'f1', importe: 0, concepto: '' })).toBe(q)
    expect(anadirPago(q, { id: 'p2', familiaId: 'f1', importe: -5, concepto: '' })).toBe(q)
    expect(anadirPago(q, { id: 'p2', familiaId: 'f1', importe: Number.NaN, concepto: '' })).toBe(q)
    expect(anadirPago(q, { id: 'p1', familiaId: 'f2', importe: 100, concepto: '' })).toBe(q)
  })

  it('redondea el importe a céntimos enteros', () => {
    expect(anadirPago(base(), { id: 'p1', familiaId: 'f1', importe: 10.4, concepto: '' }).pagos[0].importe).toBe(10)
  })
})

describe('editarPago y borrarPago', () => {
  const con = () => anadirPago(base(), { id: 'p1', familiaId: 'f1', importe: 20000, concepto: 'Reserva' })

  it('edita familia, importe y concepto', () => {
    const q = editarPago(con(), 'p1', { familiaId: 'f2', importe: 5000, concepto: 'Resto' })
    expect(q.pagos[0]).toEqual({ id: 'p1', familiaId: 'f2', importe: 5000, concepto: 'Resto' })
  })

  it('descarta los cambios no válidos y conserva el resto', () => {
    const q = editarPago(con(), 'p1', { familiaId: 'nope', importe: -1, concepto: 'Resto' })
    expect(q.pagos[0]).toEqual({ id: 'p1', familiaId: 'f1', importe: 20000, concepto: 'Resto' })
  })

  it('borra un pago', () => {
    expect(borrarPago(con(), 'p1').pagos).toEqual([])
  })
})

describe('totales', () => {
  it('suma lo pagado y calcula lo pendiente (nunca negativo; sin precio no hay pendiente)', () => {
    let q = anadirPago(base(), { id: 'p1', familiaId: 'f1', importe: 30000, concepto: '' })
    q = anadirPago(q, { id: 'p2', familiaId: 'f2', importe: 20000, concepto: '' })
    expect(totalPagado(q)).toBe(50000)
    expect(pendienteDeLaCasa(q)).toBe(50000)
    expect(pendienteDeLaCasa(anadirPago(q, { id: 'p3', familiaId: 'f2', importe: 80000, concepto: '' }))).toBe(0)
    expect(pendienteDeLaCasa({ ...q, casa: { ...q.casa, precio: null } })).toBeNull()
  })
})

describe('repartirEntreFamilias', () => {
  let n = 0
  const id = () => `n${++n}`

  it('crea un pago por familia, proporcional a sus personas y sin perder céntimos', () => {
    const q = repartirEntreFamilias(base(), { total: 10000, concepto: 'Reserva' }, id)
    expect(q.pagos.map((p) => [p.familiaId, p.importe, p.concepto])).toEqual([
      ['f1', 6667, 'Reserva'],
      ['f2', 3333, 'Reserva'],
    ])
    expect(totalPagado(q)).toBe(10000)
  })

  it('cuenta los componentes de cada familia, no el número escrito', () => {
    let q = anadirComponente(base(), { id: 'a', familiaId: 'f2', nombre: 'Ana' })
    q = anadirComponente(q, { id: 'b', familiaId: 'f2', nombre: 'Beto' })
    q = anadirComponente(q, { id: 'c', familiaId: 'f2', nombre: 'Cris' })
    const r = repartirEntreFamilias(q, { total: 10000, concepto: '' }, id)
    expect(r.pagos.find((p) => p.familiaId === 'f2')?.importe).toBe(6000)
  })

  it('no crea pagos de importe 0 ni hace nada sin familias o con un total no positivo', () => {
    const q = base()
    expect(repartirEntreFamilias(q, { total: 1, concepto: '' }, id).pagos).toHaveLength(1)
    expect(repartirEntreFamilias(q, { total: 0, concepto: '' }, id)).toBe(q)
    expect(repartirEntreFamilias(q, { total: -5, concepto: '' }, id)).toBe(q)
    const sinFamilias = quedada()
    expect(repartirEntreFamilias(sinFamilias, { total: 100, concepto: '' }, id)).toBe(sinFamilias)
  })
})

describe('borrar una familia', () => {
  it('borra también sus pagos', () => {
    let q = anadirPago(base(), { id: 'p1', familiaId: 'f1', importe: 100, concepto: '' })
    q = anadirPago(q, { id: 'p2', familiaId: 'f2', importe: 200, concepto: '' })
    expect(borrarAsistente(q, 'f1').pagos.map((p) => p.id)).toEqual(['p2'])
  })
})

describe('partes de la casa por enviar', () => {
  const conPago = () =>
    quedada({
      casa: { titulo: '', descripcion: '', direccion: '', latitud: null, longitud: null, precio: 90000 },
      asistentes: [
        { id: 'f1', familia: 'Ana y Beto', personas: 2, llegada: null },
        { id: 'f2', familia: 'Cris', personas: 1, llegada: null },
      ],
      participantes: [
        { id: 'a', nombre: 'Ana', familiaId: 'f1' },
        { id: 'b', nombre: 'Beto', familiaId: 'f1' },
        { id: 'c', nombre: 'Cris', familiaId: 'f2' },
      ],
      pagos: [{ id: 'p1', familiaId: 'f1', importe: 90000, concepto: '' }],
    })

  it('lista solo a quien debe parte de lo pagado, con su importe', () => {
    expect(partesPorEnviar(conPago())).toEqual([{ id: 'c', importe: 30000, enviada: false }])
  })

  it('sin pagos no hay nada por enviar', () => {
    expect(partesPorEnviar({ ...conPago(), pagos: [] })).toEqual([])
  })

  it('marcarCasaEnviada marca y desmarca a un participante', () => {
    const marcada = marcarCasaEnviada(conPago(), 'c', true)
    expect(partesPorEnviar(marcada)).toEqual([{ id: 'c', importe: 30000, enviada: true }])
    expect(marcarCasaEnviada(marcada, 'c', false).participantes.find((p) => p.id === 'c')?.casaEnviada).toBe(false)
  })

  it('ignora a un participante que no existe', () => {
    const q = conPago()
    expect(marcarCasaEnviada(q, 'zzz', true)).toBe(q)
  })
})
