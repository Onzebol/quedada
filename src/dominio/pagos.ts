import { ordenarPorNombre, personasDe } from './asistentes'
import { repartirProporcional } from './liquidacion'
import type { Centimos, Id, Pago, Quedada } from './tipos'

export type NuevoPago = Pick<Pago, 'id' | 'familiaId' | 'importe' | 'concepto'>
export type CambiosPago = Partial<Omit<Pago, 'id'>>

const importeValido = (importe: number) => Number.isFinite(importe) && Math.round(importe) > 0

/** Añade un pago de la casa hecho por una familia. Ignora familias desconocidas, importes no positivos e ids repetidos. */
export function anadirPago(q: Quedada, nuevo: NuevoPago): Quedada {
  if (!q.asistentes.some((a) => a.id === nuevo.familiaId)) return q
  if (!importeValido(nuevo.importe)) return q
  if (q.pagos.some((p) => p.id === nuevo.id)) return q
  const pago: Pago = { ...nuevo, importe: Math.round(nuevo.importe), concepto: nuevo.concepto.trim() }
  return { ...q, pagos: [...q.pagos, pago] }
}

/** Aplica los cambios válidos de un pago y descarta los que no lo son. */
export function editarPago(q: Quedada, id: Id, cambios: CambiosPago): Quedada {
  return {
    ...q,
    pagos: q.pagos.map((p) => {
      if (p.id !== id) return p
      const nuevo = { ...p }
      if (cambios.familiaId !== undefined && q.asistentes.some((a) => a.id === cambios.familiaId)) {
        nuevo.familiaId = cambios.familiaId
      }
      if (cambios.importe !== undefined && importeValido(cambios.importe)) nuevo.importe = Math.round(cambios.importe)
      if (cambios.concepto !== undefined) nuevo.concepto = cambios.concepto.trim()
      return nuevo
    }),
  }
}

export function borrarPago(q: Quedada, id: Id): Quedada {
  return { ...q, pagos: q.pagos.filter((p) => p.id !== id) }
}

/** Marca (o desmarca) que quien debía el pago ya lo ha pagado. */
export function marcarPagado(q: Quedada, id: Id, pagado: boolean): Quedada {
  if (!q.pagos.some((p) => p.id === id)) return q
  return { ...q, pagos: q.pagos.map((p) => (p.id === id ? { ...p, pagado } : p)) }
}

/** Suma de todos los pagos de la casa. */
export function totalPagado(q: Quedada): Centimos {
  return q.pagos.reduce((suma, p) => suma + p.importe, 0)
}

/** Lo que falta por pagar del precio (nunca negativo), o `null` si aún no hay precio. */
export function pendienteDeLaCasa(q: Quedada): Centimos | null {
  return q.casa.precio === null ? null : Math.max(0, q.casa.precio - totalPagado(q))
}

/**
 * Reparte `total` entre todas las familias en proporción a sus personas (mayor resto: la suma es
 * exacta) y crea un pago por familia. No crea pagos de 0 céntimos.
 */
export function repartirEntreFamilias(
  q: Quedada,
  { total, concepto }: { total: Centimos; concepto: string },
  crearId: () => Id,
): Quedada {
  if (!importeValido(total) || q.asistentes.length === 0) return q
  const familias = ordenarPorNombre(q.asistentes, (a) => a.familia)
  const pesos: Record<Id, number> = {}
  for (const a of familias) pesos[a.id] = personasDe(q, a)
  const partes = repartirProporcional(Math.round(total), pesos)
  let resultado = q
  for (const a of familias) {
    if (partes[a.id] > 0) resultado = anadirPago(resultado, { id: crearId(), familiaId: a.id, importe: partes[a.id], concepto })
  }
  return resultado
}
