/** Leaflet falso para los tests (jsdom no pinta mapas): recuerda el marcador y el mapa para poder «arrastrarlos». */
type Manejador = (evento?: { latlng: { lat: number; lng: number } }) => void

export class MarcadorFalso {
  posicion: { lat: number; lng: number }
  opciones: Record<string, unknown>
  manejadores: Record<string, Manejador> = {}

  constructor(posicion: [number, number], opciones: Record<string, unknown>) {
    this.posicion = { lat: posicion[0], lng: posicion[1] }
    this.opciones = opciones
  }
  addTo() {
    return this
  }
  on(evento: string, manejador: Manejador) {
    this.manejadores[evento] = manejador
    return this
  }
  getLatLng() {
    return this.posicion
  }
  setLatLng(p: { lat: number; lng: number }) {
    this.posicion = p
    return this
  }
}

export class MapaFalso {
  contenedor: HTMLElement | undefined
  constructor(contenedor?: HTMLElement) {
    // Como Leaflet de verdad: un contenedor no admite dos mapas a la vez.
    if (contenedor !== undefined) {
      if (contenedor.dataset.mapaFalso === 'si') throw new Error('Map container is already initialized.')
      contenedor.dataset.mapaFalso = 'si'
    }
    this.contenedor = contenedor
  }
  manejadores: Record<string, Manejador> = {}
  quitado = false
  centro: [number, number] | null = null
  /** Lo que Leaflet pinta antes de la atribución («Leaflet»): `false` lo quita. */
  prefijo: string | false = 'Leaflet'
  attributionControl = { setPrefix: (p: string | false) => void (this.prefijo = p) }
  setView(centro: [number, number]) {
    this.centro = centro
    return this
  }
  panTo(p: { lat: number; lng: number }) {
    this.centro = [p.lat, p.lng]
    return this
  }
  on(evento: string, manejador: Manejador) {
    this.manejadores[evento] = manejador
    return this
  }
  remove() {
    this.quitado = true
    if (this.contenedor !== undefined) delete this.contenedor.dataset.mapaFalso
  }
}

export const leaflet = {
  mapa: null as MapaFalso | null,
  marcador: null as MarcadorFalso | null,
  /** Capas de teselas creadas: url -> atribución. */
  capas: {} as Record<string, string>,
  /** Nombres de las capas base que ofrece el selector de capas. */
  selector: [] as string[],
  /** Simula arrastrar el marcador a otro sitio y soltarlo. */
  arrastrar(lat: number, lng: number) {
    leaflet.marcador!.posicion = { lat, lng }
    leaflet.marcador!.manejadores.dragend?.()
  },
  /** Simula pulsar en el mapa. */
  pulsar(lat: number, lng: number) {
    leaflet.mapa!.manejadores.click?.({ latlng: { lat, lng } })
  },
}

const L = {
  map: (contenedor?: HTMLElement) => (leaflet.mapa = new MapaFalso(contenedor)),
  tileLayer: (url: string, opciones: { attribution?: string }) => {
    leaflet.capas[url] = opciones.attribution ?? ''
    return { addTo: () => undefined, url }
  },
  control: {
    layers: (bases: Record<string, unknown>) => {
      leaflet.selector = Object.keys(bases)
      return { addTo: () => undefined }
    },
  },
  divIcon: (opciones: Record<string, unknown>) => opciones,
  marker: (posicion: [number, number], opciones: Record<string, unknown>) => (leaflet.marcador = new MarcadorFalso(posicion, opciones)),
}

export const leafletFalso = { default: L, ...L }
