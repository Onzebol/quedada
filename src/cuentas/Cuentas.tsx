import { ChevronDown } from 'lucide-react'
import { useId, useState } from 'react'
import { compradores } from '../dominio/compradores'
import { liquidacion } from '../dominio/liquidacion'
import { formatearEuros } from '../dominio/numeros'
import { resumenPorFamilia, type GrupoResumen, type LineaResumen } from '../dominio/resumen'
import type { Quedada } from '../dominio/tipos'
import './cuentas.css'

interface Props {
  quedada: Quedada
}

/** Saldo con su etiqueta: «Le deben» si es positivo, «Debe» si es negativo, «Al día» si es 0. */
function Saldo({ balance }: { balance: number }) {
  if (balance === 0) return <p className="cuentas__saldo">Al día</p>
  return (
    <div className={`cuentas__saldo ${balance > 0 ? 'cuentas__saldo--favor' : 'cuentas__saldo--contra'}`}>
      <dt>{balance > 0 ? 'Le deben' : 'Debe'}</dt>
      <dd>{formatearEuros(Math.abs(balance))}</dd>
    </div>
  )
}

function FichaGrupo({ grupo }: { grupo: GrupoResumen }) {
  const [abierta, setAbierta] = useState(false)
  const idDetalle = useId()
  const desplegable = grupo.personas.length > 0
  return (
    <li className="cuentas__ficha">
      <h4>
        {desplegable ? (
          <button type="button" aria-expanded={abierta} aria-controls={abierta ? idDetalle : undefined} onClick={() => setAbierta((v) => !v)}>
            {grupo.nombre}
            <ChevronDown className="icono cuentas__flecha" size={18} aria-hidden="true" />
          </button>
        ) : (
          grupo.nombre
        )}
      </h4>
      <dl className="cuentas__datos">
        <div>
          <dt>Ha pagado</dt>
          <dd>{formatearEuros(grupo.pagado)}</dd>
        </div>
        <div>
          <dt>Le toca</dt>
          <dd>{formatearEuros(grupo.casa + grupo.gastos)}</dd>
        </div>
        <Saldo balance={grupo.balance} />
      </dl>
      {abierta && (
        <ul id={idDetalle} className="cuentas__personas" aria-label={`Personas de ${grupo.nombre}`}>
          {grupo.personas.map((p) => (
            <FilaPersona key={p.id} persona={p} />
          ))}
        </ul>
      )}
    </li>
  )
}

function FilaPersona({ persona: p }: { persona: LineaResumen }) {
  return (
    <li>
      <span className="cuentas__nombre">{p.nombre}</span>
      <dl className="cuentas__datos">
        <div>
          <dt>Ha pagado</dt>
          <dd>{formatearEuros(p.pagado)}</dd>
        </div>
        <div>
          <dt>Casa</dt>
          <dd>{formatearEuros(p.casa)}</dd>
        </div>
        <div>
          <dt>Gastos</dt>
          <dd>{formatearEuros(p.gastos)}</dd>
        </div>
        <Saldo balance={p.balance} />
      </dl>
    </li>
  )
}

/** Resumen de las cuentas, de solo lectura: lo que paga cada uno de casa y gastos se ajusta en «La casa». */
export function Cuentas({ quedada }: Props) {
  const { transferencias } = liquidacion(quedada)
  const { grupos, totales } = resumenPorFamilia(quedada)
  const todos = compradores(quedada, { conNinos: true })
  // Un niño no paga nada, pero le puede tocar su parte: su nombre tiene que salir en «Quién paga a quién».
  const nombre = (id: string) => todos.find((c) => c.id === id)?.nombre ?? quedada.asistentes.find((a) => a.id === id)?.familia ?? id

  return (
    <section className="cuentas" aria-labelledby="titulo-cuentas">
      <h2 id="titulo-cuentas">Cuentas</h2>

      <ul className="cuentas__totales" aria-label="Totales">
        <li>
          <span>Total pagado</span>
          <strong>{formatearEuros(totales.pagado)}</strong>
        </li>
        <li>
          <span>Casa pagada</span>
          <strong>{formatearEuros(totales.casaPagada)}</strong>
        </li>
        <li>
          <span>Gastos</span>
          <strong>{formatearEuros(totales.gastos)}</strong>
        </li>
      </ul>

      <h3>Por familia</h3>
      <ul className="cuentas__grupos">
        {grupos.map((g) => (
          <FichaGrupo key={g.id} grupo={g} />
        ))}
      </ul>

      <h3>Quién paga a quién</h3>
      {transferencias.length === 0 ? (
        <p>No hay nada que liquidar</p>
      ) : (
        <ul className="cuentas__transferencias" aria-label="Quién paga a quién">
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
