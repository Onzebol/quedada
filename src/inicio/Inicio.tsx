import { Pencil, Plus } from 'lucide-react'
import { ConIcono } from '../ui/ConIcono'
import { FormularioModal } from '../ui/FormularioModal'
import { useState, type ReactNode } from 'react'
import { EliminarQuedada } from '../compra/EliminarQuedada'
import { ordenarPorNombre } from '../dominio/asistentes'
import type { Id, Quedada } from '../dominio/tipos'
import './inicio.css'

interface Props {
  quedadas: Quedada[]
  alElegir: (id: Id) => void
  alCrear: (nombre: string) => void
  /** Borra la quedada; debe rechazar si no se pudo. */
  alEliminar: (id: Id) => Promise<void>
  /** Cambia el nombre de la quedada. */
  alRenombrar: (id: Id, nombre: string) => void
  /** Si la cuenta puede borrar esa quedada (las compartidas por otra persona no). Por defecto, todas. */
  puedeEliminar?: (id: Id) => boolean
  children?: ReactNode
}

/** Ventana modal con el nombre de una quedada: sirve para añadir una (vacía) y para editar una. */
function NombreQuedada({ titulo, envio, inicial, onGuardar, onCerrar }: {
  titulo: string
  envio: string
  inicial: string
  onGuardar: (nombre: string) => void
  onCerrar: () => void
}) {
  const [nombre, setNombre] = useState(inicial)
  return (
    <FormularioModal
      titulo={titulo}
      envio={envio}
      onEnviar={() => {
        const limpio = nombre.trim()
        if (limpio !== '') onGuardar(limpio)
      }}
      onCerrar={onCerrar}
    >
      <label>
        Nombre
        <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} data-autofocus />
      </label>
    </FormularioModal>
  )
}

/** Página inicial: elegir, añadir, editar o eliminar quedadas (añadir y editar, en ventanas modales). */
export function Inicio({ quedadas, alElegir, alCrear, alEliminar, alRenombrar, puedeEliminar, children }: Props) {
  const [anadiendo, setAnadiendo] = useState(false)
  const [editando, setEditando] = useState<Quedada | null>(null)

  return (
    <section className="inicio" aria-label="Tus quedadas">
      <div className="inicio__cabecera">
        <h2>Tus quedadas</h2>
        <button type="button" onClick={() => setAnadiendo(true)}>
          <ConIcono icono={Plus}>Añadir quedada</ConIcono>
        </button>
      </div>
      {quedadas.length === 0 ? (
        <p>Todavía no tienes ninguna quedada.</p>
      ) : (
        <ul className="inicio__lista" aria-label="Quedadas">
          {ordenarPorNombre(quedadas, (q) => q.nombre).map((q) => (
            <li key={q.id}>
              <button type="button" className="inicio__abrir" onClick={() => alElegir(q.id)}>
                {q.nombre}
              </button>
              <button type="button" aria-label={`Editar ${q.nombre}`} onClick={() => setEditando(q)}>
                <ConIcono icono={Pencil}>Editar</ConIcono>
              </button>
              {(puedeEliminar?.(q.id) ?? true) && <EliminarQuedada nombre={q.nombre} onEliminar={() => alEliminar(q.id)} />}
            </li>
          ))}
        </ul>
      )}
      {children}
      {anadiendo && (
        <NombreQuedada titulo="Nueva quedada" envio="Añadir" inicial="" onGuardar={alCrear} onCerrar={() => setAnadiendo(false)} />
      )}
      {editando && (
        <NombreQuedada
          titulo="Editar quedada"
          envio="Guardar"
          inicial={editando.nombre}
          onGuardar={(n) => alRenombrar(editando.id, n)}
          onCerrar={() => setEditando(null)}
        />
      )}
    </section>
  )
}
