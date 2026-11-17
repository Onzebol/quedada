import { Download } from 'lucide-react'
import { ConIcono } from '../ui/ConIcono'
import { useInstalar } from './useInstalar'

/** Botón «Instalar»: solo aparece cuando el navegador permite instalar la aplicación. */
export function BotonInstalar() {
  const { puedeInstalar, instalar } = useInstalar()
  if (!puedeInstalar) return null
  return (
    <button type="button" className="boton-instalar" onClick={() => void instalar()}>
      <ConIcono icono={Download}>Instalar</ConIcono>
    </button>
  )
}
