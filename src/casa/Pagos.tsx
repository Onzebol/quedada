import { editarCasa } from '../dominio/casa'
import { formatearEuros } from '../dominio/numeros'
import type { Quedada } from '../dominio/tipos'
import './casa.css'
import { ordenarPorNombre } from '../dominio/asistentes'

interface Props {
  quedada: Quedada
  aplicar: (cambio: (q: Quedada) => Quedada) => void
}

/** Pestaña «Pagos»: quién ha pagado la casa y, más adelante, los tiques de la compra de cada uno. */
export function Pagos({ quedada, aplicar }: Props) {
  const { precio, pagadorId } = quedada.casa
  return (
    <>
      <section className="casa" aria-label="Pago de la casa">
        <h2>Pago de la casa</h2>
        {precio === null ? (
          <p className="casa__nota">Todavía no hay precio de la casa: ponlo en la pestaña «La casa».</p>
        ) : (
          <>
            <p>
              <strong>Precio:</strong> {formatearEuros(precio)}
            </p>
            <label>
              Quién pagó la casa
              <select
                value={pagadorId ?? ''}
                onChange={(e) => aplicar((q) => editarCasa(q, { pagadorId: e.target.value === '' ? null : e.target.value }))}
              >
                <option value="">Nadie todavía</option>
                {ordenarPorNombre(quedada.participantes, (p) => p.nombre).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </label>
            {pagadorId === null && (
              <p className="casa__nota">Mientras nadie figure como pagador, el precio no entra en las cuentas.</p>
            )}
          </>
        )}
      </section>
      <p role="note">Aquí irán también los tiques de la compra de cada uno. Todavía no se pueden registrar.</p>
    </>
  )
}
