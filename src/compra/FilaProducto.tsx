import { useState } from 'react'
import type { CambiosProducto } from '../dominio/operaciones'
import { formatearCantidad, formatearEuros, parsearCantidad, parsearEuros } from '../dominio/numeros'
import { totalLinea } from '../dominio/totales'
import type { Id, Participante, Producto } from '../dominio/tipos'

interface Props {
  producto: Producto
  participantes: Participante[]
  onCambiar: (id: Id, cambios: CambiosProducto) => void
  onBorrar: (id: Id) => void
}

export function FilaProducto({ producto, participantes, onCambiar, onBorrar }: Props) {
  const [editando, setEditando] = useState(false)

  if (editando) {
    return (
      <li className="fila fila--edicion">
        <FormularioEdicion
          producto={producto}
          onGuardar={(cambios) => {
            onCambiar(producto.id, cambios)
            setEditando(false)
          }}
          onCancelar={() => setEditando(false)}
        />
      </li>
    )
  }

  const cantidad = formatearCantidad(producto.cantidad, producto.unidad)
  return (
    <li className={producto.comprado ? 'fila fila--comprada' : 'fila'}>
      <label className="fila__nombre">
        <input
          type="checkbox"
          checked={producto.comprado}
          onChange={(e) => onCambiar(producto.id, { comprado: e.target.checked })}
        />
        <span>{producto.nombre}</span>
      </label>
      {cantidad !== '' && <span className="fila__cantidad">{cantidad}</span>}
      {producto.precioUnidad !== null && <span className="fila__total">{formatearEuros(totalLinea(producto))}</span>}
      <select
        aria-label={`Comprador de ${producto.nombre}`}
        className={producto.compradorId === null ? 'fila__comprador fila__comprador--vacio' : 'fila__comprador'}
        value={producto.compradorId ?? ''}
        onChange={(e) => onCambiar(producto.id, { compradorId: e.target.value === '' ? null : e.target.value })}
      >
        <option value="">Sin asignar</option>
        {participantes.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nombre}
          </option>
        ))}
      </select>
      <span className="fila__acciones">
        <button type="button" onClick={() => setEditando(true)} aria-label={`Editar ${producto.nombre}`}>
          Editar
        </button>
        <button type="button" onClick={() => onBorrar(producto.id)} aria-label={`Borrar ${producto.nombre}`}>
          Borrar
        </button>
      </span>
      {producto.observaciones !== '' && <p className="fila__observaciones">{producto.observaciones}</p>}
    </li>
  )
}

function FormularioEdicion({
  producto,
  onGuardar,
  onCancelar,
}: {
  producto: Producto
  onGuardar: (cambios: CambiosProducto) => void
  onCancelar: () => void
}) {
  const [nombre, setNombre] = useState(producto.nombre)
  const [cantidad, setCantidad] = useState(producto.cantidad === null ? '' : String(producto.cantidad).replace('.', ','))
  const [unidad, setUnidad] = useState(producto.unidad)
  const [precio, setPrecio] = useState(producto.precioUnidad === null ? '' : String(producto.precioUnidad).replace('.', ','))
  const [descuento, setDescuento] = useState(producto.descuento === 0 ? '' : String(producto.descuento).replace('.', ','))
  const [observaciones, setObservaciones] = useState(producto.observaciones)

  return (
    <form
      className="edicion"
      aria-label={`Editar ${producto.nombre}`}
      onSubmit={(e) => {
        e.preventDefault()
        onGuardar({
          nombre,
          cantidad: parsearCantidad(cantidad),
          unidad: unidad.trim(),
          precioUnidad: parsearEuros(precio),
          descuento: parsearEuros(descuento) ?? 0,
          observaciones: observaciones.trim(),
        })
      }}
    >
      <label>
        Nombre
        <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </label>
      <label>
        Cantidad
        <input type="text" inputMode="decimal" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
      </label>
      <label>
        Unidad
        <input type="text" value={unidad} onChange={(e) => setUnidad(e.target.value)} />
      </label>
      <label>
        Precio por unidad (€)
        <input type="text" inputMode="decimal" value={precio} onChange={(e) => setPrecio(e.target.value)} />
      </label>
      <label>
        Descuento (€)
        <input type="text" inputMode="decimal" value={descuento} onChange={(e) => setDescuento(e.target.value)} />
      </label>
      <label>
        Observaciones
        <input type="text" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
      </label>
      <span className="fila__acciones">
        <button type="submit">Guardar</button>
        <button type="button" onClick={onCancelar}>
          Cancelar
        </button>
      </span>
    </form>
  )
}
