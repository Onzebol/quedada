import { createClient } from '@supabase/supabase-js'
import type { ClienteAuth } from './autenticacionSupabase'
import type { ClienteAlmacen } from '../tiques/almacenSupabase'
import type { ClienteDatos } from './repositorioSupabase'

export type ClienteSupabase = ClienteAuth & ClienteDatos & ClienteAlmacen

/** Cliente de Supabase, o `null` si faltan la URL o la clave pública (la app sigue en modo local). */
export function crearCliente(
  url: string | undefined = import.meta.env.VITE_SUPABASE_URL,
  clave: string | undefined = import.meta.env.VITE_SUPABASE_CLAVE_PUBLICA,
): ClienteSupabase | null {
  // El tipo completo de SupabaseClient es enorme: se expone solo lo que usan la app y los tests.
  return url && clave ? (createClient(url, clave) as unknown as ClienteSupabase) : null
}
