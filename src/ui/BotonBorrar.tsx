import { Trash2 } from 'lucide-react'
import { ConIcono } from './ConIcono'
import { useRef, useState, type ReactNode } from 'react'
import { Modal } from './Modal'

interface Props {
  /** Texto visible del botón. */
  texto: string
  /** Nombre accesible del botón cuando no basta el texto (p. ej. «Borrar Sidra»). */
  etiqueta?: string
  titulo: string
  mensaje?: ReactNode
  /** Texto del botón que confirma. */
  textoConfirmar?: string
  /** Borra de verdad; si rechaza, la ventana sigue abierta con un aviso. */
  onConfirmar: () => void | Promise<void>
}

/**
 * Botón de borrado: no borra nada hasta que se confirma en una ventana modal. Mientras se borra no se
 * puede confirmar otra vez ni cerrar; si falla, avisa y deja la ventana abierta.
 */
export function BotonBorrar({ texto, etiqueta, titulo, mensaje, textoConfirmar = 'Sí, borrar', onConfirmar }: Props) {
  const [abierta, setAbierta] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState(false)
  const enCurso = useRef(false)

  function cerrar() {
    if (enCurso.current) return
    setAbierta(false)
    setError(false)
  }

  async function confirmar() {
    if (enCurso.current) return
    enCurso.current = true
    setOcupado(true)
    setError(false)
    try {
      await onConfirmar()
      setAbierta(false)
    } catch {
      setError(true)
    } finally {
      enCurso.current = false
      setOcupado(false)
    }
  }

  return (
    <>
      <button type="button" aria-label={etiqueta} onClick={() => setAbierta(true)}>
        <ConIcono icono={Trash2}>{texto}</ConIcono>
      </button>
      {abierta && (
        <Modal titulo={titulo} descripcion={mensaje} onCerrar={cerrar}>
          {error && (
            <p role="alert" className="modal__error">
              No se pudo borrar. Inténtalo de nuevo.
            </p>
          )}
          <div className="modal__acciones">
            <button type="button" className="modal__boton" data-autofocus disabled={ocupado} onClick={cerrar}>
              Cancelar
            </button>
            <button type="button" className="modal__boton modal__boton--peligro" disabled={ocupado} onClick={() => void confirmar()}>
              {textoConfirmar}
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
