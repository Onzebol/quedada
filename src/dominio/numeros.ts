const FORMATO = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 3, useGrouping: false })

/** Lee una cantidad escrita con punto o coma decimal. Devuelve null si no es un número válido. */
export function parsearCantidad(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.')
  return /^\d+(\.\d+)?$/.test(limpio) ? Number(limpio) : null
}

/** «2,3 kg». Sin cantidad devuelve una cadena vacía. */
export function formatearCantidad(cantidad: number | null, unidad: string): string {
  if (cantidad === null) return ''
  return [FORMATO.format(cantidad), unidad.trim()].filter((t) => t !== '').join(' ')
}

/** Lee un importe en euros con punto o coma decimal y signo opcional. Devuelve null si no es válido. */
export function parsearEuros(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.')
  return /^-?\d+(\.\d+)?$/.test(limpio) ? Number(limpio) : null
}

const EUROS = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  useGrouping: 'always',
})

/** «1.667,41 €» a partir de céntimos enteros. */
export function formatearEuros(centimos: number): string {
  return EUROS.format(centimos / 100)
}

/** Deja en un campo de importe solo dígitos, un separador decimal (punto o coma) y un menos inicial. */
export function filtrarImporte(texto: string, conSigno = true): string {
  let salida = ''
  let separador = false
  for (const c of texto) {
    if (/\d/.test(c)) salida += c
    else if ((c === ',' || c === '.') && !separador) {
      separador = true
      salida += c
    } else if (conSigno && c === '-' && salida === '') salida += c
  }
  return salida
}
