import { compradores } from './compradores'
import type { Centimos, Id, Gasto, Quedada } from './tipos'

const valido = (q: Quedada, p: Gasto) =>
  p.concepto !== '' && Number.isInteger(p.importe) && p.importe > 0 && compradores(q).some((c) => c.id === p.pagadorId)

/** Registra un gasto real. Se ignora si el importe no es positivo, no hay concepto o el pagador no existe. */
export function anadirGasto(q: Quedada, nuevo: Gasto): Quedada {
  const gasto = { ...nuevo, concepto: nuevo.concepto.trim() }
  return valido(q, gasto) ? { ...q, gastos: [...q.gastos, gasto] } : q
}

/** Cambia pagador, concepto, importe o imagen (`null` la quita); si el resultado no es válido no cambia nada. */
export function editarGasto(
  q: Quedada,
  id: Id,
  cambios: Partial<{ pagadorId: Id; concepto: string; importe: Centimos; imagen: string | null }>,
): Quedada {
  const actual = q.gastos.find((p) => p.id === id)
  if (!actual) return q
  const { imagen, ...resto } = cambios
  const nuevo: Gasto = { ...actual, ...resto }
  if (imagen === null) delete nuevo.imagen
  else if (imagen !== undefined) nuevo.imagen = imagen
  nuevo.concepto = nuevo.concepto.trim()
  return valido(q, nuevo) ? { ...q, gastos: q.gastos.map((p) => (p.id === id ? nuevo : p)) } : q
}

export function borrarGasto(q: Quedada, id: Id): Quedada {
  return { ...q, gastos: q.gastos.filter((p) => p.id !== id) }
}
