import { Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { compradores } from '../dominio/compradores'
import { anadirGasto, borrarGasto, editarGasto } from '../dominio/gastos'
import { formatearEuros, parsearEuros } from '../dominio/numeros'
import type { Gasto, Id, Quedada } from '../dominio/tipos'
import { BotonBorrar } from '../ui/BotonBorrar'
import { ConIcono } from '../ui/ConIcono'
import { FormularioModal } from '../ui/FormularioModal'
import './casa.css'

interface Props {
  quedada: Quedada
  aplicar: (cambio: (q: Quedada) => Quedada) => void
  crearId: () => Id
}

const aTexto = (centimos: number) => String(centimos / 100).replace('.', ',')

/** Lo que ha puesto cada uno de su bolsillo, esté o no en la lista de la compra: de aquí salen las cuentas (con el alquiler). */
export function Gastos({ quedada, aplicar, crearId }: Props) {
  const quienes = compradores(quedada)
  const nombre = (id: Id) => quienes.find((c) => c.id === id)?.nombre ?? id
  const [ventana, setVentana] = useState<'nuevo' | Gasto | null>(null)
  const total = quedada.gastos.reduce((suma, g) => suma + g.importe, 0)

  return (
    <>
      <section className="casa" aria-label="Gastos pagados">
        <div className="gastos__cabecera">
          <h2>Gastos</h2>
          {quienes.length > 0 && (
            <button type="button" onClick={() => setVentana('nuevo')}>
              <ConIcono icono={Plus}>Añadir gasto</ConIcono>
            </button>
          )}
        </div>
        <p className="casa__nota">
          Apunta lo que ha pagado cada uno, esté o no en la lista de la compra: las cuentas se hacen con estos gastos y con los
          pagos de la casa. Los precios de la lista de la compra son orientativos y no cuentan.
        </p>
        {quienes.length === 0 && <p className="casa__nota">Añade primero las personas en la pestaña «La casa».</p>}
        {quedada.gastos.length > 0 && (
          <>
            <ul className="pagos__lista" aria-label="Gastos">
              {quedada.gastos.map((g) => (
                <li key={g.id} className="pago">
                  <span className="pago__quien">
                    <strong>{g.concepto}</strong>
                    <span className="pago__concepto">{nombre(g.pagadorId)}</span>
                  </span>
                  <span className="pago__importe">{formatearEuros(g.importe)}</span>
                  <span className="pago__acciones">
                    <button type="button" aria-label={`Editar gasto ${g.concepto}`} onClick={() => setVentana(g)}>
                      <ConIcono icono={Pencil}>Editar</ConIcono>
                    </button>
                    <BotonBorrar
                      texto="Borrar"
                      etiqueta={`Borrar gasto ${g.concepto}`}
                      titulo={`¿Borrar el gasto «${g.concepto}»?`}
                      mensaje="Dejará de contar en las cuentas. No se puede deshacer."
                      onConfirmar={() => aplicar((q) => borrarGasto(q, g.id))}
                    />
                  </span>
                </li>
              ))}
            </ul>
            <p>
              <strong>Total de gastos:</strong> {formatearEuros(total)}
            </p>
          </>
        )}
      </section>

      {ventana !== null && (
        <FormularioGasto
          quienes={quienes}
          inicial={ventana === 'nuevo' ? null : ventana}
          onCerrar={() => setVentana(null)}
          onGuardar={(valores) =>
            aplicar((q) =>
              ventana === 'nuevo' ? anadirGasto(q, { id: crearId(), ...valores }) : editarGasto(q, ventana.id, valores),
            )
          }
        />
      )}
    </>
  )
}

interface PropsFormulario {
  quienes: { id: Id; nombre: string }[]
  inicial: Gasto | null
  onGuardar: (valores: { pagadorId: Id; concepto: string; importe: number }) => void
  onCerrar: () => void
}

function FormularioGasto({ quienes, inicial, onGuardar, onCerrar }: PropsFormulario) {
  const [pagadorId, setPagadorId] = useState(inicial?.pagadorId ?? quienes[0]?.id ?? '')
  const [concepto, setConcepto] = useState(inicial?.concepto ?? '')
  const [importe, setImporte] = useState(inicial ? aTexto(inicial.importe) : '')

  return (
    <FormularioModal
      titulo={inicial ? 'Editar gasto' : 'Añadir gasto'}
      envio={inicial ? 'Guardar' : 'Añadir'}
      onCerrar={onCerrar}
      onEnviar={() => {
        const euros = parsearEuros(importe)
        if (euros === null) return
        onGuardar({ pagadorId, concepto, importe: Math.round(euros * 100) })
      }}
    >
      <label>
        Quién pagó
        <select value={pagadorId} onChange={(e) => setPagadorId(e.target.value)}>
          {quienes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </label>
      <label>
        Concepto
        <input type="text" value={concepto} onChange={(e) => setConcepto(e.target.value)} />
      </label>
      <label>
        Importe (€)
        <input type="text" inputMode="decimal" value={importe} onChange={(e) => setImporte(e.target.value)} />
      </label>
    </FormularioModal>
  )
}
