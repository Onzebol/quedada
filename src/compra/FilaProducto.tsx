import { Pencil } from 'lucide-react'
import { ConIcono } from '../ui/ConIcono'
import { useState } from 'react'
import type { CambiosProducto } from '../dominio/operaciones'
import { formatearCantidad, formatearEuros } from '../dominio/numeros'
import { totalLinea } from '../dominio/totales'
import type { Comprador } from '../dominio/compradores'
import type { Id, Producto } from '../dominio/tipos'
import { BotonBorrar } from '../ui/BotonBorrar'
import { FormularioProducto } from './FormularioProducto'

interface Props {
  producto: Producto
  /** A quién se puede asignar la compra: participantes y familias sin personas. */
  compradores: Comprador[]
  /** Con un filtro por persona todos los productos son suyos y el desplegable sobra. */
  conComprador?: boolean
  /** Sin botones de editar ni borrar. */
  soloLectura?: boolean
  onCambiar: (id: Id, cambios: CambiosProducto) => void
  onBorrar: (id: Id) => void
}

export function FilaProducto({ producto, compradores, conComprador = true, soloLectura = false, onCambiar, onBorrar }: Props) {
  const [editando, setEditando] = useState(false)

  const cantidad = formatearCantidad(producto.cantidad, producto.unidad)
  const hayDatos = producto.precioUnidad !== null || producto.observaciones !== ''
  return (
    <li className={producto.comprado ? 'fila fila--comprada' : 'fila'}>
      <label className="fila__nombre">
        <input
          type="checkbox"
          aria-label={producto.nombre}
          checked={producto.comprado}
          onChange={(e) => onCambiar(producto.id, { comprado: e.target.checked })}
        />
        <span>
          {cantidad !== '' && <span className="fila__cantidad">{cantidad}</span>}
          {producto.nombre}
        </span>
      </label>
      {hayDatos && (
        <span className="fila__datos">
          {producto.precioUnidad !== null && <span className="fila__total">{formatearEuros(totalLinea(producto))}</span>}
          {producto.observaciones !== '' && <span className="fila__observaciones">{producto.observaciones}</span>}
        </span>
      )}
      <span className="fila__acciones">
        {conComprador && (
          <select
            aria-label={`Comprador de ${producto.nombre}`}
            className="fila__comprador"
            value={producto.compradorId ?? ''}
            onChange={(e) => onCambiar(producto.id, { compradorId: e.target.value === '' ? null : e.target.value })}
          >
            <option value="">Sin asignar</option>
            {compradores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        )}
        {!soloLectura && (
          <>
            <button type="button" onClick={() => setEditando(true)} aria-label={`Editar ${producto.nombre}`}>
              <ConIcono icono={Pencil}>Editar</ConIcono>
            </button>
            <BotonBorrar
              texto="Borrar"
              etiqueta={`Borrar ${producto.nombre}`}
              titulo={`¿Borrar «${producto.nombre}»?`}
              mensaje="Se quitará de la lista de la compra. No se puede deshacer."
              onConfirmar={() => onBorrar(producto.id)}
            />
          </>
        )}
      </span>
      {editando && (
        <FormularioProducto
          titulo="Editar producto"
          envio="Guardar"
          inicial={producto}
          onGuardar={(cambios) => onCambiar(producto.id, cambios)}
          onCerrar={() => setEditando(false)}
        />
      )}
    </li>
  )
}
