import type { Repositorio } from '../dominio/repositorio'
import type { Id, Quedada } from '../dominio/tipos'

interface Error_ {
  message: string
}

/** La parte de `SupabaseClient` que usa el repositorio, para poder probarlo con un cliente falso. */
export interface ClienteDatos {
  from(tabla: string): {
    select(columnas: string): {
      eq(columna: string, valor: string): {
        maybeSingle(): PromiseLike<{ data: { datos: unknown } | null; error: Error_ | null }>
      }
      order(columna: string): PromiseLike<{ data: { datos: unknown }[] | null; error: Error_ | null }>
    }
    upsert(fila: { id: string; datos: unknown }): PromiseLike<{ error: Error_ | null }>
    delete(): { eq(columna: string, valor: string): PromiseLike<{ error: Error_ | null }> }
  }
}

function esQuedada(x: unknown): x is Quedada {
  if (typeof x !== 'object' || x === null) return false
  const q = x as Record<string, unknown>
  return (
    typeof q.id === 'string' &&
    typeof q.nombre === 'string' &&
    Array.isArray(q.participantes) &&
    Array.isArray(q.grupos) &&
    Array.isArray(q.productos)
  )
}

/**
 * Quedadas en Supabase (Postgres). Cada quedada es una fila con su documento en `datos` (jsonb).
 * Quién ve cada fila lo decide la seguridad por fila (RLS) de la base, no esta clase.
 */
export class RepositorioSupabase implements Repositorio {
  private readonly cliente: ClienteDatos

  constructor(cliente: ClienteDatos) {
    this.cliente = cliente
  }

  async listar(): Promise<Quedada[]> {
    const { data, error } = await this.cliente.from('quedadas').select('datos').order('creada')
    if (error) throw new Error(error.message)
    return (data ?? []).map((f) => f.datos).filter(esQuedada)
  }

  async obtener(id: Id): Promise<Quedada | null> {
    const { data, error } = await this.cliente.from('quedadas').select('datos').eq('id', id).maybeSingle()
    if (error) throw new Error(error.message)
    return data && esQuedada(data.datos) ? data.datos : null
  }

  async guardar(quedada: Quedada): Promise<void> {
    const { error } = await this.cliente.from('quedadas').upsert({ id: quedada.id, datos: quedada })
    if (error) throw new Error(error.message)
  }

  async borrar(id: Id): Promise<void> {
    const { error } = await this.cliente.from('quedadas').delete().eq('id', id)
    if (error) throw new Error(error.message)
  }
}
