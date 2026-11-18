import type { Map as MapaLeaflet } from 'leaflet'

const ZOOM = 16

/**
 * Crea un mapa de Leaflet con las teselas de OpenStreetMap. Leaflet se carga bajo demanda. El único pie es
 * «© OpenStreetMap» (atribución que exige la licencia ODbL), sin el prefijo «Leaflet»; con la capa de
 * satélite, la atribución de Esri.
 */
export async function crearMapa(
  contenedor: HTMLElement,
  latitud: number,
  longitud: number,
  /** Se consulta justo tras cargar Leaflet: si el componente ya se desmontó no se crea nada (con StrictMode, dos mapas en un contenedor fallan). */
  cancelado: () => boolean,
) {
  const [modulo] = await Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')])
  if (cancelado()) return null
  const L = modulo.default ?? modulo
  const mapa = L.map(contenedor).setView([latitud, longitud], ZOOM)
  mapa.attributionControl.setPrefix(false)
  const calles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(mapa)
  // La atribución de Esri es obligatoria; Leaflet solo muestra la de la capa que se está viendo.
  const satelite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: 'Imágenes © Esri, Maxar, Earthstar Geographics',
  })
  let verSatelite = false
  /** Cambia de capa y devuelve si ahora se ve el satélite. */
  const alternarCapa = () => {
    mapa.removeLayer(verSatelite ? satelite : calles)
    verSatelite = !verSatelite
    mapa.addLayer(verSatelite ? satelite : calles)
    return verSatelite
  }
  return { L, mapa, alternarCapa }
}

/** Devuelve el mapa a la casa, con el zoom inicial. */
export function centrarEn(mapa: MapaLeaflet, latitud: number, longitud: number) {
  mapa.setView([latitud, longitud], ZOOM)
}
