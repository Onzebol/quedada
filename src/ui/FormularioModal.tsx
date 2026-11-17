import type { ReactNode } from 'react'
import { Modal } from './Modal'

interface Props {
  titulo: string
  /** Texto del botón que envía el formulario («Guardar», «Añadir»…). */
  envio: string
  /** Se llama al enviar; después la ventana se cierra sola. */
  onEnviar: () => void
  onCerrar: () => void
  children: ReactNode
}

/** Ventana modal con un formulario: los campos (hijos), «Cancelar» y el botón de envío. */
export function FormularioModal({ titulo, envio, onEnviar, onCerrar, children }: Props) {
  return (
    <Modal titulo={titulo} onCerrar={onCerrar}>
      <form
        className="modal__formulario"
        onSubmit={(e) => {
          e.preventDefault()
          onEnviar()
          onCerrar()
        }}
      >
        {children}
        <div className="modal__acciones">
          <button type="button" className="modal__boton" onClick={onCerrar}>
            Cancelar
          </button>
          <button type="submit">{envio}</button>
        </div>
      </form>
    </Modal>
  )
}
