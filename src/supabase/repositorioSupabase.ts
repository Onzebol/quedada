import type { Repositorio } from '../dominio/repositorio'
import type { Asistente, Basico, Grupo, Id, Participante, Producto, Quedada } from '../dominio/tipos'

interface ErrorSupabase {
  message: string
}

type Fila = Record<string, string | number | boolean | null>
type FilaLeida = Record<string, unknown>

/** Fila de `quedadas` con sus cinco tablas hijas incrustadas (una sola consulta). */
export type FilaQuedada = FilaLeida & {
  participantes?: FilaLeida[]
  grupos?: FilaLeida[]
  productos?: FilaLeida[]
  asistentes?: FilaLeida[]
  basicos?: FilaLeida[]
}

interface Lectura<T> extends PromiseLike<{ data: T[] | null; error: ErrorSupabase | null }> {
  eq(columna: string, valor: string): Lectura<T>
  order(columna: string, opciones?: { referencedTable?: string }): Lectura<T>
  maybeSingle(): PromiseLike<{ data: T | null; error: ErrorSupabase | null }>
}

interface Escritura extends PromiseLike<{ error: ErrorSupabase | null }> {
  eq(columna: string, valor: string): Escritura
  in(columna: string, valores: string[]): Escritura
}

/** La parte de `SupabaseClient` que usa el repositorio, para poder probarlo con un cliente falso. */
export interface ClienteDatos {
  from(tabla: string): {
    select(columnas: string): Lectura<FilaQuedada>
    upsert(filas: Fila | Fila[], opciones?: { onConflict: string }): Escritura
    update(valores: Fila): Escritura
    delete(): Escritura
  }
}

type ListaClave = 'participantes' | 'grupos' | 'productos' | 'asistentes' | 'basicos'
const LISTAS: ListaClave[] = ['participantes', 'grupos', 'productos', 'asistentes', 'basicos']

const hay = (v: unknown): v is NonNullable<unknown> => v !== null && v !== undefined
const texto = (v: unknown) => String(v ?? '')
const numeroONulo = (v: unknown) => (hay(v) ? Number(v) : null)

/** Una tabla hija: cómo pasar de elemento de la quedada a fila y viceversa. */
interface Tabla {
  clave: ListaClave
  aFilas(q: Quedada): Fila[]
  deFilas(filas: FilaLeida[]): unknown[]
}

function tabla<K extends ListaClave>(
  clave: K,
  aFila: (x: Quedada[K][number], posicion: number) => Fila,
  deFila: (f: FilaLeida) => Quedada[K][number],
): Tabla {
  return {
    clave,
    aFilas: (q) => (q[clave] as Quedada[K][number][]).map((x, i) => ({ ...aFila(x, i), posicion: i })),
    deFilas: (filas) => filas.map(deFila),
  }
}

const TABLAS: Tabla[] = [
  tabla(
    'participantes',
    (p: Participante) => ({
      id: p.id,
      nombre: p.nombre,
      porcentaje_comida: p.porcentajeComida ?? null,
      paga_casa: p.pagaCasa ?? null,
      cuenta_id: p.cuentaId ?? null,
    }),
    (f): Participante => ({
      id: texto(f.id),
      nombre: texto(f.nombre),
      ...(hay(f.porcentaje_comida) && { porcentajeComida: Number(f.porcentaje_comida) }),
      ...(hay(f.paga_casa) && { pagaCasa: f.paga_casa === true }),
      ...(hay(f.cuenta_id) && { cuentaId: texto(f.cuenta_id) }),
    }),
  ),
  tabla(
    'grupos',
    (g: Grupo) => ({ id: g.id, nombre: g.nombre, orden: g.orden, reparto: g.reparto ?? null }),
    (f): Grupo => ({
      id: texto(f.id),
      nombre: texto(f.nombre),
      orden: Number(f.orden),
      ...(hay(f.reparto) && { reparto: f.reparto as 'casa' | 'comida' }),
    }),
  ),
  tabla(
    'productos',
    (p: Producto) => ({
      id: p.id,
      grupo_id: p.grupoId,
      nombre: p.nombre,
      cantidad: p.cantidad,
      unidad: p.unidad,
      comprador_id: p.compradorId,
      comprado: p.comprado,
      precio_unidad: p.precioUnidad,
      descuento: p.descuento,
      observaciones: p.observaciones,
    }),
    (f): Producto => ({
      id: texto(f.id),
      grupoId: texto(f.grupo_id),
      nombre: texto(f.nombre),
      cantidad: numeroONulo(f.cantidad),
      unidad: texto(f.unidad),
      compradorId: hay(f.comprador_id) ? texto(f.comprador_id) : null,
      comprado: f.comprado === true,
      precioUnidad: numeroONulo(f.precio_unidad),
      descuento: Number(f.descuento ?? 0),
      observaciones: texto(f.observaciones),
    }),
  ),
  tabla(
    'asistentes',
    (a: Asistente) => ({ id: a.id, familia: a.familia, personas: a.personas, llegada: a.llegada }),
    (f): Asistente => ({
      id: texto(f.id),
      familia: texto(f.familia),
      personas: Number(f.personas),
      llegada: hay(f.llegada) ? texto(f.llegada) : null,
    }),
  ),
  tabla(
    'basicos',
    (b: Basico) => ({ id: b.id, nombre: b.nombre, asistente_id: b.asistenteId }),
    (f): Basico => ({
      id: texto(f.id),
      nombre: texto(f.nombre),
      asistenteId: hay(f.asistente_id) ? texto(f.asistente_id) : null,
    }),
  ),
]

const COLUMNAS_QUEDADA = ['nombre', 'inicio', 'fin'] as const

const filaQuedada = (q: Quedada): Fila => ({ nombre: q.nombre, inicio: q.inicio, fin: q.fin })

const CONSULTA = `*, ${LISTAS.map((t) => `${t}(*)`).join(', ')}`

function leerQuedada(f: FilaQuedada): Quedada | null {
  if (typeof f.id !== 'string' || typeof f.nombre !== 'string') return null
  const listas = Object.fromEntries(
    TABLAS.map((t) => [t.clave, t.deFilas((f[t.clave] as FilaLeida[] | undefined) ?? [])]),
  )
  return {
    id: f.id,
    nombre: f.nombre,
    inicio: hay(f.inicio) ? texto(f.inicio) : null,
    fin: hay(f.fin) ? texto(f.fin) : null,
    ...listas,
  } as unknown as Quedada
}

interface Diferencias {
  altas: Fila[]
  cambios: { id: string; valores: Fila }[]
  bajas: string[]
}

/** Qué filas hay que crear, qué columnas cambiar en las existentes y qué ids borrar. */
function diferencias(antes: Fila[], despues: Fila[]): Diferencias {
  const previas = new Map(antes.map((f) => [String(f.id), f]))
  const ahora = new Set(despues.map((f) => String(f.id)))
  const altas: Fila[] = []
  const cambios: Diferencias['cambios'] = []
  for (const f of despues) {
    const previa = previas.get(String(f.id))
    if (previa === undefined) {
      altas.push(f)
      continue
    }
    const valores = Object.fromEntries(Object.entries(f).filter(([c, v]) => c !== 'id' && previa[c] !== v))
    if (Object.keys(valores).length > 0) cambios.push({ id: String(f.id), valores })
  }
  const bajas = antes.map((f) => String(f.id)).filter((id) => !ahora.has(id))
  return { altas, cambios, bajas }
}

function comprobar(resultado: { error: ErrorSupabase | null }) {
  if (resultado.error) throw new Error(resultado.error.message)
}

/**
 * Quedadas en Supabase (Postgres): una fila por quedada, participante, comida, producto, asistente
 * y básico. Al guardar solo se escribe lo que ha cambiado respecto a lo último leído o guardado
 * (filas nuevas, columnas modificadas, ids borrados), así dos personas que tocan cosas distintas
 * no se pisan. Quién ve cada fila lo decide la seguridad por fila (RLS) de la base, no esta clase.
 */
export class RepositorioSupabase implements Repositorio {
  private readonly cliente: ClienteDatos
  /** Lo último que se sabe que hay en el servidor, por quedada: la base de las diferencias. */
  private readonly vistas = new Map<Id, Quedada>()

  constructor(cliente: ClienteDatos) {
    this.cliente = cliente
  }

  async listar(): Promise<Quedada[]> {
    const { data, error } = await this.cliente
      .from('quedadas')
      .select(CONSULTA)
      .order('creada')
      .order('posicion', { referencedTable: 'participantes' })
      .order('posicion', { referencedTable: 'grupos' })
      .order('posicion', { referencedTable: 'productos' })
      .order('posicion', { referencedTable: 'asistentes' })
      .order('posicion', { referencedTable: 'basicos' })
    if (error) throw new Error(error.message)
    return (data ?? []).flatMap((f) => {
      const q = leerQuedada(f)
      if (q === null) return []
      this.vistas.set(q.id, structuredClone(q))
      return [q]
    })
  }

  async obtener(id: Id): Promise<Quedada | null> {
    const { data, error } = await this.cliente
      .from('quedadas')
      .select(CONSULTA)
      .eq('id', id)
      .order('posicion', { referencedTable: 'participantes' })
      .order('posicion', { referencedTable: 'grupos' })
      .order('posicion', { referencedTable: 'productos' })
      .order('posicion', { referencedTable: 'asistentes' })
      .order('posicion', { referencedTable: 'basicos' })
      .maybeSingle()
    if (error) throw new Error(error.message)
    const q = data ? leerQuedada(data) : null
    if (q === null) return null
    this.vistas.set(q.id, structuredClone(q))
    return q
  }

  async guardar(quedada: Quedada): Promise<void> {
    const base = this.vistas.get(quedada.id) ?? (await this.obtener(quedada.id))
    const quedadas = this.cliente.from('quedadas')

    // 1. La quedada primero: las demás filas dependen de ella.
    if (base === null) {
      comprobar(await quedadas.upsert({ id: quedada.id, ...filaQuedada(quedada) }))
    } else {
      const antes = filaQuedada(base)
      const ahora = filaQuedada(quedada)
      const cambiado = Object.fromEntries(COLUMNAS_QUEDADA.filter((c) => antes[c] !== ahora[c]).map((c) => [c, ahora[c]]))
      if (Object.keys(cambiado).length > 0) comprobar(await quedadas.update(cambiado).eq('id', quedada.id))
    }

    // 2. Altas y cambios; 3. después los borrados. Todo es idempotente: si algo falla, `vistas` no
    // avanza y reintentar vuelve a enviar lo pendiente sin duplicar ni pisar nada.
    const pendientes = TABLAS.map((t) => ({
      t,
      d: diferencias(base === null ? [] : t.aFilas(base), t.aFilas(quedada)),
    }))
    const escrituras: PromiseLike<{ error: ErrorSupabase | null }>[] = []
    for (const { t, d } of pendientes) {
      const hija = this.cliente.from(t.clave)
      if (d.altas.length > 0) {
        escrituras.push(hija.upsert(d.altas.map((f) => ({ ...f, quedada_id: quedada.id })), { onConflict: 'quedada_id,id' }))
      }
      for (const c of d.cambios) escrituras.push(hija.update(c.valores).eq('quedada_id', quedada.id).eq('id', c.id))
    }
    for (const r of await Promise.all(escrituras)) comprobar(r)

    const borrados = pendientes
      .filter(({ d }) => d.bajas.length > 0)
      .map(({ t, d }) => this.cliente.from(t.clave).delete().eq('quedada_id', quedada.id).in('id', d.bajas))
    for (const r of await Promise.all(borrados)) comprobar(r)

    this.vistas.set(quedada.id, structuredClone(quedada))
  }

  async borrar(id: Id): Promise<void> {
    comprobar(await this.cliente.from('quedadas').delete().eq('id', id))
    this.vistas.delete(id)
  }
}
