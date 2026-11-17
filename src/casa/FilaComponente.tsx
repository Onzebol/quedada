import type { ReactNode } from 'react'
import { pesoCasa, quitarComponente } from '../dominio/casa'
import { editarParticipante } from '../dominio/operaciones'
import type { Participante, Quedada } from '../dominio/tipos'
import { CampoPorcentaje } from '../cuentas/CampoPorcentaje'
import { BotonBorrar } from '../ui/BotonBorrar'

interface Props {
  participante: Participante
  aplicar: (cambio: (q: Quedada) => Quedada) => void
  /** Controles extra al final de la fila (por ejemplo, elegir familia). */
  children?: ReactNode
}

/** Un componente de una familia (o participante sin familia): nombre y lo que paga de casa y de los demás gastos. */
export function FilaComponente({ participante: p, aplicar, children }: Props) {
  return (
    <li className="componente">
      <input
        key={p.nombre}
        type="text"
        aria-label={`Nombre de ${p.nombre}`}
        defaultValue={p.nombre}
        onBlur={(e) => aplicar((q) => editarParticipante(q, p.id, { nombre: e.target.value }))}
      />
      <label>
        % casa
        <CampoPorcentaje
          aria-label={`% de la casa de ${p.nombre}`}
          valor={pesoCasa(p)}
          onCambiar={(n) => aplicar((q) => editarParticipante(q, p.id, { porcentajeCasa: n }))}
        />
      </label>
      <label>
        % demás gastos
        <CampoPorcentaje
          aria-label={`% de los demás gastos de ${p.nombre}`}
          valor={p.porcentajeComida ?? 100}
          onCambiar={(n) => aplicar((q) => editarParticipante(q, p.id, { porcentajeComida: n }))}
        />
      </label>
      {children}
      <BotonBorrar
        texto="Borrar"
        etiqueta={`Borrar persona ${p.nombre}`}
        titulo={`¿Borrar a «${p.nombre}»?`}
        mensaje="Dejará de repartir gastos, y lo que compraba o pagaba de la casa quedará sin asignar. No se puede deshacer."
        onConfirmar={() => aplicar((q) => quitarComponente(q, p.id))}
      />
    </li>
  )
}
