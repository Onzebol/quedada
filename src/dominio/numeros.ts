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
