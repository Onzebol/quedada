import { describe, expect, it } from 'vitest'
import {
  anadirAsistente,
  editarAsistente,
  ordenarPorNombre,
  totalAsistentes,
} from './asistentes'
import { quedada } from './fabrica'

describe('asistentes', () => {
  it('añade una familia con personas y hora de llegada', () => {
    const q = anadirAsistente(quedada(), { id: 'a1', familia: ' Pérez ', personas: 4, llegada: '18:30' })
    expect(q.asistentes).toEqual([{ id: 'a1', familia: 'Pérez', personas: 4, llegada: '18:30' }])
  })

  it('ignora nombres vacíos, repetidos y número de personas no válido', () => {
    const base = anadirAsistente(quedada(), { id: 'a1', familia: 'Pérez', personas: 2, llegada: null })
    expect(anadirAsistente(base, { id: 'a2', familia: '  ', personas: 2, llegada: null })).toBe(base)
    expect(anadirAsistente(base, { id: 'a2', familia: 'pérez', personas: 2, llegada: null })).toBe(base)
    expect(anadirAsistente(base, { id: 'a2', familia: 'Gil', personas: 0, llegada: null })).toBe(base)
    expect(anadirAsistente(base, { id: 'a2', familia: 'Gil', personas: 1.5, llegada: null })).toBe(base)
  })

  it('edita personas, llegada y familia', () => {
    const q0 = anadirAsistente(quedada(), { id: 'a1', familia: 'Pérez', personas: 2, llegada: null })
    const q1 = editarAsistente(q0, 'a1', { personas: 5, llegada: '20:00', familia: 'Pérez Gil' })
    expect(q1.asistentes[0]).toEqual({ id: 'a1', familia: 'Pérez Gil', personas: 5, llegada: '20:00' })
  })

  it('al editar rechaza los cambios no válidos pero aplica los válidos', () => {
    const q0 = anadirAsistente(quedada(), { id: 'a1', familia: 'Pérez', personas: 2, llegada: '10:00' })
    const q1 = editarAsistente(q0, 'a1', { personas: 0, familia: ' ', llegada: '11:15' })
    expect(q1.asistentes[0]).toEqual({ id: 'a1', familia: 'Pérez', personas: 2, llegada: '11:15' })
  })

  it('suma las personas de todas las familias', () => {
    let q = quedada()
    q = anadirAsistente(q, { id: 'a1', familia: 'Pérez', personas: 4, llegada: null })
    q = anadirAsistente(q, { id: 'a2', familia: 'Gil', personas: 3, llegada: null })
    expect(totalAsistentes(q)).toBe(7)
    expect(totalAsistentes(quedada())).toBe(0)
  })

  it('ordena alfabéticamente sin distinguir mayúsculas ni acentos', () => {
    const nombres = ['zapata', 'Álvarez', 'Pérez', 'alonso', 'Ñúñez']
    const ordenados = ordenarPorNombre(nombres.map((n) => ({ nombre: n })), (x) => x.nombre)
    expect(ordenados.map((x) => x.nombre)).toEqual(['alonso', 'Álvarez', 'Ñúñez', 'Pérez', 'zapata'])
  })
})
