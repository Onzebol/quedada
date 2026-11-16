import { BotonBorrar } from '../ui/BotonBorrar'
import './eliminarQuedada.css'

interface Props {
  nombre: string
  /** Borra la quedada; debe rechazar si no se pudo. */
  onEliminar: () => Promise<void>
}

/** Botón «Eliminar quedada»: pide confirmación en una ventana modal. */
export function EliminarQuedada({ nombre, onEliminar }: Props) {
  return (
    <div className="eliminar-quedada">
      <BotonBorrar
        texto="Eliminar quedada"
        titulo={`¿Eliminar «${nombre}»?`}
        mensaje="Se borrará con todos sus productos, participantes y gastos y no se puede deshacer."
        textoConfirmar="Sí, eliminar"
        onConfirmar={onEliminar}
      />
    </div>
  )
}
