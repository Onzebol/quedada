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
