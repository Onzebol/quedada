import type { Quedada } from './tipos'

/** Por fecha de inicio descendente (la más nueva arriba; sin fecha, al final) y, a igualdad, por nombre. No modifica la lista. */
export function ordenarQuedadas(quedadas: Quedada[]): Quedada[] {
  return [...quedadas].sort((a, b) => {
    if (a.inicio !== b.inicio) {
      if (a.inicio === null) return 1
      if (b.inicio === null) return -1
      return a.inicio > b.inicio ? -1 : 1
    }
    return a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
  })
}

/** El fin, si lo hay, no puede ser anterior al inicio (fechas ISO AAAA-MM-DD, comparables como texto). */
export function fechasValidas(inicio: string | null, fin: string | null): boolean {
  return inicio === null || fin === null || fin >= inicio
}

const formatoFecha = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })

function fechaLegible(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number)
  return formatoFecha.format(new Date(a, m - 1, d)).replace(/\./g, '')
}

/** «4 dic 2026 – 6 dic 2026», o solo la que haya; vacío si no hay ninguna. */
export function textoFechas({ inicio, fin }: Pick<Quedada, 'inicio' | 'fin'>): string {
  if (inicio && fin) return `${fechaLegible(inicio)} – ${fechaLegible(fin)}`
  if (inicio) return `Desde el ${fechaLegible(inicio)}`
  if (fin) return `Hasta el ${fechaLegible(fin)}`
  return ''
}
