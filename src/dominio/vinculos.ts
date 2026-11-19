import type { Id, Participante, Quedada } from './tipos'

/**
 * Vincula una cuenta con un participante («este soy yo»). Una cuenta es un solo participante y
 * un participante tiene una sola cuenta: se sueltan los vínculos previos. Con `participanteId`
 * a `null` solo se suelta la cuenta.
 */
export function vincularCuenta(q: Quedada, participanteId: Id | null, cuentaId: string): Quedada {
  if (participanteId !== null && !q.participantes.some((p) => p.id === participanteId)) return q
  return {
    ...q,
    participantes: q.participantes.map((p) => {
      if (p.id === participanteId) return { ...p, cuentaId }
      if (p.cuentaId === cuentaId) {
        const { cuentaId: _suelta, ...resto } = p
        return resto
      }
      return p
    }),
  }
}

export function participanteDe(q: Quedada, cuentaId: string): Participante | null {
  return q.participantes.find((p) => p.cuentaId === cuentaId) ?? null
}

/** Ids de lo que es mío: mi participante, mi familia y los componentes de mi familia. Vacío sin vínculo. */
export function idsMios(q: Quedada, cuentaId: string | null): Set<Id> {
  const yo = cuentaId === null ? null : participanteDe(q, cuentaId)
  if (yo === null) return new Set()
  const ids = new Set<Id>([yo.id])
  if (yo.familiaId !== undefined) {
    ids.add(yo.familiaId)
    for (const p of q.participantes) if (p.familiaId === yo.familiaId) ids.add(p.id)
  }
  return ids
}
