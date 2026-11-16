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

/** URL completa de la quedada: la de la página sin su hash antiguo, más `#/<id>`. */
export function enlaceQuedada(urlPagina: string, id: string): string {
  return `${urlPagina.split('#')[0]}${hashQuedada(id)}`
}
