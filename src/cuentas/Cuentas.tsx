import { liquidacion } from '../dominio/liquidacion'
import { formatearEuros } from '../dominio/numeros'
import { editarParticipante } from '../dominio/operaciones'
import type { Quedada } from '../dominio/tipos'
import { CampoPorcentaje } from './CampoPorcentaje'
import './cuentas.css'

interface Props {
  quedada: Quedada
  aplicar: (cambio: (q: Quedada) => Quedada) => void
}

export function Cuentas({ quedada, aplicar }: Props) {
  const { total, pagado, transferencias } = liquidacion(quedada)
  const nombre = (id: string) => quedada.participantes.find((p) => p.id === id)?.nombre ?? id

  return (
    <section className="cuentas" aria-labelledby="titulo-cuentas">
      <h2 id="titulo-cuentas">Cuentas</h2>
      <p>Total de la quedada: {formatearEuros(total)}</p>

      <ul className="cuentas__personas">
        {quedada.participantes.map((p) => (
          <li key={p.id}>
            <span>
              {p.nombre} ha pagado {formatearEuros(pagado[p.id] ?? 0)}
            </span>
            <label>
              Porcentaje de comida de {p.nombre}
              <CampoPorcentaje
                valor={p.porcentajeComida ?? 100}
                onCambiar={(n) => aplicar((q) => editarParticipante(q, p.id, { porcentajeComida: n }))}
              />
            </label>
            <label>
              <input
                type="checkbox"
                role="switch"
                aria-label={`${p.nombre} paga la casa`}
                checked={p.pagaCasa !== false}
                onChange={(e) => aplicar((q) => editarParticipante(q, p.id, { pagaCasa: e.target.checked }))}
              />
              Paga la casa
            </label>
          </li>
        ))}
      </ul>

      <h4>Quién paga a quién</h4>
      {transferencias.length === 0 ? (
        <p>No hay nada que liquidar</p>
      ) : (
        <ul className="cuentas__transferencias">
          {transferencias.map((t) => (
            <li key={`${t.de}-${t.a}`}>
              {nombre(t.de)} paga {formatearEuros(t.importe)} a {nombre(t.a)}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
