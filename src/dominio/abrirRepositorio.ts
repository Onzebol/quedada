import initSqlJs from 'sql.js'
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'
import { migrar } from './migracion'
import { PersistenciaIndexedDb } from './persistenciaIndexedDb'
import type { Repositorio } from './repositorio'
import { RepositorioLocalStorage } from './repositorioLocalStorage'
import { RepositorioSqlite } from './repositorioSqlite'

/** Abre la base SQLite del navegador e importa, la primera vez, los datos antiguos de localStorage. */
export async function abrirRepositorio(): Promise<Repositorio> {
  const sql = await initSqlJs({ locateFile: () => wasmUrl })
  const repo = await RepositorioSqlite.abrir(sql, new PersistenciaIndexedDb())
  await migrar(new RepositorioLocalStorage(), repo)
  return repo
}
