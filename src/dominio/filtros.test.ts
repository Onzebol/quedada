import { describe, expect, it } from 'vitest'
import { producto } from './fabrica'
import { contarSinAsignar, filtrarProductos } from './filtros'

const productos = [
  producto({ id: 'a', compradorId: 'josu', comprado: true }),
  producto({ id: 'b', compradorId: 'josu', comprado: false }),
  producto({ id: 'c', compradorId: null, comprado: false }),
  producto({ id: 'd', compradorId: 'motxi', comprado: false }),
]

const ids = (ps: ReturnType<typeof filtrarProductos>) => ps.map((p) => p.id)

describe('filtrarProductos', () => {
  it('todos devuelve todo', () => {
    expect(ids(filtrarProductos(productos, { tipo: 'todos' }))).toEqual(['a', 'b', 'c', 'd'])
  })

  it('sinAsignar devuelve lo que no tiene comprador', () => {
    expect(ids(filtrarProductos(productos, { tipo: 'sinAsignar' }))).toEqual(['c'])
  })

  it('pendientes devuelve lo no comprado, tenga o no comprador', () => {
    expect(ids(filtrarProductos(productos, { tipo: 'pendientes' }))).toEqual(['b', 'c', 'd'])
  })

  it('comprador devuelve lo de esa persona', () => {
    expect(ids(filtrarProductos(productos, { tipo: 'comprador', compradorId: 'josu' }))).toEqual(['a', 'b'])
  })

  it('comprador sin productos devuelve una lista vacía', () => {
    expect(filtrarProductos(productos, { tipo: 'comprador', compradorId: 'nadie' })).toEqual([])
  })
})

describe('contarSinAsignar', () => {
  it('cuenta los productos sin comprador', () => {
    expect(contarSinAsignar(productos)).toBe(1)
    expect(contarSinAsignar([])).toBe(0)
  })
})
