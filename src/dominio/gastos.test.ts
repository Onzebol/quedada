import { describe, expect, it } from 'vitest'
import { quedada } from './fabrica'
import { anadirGasto, borrarGasto, editarGasto } from './gastos'
import { borrarAsistente } from './asistentes'
import { quitarComponente } from './casa'
import { compradores } from './compradores'

const base = quedada({
  participantes: [{ id: 'a', nombre: 'Ana' }],
  asistentes: [{ id: 'f', familia: 'Pérez', personas: 2, llegada: null }],
})

describe('gastos', () => {
  it('añade un gasto de una persona o de una familia', () => {
    const q = anadirGasto(anadirGasto(base, { id: 'p1', pagadorId: 'a', concepto: ' Gasolina ', importe: 4550 }), {
      id: 'p2', pagadorId: 'f', concepto: 'Hielo', importe: 300,
    })
    expect(q.gastos).toEqual([
      { id: 'p1', pagadorId: 'a', concepto: 'Gasolina', importe: 4550 },
      { id: 'p2', pagadorId: 'f', concepto: 'Hielo', importe: 300 },
    ])
  })

  it('rechaza importes no positivos, conceptos vacíos y pagadores desconocidos', () => {
    expect(anadirGasto(base, { id: 'p', pagadorId: 'a', concepto: 'x', importe: 0 })).toBe(base)
    expect(anadirGasto(base, { id: 'p', pagadorId: 'a', concepto: ' ', importe: 100 })).toBe(base)
    expect(anadirGasto(base, { id: 'p', pagadorId: 'nadie', concepto: 'x', importe: 100 })).toBe(base)
  })

  it('edita un gasto', () => {
    const q = anadirGasto(base, { id: 'p1', pagadorId: 'a', concepto: 'Gasolina', importe: 4550 })
    const e = editarGasto(q, 'p1', { concepto: 'Peaje', importe: 1000, pagadorId: 'f' })
    expect(e.gastos).toEqual([{ id: 'p1', pagadorId: 'f', concepto: 'Peaje', importe: 1000 }])
    expect(editarGasto(q, 'p1', { importe: -5 })).toBe(q)
  })

  it('borra un gasto', () => {
    const q = anadirGasto(base, { id: 'p1', pagadorId: 'a', concepto: 'Gasolina', importe: 4550 })
    expect(borrarGasto(q, 'p1').gastos).toEqual([])
  })

  it('al borrar a quien pagó, se borran sus gastos', () => {
    const q = anadirGasto(anadirGasto(base, { id: 'p1', pagadorId: 'a', concepto: 'x', importe: 100 }), {
      id: 'p2', pagadorId: 'f', concepto: 'y', importe: 200,
    })
    expect(quitarComponente(q, 'a').gastos.map((p) => p.id)).toEqual(['p2'])
    expect(borrarAsistente(q, 'f').gastos.map((p) => p.id)).toEqual(['p1'])
  })

  it('una familia con personas sigue pudiendo figurar como pagadora si ya gastó', () => {
    const q = quedada({
      participantes: [{ id: 'a', nombre: 'Ana', familiaId: 'f' }],
      asistentes: [{ id: 'f', familia: 'Pérez', personas: 1, llegada: null }],
      gastos: [{ id: 'p', pagadorId: 'f', concepto: 'x', importe: 100 }],
    })
    expect(compradores(q).map((c) => c.id)).toEqual(['a', 'f'])
  })

  it('guarda la imagen del tique y la conserva o cambia al editar', () => {
    const q = anadirGasto(base, { id: 'p1', pagadorId: 'a', concepto: 'Tique', importe: 1200, imagen: 'q/p1.jpg' })
    expect(q.gastos[0].imagen).toBe('q/p1.jpg')
    expect(editarGasto(q, 'p1', { importe: 1300 }).gastos[0].imagen).toBe('q/p1.jpg')
    expect(editarGasto(q, 'p1', { imagen: 'q/otra.jpg' }).gastos[0].imagen).toBe('q/otra.jpg')
    expect(editarGasto(q, 'p1', { imagen: null }).gastos[0]).not.toHaveProperty('imagen')
  })
})
