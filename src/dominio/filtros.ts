import type { Id, Producto } from './tipos'

export type Filtro =
  | { tipo: 'todos' }
  | { tipo: 'sinAsignar' }
  | { tipo: 'pendientes' }
  | { tipo: 'comprador'; compradorId: Id }

export function filtrarProductos(productos: Producto[], filtro: Filtro): Producto[] {
  switch (filtro.tipo) {
    case 'todos':
      return productos
    case 'sinAsignar':
      return productos.filter((p) => p.compradorId === null)
    case 'pendientes':
      return productos.filter((p) => !p.comprado)
    case 'comprador':
      return productos.filter((p) => p.compradorId === filtro.compradorId)
  }
}

export function contarSinAsignar(productos: Producto[]): number {
  return productos.filter((p) => p.compradorId === null).length
}
