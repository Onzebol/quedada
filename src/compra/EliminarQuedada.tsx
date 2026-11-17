import { BotonBorrar } from '../ui/BotonBorrar'
import './eliminarQuedada.css'

interface Props {
  nombre: string
  /** Borra la quedada; debe rechazar si no se pudo. */
  onEliminar: () => Promise<void>
}

/** Botón «Borrar quedada»: pide confirmación en una ventana modal. */
export function EliminarQuedada({ nombre, onEliminar }: Props) {
  return (
    <div className="eliminar-quedada">
      <BotonBorrar
        texto="Borrar"
        etiqueta={`Borrar quedada ${nombre}`}
        titulo={`¿Borrar «${nombre}»?`}
        mensaje="Se borrará con todos sus productos, participantes y gastos y no se puede deshacer."
        onConfirmar={onEliminar}
      />
    </div>
  )
}
