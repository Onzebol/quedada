import { useState } from 'react'
import './eliminarQuedada.css'

interface Props {
  nombre: string
  /** Borra la quedada; debe rechazar si no se pudo. */
  onEliminar: () => Promise<void>
}

/** Botón «Eliminar quedada» con confirmación en la propia página (sin `window.confirm`). */
export function EliminarQuedada({ nombre, onEliminar }: Props) {
  const [confirmando, setConfirmando] = useState(false)
  const [error, setError] = useState(false)

  async function eliminar() {
    setError(false)
    try {
      await onEliminar()
      setConfirmando(false)
    } catch {
      setError(true)
    }
  }

  return (
    <div className="eliminar-quedada">
      {!confirmando ? (
        <button type="button" className="eliminar-quedada__abrir" onClick={() => setConfirmando(true)}>
          Eliminar quedada
        </button>
      ) : (
        <section role="group" aria-label="Confirmar eliminación" className="eliminar-quedada__confirmar">
          <p>
            ¿Eliminar «{nombre}»? Se borrará con todos sus productos, participantes y gastos y no se puede deshacer.
          </p>
          <div className="eliminar-quedada__acciones">
            <button type="button" className="eliminar-quedada__si" onClick={() => void eliminar()}>
              Sí, eliminar
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmando(false)
                setError(false)
              }}
            >
              Cancelar
            </button>
          </div>
        </section>
      )}
      {error && <p role="alert">No se pudo eliminar la quedada. Inténtalo de nuevo.</p>}
    </div>
  )
}
