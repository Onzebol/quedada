import type { Quedada } from './tipos'

/** Por fecha de inicio (las más próximas primero; sin fecha, al final) y, a igualdad, por nombre. No modifica la lista. */
export function ordenarQuedadas(quedadas: Quedada[]): Quedada[] {
  return [...quedadas].sort((a, b) => {
    if (a.inicio !== b.inicio) {
      if (a.inicio === null) return 1
      if (b.inicio === null) return -1
      return a.inicio < b.inicio ? -1 : 1
    }
    return a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
  })
}

/** El fin, si lo hay, no puede ser anterior al inicio (fechas ISO AAAA-MM-DD, comparables como texto). */
export function fechasValidas(inicio: string | null, fin: string | null): boolean {
  return inicio === null || fin === null || fin >= inicio
}
