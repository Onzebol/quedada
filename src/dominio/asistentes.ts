import type { Asistente, Basico, Id, Quedada } from './tipos'

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

export type CambiosAsistente = Partial<Omit<Asistente, 'id'>>

/** Aplica los cambios válidos y descarta los que no lo son (familia vacía, personas < 1, hora mal escrita). */
export function editarAsistente(q: Quedada, id: Id, cambios: CambiosAsistente): Quedada {
  const seguros: CambiosAsistente = {}
  if (cambios.familia !== undefined && cambios.familia.trim() !== '') seguros.familia = cambios.familia.trim()
  if (cambios.personas !== undefined && personasValidas(cambios.personas)) seguros.personas = cambios.personas
  if (cambios.llegada !== undefined && (cambios.llegada === null || HORA.test(cambios.llegada))) {
    seguros.llegada = cambios.llegada
  }
  return { ...q, asistentes: q.asistentes.map((a) => (a.id === id ? { ...a, ...seguros } : a)) }
}

/** Borra la familia; sus básicos quedan sin asignar. */
export function borrarAsistente(q: Quedada, id: Id): Quedada {
  return {
    ...q,
    asistentes: q.asistentes.filter((a) => a.id !== id),
    basicos: q.basicos.map((b) => (b.asistenteId === id ? { ...b, asistenteId: null } : b)),
  }
}

/** Total de personas que vienen (suma de las familias). */
export function totalAsistentes(q: Quedada): number {
  return q.asistentes.reduce((suma, a) => suma + a.personas, 0)
}

/** Por hora de llegada; quienes no tienen hora van al final, en su orden. */
export function ordenarPorLlegada(asistentes: Asistente[]): Asistente[] {
  return [...asistentes].sort((a, b) => {
    if (a.llegada === b.llegada) return 0
    if (a.llegada === null) return 1
    if (b.llegada === null) return -1
    return a.llegada < b.llegada ? -1 : 1
  })
}

export function anadirBasico(q: Quedada, nuevo: Pick<Basico, 'id' | 'nombre'>): Quedada {
  const nombre = nuevo.nombre.trim()
  if (nombre === '' || q.basicos.some((b) => b.nombre.toLowerCase() === nombre.toLowerCase())) return q
  return { ...q, basicos: [...q.basicos, { id: nuevo.id, nombre, asistenteId: null }] }
}

/** Asigna el básico a una familia existente, o lo suelta con `null`. */
export function asignarBasico(q: Quedada, id: Id, asistenteId: Id | null): Quedada {
  if (asistenteId !== null && !q.asistentes.some((a) => a.id === asistenteId)) return q
  return { ...q, basicos: q.basicos.map((b) => (b.id === id ? { ...b, asistenteId } : b)) }
}

export function borrarBasico(q: Quedada, id: Id): Quedada {
  return { ...q, basicos: q.basicos.filter((b) => b.id !== id) }
}

export function basicosSinAsignar(q: Quedada): Basico[] {
  return q.basicos.filter((b) => b.asistenteId === null)
}
