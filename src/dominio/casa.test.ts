import { describe, expect, it } from 'vitest'
import { borrarAsistente, totalAsistentes } from './asistentes'
import { anadirComponente, casaVacia, editarCasa, partesDeLaCasa, quitarComponente } from './casa'
import { quedada } from './fabrica'
import { editarParticipante } from './operaciones'

const base = () =>
  quedada({
    asistentes: [{ id: 'f1', familia: 'Pérez', personas: 1, llegada: null }],
    participantes: [{ id: 'a', nombre: 'Ana' }],
  })

describe('editarCasa', () => {
  it('guarda título, descripción y dirección', () => {
    const q = editarCasa(quedada(), { titulo: 'Casa Almunia', descripcion: 'Ver https://x.es', direccion: 'Calle 1' })
    expect(q.casa).toMatchObject({ titulo: 'Casa Almunia', descripcion: 'Ver https://x.es', direccion: 'Calle 1' })
  })

  it('descarta precios negativos o no numéricos y admite quitarlo', () => {
    let q = editarCasa(quedada(), { precio: 120000 })
    expect(q.casa.precio).toBe(120000)
    expect(editarCasa(q, { precio: -5 }).casa.precio).toBe(120000)
    expect(editarCasa(q, { precio: Number.NaN }).casa.precio).toBe(120000)
    q = editarCasa(q, { precio: null })
    expect(q.casa.precio).toBeNull()
  })

  it('descarta coordenadas fuera de rango', () => {
    const q = editarCasa(quedada(), { latitud: 41.6, longitud: -1.2 })
    expect(editarCasa(q, { latitud: 95 }).casa.latitud).toBe(41.6)
    expect(editarCasa(q, { longitud: -200 }).casa.longitud).toBe(-1.2)
  })


  it('cambiar la dirección borra las coordenadas viejas', () => {
    const q = editarCasa(editarCasa(quedada(), { direccion: 'A' }), { latitud: 1, longitud: 2 })
    expect(editarCasa(q, { direccion: 'B' }).casa).toMatchObject({ latitud: null, longitud: null })
    expect(editarCasa(q, { direccion: 'A' }).casa).toMatchObject({ latitud: 1, longitud: 2 })
  })
})

describe('componentes de una familia', () => {
  it('añade un componente (participante de la familia) y la familia pasa a contarlos', () => {
    let q = anadirComponente(base(), { id: 'b', familiaId: 'f1', nombre: ' Beto ' })
    q = anadirComponente(q, { id: 'c', familiaId: 'f1', nombre: 'Cris' })
    expect(q.participantes.filter((p) => p.familiaId === 'f1').map((p) => p.nombre)).toEqual(['Beto', 'Cris'])
    expect(q.asistentes[0].personas).toBe(2)
    expect(totalAsistentes(q)).toBe(2)
  })

  it('ignora nombres vacíos, repetidos o familias que no existen', () => {
    const q = base()
    expect(anadirComponente(q, { id: 'b', familiaId: 'f1', nombre: ' ' })).toBe(q)
    expect(anadirComponente(q, { id: 'b', familiaId: 'f1', nombre: 'ana' })).toBe(q)
    expect(anadirComponente(q, { id: 'b', familiaId: 'nope', nombre: 'Beto' })).toBe(q)
  })

  it('una familia sin componentes sigue contando sus personas escritas', () => {
    expect(totalAsistentes(quedada({ asistentes: [{ id: 'f', familia: 'X', personas: 4, llegada: null }] }))).toBe(4)
  })

  it('quitar un componente lo suelta de compradores y la familia lo deja de contar', () => {
    let q = anadirComponente(base(), { id: 'b', familiaId: 'f1', nombre: 'Beto' })
    q = anadirComponente(q, { id: 'c', familiaId: 'f1', nombre: 'Cris' })
    q = {
      ...q,
      productos: [
        { id: 'p', grupoId: 'g', nombre: 'Pan', cantidad: 1, unidad: '', compradorId: 'b', comprado: true, precioUnidad: 1, descuento: 0, observaciones: '' },
      ],
    }
    q = quitarComponente(q, 'b')
    expect(q.participantes.map((p) => p.id)).toEqual(['a', 'c'])
    expect(q.productos[0].compradorId).toBeNull()
    expect(q.asistentes[0].personas).toBe(1)
  })

  it('borrar una familia deja a sus componentes como participantes sin familia', () => {
    const q = borrarAsistente(anadirComponente(base(), { id: 'b', familiaId: 'f1', nombre: 'Beto' }), 'f1')
    expect(q.participantes.find((p) => p.id === 'b')).toEqual({ id: 'b', nombre: 'Beto' })
  })

  it('edita el nombre y los porcentajes de casa y comida, acotados a 0–100', () => {
    let q = anadirComponente(base(), { id: 'b', familiaId: 'f1', nombre: 'Beto' })
    q = editarParticipante(q, 'b', { nombre: 'Humberto', porcentajeCasa: 150, porcentajeComida: 50 })
    expect(q.participantes.find((p) => p.id === 'b')).toMatchObject({ nombre: 'Humberto', porcentajeCasa: 100, porcentajeComida: 50 })
    expect(editarParticipante(q, 'b', { nombre: ' ' }).participantes[1].nombre).toBe('Humberto')
    expect(editarParticipante(q, 'b', { nombre: 'Ana' }).participantes[1].nombre).toBe('Humberto')
    expect(editarParticipante(q, 'b', { porcentajeCasa: Number.NaN })).toBe(q)
  })
})

describe('partesDeLaCasa', () => {
  it('reparte el precio según el porcentaje de casa de cada participante', () => {
    const q = editarCasa(
      quedada({
        participantes: [
          { id: 'a', nombre: 'Ana' },
          { id: 'b', nombre: 'Beto', porcentajeCasa: 50 },
          { id: 'c', nombre: 'Cris', pagaCasa: false },
        ],
      }),
      { precio: 100000 },
    )
    expect(partesDeLaCasa(q)).toEqual({ a: 66667, b: 33333, c: 0 })
  })

  it('sin precio todas las partes son 0', () => {
    expect(partesDeLaCasa(quedada({ participantes: [{ id: 'a', nombre: 'Ana' }] }))).toEqual({ a: 0 })
  })
})

describe('casaVacia', () => {
  it('empieza sin datos', () => {
    expect(casaVacia()).toEqual({
      titulo: '',
      descripcion: '',
      direccion: '',
      latitud: null,
      longitud: null,
      precio: null,
    })
  })
})
