import type { Centimos, Id, Producto, Quedada } from './tipos'

/** Cantidad × precio + descuento, redondeado al céntimo. Sin cantidad o sin precio vale 0. */
export function totalLinea(producto: Producto): Centimos {
  if (producto.cantidad === null || producto.precioUnidad === null) return 0
  return Math.round((producto.cantidad * producto.precioUnidad + producto.descuento) * 100)
}

function sumar(productos: Producto[]): Centimos {
  return productos.reduce((suma, p) => suma + totalLinea(p), 0)
}

export function totalGrupo(quedada: Quedada, grupoId: Id): Centimos {
  return sumar(quedada.productos.filter((p) => p.grupoId === grupoId))
}

/** Lo que ha pagado cada comprador. Los productos sin comprador no se cuentan. */
export function totalPorComprador(quedada: Quedada): Record<Id, Centimos> {
  const totales: Record<Id, Centimos> = {}
  for (const p of quedada.productos) {
    if (p.compradorId === null) continue
    totales[p.compradorId] = (totales[p.compradorId] ?? 0) + totalLinea(p)
  }
  return totales
}

export function totalQuedada(quedada: Quedada): Centimos {
  return sumar(quedada.productos)
}
