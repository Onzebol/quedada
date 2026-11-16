import type { Repositorio } from './repositorio'

/** Copia las quedadas de `origen` a `destino` solo si `destino` está vacío. No borra el origen. */
export async function migrar(origen: Repositorio, destino: Repositorio): Promise<void> {
  if ((await destino.listar()).length > 0) return
  for (const q of await origen.listar()) await destino.guardar(q)
}
