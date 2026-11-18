import { ordenarPorNombre } from './asistentes'
import { liquidar, pagadoPor, partesDeCadaUno, totalCasa, type Transferencia } from './liquidacion'
import type { Centimos, Id, Quedada } from './tipos'

/** Lo de una persona o de una familia: lo pagado, lo que le toca (casa y gastos) y el saldo (positivo = le deben). */
export interface LineaResumen {
  id: Id
  nombre: string
  pagado: Centimos
  casa: Centimos
  gastos: Centimos
  balance: Centimos
}

/** Una familia (o una persona suelta) con las personas que la componen; vacío si no tiene componentes. */
export interface GrupoResumen extends LineaResumen {
  personas: LineaResumen[]
}

export interface ResumenCuentas {
  grupos: GrupoResumen[]
  /** Quién paga a quién entre grupos (familias o personas sueltas). */
  transferencias: Transferencia[]
  totales: {
    pagado: Centimos
    casaPagada: Centimos
    /** Lo que falta del precio de la casa (nunca negativo), o `null` sin precio. */
    casaFalta: Centimos | null
    gastos: Centimos
  }
}

function linea(id: Id, nombre: string, pagado: Centimos, casa: Centimos, gastos: Centimos): LineaResumen {
  const balance = pagado - casa - gastos
  return { id, nombre, pagado, casa, gastos, balance: balance === 0 ? 0 : balance }
}

/** Resumen de las cuentas por familia: cada familia suma a sus componentes; quien no tiene familia va aparte. */
export function resumenPorFamilia(q: Quedada): ResumenCuentas {
  const pagado = pagadoPor(q)
  const partes = partesDeCadaUno(q)
  const deParticipante = (id: Id, nombre: string) => linea(id, nombre, pagado[id] ?? 0, partes.casa[id] ?? 0, partes.gastos[id] ?? 0)
  const suma = (lineas: LineaResumen[], campo: 'pagado' | 'casa' | 'gastos') => lineas.reduce((s, l) => s + l[campo], 0)

  const grupos: GrupoResumen[] = []
  const enFamilia = new Set<Id>()
  for (const a of q.asistentes) {
    const componentes = q.participantes.filter((p) => p.familiaId === a.id)
    componentes.forEach((p) => enFamilia.add(p.id))
    const personas = ordenarPorNombre(componentes.map((p) => deParticipante(p.id, p.nombre)), (l) => l.nombre)
    // Sin componentes, la familia figura ella misma con lo que haya pagado.
    const propia = componentes.length === 0 ? pagado[a.id] ?? 0 : 0
    grupos.push({ ...linea(a.id, a.familia, suma(personas, 'pagado') + propia, suma(personas, 'casa'), suma(personas, 'gastos')), personas })
  }
  for (const p of q.participantes) {
    if (!enFamilia.has(p.id)) grupos.push({ ...deParticipante(p.id, p.nombre), personas: [] })
  }

  const ordenados = ordenarPorNombre(grupos, (g) => g.nombre)
  return {
    grupos: ordenados,
    transferencias: liquidar(Object.fromEntries(ordenados.map((g) => [g.id, g.balance]))),
    totales: {
      pagado: Object.values(pagado).reduce((s, v) => s + v, 0),
      casaPagada: totalCasa(q),
      casaFalta: q.casa.precio === null ? null : Math.max(0, q.casa.precio - totalCasa(q)),
      gastos: q.gastos.reduce((s, g) => s + g.importe, 0),
    },
  }
}
