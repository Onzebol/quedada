import { ChevronDown, Plus, Pencil } from 'lucide-react'
import { ConIcono } from '../ui/ConIcono'
import { useId, useState } from 'react'
import type { CambiosProducto } from '../dominio/operaciones'
import type { Comprador } from '../dominio/compradores'
import type { Grupo, Id, Producto } from '../dominio/tipos'
import { BotonBorrar } from '../ui/BotonBorrar'
import { FormularioModal } from '../ui/FormularioModal'
import { FilaProducto } from './FilaProducto'
import { FormularioProducto } from './FormularioProducto'
import { PRODUCTO_VACIO } from './productoVacio'

interface Props {
  grupo: Grupo
  /** Productos del grupo que se muestran (ya filtrados). */
  productos: Producto[]
  /** Cuántos productos tiene el grupo en total, sin filtrar. */
  total: number
  /** Abierta aunque no se haya desplegado (mientras hay un filtro activo). */
  forzarAbierta?: boolean
  /** Muestra el desplegable de asignar comprador en cada producto (no con un filtro por persona). */
  conComprador?: boolean
  /** Sin productos que mostrar con el filtro: no se pinta, pero conserva si estaba desplegada. */
  oculta?: boolean
  /** A quién se puede asignar la compra: participantes y familias sin personas. */
  compradores: Comprador[]
  onAnadirProducto: (grupoId: Id, valores: CambiosProducto) => void
  onCambiarProducto: (id: Id, cambios: CambiosProducto) => void
  onBorrarProducto: (id: Id) => void
  onRenombrar: (grupoId: Id, nombre: string) => void
  onBorrar: (grupoId: Id) => void
}

/** Sección de la compra: contraída por defecto (nombre y datos); sus acciones abren ventanas modales. */
export function GrupoCompra({
  grupo,
  productos,
  total,
  forzarAbierta = false,
  conComprador = true,
  oculta = false,
  compradores,
  onAnadirProducto,
  onCambiarProducto,
  onBorrarProducto,
  onRenombrar,
  onBorrar,
}: Props) {
  const [anadiendo, setAnadiendo] = useState(false)
  const [renombrando, setRenombrando] = useState(false)
  const [desplegada, setDesplegada] = useState(false)
  const idDetalle = useId()
  const abierta = desplegada || forzarAbierta
  const sinComprador = productos.filter((p) => p.compradorId === null).length
  const porComprar = productos.filter((p) => !p.comprado).length

  if (oculta) return null

  return (
    <section className="grupo" aria-labelledby={`grupo-${grupo.id}`}>
      <div className="grupo__cabecera">
        <div className="grupo__titulo">
          <h3 id={`grupo-${grupo.id}`}>
            <button
              type="button"
              className="grupo__alternar"
              aria-expanded={abierta}
              aria-controls={abierta ? idDetalle : undefined}
              onClick={() => setDesplegada((v) => !v)}
            >
              {grupo.nombre}
              <ChevronDown className="icono grupo__flecha" size={18} aria-hidden="true" />
            </button>
          </h3>
          <p className="grupo__datos">
            <span>
              {forzarAbierta ? `${productos.length} de ${total}` : total} {total === 1 ? 'producto' : 'productos'}
            </span>
            {porComprar > 0 && <span>{porComprar} por comprar</span>}
            {sinComprador > 0 && <span>{sinComprador} sin comprador</span>}
          </p>
        </div>
        <div className="grupo__acciones">
          <button type="button" aria-label={`Renombrar ${grupo.nombre}`} onClick={() => setRenombrando(true)}>
            <ConIcono icono={Pencil}>Renombrar</ConIcono>
          </button>
          <BotonBorrar
            texto="Borrar"
            etiqueta={`Borrar sección ${grupo.nombre}`}
            titulo={`¿Borrar «${grupo.nombre}»?`}
            mensaje={`Se borrará la sección y su ${total} ${total === 1 ? 'producto' : 'productos'}. No se puede deshacer.`}
            onConfirmar={() => onBorrar(grupo.id)}
          />
        </div>
      </div>

      {abierta && (
        <div id={idDetalle} className="grupo__detalle">
          <ul className="grupo__lista">
            {productos.map((p) => (
              <FilaProducto
                key={p.id}
                producto={p}
                compradores={compradores}
                conComprador={conComprador}
                onCambiar={onCambiarProducto}
                onBorrar={onBorrarProducto}
              />
            ))}
          </ul>
          <button
            type="button"
            className="grupo__anadir"
            aria-label={`Añadir algo para comprar a ${grupo.nombre}`}
            onClick={() => setAnadiendo(true)}
          >
            <ConIcono icono={Plus}>Añadir</ConIcono>
          </button>
        </div>
      )}

      {renombrando && (
        <Renombrar nombre={grupo.nombre} onGuardar={(n) => onRenombrar(grupo.id, n)} onCerrar={() => setRenombrando(false)} />
      )}
      {anadiendo && (
        <FormularioProducto
          titulo="Nuevo producto"
          envio="Añadir"
          inicial={PRODUCTO_VACIO}
          onGuardar={(valores) => onAnadirProducto(grupo.id, valores)}
          onCerrar={() => setAnadiendo(false)}
        />
      )}
    </section>
  )
}

function Renombrar({
  nombre,
  onGuardar,
  onCerrar,
}: {
  nombre: string
  onGuardar: (nombre: string) => void
  onCerrar: () => void
}) {
  const [valor, setValor] = useState(nombre)
  return (
    <FormularioModal titulo="Renombrar sección" envio="Guardar" onEnviar={() => onGuardar(valor)} onCerrar={onCerrar}>
      <label>
        Nombre
        <input type="text" value={valor} onChange={(e) => setValor(e.target.value)} />
      </label>
    </FormularioModal>
  )
}
