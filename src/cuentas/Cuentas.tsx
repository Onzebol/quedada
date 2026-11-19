import { Check, ChevronDown, Copy } from 'lucide-react'
import { useId, useState } from 'react'
import { formatearEuros } from '../dominio/numeros'
import { resumenPorFamilia, type GrupoResumen, type PersonaResumen } from '../dominio/resumen'
import type { Transferencia } from '../dominio/liquidacion'
import type { Quedada } from '../dominio/tipos'
import { useMio } from '../ui/MisCosas'
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
    <li className="cuentas__ficha" {...useMio(grupo.id)}>
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
          <dt>Casa pagada</dt>
          <dd>{formatearEuros(grupo.casaPagada)}</dd>
        </div>
        <div>
          <dt>Total pagado</dt>
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

function FilaPersona({ persona: p }: { persona: PersonaResumen }) {
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
      </dl>
    </li>
  )
}

/** Importe de una transferencia: al pulsarlo se copia el número («180,00») para pegarlo en la app del banco. */
function ImporteCopiable({ importe }: { importe: number }) {
  const [copiado, setCopiado] = useState(false)
  const texto = formatearEuros(importe)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto.replace(/[^\d,-]/g, ''))
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      setCopiado(false)
    }
  }

  return (
    <button type="button" className="cuentas__importe" aria-label={`Copiar ${texto}`} onClick={() => void copiar()}>
      {texto}
      {copiado ? <Check className="icono" size={14} aria-hidden="true" /> : <Copy className="icono" size={14} aria-hidden="true" />}
    </button>
  )
}

function FilaTransferencia({ t, nombre }: { t: Transferencia; nombre: (id: string) => string }) {
  return (
    <li {...useMio(t.de, t.a)}>
      <strong>{nombre(t.de)}</strong> paga <ImporteCopiable importe={t.importe} /> a <strong>{nombre(t.a)}</strong>
    </li>
  )
}

/** Resumen de las cuentas, de solo lectura: lo que paga cada uno de casa y gastos se ajusta en «La casa». */
export function Cuentas({ quedada }: Props) {
  const { grupos, totales, transferencias } = resumenPorFamilia(quedada)
  // Se paga entre familias (o personas sueltas), no entre las personas de cada una.
  const nombre = (id: string) => grupos.find((g) => g.id === id)?.nombre ?? id

  return (
    <section className="cuentas" aria-labelledby="titulo-cuentas">
      <h2 id="titulo-cuentas">Cuentas</h2>

      <ul className="cuentas__totales" aria-label="Totales">
        <li>
          <span>Total pagado</span>
          <strong>{formatearEuros(totales.pagado)}</strong>
        </li>
        <li>
          <span>Gastos</span>
          <strong>{formatearEuros(totales.gastos)}</strong>
        </li>
        <li>
          <span>Casa pagada</span>
          <strong>{formatearEuros(totales.casaPagada)}</strong>
        </li>
        {totales.casaFalta !== null && (
          <li className={totales.casaFalta > 0 ? 'cuentas__falta' : undefined}>
            <span>Falta de la casa</span>
            <strong>{formatearEuros(totales.casaFalta)}</strong>
          </li>
        )}
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
            <FilaTransferencia key={`${t.de}-${t.a}`} t={t} nombre={nombre} />
          ))}
        </ul>
      )}
    </section>
  )
}
