/** Lo mínimo que se guarda de una cuenta: identificador, nombre visible y foto. */
export interface Usuario {
  id: string
  nombre: string
  foto: string | null
}

/**
 * Inicio de sesión detrás de una interfaz, como el repositorio: la app real usa Google
 * (`autenticacionGoogle.ts`) y los tests una implementación en memoria.
 */
export interface Autenticacion {
  /** Cuenta con sesión abierta, o `null`. */
  actual(): Usuario | null
  /** Abre el flujo de inicio de sesión. Rechaza si la persona cancela o falla. */
  entrar(): Promise<Usuario>
  salir(): Promise<void>
  /** Si no hay configuración (p. ej. falta el Client ID), la app no ofrece entrar. */
  disponible(): boolean
}
