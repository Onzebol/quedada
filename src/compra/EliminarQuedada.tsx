import { useState } from 'react'
import './eliminarQuedada.css'

interface Props {
  /** Quedada a la que se refiere el botón: la confirmación abierta solo vale para ella. */
  quedadaId: string
  nombre: string
  /** Borra la quedada; debe rechazar si no se pudo. */
  onEliminar: () => Promise<void>
}

/** Botón «Eliminar quedada» con confirmación en la propia página (sin `window.confirm`). */
export function EliminarQuedada({ quedadaId, nombre, onEliminar }: Props) {
  // Se guarda para qué quedada se pidió confirmar, en vez de reiniciar el componente con `key`.
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null)
  const [errorId, setErrorId] = useState<string | null>(null)
  const confirmando = confirmandoId === quedadaId
  const error = errorId === quedadaId

  async function eliminar() {
    setErrorId(null)
    try {
      await onEliminar()
      setConfirmandoId(null)
    } catch {
      setErrorId(quedadaId)
    }
  }

  return (
    <div className="eliminar-quedada">
      {!confirmando ? (
        <button type="button" className="eliminar-quedada__abrir" onClick={() => setConfirmandoId(quedadaId)}>
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
                setConfirmandoId(null)
                setErrorId(null)
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
