import type { Asistente, Id, Quedada } from './tipos'

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/

function personasValidas(n: number): boolean {
  return Number.isInteger(n) && n >= 1
}

export function anadirAsistente(q: Quedada, nuevo: Asistente): Quedada {
  const familia = nuevo.familia.trim()
  if (familia === '' || !personasValidas(nuevo.personas)) return q
  if (q.asistentes.some((a) => a.familia.toLowerCase() === familia.toLowerCase())) return q
  const llegada = nuevo.llegada !== null && HORA.test(nuevo.llegada) ? nuevo.llegada : null
  return { ...q, asistentes: [...q.asistentes, { id: nuevo.id, familia, personas: nuevo.personas, llegada }] }
}

/** `pagadorId: null` vuelve a la persona por defecto. */
export type CambiosAsistente = Partial<Omit<Asistente, 'id' | 'pagadorId'>> & { pagadorId?: Id | null }

/** Aplica los cambios válidos y descarta los que no lo son (familia vacía, personas < 1, hora mal escrita). */
export function editarAsistente(q: Quedada, id: Id, cambios: CambiosAsistente): Quedada {
  const seguros: Partial<Omit<Asistente, 'id'>> = {}
  const quitarPagador = cambios.pagadorId === null
  if (cambios.familia !== undefined && cambios.familia.trim() !== '') seguros.familia = cambios.familia.trim()
  if (cambios.personas !== undefined && personasValidas(cambios.personas)) seguros.personas = cambios.personas
  if (cambios.llegada !== undefined && (cambios.llegada === null || HORA.test(cambios.llegada))) {
    seguros.llegada = cambios.llegada
  }
  if (typeof cambios.pagadorId === 'string') {
    const nuevo = q.participantes.find((p) => p.id === cambios.pagadorId)
    if (nuevo && nuevo.familiaId === id && nuevo.adulto !== false) seguros.pagadorId = nuevo.id
  }
  return {
    ...q,
    asistentes: q.asistentes.map((a) => {
      if (a.id !== id) return a
      const { pagadorId: _quitado, ...resto } = a
      return quitarPagador ? { ...resto, ...seguros } : { ...a, ...seguros }
    }),
  }
}

/**
 * Persona a la que se le acreditan los pagos de la casa de la familia: la elegida si sigue siendo un
 * componente adulto; si no, el primer adulto (o el primer componente si todos son menores).
 * `undefined` si la familia no tiene componentes.
 */
export function pagadorDeLaCasa(q: Quedada, a: Asistente): Id | undefined {
  const componentes = q.participantes.filter((p) => p.familiaId === a.id)
  const elegido = componentes.find((p) => p.id === a.pagadorId && p.adulto !== false)
  return (elegido ?? componentes.find((p) => p.adulto !== false) ?? componentes[0])?.id
}

/** Borra la familia; sus componentes se quedan como participantes sin familia. */
export function borrarAsistente(q: Quedada, id: Id): Quedada {
  return {
    ...q,
    participantes: q.participantes.map((p) => {
      if (p.familiaId !== id) return p
      const { familiaId: _suelta, ...resto } = p
      return resto
    }),
    productos: q.productos.map((p) => (p.compradorId === id ? { ...p, compradorId: null } : p)),
    asistentes: q.asistentes.filter((a) => a.id !== id),
    pagos: q.pagos.filter((p) => p.familiaId !== id),
    gastos: q.gastos.filter((g) => g.pagadorId !== id),
  }
}

/** Personas de una familia: sus componentes si los tiene; si no, el número escrito. */
export function personasDe(q: Quedada, a: Asistente): number {
  const componentes = q.participantes.filter((p) => p.familiaId === a.id).length
  return componentes > 0 ? componentes : a.personas
}

/** Total de personas que vienen (suma de las familias). */
export function totalAsistentes(q: Quedada): number {
  return q.asistentes.reduce((suma, a) => suma + personasDe(q, a), 0)
}

/** Alfabético (como se ordena en español: sin distinguir mayúsculas ni acentos). No modifica la lista. */
export function ordenarPorNombre<T>(elementos: T[], nombre: (e: T) => string): T[] {
  return [...elementos].sort((a, b) =>
    nombre(a).localeCompare(nombre(b), 'es', { sensitivity: 'base' }),
  )
}
