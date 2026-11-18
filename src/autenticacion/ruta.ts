const RAIZ = '#/'
/** Formato anterior (`#/quedada/<id>`): ya se pudo compartir, así que se sigue entendiendo. */
const ANTIGUO = '#/quedada/'

/** Hash de una quedada: `#/<id>`. El id se codifica, así que nunca contiene `/`. */
export function hashQuedada(id: string): string {
  return `${RAIZ}${encodeURIComponent(id)}`
}

/**
 * Id de la quedada de un hash `#/<id>` (o del formato antiguo `#/quedada/<id>`), o `null` si el hash es
 * otra cosa. Como un id nuevo nunca lleva `/` sin codificar, el prefijo antiguo no se confunde con un id.
 */
export function quedadaDeHash(hash: string): string | null {
  const resto = hash.startsWith(ANTIGUO) ? hash.slice(ANTIGUO.length) : hash.startsWith(RAIZ) ? hash.slice(RAIZ.length) : ''
  if (resto === '' || resto.includes('/')) return null
  try {
    return decodeURIComponent(resto)
  } catch {
    return null
  }
}

const UNIRSE = '#/unirse/'

/** Hash de una invitación: `#/unirse/<token>`. */
export function hashInvitacion(token: string): string {
  return `${UNIRSE}${encodeURIComponent(token)}`
}

/** Token de un hash `#/unirse/<token>`, o `null` si el hash es otra cosa. */
export function invitacionDeHash(hash: string): string | null {
  if (!hash.startsWith(UNIRSE)) return null
  const resto = hash.slice(UNIRSE.length)
  if (resto === '' || resto.includes('/')) return null
  try {
    return decodeURIComponent(resto)
  } catch {
    return null
  }
}

/** URL completa de la invitación: la de la página sin su hash, más `#/unirse/<token>`. */
export function enlaceInvitacion(urlPagina: string, token: string): string {
  return `${urlPagina.split('#')[0]}${hashInvitacion(token)}`
}
