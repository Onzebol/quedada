import type { Id, Quedada } from './tipos'

/** Almacenamiento de quedadas. Asíncrono para poder sustituirlo por un servicio compartido. */
export interface Repositorio {
  listar(): Promise<Quedada[]>
  obtener(id: Id): Promise<Quedada | null>
  guardar(quedada: Quedada): Promise<void>
  borrar(id: Id): Promise<void>
  /** Si la cuenta puede borrar la quedada (solo su propietario). Ausente: siempre. */
  puedeBorrar?(id: Id): boolean
  /**
   * Avisa con `alCambiar` cada vez que alguien cambia la quedada `id` (y al quedar suscrito, para
   * recoger lo ocurrido antes). Devuelve la función que cancela la suscripción. Solo lo tienen los
   * repositorios compartidos; los locales no lo necesitan.
   */
  suscribir?(id: Id, alCambiar: () => void): () => void
}
