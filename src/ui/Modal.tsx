import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import './modal.css'

interface Props {
  titulo: string
  descripcion?: ReactNode
  /** Se llama al pulsar Esc o fuera de la ventana. Quien la usa decide si cierra de verdad. */
  onCerrar: () => void
  children: ReactNode
}

const ENFOCABLES =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Ventana modal con el estilo de la web (`modal.css`). Rol `dialog` y `aria-modal`, oscurece la
 * página, se cierra con Esc o pulsando fuera, mantiene el foco dentro (Tab y Mayús+Tab), lo lleva al
 * elemento con `data-autofocus` al abrir y lo devuelve a donde estaba al cerrar, y bloquea el scroll.
 */
export function Modal({ titulo, descripcion, onCerrar, children }: Props) {
  const idTitulo = useId()
  const idDescripcion = useId()
  const panel = useRef<HTMLDivElement>(null)
  const alCerrar = useRef(onCerrar)

  useEffect(() => {
    alCerrar.current = onCerrar
  })

  useEffect(() => {
    const previo = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const overflowPrevio = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const inicial = panel.current?.querySelector<HTMLElement>('[data-autofocus]') ?? panel.current?.querySelector<HTMLElement>(ENFOCABLES)
    ;(inicial ?? panel.current)?.focus()

    function alTeclear(e: globalThis.KeyboardEvent) {
      if (e.key !== 'Escape') return
      e.preventDefault()
      alCerrar.current()
    }
    document.addEventListener('keydown', alTeclear)

    return () => {
      document.removeEventListener('keydown', alTeclear)
      document.body.style.overflow = overflowPrevio
      if (previo !== null && previo.isConnected) previo.focus()
    }
  }, [])

  function mantenerFoco(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'Tab' || panel.current === null) return
    const elementos = [...panel.current.querySelectorAll<HTMLElement>(ENFOCABLES)]
    if (elementos.length === 0) {
      e.preventDefault()
      return
    }
    const primero = elementos[0]
    const ultimo = elementos[elementos.length - 1]
    const dentro = panel.current.contains(document.activeElement)
    if (e.shiftKey && (!dentro || document.activeElement === primero)) {
      e.preventDefault()
      ultimo.focus()
    } else if (!e.shiftKey && (!dentro || document.activeElement === ultimo)) {
      e.preventDefault()
      primero.focus()
    }
  }

  return createPortal(
    <div
      className="modal"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) alCerrar.current()
      }}
      onKeyDown={mantenerFoco}
    >
      <div
        ref={panel}
        className="modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        aria-describedby={descripcion === undefined ? undefined : idDescripcion}
        tabIndex={-1}
      >
        <h2 id={idTitulo} className="modal__titulo">
          {titulo}
        </h2>
        {descripcion !== undefined && (
          <p id={idDescripcion} className="modal__texto">
            {descripcion}
          </p>
        )}
        {children}
      </div>
    </div>,
    document.body,
  )
}
