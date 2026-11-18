import { useState } from 'react'
import type { CambiosProducto } from '../dominio/operaciones'
import { filtrarImporte, parsearCantidad, parsearEuros } from '../dominio/numeros'
import { FormularioModal } from '../ui/FormularioModal'
import type { ValoresProducto } from './productoVacio'

interface Props {
  titulo: string
  envio: string
  inicial: ValoresProducto
  onGuardar: (cambios: CambiosProducto) => void
  onCerrar: () => void
}

const aTexto = (n: number | null) => (n === null ? '' : String(n).replace('.', ','))

/** Ventana con los datos de un producto: la misma para añadir uno y para editarlo. */
export function FormularioProducto({ titulo, envio, inicial, onGuardar, onCerrar }: Props) {
  const [nombre, setNombre] = useState(inicial.nombre)
  const [cantidad, setCantidad] = useState(aTexto(inicial.cantidad))
  const [unidad, setUnidad] = useState(inicial.unidad)
  const [precio, setPrecio] = useState(aTexto(inicial.precioUnidad))
  const [observaciones, setObservaciones] = useState(inicial.observaciones)

  return (
    <FormularioModal
      titulo={titulo}
      envio={envio}
      onCerrar={onCerrar}
      onEnviar={() =>
        onGuardar({
          nombre,
          cantidad: parsearCantidad(cantidad),
          unidad: unidad.trim(),
          precioUnidad: parsearEuros(precio),
          observaciones: observaciones.trim(),
        })
      }
    >
      <label>
        Nombre
        <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </label>
      <label>
        Cantidad
        <input type="text" inputMode="decimal" value={cantidad} onChange={(e) => setCantidad(filtrarImporte(e.target.value, false))} />
      </label>
      <label>
        Unidad
        <input type="text" value={unidad} onChange={(e) => setUnidad(e.target.value)} />
      </label>
      <label>
        Precio por unidad (€)
        <input type="text" inputMode="decimal" value={precio} onChange={(e) => setPrecio(filtrarImporte(e.target.value))} />
      </label>
      <label>
        Observaciones
        <input type="text" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
      </label>
    </FormularioModal>
  )
}
