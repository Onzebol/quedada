const PREFIJO = '#/quedada/'

/** Id de la quedada de un hash `#/quedada/<id>`, o `null` si el hash es otra cosa. */
export function quedadaDeHash(hash: string): string | null {
  if (!hash.startsWith(PREFIJO) || hash.length === PREFIJO.length) return null
  try {
    return decodeURIComponent(hash.slice(PREFIJO.length))
  } catch {
    return null
  }
}

/** URL completa de la quedada: la de la página sin su hash antiguo, más `#/quedada/<id>`. */
export function enlaceQuedada(urlPagina: string, id: string): string {
  const sinHash = urlPagina.split('#')[0]
  return `${sinHash}${PREFIJO}${encodeURIComponent(id)}`
}
