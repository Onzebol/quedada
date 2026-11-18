import type { Id } from '../dominio/tipos'
import type { Invitaciones, Miembro } from '../invitaciones/tipos'

/** Invitaciones falsas para tests: un enlace vigente, los miembros y los destinos de cada token, todo en memoria. */
export class InvitacionesMemoria implements Invitaciones {
  enlace: string | null
  miembrosActuales: Miembro[]
  /** token → [id, nombre] de las quedadas a las que se puede entrar. */
  destinos: Record<string, [Id, string]>
  aceptados: { token: string; nombre: string }[] = []
  contador = 0
  falla = false

  constructor(opciones: { enlace?: string | null; miembros?: Miembro[]; destinos?: Record<string, [Id, string]> } = {}) {
    this.enlace = opciones.enlace ?? null
    this.miembrosActuales = opciones.miembros ?? []
    this.destinos = opciones.destinos ?? {}
  }

  private comprobar() {
    if (this.falla) throw new Error('fallo simulado')
  }

  async enlaceActivo() {
    this.comprobar()
    return this.enlace
  }

  async crearEnlace() {
    this.comprobar()
    this.enlace = `token${++this.contador}`
    return this.enlace
  }

  async desactivarEnlace() {
    this.comprobar()
    this.enlace = null
  }

  async miembros() {
    this.comprobar()
    return [...this.miembrosActuales]
  }

  async retirar(_quedadaId: Id, usuarioId: string) {
    this.comprobar()
    this.miembrosActuales = this.miembrosActuales.filter((m) => m.usuarioId !== usuarioId)
  }

  async nombreDe(token: string) {
    this.comprobar()
    return this.destinos[token]?.[1] ?? null
  }

  async aceptar(token: string, nombre: string) {
    this.comprobar()
    const destino = this.destinos[token]
    if (!destino) throw new Error('La invitación no es válida o ha caducado')
    this.aceptados.push({ token, nombre })
    return destino[0]
  }
}
