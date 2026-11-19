import { describe, expect, it } from 'vitest'
import { quedada } from './fabrica'
import { fechasValidas, ordenarQuedadas } from './ordenQuedadas'

const q = (id: string, nombre: string, inicio: string | null) => quedada({ id, nombre, inicio })

describe('ordenarQuedadas', () => {
  it('ordena por fecha de inicio descendente, la más nueva primero', () => {
    const orden = ordenarQuedadas([q('a', 'A', '2026-12-04'), q('b', 'B', '2025-12-05'), q('c', 'C', '2026-03-01')])
    expect(orden.map((x) => x.id)).toEqual(['a', 'c', 'b'])
  })

  it('a igualdad de fecha, por nombre', () => {
    const orden = ordenarQuedadas([q('a', 'Zamora', '2026-12-04'), q('b', 'Ávila', '2026-12-04'), q('c', 'Burgos', '2026-12-04')])
    expect(orden.map((x) => x.id)).toEqual(['b', 'c', 'a'])
  })

  it('las quedadas sin fecha van al final, por nombre', () => {
    const orden = ordenarQuedadas([q('a', 'B sin fecha', null), q('b', 'Con fecha', '2027-01-01'), q('c', 'A sin fecha', null)])
    expect(orden.map((x) => x.id)).toEqual(['b', 'c', 'a'])
  })

  it('no modifica la lista original', () => {
    const lista = [q('a', 'B', null), q('b', 'A', null)]
    ordenarQuedadas(lista)
    expect(lista.map((x) => x.id)).toEqual(['a', 'b'])
  })
})

describe('fechasValidas', () => {
  it('acepta fechas vacías, solo una o fin igual o posterior al inicio', () => {
    expect(fechasValidas(null, null)).toBe(true)
    expect(fechasValidas('2026-12-04', null)).toBe(true)
    expect(fechasValidas(null, '2026-12-06')).toBe(true)
    expect(fechasValidas('2026-12-04', '2026-12-04')).toBe(true)
    expect(fechasValidas('2026-12-04', '2026-12-06')).toBe(true)
  })

  it('rechaza un fin anterior al inicio', () => {
    expect(fechasValidas('2026-12-06', '2026-12-04')).toBe(false)
  })
})
