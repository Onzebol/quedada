import { Map as IconoMapa, Satellite } from 'lucide-react'
import { useState } from 'react'
import './casa.css'

/** Un solo botón sobre el mapa que alterna entre mapa y satélite; sin texto (el nombre va en `aria-label`) y llamado como la capa a la que cambia. */
export function BotonCapa({ alternar }: { alternar: () => boolean | undefined }) {
  const [satelite, setSatelite] = useState(false)
  const Icono = satelite ? IconoMapa : Satellite
  return (
    <button
      type="button"
      className="casa__capa"
      aria-label={satelite ? 'Mapa' : 'Satélite'}
      onClick={() => {
        const ahora = alternar()
        if (ahora !== undefined) setSatelite(ahora)
      }}
    >
      <Icono aria-hidden="true" size={18} strokeWidth={2} />
    </button>
  )
}
