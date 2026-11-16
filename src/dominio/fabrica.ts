import type { Producto, Quedada } from './tipos'

/** Constructores con valores por defecto, para escribir tests legibles. */
export function producto(parcial: Partial<Producto> = {}): Producto {
  return {
    id: 'p1',
    grupoId: 'g1',
    nombre: 'Producto',
    cantidad: 1,
    unidad: '',
    compradorId: null,
    comprado: false,
    precioUnidad: null,
    descuento: 0,
    observaciones: '',
    ...parcial,
  }
}

export function quedada(parcial: Partial<Quedada> = {}): Quedada {
  return {
    id: 'q1',
    nombre: 'Quedada 2026',
    inicio: null,
    fin: null,
    participantes: [],
    grupos: [],
    productos: [],
    ...parcial,
  }
}
