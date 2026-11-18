import { LocateFixed, Navigation } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { ConIcono } from '../ui/ConIcono'
import { centrarEn, crearMapa } from './leafletMapa'
import type { Map as MapaLeaflet } from 'leaflet'
import './casa.css'

interface Props {
  latitud: number
  longitud: number
  /** Enlace a la app de mapas del móvil; sin él no hay botón «Navegar». */
  enlaceApp?: string | null
}

/** Mapa de solo lectura de la ficha: marcador fijo, zoom y desplazamiento libres, y «Centrar» para volver a la casa. */
export function MapaCasa({ latitud, longitud, enlaceApp = null }: Props) {
  const contenedor = useRef<HTMLDivElement>(null)
  const mapa = useRef<MapaLeaflet | null>(null)

  useEffect(() => {
    let cancelado = false
    void crearMapa(contenedor.current!, latitud, longitud).then(({ L, mapa: nuevo }) => {
      if (cancelado) {
        nuevo.remove()
        return
      }
      L.marker([latitud, longitud], {
        alt: 'Marcador de la casa',
        keyboard: false,
        icon: L.divIcon({ className: 'casa__pin casa__pin--fijo', iconSize: [28, 28], iconAnchor: [14, 28] }),
      }).addTo(nuevo)
      mapa.current = nuevo
    })
    return () => {
      cancelado = true
      mapa.current?.remove()
      mapa.current = null
    }
  }, [latitud, longitud])

  return (
    <div className="casa__mapa">
      <div ref={contenedor} className="casa__mapa-ajustable" role="application" aria-label="Mapa de la casa" />
      <div className="casa__mapa-acciones">
        <button type="button" onClick={() => mapa.current !== null && centrarEn(mapa.current, latitud, longitud)}>
          <ConIcono icono={LocateFixed}>Centrar</ConIcono>
        </button>
        {enlaceApp !== null && (
          <a className="casa__boton" href={enlaceApp}>
            <ConIcono icono={Navigation}>Navegar</ConIcono>
          </a>
        )}
      </div>
    </div>
  )
}
