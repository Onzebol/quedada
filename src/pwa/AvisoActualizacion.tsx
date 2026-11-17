import { RefreshCw, X } from 'lucide-react'
import { ConIcono } from '../ui/ConIcono'
import './aviso.css'

interface Props {
  hayNueva: boolean
  onActualizar: () => void
  onCerrar: () => void
}

/** Aviso fijo abajo cuando hay una versión nueva de la aplicación instalada. */
export function AvisoActualizacion({ hayNueva, onActualizar, onCerrar }: Props) {
  if (!hayNueva) return null
  return (
    <div className="aviso" role="status">
      <p className="aviso__texto">Hay una versión nueva de la aplicación</p>
      <div className="aviso__acciones">
        <button type="button" className="aviso__cerrar" onClick={onCerrar}>
          <ConIcono icono={X}>Más tarde</ConIcono>
        </button>
        <button type="button" onClick={onActualizar}>
          <ConIcono icono={RefreshCw}>Actualizar</ConIcono>
        </button>
      </div>
    </div>
  )
}
