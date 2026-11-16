import { useState } from 'react'
import type { CambiosProducto } from '../dominio/operaciones'
import type { Grupo, Id, Participante, Producto } from '../dominio/tipos'
import { BotonBorrar } from '../ui/BotonBorrar'
import { FilaProducto } from './FilaProducto'

interface Props {
  grupo: Grupo
  /** Productos del grupo que se muestran (ya filtrados). */
  productos: Producto[]
  /** Cuántos productos tiene el grupo en total, sin filtrar. */
  total: number
  participantes: Participante[]
  onAnadirProducto: (grupoId: Id, nombre: string) => void
  onCambiarProducto: (id: Id, cambios: CambiosProducto) => void
  onBorrarProducto: (id: Id) => void
  onRenombrar: (grupoId: Id, nombre: string) => void
  onBorrar: (grupoId: Id) => void
  onCambiarReparto: (grupoId: Id, reparto: 'casa' | 'comida') => void
}

export function GrupoCompra({
  grupo,
  productos,
  total,
  participantes,
  onAnadirProducto,
  onCambiarProducto,
  onBorrarProducto,
  onRenombrar,
  onBorrar,
  onCambiarReparto,
}: Props) {
  const [nuevo, setNuevo] = useState('')
  const [renombrando, setRenombrando] = useState(false)
  const [nombre, setNombre] = useState(grupo.nombre)

  return (
    <section className="grupo" aria-labelledby={`grupo-${grupo.id}`}>
      {renombrando ? (
        <form
          className="grupo__cabecera"
          onSubmit={(e) => {
            e.preventDefault()
            onRenombrar(grupo.id, nombre)
            setRenombrando(false)
          }}
        >
          <input
            type="text"
            aria-label={`Nuevo nombre de ${grupo.nombre}`}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
          <button type="submit">Guardar nombre</button>
          <button type="button" onClick={() => setRenombrando(false)}>
            Cancelar
          </button>
        </form>
      ) : (
        <div className="grupo__cabecera">
          <h3 id={`grupo-${grupo.id}`}>{grupo.nombre}</h3>
          <button
            type="button"
            aria-label={`Renombrar ${grupo.nombre}`}
            onClick={() => {
              setNombre(grupo.nombre)
              setRenombrando(true)
            }}
          >
            Renombrar
          </button>
          <label className="grupo__casa">
            <input
              type="checkbox"
              role="switch"
              aria-label={`Gasto de la casa: ${grupo.nombre}`}
              checked={grupo.reparto === 'casa'}
              onChange={(e) => onCambiarReparto(grupo.id, e.target.checked ? 'casa' : 'comida')}
            />
            Gasto de la casa
          </label>
          <BotonBorrar
            texto="Borrar"
            etiqueta={`Borrar comida ${grupo.nombre}`}
            titulo={`¿Borrar «${grupo.nombre}»?`}
            mensaje={`Se borrará la comida y su ${total} ${total === 1 ? 'producto' : 'productos'}. No se puede deshacer.`}
            onConfirmar={() => onBorrar(grupo.id)}
          />
        </div>
      )}

      <ul className="grupo__lista">
        {productos.map((p) => (
          <FilaProducto
            key={p.id}
            producto={p}
            participantes={participantes}
            onCambiar={onCambiarProducto}
            onBorrar={onBorrarProducto}
          />
        ))}
      </ul>

      <form
        className="grupo__anadir"
        aria-label={`Añadir producto a ${grupo.nombre}`}
        onSubmit={(e) => {
          e.preventDefault()
          onAnadirProducto(grupo.id, nuevo)
          setNuevo('')
        }}
      >
        <input type="text" aria-label="Producto" value={nuevo} onChange={(e) => setNuevo(e.target.value)} />
        <button type="submit">Añadir</button>
      </form>
    </section>
  )
}
