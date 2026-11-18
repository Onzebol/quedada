import { LocateFixed } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { ConIcono } from '../ui/ConIcono'
import type { Map as MapaLeaflet, Marker } from 'leaflet'
import './casa.css'

interface Props {
  latitud: number
  longitud: number
  /** Se llama al soltar el marcador o al pulsar en el mapa, con la nueva posición. */
  onMover: (latitud: number, longitud: number) => void
}

const redondear = (n: number) => Number(n.toFixed(6))

/**
 * Mapa para ajustar a mano dónde está la casa (solo en edición): se arrastra el marcador o se pulsa en
 * el mapa para colocarlo. Leaflet se carga al abrir el formulario, no con el resto de la página.
 */
export function MapaAjustable({ latitud, longitud, onMover }: Props) {
  const contenedor = useRef<HTMLDivElement>(null)
  const mapa = useRef<MapaLeaflet | null>(null)
  const marcador = useRef<Marker | null>(null)
  const alMover = useRef(onMover)

  useEffect(() => {
    alMover.current = onMover
  })

  useEffect(() => {
    let cancelado = false
    void Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')]).then(([modulo]) => {
      if (cancelado || contenedor.current === null) return
      const L = modulo.default ?? modulo
      const nuevo = L.map(contenedor.current).setView([latitud, longitud], 16)
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(nuevo)
      const pin = L.marker([latitud, longitud], {
        draggable: true,
        alt: 'Marcador de la casa',
        icon: L.divIcon({ className: 'casa__pin', iconSize: [28, 28], iconAnchor: [14, 28] }),
      }).addTo(nuevo)
      pin.on('dragend', () => {
        const p = pin.getLatLng()
        alMover.current(redondear(p.lat), redondear(p.lng))
      })
      nuevo.on('click', (e) => {
        pin.setLatLng(e.latlng)
        alMover.current(redondear(e.latlng.lat), redondear(e.latlng.lng))
      })
      mapa.current = nuevo
      marcador.current = pin
    })
    return () => {
      cancelado = true
      mapa.current?.remove()
      mapa.current = null
      marcador.current = null
    }
    // Se monta una vez; los cambios de coordenadas se siguen en el efecto de abajo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const pin = marcador.current
    if (pin === null) return
    const actual = pin.getLatLng()
    if (redondear(actual.lat) !== redondear(latitud) || redondear(actual.lng) !== redondear(longitud)) {
      pin.setLatLng({ lat: latitud, lng: longitud } as never)
      mapa.current?.panTo({ lat: latitud, lng: longitud } as never)
    }
  }, [latitud, longitud])

  function centrar() {
    const p = marcador.current?.getLatLng()
    if (p !== undefined) mapa.current?.panTo(p)
  }

  return (
    <div className="casa__mapa">
      <div
        ref={contenedor}
        className="casa__mapa-ajustable"
        role="application"
        aria-label="Mapa de la casa: arrastra el marcador o pulsa en el mapa para ajustar su posición"
      />
      <button type="button" className="casa__boton" onClick={centrar}>
        <ConIcono icono={LocateFixed}>Centrar</ConIcono>
      </button>
      <p className="casa__ayuda">Arrastra el marcador o pulsa en el mapa para ajustar la posición.</p>
    </div>
  )
}
