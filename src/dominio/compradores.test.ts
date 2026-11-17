import { describe, expect, it } from 'vitest'
import { borrarAsistente } from './asistentes'
import { compradores } from './compradores'
import { producto, quedada } from './fabrica'

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

describe('borrar una familia', () => {
  it('suelta los productos que tenía asignados', () => {
    const q = { ...base(), productos: [producto({ id: 'p1', compradorId: 'f2' }), producto({ id: 'p2', compradorId: 'ana' })] }
    const sin = borrarAsistente(q, 'f2')
    expect(sin.productos.map((p) => p.compradorId)).toEqual([null, 'ana'])
  })
})
