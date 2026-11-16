import { describe, expect, it } from 'vitest'
import {
  anadirAsistente,
  anadirBasico,
  asignarBasico,
  basicosSinAsignar,
  borrarAsistente,
  borrarBasico,
  editarAsistente,
  ordenarPorLlegada,
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

  it('ordena por hora de llegada y deja al final los que no la tienen', () => {
    let q = quedada()
    q = anadirAsistente(q, { id: 'a1', familia: 'Sin hora', personas: 1, llegada: null })
    q = anadirAsistente(q, { id: 'a2', familia: 'Tarde', personas: 1, llegada: '21:00' })
    q = anadirAsistente(q, { id: 'a3', familia: 'Pronto', personas: 1, llegada: '09:05' })
    expect(ordenarPorLlegada(q.asistentes).map((a) => a.familia)).toEqual(['Pronto', 'Tarde', 'Sin hora'])
  })

  it('al borrar una familia sus básicos quedan sin asignar', () => {
    let q = anadirAsistente(quedada(), { id: 'a1', familia: 'Pérez', personas: 2, llegada: null })
    q = anadirBasico(q, { id: 'b1', nombre: 'Leche' })
    q = asignarBasico(q, 'b1', 'a1')
    q = borrarAsistente(q, 'a1')
    expect(q.asistentes).toEqual([])
    expect(q.basicos).toEqual([{ id: 'b1', nombre: 'Leche', asistenteId: null }])
  })
})

describe('básicos', () => {
  it('añade básicos sin asignar y rechaza vacíos o repetidos', () => {
    let q = anadirBasico(quedada(), { id: 'b1', nombre: ' Leche ' })
    expect(q.basicos).toEqual([{ id: 'b1', nombre: 'Leche', asistenteId: null }])
    expect(anadirBasico(q, { id: 'b2', nombre: ' ' })).toBe(q)
    expect(anadirBasico(q, { id: 'b2', nombre: 'leche' })).toBe(q)
    q = anadirBasico(q, { id: 'b3', nombre: 'Pastillas de lavavajillas' })
    expect(basicosSinAsignar(q).map((b) => b.nombre)).toEqual(['Leche', 'Pastillas de lavavajillas'])
  })

  it('asigna un básico a una familia y lo puede soltar', () => {
    let q = anadirAsistente(quedada(), { id: 'a1', familia: 'Pérez', personas: 2, llegada: null })
    q = anadirBasico(q, { id: 'b1', nombre: 'Leche' })
    q = asignarBasico(q, 'b1', 'a1')
    expect(basicosSinAsignar(q)).toEqual([])
    q = asignarBasico(q, 'b1', null)
    expect(basicosSinAsignar(q)).toHaveLength(1)
  })

  it('no asigna a una familia que no existe', () => {
    const q = anadirBasico(quedada(), { id: 'b1', nombre: 'Leche' })
    expect(asignarBasico(q, 'b1', 'nadie')).toBe(q)
  })

  it('borra un básico', () => {
    let q = anadirBasico(quedada(), { id: 'b1', nombre: 'Leche' })
    q = borrarBasico(q, 'b1')
    expect(q.basicos).toEqual([])
  })
})
