import { invitacionDeHash, quedadaDeHash } from './ruta'

/** Lo que usamos de `Storage` (así se prueba con uno falso y se tolera que el navegador lo bloquee). */
export interface AlmacenClaves {
  getItem(clave: string): string | null
  setItem(clave: string, valor: string): void
  removeItem(clave: string): void
}

const CLAVE = 'quedada:enlace-pendiente'
const VIGENCIA_MS = 60 * 60 * 1000

function almacenDelNavegador(): AlmacenClaves | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

const esEnlace = (hash: string) => invitacionDeHash(hash) !== null || quedadaDeHash(hash) !== null

/**
 * Antes de ir a Google: recuerda el enlace abierto (`#/unirse/<token>` o `#/<id>`) para recuperarlo al
 * volver, porque la redirección lo pierde. Si el hash es otra cosa no guarda nada y borra lo anterior.
 */
export function guardarEnlacePendiente(hash: string, almacen: AlmacenClaves | null = almacenDelNavegador(), ahora = Date.now()): void {
  try {
    if (esEnlace(hash)) almacen?.setItem(CLAVE, JSON.stringify({ hash, cuando: ahora }))
    else almacen?.removeItem(CLAVE)
  } catch {
    // Sin almacenamiento (modo privado, bloqueado): se pierde el enlace, pero nada se rompe.
  }
}

/**
 * Al volver con sesión: el enlace guardado, una sola vez (se borra al leerlo), si no ha pasado más de
 * una hora y si la URL no apunta ya a algo (solo se restaura sobre la raíz). `null` si no hay nada que restaurar.
 */
export function recuperarEnlacePendiente(hashActual: string, almacen: AlmacenClaves | null = almacenDelNavegador(), ahora = Date.now()): string | null {
  try {
    const crudo = almacen?.getItem(CLAVE)
    if (!crudo) return null
    almacen?.removeItem(CLAVE)
    if (hashActual !== '' && hashActual !== '#' && hashActual !== '#/') return null
    const { hash, cuando } = JSON.parse(crudo) as { hash?: unknown; cuando?: unknown }
    if (typeof hash !== 'string' || typeof cuando !== 'number' || !esEnlace(hash)) return null
    return ahora - cuando <= VIGENCIA_MS ? hash : null
  } catch {
    return null
  }
}

/**
 * Al arrancar con sesión: si se pasó por el login con un enlace abierto, vuelve a poner su hash en la URL
 * (sin añadir una entrada al historial) antes de pintar, para que la app lo lea como si nunca se hubiera ido.
 */
export function restaurarEnlacePendiente(): void {
  const hash = recuperarEnlacePendiente(window.location.hash)
  if (hash !== null) window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${hash}`)
}
