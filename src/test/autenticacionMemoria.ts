import type { Autenticacion, Usuario } from '../autenticacion/tipos'

/** Autenticación falsa para tests: `entrar` devuelve `cuenta` (o falla si es `null`). */
export class AutenticacionMemoria implements Autenticacion {
  montarBoton?: Autenticacion['montarBoton']
  private sesion: Usuario | null
  private readonly cuenta: Usuario | null
  readonly disponibleSiempre: boolean

  constructor(cuenta: Usuario | null, sesion: Usuario | null = null, disponible = true) {
    this.cuenta = cuenta
    this.sesion = sesion
    this.disponibleSiempre = disponible
  }

  actual() {
    return this.sesion
  }

  async entrar() {
    if (this.cuenta === null) throw new Error('cancelado')
    this.sesion = this.cuenta
    return this.cuenta
  }

  async salir() {
    this.sesion = null
  }

  disponible() {
    return this.disponibleSiempre
  }
}
