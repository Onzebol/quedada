import { repartirProporcional } from './liquidacion'
import type { Casa, Centimos, Id, Participante, Quedada } from './tipos'

export function casaVacia(): Casa {
  return { titulo: '', descripcion: '', direccion: '', latitud: null, longitud: null, precio: null }
}

export type CambiosCasa = Partial<Casa>

/** Aplica los cambios válidos y descarta los que no lo son (precio negativo, coordenadas fuera de rango, pagador desconocido). */
export function editarCasa(q: Quedada, cambios: CambiosCasa): Quedada {
  const casa = { ...q.casa }
  if (cambios.titulo !== undefined) casa.titulo = cambios.titulo
  if (cambios.descripcion !== undefined) casa.descripcion = cambios.descripcion
  if (cambios.direccion !== undefined && cambios.direccion !== casa.direccion) {
    casa.direccion = cambios.direccion
    // Las coordenadas eran de la dirección anterior.
    casa.latitud = null
    casa.longitud = null
  }
  if (cambios.precio !== undefined) {
    if (cambios.precio === null) casa.precio = null
    else if (Number.isFinite(cambios.precio) && cambios.precio >= 0) casa.precio = Math.round(cambios.precio)
  }
  if (cambios.latitud !== undefined && (cambios.latitud === null || (cambios.latitud >= -90 && cambios.latitud <= 90))) {
    casa.latitud = cambios.latitud
  }
  if (cambios.longitud !== undefined && (cambios.longitud === null || (cambios.longitud >= -180 && cambios.longitud <= 180))) {
    casa.longitud = cambios.longitud
  }
  return { ...q, casa }
}

/** Mantiene `personas` de cada familia con componentes igual al número de componentes. */
function sincronizarPersonas(q: Quedada): Quedada {
  return {
    ...q,
    asistentes: q.asistentes.map((a) => {
      const n = q.participantes.filter((p) => p.familiaId === a.id).length
      return n > 0 && n !== a.personas ? { ...a, personas: n } : a
    }),
  }
}

/** Añade un participante como componente de una familia existente. */
export function anadirComponente(q: Quedada, nuevo: { id: Id; familiaId: Id; nombre: string }): Quedada {
  const nombre = nuevo.nombre.trim()
  if (nombre === '' || !q.asistentes.some((a) => a.id === nuevo.familiaId)) return q
  const participante: Participante = { id: nuevo.id, nombre, familiaId: nuevo.familiaId }
  return sincronizarPersonas({ ...q, participantes: [...q.participantes, participante] })
}

/** Borra al participante: lo suelta como comprador y como pagador de la casa. */
export function quitarComponente(q: Quedada, id: Id): Quedada {
  return sincronizarPersonas({
    ...q,
    participantes: q.participantes.filter((p) => p.id !== id),
    gastos: q.gastos.filter((g) => g.pagadorId !== id),
    productos: q.productos.map((p) => (p.compradorId === id ? { ...p, compradorId: null } : p)),
  })
}

/** Peso de un participante en el reparto de la casa: su porcentaje (100 por defecto; `pagaCasa: false` = 0). */
export function pesoCasa(p: Participante): number {
  return p.porcentajeCasa ?? (p.pagaCasa === false ? 0 : 100)
}

/** Lo que le toca a cada participante del precio del alquiler (céntimos). */
export function partesDeLaCasa(q: Quedada): Record<Id, Centimos> {
  const pesos: Record<Id, number> = {}
  for (const p of q.participantes) pesos[p.id] = pesoCasa(p)
  return repartirProporcional(q.casa.precio ?? 0, pesos)
}
