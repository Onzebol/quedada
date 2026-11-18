import { Map as IconoMapa, Satellite } from 'lucide-react'
import { useState } from 'react'
import { ConIcono } from '../ui/ConIcono'
import './casa.css'

/** Un solo botón sobre el mapa que alterna entre mapa y satélite; se llama como la capa a la que cambia. */
export function BotonCapa({ alternar }: { alternar: () => boolean | undefined }) {
  const [satelite, setSatelite] = useState(false)
  return (
    <button
      type="button"
      className="casa__capa"
      onClick={() => {
        const ahora = alternar()
        if (ahora !== undefined) setSatelite(ahora)
      }}
    >
      <ConIcono icono={satelite ? IconoMapa : Satellite}>{satelite ? 'Mapa' : 'Satélite'}</ConIcono>
    </button>
  )
}
