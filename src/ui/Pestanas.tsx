import { useId, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import './pestanas.css'

export interface Pestana {
  id: string
  titulo: string
  contenido: ReactNode
}

interface Props {
  etiqueta: string
  pestanas: Pestana[]
  /** Pestaña abierta al empezar (por defecto, la primera). */
  inicial?: string
}

/** Pestañas accesibles (patrón WAI-ARIA): flechas, Inicio y Fin; solo se monta el panel activo. */
export function Pestanas({ etiqueta, pestanas, inicial }: Props) {
  const base = useId()
  const [activa, setActiva] = useState(inicial ?? pestanas[0].id)
  const botones = useRef<Record<string, HTMLButtonElement | null>>({})

  const ir = (indice: number) => {
    const destino = pestanas[(indice + pestanas.length) % pestanas.length]
    setActiva(destino.id)
    botones.current[destino.id]?.focus()
  }

  const alPulsar = (e: KeyboardEvent, indice: number) => {
    const destino =
      e.key === 'ArrowRight' ? indice + 1 : e.key === 'ArrowLeft' ? indice - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? pestanas.length - 1 : null
    if (destino === null) return
    e.preventDefault()
    ir(destino)
  }

  const actual = pestanas.find((p) => p.id === activa) ?? pestanas[0]

  return (
    <div className="pestanas">
      <div role="tablist" aria-label={etiqueta} className="pestanas__lista">
        {pestanas.map((p, i) => (
          <button
            key={p.id}
            ref={(el) => {
              botones.current[p.id] = el
            }}
            type="button"
            role="tab"
            id={`${base}-tab-${p.id}`}
            aria-selected={p.id === actual.id}
            aria-controls={`${base}-panel-${p.id}`}
            tabIndex={p.id === actual.id ? 0 : -1}
            className="pestanas__tab"
            onClick={() => setActiva(p.id)}
            onKeyDown={(e) => alPulsar(e, i)}
          >
            {p.titulo}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`${base}-panel-${actual.id}`}
        aria-labelledby={`${base}-tab-${actual.id}`}
        className="pestanas__panel"
      >
        {actual.contenido}
      </div>
    </div>
  )
}
