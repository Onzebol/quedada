import type { Id } from '../dominio/tipos'

/** Quien ha entrado en una quedada con un enlace de invitación (el propietario no figura). */
export interface Miembro {
  usuarioId: string
  nombre: string
}

/** Invitar por enlace y gestionar quién ha entrado. Las operaciones del propietario rechazan si no lo es. */
export interface Invitaciones {
  /** Token del enlace vigente, o `null` si no hay. Solo el propietario. */
  enlaceActivo(quedadaId: Id): Promise<string | null>
  /** Crea un enlace nuevo (el anterior deja de valer) y devuelve su token. Solo el propietario. */
  crearEnlace(quedadaId: Id): Promise<string>
  /** El enlace deja de valer. Solo el propietario. */
  desactivarEnlace(quedadaId: Id): Promise<void>
  /** Miembros de la quedada, sin el propietario. Lo ve quien tiene acceso. */
  miembros(quedadaId: Id): Promise<Miembro[]>
  /** Retira a un miembro. Solo el propietario. */
  retirar(quedadaId: Id, usuarioId: string): Promise<void>
  /** Nombre de la quedada a la que lleva el enlace, o `null` si no vale (inválido, desactivado o caducado). */
  nombreDe(token: string): Promise<string | null>
  /** Entra en la quedada con el enlace y devuelve su id; rechaza si el enlace no vale. */
  aceptar(token: string, nombre: string): Promise<Id>
}
