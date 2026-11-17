import { ordenarPorNombre } from './asistentes'
import type { Id, Quedada } from './tipos'

export interface Comprador {
  id: Id
  nombre: string
}

/**
 * A quién se puede asignar una compra, por orden alfabético: los participantes y las familias que no tienen personas
 * (no hay a quién más asignarles). Una familia con personas solo aparece si ya tiene productos asignados,
 * para que no se pierda ese dato si se le añadieron personas después.
 */
export function compradores(q: Quedada): Comprador[] {
  const asignadas = new Set(q.productos.map((p) => p.compradorId))
  const familiasComprador = q.asistentes
    .filter((a) => !q.participantes.some((p) => p.familiaId === a.id) || asignadas.has(a.id))
    .map((a) => ({ id: a.id, nombre: a.familia }))
  const todos = [...q.participantes.map((p) => ({ id: p.id, nombre: p.nombre })), ...familiasComprador]
  return ordenarPorNombre(todos, (c) => c.nombre)
}
