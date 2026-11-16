import type { Grupo, Id, Participante, Producto, Quedada } from './tipos'

const COMIDAS_HABITUALES = [
  'Cena del viernes',
  'Comida del sábado (asado)',
  'Cena del sábado (sopa)',
  'Comida del domingo (pasta)',
  'Desayunos',
  'Picoteos y varios',
  'Bebida',
]

/** Quedada nueva con las comidas que se repiten cada año, sin productos ni participantes. */
export function quedadaInicial(crearId: () => Id, nombre = 'Quedada'): Quedada {
  return {
    id: crearId(),
    nombre,
    inicio: null,
    fin: null,
    participantes: [],
    grupos: COMIDAS_HABITUALES.map((n, orden) => ({ id: crearId(), nombre: n, orden })),
    productos: [],
    asistentes: [],
    basicos: [],
  }
}

export function anadirParticipante(q: Quedada, participante: Participante): Quedada {
  const nombre = participante.nombre.trim()
  if (nombre === '') return q
  const existe = q.participantes.some((p) => p.nombre.toLowerCase() === nombre.toLowerCase())
  if (existe) return q
  return { ...q, participantes: [...q.participantes, { id: participante.id, nombre }] }
}

export function anadirGrupo(q: Quedada, grupo: Pick<Grupo, 'id' | 'nombre'>): Quedada {
  const nombre = grupo.nombre.trim()
  if (nombre === '') return q
  const orden = q.grupos.reduce((max, g) => Math.max(max, g.orden), -1) + 1
  return { ...q, grupos: [...q.grupos, { id: grupo.id, nombre, orden }] }
}

export function renombrarGrupo(q: Quedada, id: Id, nombre: string): Quedada {
  const limpio = nombre.trim()
  if (limpio === '') return q
  return { ...q, grupos: q.grupos.map((g) => (g.id === id ? { ...g, nombre: limpio } : g)) }
}

/** Borra el grupo y todos sus productos. */
export function borrarGrupo(q: Quedada, id: Id): Quedada {
  return {
    ...q,
    grupos: q.grupos.filter((g) => g.id !== id),
    productos: q.productos.filter((p) => p.grupoId !== id),
  }
}

export interface NuevoProducto {
  id: Id
  grupoId: Id
  nombre: string
  cantidad?: number | null
  unidad?: string
  observaciones?: string
}

export function anadirProducto(q: Quedada, nuevo: NuevoProducto): Quedada {
  const nombre = nuevo.nombre.trim()
  if (nombre === '' || !q.grupos.some((g) => g.id === nuevo.grupoId)) return q
  const producto: Producto = {
    id: nuevo.id,
    grupoId: nuevo.grupoId,
    nombre,
    cantidad: nuevo.cantidad ?? null,
    unidad: nuevo.unidad ?? '',
    compradorId: null,
    comprado: false,
    precioUnidad: null,
    descuento: 0,
    observaciones: nuevo.observaciones ?? '',
  }
  return { ...q, productos: [...q.productos, producto] }
}

export type CambiosProducto = Partial<Omit<Producto, 'id' | 'grupoId'>>

export function editarProducto(q: Quedada, id: Id, cambios: CambiosProducto): Quedada {
  const seguros = { ...cambios }
  if (seguros.nombre !== undefined) {
    const nombre = seguros.nombre.trim()
    if (nombre === '') delete seguros.nombre
    else seguros.nombre = nombre
  }
  return { ...q, productos: q.productos.map((p) => (p.id === id ? { ...p, ...seguros } : p)) }
}

export function borrarProducto(q: Quedada, id: Id): Quedada {
  return { ...q, productos: q.productos.filter((p) => p.id !== id) }
}

export type CambiosParticipante = Partial<Pick<Participante, 'porcentajeComida' | 'pagaCasa'>>

/** Ajusta cómo reparte un participante: porcentaje de comida (0–100) y si paga la casa. */
export function editarParticipante(q: Quedada, id: Id, cambios: CambiosParticipante): Quedada {
  const seguros = { ...cambios }
  if (seguros.porcentajeComida !== undefined) {
    if (Number.isNaN(seguros.porcentajeComida)) return q
    seguros.porcentajeComida = Math.min(100, Math.max(0, seguros.porcentajeComida))
  }
  return { ...q, participantes: q.participantes.map((p) => (p.id === id ? { ...p, ...seguros } : p)) }
}

/** `casa`: gasto a partes iguales entre quienes pagan la casa. `comida`: por porcentaje de comida. */
export function cambiarReparto(q: Quedada, id: Id, reparto: 'casa' | 'comida'): Quedada {
  return { ...q, grupos: q.grupos.map((g) => (g.id === id ? { ...g, reparto } : g)) }
}
