import type { Id } from '../dominio/tipos'
import type { Invitaciones, Miembro } from './tipos'

/** La parte de `SupabaseClient` que usan las invitaciones (funciones de la base), para probarla con un cliente falso. */
export interface ClienteRpc {
  rpc(nombre: string, argumentos: Record<string, unknown>): PromiseLike<{ data: unknown; error: { message: string } | null }>
}

/** Invitaciones sobre las funciones de `0012_invitaciones.sql`; quién puede qué lo decide la base, no esta clase. */
export class InvitacionesSupabase implements Invitaciones {
  private readonly cliente: ClienteRpc

  constructor(cliente: ClienteRpc) {
    this.cliente = cliente
  }

  private async llamar(nombre: string, argumentos: Record<string, unknown>): Promise<unknown> {
    const { data, error } = await this.cliente.rpc(nombre, argumentos)
    if (error) throw new Error(error.message)
    return data
  }

  async enlaceActivo(quedadaId: Id) {
    const t = await this.llamar('invitacion_activa', { p_quedada_id: quedadaId })
    return typeof t === 'string' ? t : null
  }

  async crearEnlace(quedadaId: Id) {
    const t = await this.llamar('crear_invitacion', { p_quedada_id: quedadaId })
    if (typeof t !== 'string') throw new Error('Respuesta inesperada al crear el enlace')
    return t
  }

  async desactivarEnlace(quedadaId: Id) {
    await this.llamar('desactivar_invitacion', { p_quedada_id: quedadaId })
  }

  async miembros(quedadaId: Id): Promise<Miembro[]> {
    const filas = await this.llamar('miembros_de', { p_quedada_id: quedadaId })
    if (!Array.isArray(filas)) return []
    return filas.map((f: { usuario_id: string; nombre: string }) => ({ usuarioId: f.usuario_id, nombre: f.nombre }))
  }

  async retirar(quedadaId: Id, usuarioId: string) {
    await this.llamar('retirar_miembro', { p_quedada_id: quedadaId, p_usuario_id: usuarioId })
  }

  async nombreDe(token: string) {
    const n = await this.llamar('nombre_invitacion', { p_token: token })
    return typeof n === 'string' ? n : null
  }

  async aceptar(token: string, nombre: string) {
    const id = await this.llamar('aceptar_invitacion', { p_token: token, p_nombre: nombre })
    if (typeof id !== 'string') throw new Error('Respuesta inesperada al aceptar la invitación')
    return id
  }
}
