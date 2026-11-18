import { partesDeLaCasa } from '../dominio/casa'
import { compradores } from '../dominio/compradores'
import { liquidacion } from '../dominio/liquidacion'
import { formatearEuros } from '../dominio/numeros'
import type { Quedada } from '../dominio/tipos'
import './cuentas.css'

interface Props {
  quedada: Quedada
}

/** Resumen de las cuentas, de solo lectura: lo que cada uno paga de casa y gastos se ajusta en «La casa». */
export function Cuentas({ quedada }: Props) {
  const { total, pagado, transferencias } = liquidacion(quedada)
  const casa = partesDeLaCasa(quedada)
  const quienes = compradores(quedada)
  // Un niño no paga nada, pero le puede tocar su parte: su nombre tiene que salir en «Quién paga a quién».
  const nombre = (id: string) => compradores(quedada, { conNinos: true }).find((c) => c.id === id)?.nombre ?? id

  return (
    <section className="cuentas" aria-labelledby="titulo-cuentas">
      <h2 id="titulo-cuentas">Cuentas</h2>
      <p>Total de la quedada: {formatearEuros(total)}</p>

      <ul className="cuentas__personas">
        {quienes.map((c) => (
          <li key={c.id}>
            <span>
              {c.nombre} ha pagado {formatearEuros(pagado[c.id] ?? 0)}
            </span>
          </li>
        ))}
      </ul>

      {quedada.casa.precio !== null && (
        <>
          <h4>Lo que paga cada uno de la casa</h4>
          <ul className="cuentas__personas" aria-label="Lo que paga cada uno de la casa">
            {quedada.participantes.map((p) => (
              <li key={p.id}>
                <span>
                  {p.nombre}: {formatearEuros(casa[p.id] ?? 0)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

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
