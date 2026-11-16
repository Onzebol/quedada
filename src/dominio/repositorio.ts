import type { Id, Quedada } from './tipos'

/** Almacenamiento de quedadas. Asíncrono para poder sustituirlo por un servicio compartido. */
export interface Repositorio {
  listar(): Promise<Quedada[]>
  obtener(id: Id): Promise<Quedada | null>
  guardar(quedada: Quedada): Promise<void>
  borrar(id: Id): Promise<void>
}
