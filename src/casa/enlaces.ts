export type Trozo = { tipo: 'texto' | 'enlace'; valor: string }

const ENLACE = /https?:\/\/[^\s<>"]+/g
const PUNTUACION_FINAL = /[.,;:!?)\]}'»]+$/

/** Parte un texto en trozos de texto y enlaces `http(s)://`; la puntuación final queda fuera del enlace. */
export function partirEnlaces(texto: string): Trozo[] {
  const trozos: Trozo[] = []
  let desde = 0
  for (const m of texto.matchAll(ENLACE)) {
    const enlace = m[0].replace(PUNTUACION_FINAL, '')
    if (enlace === 'http://' || enlace === 'https://') continue
    const inicio = m.index
    if (inicio > desde) trozos.push({ tipo: 'texto', valor: texto.slice(desde, inicio) })
    trozos.push({ tipo: 'enlace', valor: enlace })
    desde = inicio + enlace.length
  }
  if (desde < texto.length) trozos.push({ tipo: 'texto', valor: texto.slice(desde) })
  return trozos
}
