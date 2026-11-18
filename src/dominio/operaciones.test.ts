import { describe, expect, it } from 'vitest'
import { producto, quedada } from './fabrica'
import {
  anadirGrupo,
  anadirParticipante,
  anadirProducto,
  borrarGrupo,
  borrarProducto,
  cambiarReparto,
  editarParticipante,
  editarProducto,
  quedadaInicial,
  renombrarGrupo,
} from './operaciones'

function contador() {
  let n = 0
  return () => `id${++n}`
}

describe('quedadaInicial', () => {
  it('trae las comidas habituales en orden', () => {
    const q = quedadaInicial(contador())
    expect(q.grupos.map((g) => g.nombre)).toEqual([
      'Cena del viernes',
      'Comida del sábado (asado)',
      'Cena del sábado (sopa)',
      'Comida del domingo (pasta)',
      'Desayunos',
      'Picoteos y varios',
      'Bebida',
    ])
    expect(q.grupos.map((g) => g.orden)).toEqual([0, 1, 2, 3, 4, 5, 6])
  })

  it('genera ids distintos y empieza sin productos ni participantes', () => {
    const q = quedadaInicial(contador(), 'Almunia 2026')
    expect(q.nombre).toBe('Almunia 2026')
    expect(new Set([q.id, ...q.grupos.map((g) => g.id)]).size).toBe(8)
    expect(q.productos).toEqual([])
    expect(q.participantes).toEqual([])
  })
})

describe('participantes', () => {
  it('añade un participante sin tocar el original', () => {
    const q = quedada()
    const nueva = anadirParticipante(q, { id: 'p1', nombre: 'Josu' })
    expect(nueva.participantes).toEqual([{ id: 'p1', nombre: 'Josu' }])
    expect(q.participantes).toEqual([])
  })

  it('recorta el nombre e ignora los vacíos', () => {
    const q = quedada()
    expect(anadirParticipante(q, { id: 'p1', nombre: '  Motxi ' }).participantes[0].nombre).toBe('Motxi')
    expect(anadirParticipante(q, { id: 'p2', nombre: '   ' })).toBe(q)
  })

  it('permite varias personas con el mismo nombre', () => {
    const q = anadirParticipante(quedada(), { id: 'p1', nombre: 'Josu' })
    expect(anadirParticipante(q, { id: 'p2', nombre: 'josu' }).participantes.map((p) => p.id)).toEqual(['p1', 'p2'])
  })

  it('permite renombrar a una persona con el nombre de otra', () => {
    let q = anadirParticipante(quedada(), { id: 'p1', nombre: 'Josu' })
    q = anadirParticipante(q, { id: 'p2', nombre: 'Ana' })
    expect(editarParticipante(q, 'p2', { nombre: 'josu' }).participantes[1].nombre).toBe('josu')
  })
})

describe('grupos', () => {
  it('añade un grupo al final', () => {
    const q = quedada({ grupos: [{ id: 'g1', nombre: 'A', orden: 0 }] })
    const nueva = anadirGrupo(q, { id: 'g2', nombre: 'B' })
    expect(nueva.grupos.map((g) => [g.id, g.orden])).toEqual([
      ['g1', 0],
      ['g2', 1],
    ])
  })

  it('ignora nombres vacíos', () => {
    const q = quedada()
    expect(anadirGrupo(q, { id: 'g', nombre: '  ' })).toBe(q)
  })

  it('renombra un grupo', () => {
    const q = quedada({ grupos: [{ id: 'g1', nombre: 'A', orden: 0 }] })
    expect(renombrarGrupo(q, 'g1', ' Nuevo ').grupos[0].nombre).toBe('Nuevo')
  })

  it('no renombra con nombre vacío', () => {
    const q = quedada({ grupos: [{ id: 'g1', nombre: 'A', orden: 0 }] })
    expect(renombrarGrupo(q, 'g1', ' ')).toBe(q)
  })

  it('al borrar un grupo se borran también sus productos', () => {
    const q = quedada({
      grupos: [
        { id: 'g1', nombre: 'A', orden: 0 },
        { id: 'g2', nombre: 'B', orden: 1 },
      ],
      productos: [producto({ id: 'a', grupoId: 'g1' }), producto({ id: 'b', grupoId: 'g2' })],
    })
    const nueva = borrarGrupo(q, 'g1')
    expect(nueva.grupos.map((g) => g.id)).toEqual(['g2'])
    expect(nueva.productos.map((p) => p.id)).toEqual(['b'])
  })
})

describe('productos', () => {
  const base = quedada({ grupos: [{ id: 'g1', nombre: 'A', orden: 0 }] })

  it('añade un producto con valores por defecto', () => {
    const nueva = anadirProducto(base, { id: 'p1', grupoId: 'g1', nombre: 'Pizza BBQ' })
    expect(nueva.productos).toEqual([
      {
        id: 'p1',
        grupoId: 'g1',
        nombre: 'Pizza BBQ',
        cantidad: null,
        unidad: '',
        compradorId: null,
        comprado: false,
        precioUnidad: null,
        descuento: 0,
        observaciones: '',
      },
    ])
  })

  it('guarda cantidad, unidad y observaciones si se indican', () => {
    const nueva = anadirProducto(base, {
      id: 'p1',
      grupoId: 'g1',
      nombre: 'Alitas',
      cantidad: 2.3,
      unidad: 'kg',
      observaciones: 'Una bandeja',
    })
    expect(nueva.productos[0]).toMatchObject({ cantidad: 2.3, unidad: 'kg', observaciones: 'Una bandeja' })
  })

  it('ignora nombres vacíos y grupos que no existen', () => {
    expect(anadirProducto(base, { id: 'p', grupoId: 'g1', nombre: ' ' })).toBe(base)
    expect(anadirProducto(base, { id: 'p', grupoId: 'nada', nombre: 'X' })).toBe(base)
  })

  it('edita solo el producto indicado', () => {
    const q = quedada({ productos: [producto({ id: 'a' }), producto({ id: 'b' })] })
    const nueva = editarProducto(q, 'a', { comprado: true, compradorId: 'josu' })
    expect(nueva.productos[0]).toMatchObject({ comprado: true, compradorId: 'josu' })
    expect(nueva.productos[1]).toBe(q.productos[1])
  })

  it('editar un producto que no existe no cambia nada', () => {
    const q = quedada({ productos: [producto({ id: 'a' })] })
    expect(editarProducto(q, 'x', { comprado: true })).toEqual(q)
  })

  it('no permite dejar el nombre vacío al editar', () => {
    const q = quedada({ productos: [producto({ id: 'a', nombre: 'Pan' })] })
    expect(editarProducto(q, 'a', { nombre: '  ' }).productos[0].nombre).toBe('Pan')
  })

  it('borra un producto', () => {
    const q = quedada({ productos: [producto({ id: 'a' }), producto({ id: 'b' })] })
    expect(borrarProducto(q, 'a').productos.map((p) => p.id)).toEqual(['b'])
  })
})

describe('editarParticipante', () => {
  const q = quedada({ participantes: [{ id: 'a', nombre: 'Ana' }, { id: 'b', nombre: 'Beto' }] })

  it('cambia el porcentaje de comida y si paga la casa solo de ese participante', () => {
    const r = editarParticipante(q, 'a', { porcentajeComida: 50, pagaCasa: false })
    expect(r.participantes[0]).toEqual({ id: 'a', nombre: 'Ana', porcentajeComida: 50, pagaCasa: false })
    expect(r.participantes[1]).toEqual({ id: 'b', nombre: 'Beto' })
  })

  it('limita el porcentaje entre 0 y 100', () => {
    expect(editarParticipante(q, 'a', { porcentajeComida: 150 }).participantes[0].porcentajeComida).toBe(100)
    expect(editarParticipante(q, 'a', { porcentajeComida: -5 }).participantes[0].porcentajeComida).toBe(0)
  })

  it('ignora un porcentaje que no es un número', () => {
    expect(editarParticipante(q, 'a', { porcentajeComida: NaN })).toBe(q)
  })
})

describe('cambiarReparto', () => {
  it('marca un grupo como casa o como comida', () => {
    const q = quedada({ grupos: [{ id: 'g1', nombre: 'Alquiler', orden: 0 }] })
    const casa = cambiarReparto(q, 'g1', 'casa')
    expect(casa.grupos[0].reparto).toBe('casa')
    expect(cambiarReparto(casa, 'g1', 'comida').grupos[0].reparto).toBe('comida')
  })
})
