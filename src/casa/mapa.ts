export interface Coordenadas {
  latitud: number
  longitud: number
}

/** Convierte una dirección en coordenadas, o `null` si no la encuentra. */
export type Geocodificador = (direccion: string) => Promise<Coordenadas | null>

const redondear = (n: number) => Number(n.toFixed(5))

/** Mapa de OpenStreetMap para un `iframe`: un recuadro de ±0,01° alrededor del marcador. */
export function urlMapaIncrustado(latitud: number, longitud: number): string {
  const d = 0.01
  const bbox = [longitud - d, latitud - d, longitud + d, latitud + d].map(redondear).join(',')
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitud},${longitud}`
}

export function urlAbrirMapa(latitud: number, longitud: number): string {
  return `https://www.openstreetmap.org/?mlat=${latitud}&mlon=${longitud}#map=16/${latitud}/${longitud}`
}

/** Busca la dirección en Nominatim (OpenStreetMap). Solo se llama al pulsar el botón, nunca al escribir. */
export const geocodificarNominatim: Geocodificador = async (direccion) => {
  const respuesta = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(direccion)}`,
    { headers: { Accept: 'application/json' } },
  )
  if (!respuesta.ok) throw new Error('Nominatim no respondió')
  const datos = (await respuesta.json()) as { lat: string; lon: string }[]
  if (datos.length === 0) return null
  const latitud = Number(datos[0].lat)
  const longitud = Number(datos[0].lon)
  return Number.isFinite(latitud) && Number.isFinite(longitud) ? { latitud, longitud } : null
}
