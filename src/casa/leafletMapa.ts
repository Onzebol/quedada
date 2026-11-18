import type { Map as MapaLeaflet } from 'leaflet'

const ZOOM = 16

/**
 * Crea un mapa de Leaflet con las teselas de OpenStreetMap. Leaflet se carga bajo demanda. El único pie es
 * «© OpenStreetMap» (atribución que exige la licencia ODbL), sin el prefijo «Leaflet».
 */
export async function crearMapa(contenedor: HTMLElement, latitud: number, longitud: number) {
  const [modulo] = await Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')])
  const L = modulo.default ?? modulo
  const mapa = L.map(contenedor).setView([latitud, longitud], ZOOM)
  mapa.attributionControl.setPrefix(false)
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(mapa)
  return { L, mapa }
}

/** Devuelve el mapa a la casa, con el zoom inicial. */
export function centrarEn(mapa: MapaLeaflet, latitud: number, longitud: number) {
  mapa.setView([latitud, longitud], ZOOM)
}
