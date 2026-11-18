import { describe, expect, it } from 'vitest'
import { borrarAsistente } from './asistentes'
import { compradores } from './compradores'
import { producto, quedada } from './fabrica'
import { editarParticipante } from './operaciones'

const base = () =>
  quedada({
    asistentes: [
      { id: 'f1', familia: 'Pérez', personas: 2, llegada: null },
      { id: 'f2', familia: 'Gómez', personas: 3, llegada: null },
    ],
    participantes: [{ id: 'ana', nombre: 'Ana', familiaId: 'f1' }],
  })

describe('compradores', () => {
  it('son los participantes y las familias que no tienen personas, por orden alfabético', () => {
    expect(compradores(base())).toEqual([
      { id: 'ana', nombre: 'Ana' },
      { id: 'f2', nombre: 'Gómez' },
    ])
  })

  it('una familia con personas no es comprador, salvo que ya tenga productos asignados', () => {
    const q = { ...base(), productos: [producto({ id: 'p1', compradorId: 'f1' })] }
    expect(compradores(q).map((c) => c.id)).toEqual(['ana', 'f2', 'f1'])
  })
})

describe('niños', () => {
  const conNino = () => ({
    ...base(),
    participantes: [
      { id: 'ana', nombre: 'Ana', familiaId: 'f1' },
      { id: 'leo', nombre: 'Leo', familiaId: 'f1', adulto: false },
    ],
  })

  it('no son compradores (ni pagadores)', () => {
    expect(compradores(conNino()).map((c) => c.id)).toEqual(['ana', 'f2'])
  })

  it('se pueden incluir cuando hace falta ponerles nombre', () => {
    expect(compradores(conNino(), { conNinos: true }).map((c) => c.id)).toEqual(['ana', 'f2', 'leo'])
  })

  it('al marcar a alguien como niño se sueltan sus productos', () => {
    const q = { ...base(), productos: [producto({ id: 'p1', compradorId: 'ana' }), producto({ id: 'p2', compradorId: 'f2' })] }
    const nueva = editarParticipante(q, 'ana', { adulto: false })
    expect(nueva.participantes[0].adulto).toBe(false)
    expect(nueva.productos.map((p) => p.compradorId)).toEqual([null, 'f2'])
  })

  it('no se puede marcar como niño a quien ya tiene gastos registrados', () => {
    const q = { ...base(), gastos: [{ id: 'g1', pagadorId: 'ana', concepto: 'Compra', importe: 1000 }] }
    expect(editarParticipante(q, 'ana', { adulto: false })).toBe(q)
  })

  it('volver a adulto es posible', () => {
    const q = editarParticipante(base(), 'ana', { adulto: false })
    expect(editarParticipante(q, 'ana', { adulto: true }).participantes[0].adulto).toBe(true)
  })
})

describe('borrar una familia', () => {
  it('suelta los productos que tenía asignados', () => {
    const q = { ...base(), productos: [producto({ id: 'p1', compradorId: 'f2' }), producto({ id: 'p2', compradorId: 'ana' })] }
    const sin = borrarAsistente(q, 'f2')
    expect(sin.productos.map((p) => p.compradorId)).toEqual([null, 'ana'])
  })
})
