import { Pencil, Plus, Users } from 'lucide-react'
import { useContext, useState } from 'react'
import { MisCosas, marcaMio } from '../ui/MisCosas'
import { ordenarPorNombre } from '../dominio/asistentes'
import { filtrarImporte, formatearEuros, parsearEuros } from '../dominio/numeros'
import { anadirPago, borrarPago, editarPago, marcarPagado, pendienteDeLaCasa, repartirEntreFamilias, totalPagado } from '../dominio/pagos'
import type { Asistente, Id, Pago, Quedada } from '../dominio/tipos'
import type { Imagenes } from '../tiques/almacenImagenes'
import { BotonBorrar } from '../ui/BotonBorrar'
import { ConIcono } from '../ui/ConIcono'
import { FormularioModal } from '../ui/FormularioModal'
import { Gastos } from './Gastos'
import './casa.css'

interface Props {
  quedada: Quedada
  aplicar: (cambio: (q: Quedada) => Quedada) => void
  crearId: () => Id
  imagenes?: Imagenes
}

/** Céntimos como texto editable en euros, con coma decimal: «200,00». */
const aTexto = (centimos: number) => (centimos / 100).toFixed(2).replace('.', ',')
/** Euros escritos a céntimos enteros; `NaN` si no es un importe válido (el dominio lo descarta). */
const aCentimos = (texto: string) => {
  const euros = parsearEuros(texto)
  return euros === null ? Number.NaN : Math.round(euros * 100)
}

/** Pestaña «Pagos»: lo que ha pagado cada familia de la casa (reserva, resto…) y lo que falta. */
export function Pagos({ quedada, aplicar, crearId, imagenes }: Props) {
  const { precio } = quedada.casa
  const familias = ordenarPorNombre(quedada.asistentes, (a) => a.familia)
  const pendiente = pendienteDeLaCasa(quedada)
  const nombre = (id: Id) => quedada.asistentes.find((a) => a.id === id)?.familia ?? id
  const [ventana, setVentana] = useState<'anadir' | 'repartir' | null>(null)
  const [editando, setEditando] = useState<Pago | null>(null)
  const mios = useContext(MisCosas)

  return (
    <>
      <section className="casa" aria-label="Pago de la casa">
        <h2>Pago de la casa</h2>
        {precio === null && (
          <p className="casa__nota">Todavía no hay precio de la casa: puedes ponerlo en la pestaña «La casa».</p>
        )}
        <dl className="pagos__resumen">
          {precio !== null && (
            <div>
              <dt>Precio</dt>
              <dd>{formatearEuros(precio)}</dd>
            </div>
          )}
          <div>
            <dt>Pagado</dt>
            <dd>{formatearEuros(totalPagado(quedada))}</dd>
          </div>
          {pendiente !== null && (
            <div>
              <dt>Falta</dt>
              <dd>{formatearEuros(pendiente)}</dd>
            </div>
          )}
        </dl>

        {familias.length === 0 ? (
          <p className="casa__nota">Añade primero las familias en la pestaña «La casa» para poder registrar sus pagos.</p>
        ) : (
          <div className="pagos__acciones">
            <button type="button" onClick={() => setVentana('anadir')}>
              <ConIcono icono={Plus}>Añadir pago</ConIcono>
            </button>
            <button type="button" onClick={() => setVentana('repartir')}>
              <ConIcono icono={Users}>Repartir entre familias</ConIcono>
            </button>
          </div>
        )}

        {quedada.pagos.length > 0 && (
          <ul className="pagos__lista" aria-label="Pagos de la casa">
            {quedada.pagos.map((p) => {
              const descripcion = `${p.concepto === '' ? 'Pago' : p.concepto} de ${nombre(p.familiaId)}`
              return (
                <li key={p.id} className="pago pago--con-pagado" {...marcaMio(mios, p.familiaId)}>
                  <span className="pago__quien">
                    <strong>{nombre(p.familiaId)}</strong>
                    {p.concepto !== '' && <span className="pago__concepto">{p.concepto}</span>}
                  </span>
                  <span className="pago__importe">{formatearEuros(p.importe)}</span>
                  <span className="pago__segunda">
                  <label className="pago__pagado">
                    <input
                      type="checkbox"
                      checked={p.pagado === true}
                      aria-label={`Pagado: ${descripcion}`}
                      onChange={(e) => aplicar((q) => marcarPagado(q, p.id, e.target.checked))}
                    />
                    Pagado
                  </label>
                  <span className="pago__acciones">
                    <button type="button" aria-label={`Editar ${descripcion}`} onClick={() => setEditando(p)}>
                      <ConIcono icono={Pencil}>Editar</ConIcono>
                    </button>
                    <BotonBorrar
                      texto="Borrar"
                      etiqueta={`Borrar ${descripcion}`}
                      titulo={`¿Borrar el pago de ${formatearEuros(p.importe)}?`}
                      mensaje={`Se quitará el pago de ${nombre(p.familiaId)}. No se puede deshacer.`}
                      onConfirmar={() => aplicar((q) => borrarPago(q, p.id))}
                    />
                  </span>
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <Gastos quedada={quedada} aplicar={aplicar} crearId={crearId} imagenes={imagenes} />

      {ventana === 'anadir' && (
        <FormularioPago
          titulo="Añadir pago"
          envio="Añadir"
          familias={familias}
          inicial={{ familiaId: familias[0].id, importe: '', concepto: '' }}
          onEnviar={(v) => aplicar((q) => anadirPago(q, { id: crearId(), familiaId: v.familiaId, importe: aCentimos(v.importe), concepto: v.concepto }))}
          onCerrar={() => setVentana(null)}
        />
      )}
      {ventana === 'repartir' && (
        <FormularioReparto
          inicial={pendiente !== null && pendiente > 0 ? aTexto(pendiente) : ''}
          onEnviar={(total, concepto) => aplicar((q) => repartirEntreFamilias(q, { total, concepto }, crearId))}
          onCerrar={() => setVentana(null)}
        />
      )}
      {editando && (
        <FormularioPago
          titulo="Editar pago"
          envio="Guardar"
          familias={familias}
          inicial={{ familiaId: editando.familiaId, importe: aTexto(editando.importe), concepto: editando.concepto }}
          onEnviar={(v) => aplicar((q) => editarPago(q, editando.id, { familiaId: v.familiaId, importe: aCentimos(v.importe), concepto: v.concepto }))}
          onCerrar={() => setEditando(null)}
        />
      )}
    </>
  )
}

interface ValoresPago {
  familiaId: Id
  importe: string
  concepto: string
}

interface PropsFormulario {
  titulo: string
  envio: string
  familias: Asistente[]
  inicial: ValoresPago
  onEnviar: (valores: ValoresPago) => void
  onCerrar: () => void
}

function FormularioPago({ titulo, envio, familias, inicial, onEnviar, onCerrar }: PropsFormulario) {
  const [valores, setValores] = useState(inicial)
  return (
    <FormularioModal titulo={titulo} envio={envio} onEnviar={() => onEnviar(valores)} onCerrar={onCerrar}>
      <label>
        Familia
        <select value={valores.familiaId} onChange={(e) => setValores({ ...valores, familiaId: e.target.value })}>
          {familias.map((a) => (
            <option key={a.id} value={a.id}>
              {a.familia}
            </option>
          ))}
        </select>
      </label>
      <label>
        Importe (€)
        <input type="text" inputMode="decimal" required value={valores.importe} onChange={(e) => setValores({ ...valores, importe: filtrarImporte(e.target.value) })} />
      </label>
      <label>
        Concepto
        <input type="text" placeholder="Reserva, resto…" value={valores.concepto} onChange={(e) => setValores({ ...valores, concepto: e.target.value })} />
      </label>
    </FormularioModal>
  )
}

function FormularioReparto({
  inicial,
  onEnviar,
  onCerrar,
}: {
  inicial: string
  onEnviar: (total: number, concepto: string) => void
  onCerrar: () => void
}) {
  const [importe, setImporte] = useState(inicial)
  const [concepto, setConcepto] = useState('')
  return (
    <FormularioModal titulo="Repartir entre familias" envio="Repartir" onEnviar={() => onEnviar(aCentimos(importe), concepto)} onCerrar={onCerrar}>
      <p className="casa__ayuda">Crea un pago por familia, proporcional a su número de personas.</p>
      <label>
        Importe total (€)
        <input type="text" inputMode="decimal" required value={importe} onChange={(e) => setImporte(filtrarImporte(e.target.value))} />
      </label>
      <label>
        Concepto
        <input type="text" placeholder="Reserva, resto…" value={concepto} onChange={(e) => setConcepto(e.target.value)} />
      </label>
    </FormularioModal>
  )
}
