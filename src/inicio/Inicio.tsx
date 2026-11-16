import { useState, type ReactNode } from 'react'
import { EliminarQuedada } from '../compra/EliminarQuedada'
import type { Id, Quedada } from '../dominio/tipos'
import './inicio.css'

interface Props {
  quedadas: Quedada[]
  alElegir: (id: Id) => void
  alCrear: (nombre: string) => void
  /** Borra la quedada; debe rechazar si no se pudo. */
  alEliminar: (id: Id) => Promise<void>
  children?: ReactNode
}

/** Página inicial: elegir, crear o eliminar quedadas. */
export function Inicio({ quedadas, alElegir, alCrear, alEliminar, children }: Props) {
  const [nombre, setNombre] = useState('')

  function crear(e: React.FormEvent) {
    e.preventDefault()
    const limpio = nombre.trim()
    if (limpio === '') return
    alCrear(limpio)
    setNombre('')
  }

  return (
    <section className="inicio" aria-label="Tus quedadas">
      <h2>Tus quedadas</h2>
      {quedadas.length === 0 ? (
        <p>Todavía no tienes ninguna quedada.</p>
      ) : (
        <ul className="inicio__lista" aria-label="Quedadas">
          {quedadas.map((q) => (
            <li key={q.id}>
              <button type="button" className="inicio__abrir" onClick={() => alElegir(q.id)}>
                {q.nombre}
              </button>
              <EliminarQuedada quedadaId={q.id} nombre={q.nombre} onEliminar={() => alEliminar(q.id)} />
            </li>
          ))}
        </ul>
      )}
      <form className="inicio__nueva" onSubmit={crear}>
        <label>
          Nombre de la nueva quedada
          <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </label>
        <button type="submit">Crear quedada</button>
      </form>
      {children}
    </section>
  )
}
