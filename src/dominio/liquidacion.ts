import { pagadorDeLaCasa } from './asistentes'
import { pesoCasa } from './casa'
import type { Centimos, Id, Quedada } from './tipos'

export interface Transferencia {
  de: Id
  a: Id
  importe: Centimos
}

export interface Liquidacion {
  /** Total pagado: gastos y pagos de la casa. Los precios de la lista de la compra no cuentan. */
  total: Centimos
  pagado: Record<Id, Centimos>
  /** Pagado menos lo que le toca: positivo = le deben, negativo = debe. Suma cero. */
  balances: Record<Id, Centimos>
  transferencias: Transferencia[]
}

/**
 * Reparte `total` en proporción a `pesos` en céntimos enteros (mayor resto):
 * la suma de las partes es siempre `total`. Con todos los pesos a 0 reparte a partes iguales.
 */
export function repartirProporcional(total: Centimos, pesos: Record<Id, number>): Record<Id, Centimos> {
  const ids = Object.keys(pesos)
  const hayPeso = ids.some((id) => pesos[id] > 0)
  const pesoDe = (id: Id) => (hayPeso ? Math.max(pesos[id], 0) : 1)
  const sumaPesos = ids.reduce((suma, id) => suma + pesoDe(id), 0)
  const signo = total < 0 ? -1 : 1
  const absoluto = Math.abs(total)

  const partes = ids.map((id, indice) => {
    const exacto = sumaPesos === 0 ? 0 : (absoluto * pesoDe(id)) / sumaPesos
    return { id, indice, base: Math.floor(exacto), resto: exacto - Math.floor(exacto) }
  })
  let sobrante = absoluto - partes.reduce((suma, p) => suma + p.base, 0)
  const porResto = [...partes].sort((x, y) => y.resto - x.resto || x.indice - y.indice)
  for (const p of porResto) {
    if (sobrante <= 0) break
    p.base += 1
    sobrante -= 1
  }

  const resultado: Record<Id, Centimos> = {}
  for (const p of partes) resultado[p.id] = p.base === 0 ? 0 : signo * p.base
  return resultado
}

/** Pagos de la casa que entran en las cuentas: solo los marcados como pagados (puede haber quien aún no haya pagado la reserva). */
function pagosCobrados(quedada: Quedada) {
  return quedada.pagos.filter((p) => p.pagado === true)
}

/**
 * Lo pagado por cada persona: sus gastos y los pagos de la casa. El pago de una familia se acredita
 * entero a su pagador de la casa (`pagadorDeLaCasa`); si la familia no tiene componentes, figura ella misma.
 */
export function pagadoPor(quedada: Quedada): Record<Id, Centimos> {
  const pagado: Record<Id, Centimos> = {}
  for (const g of quedada.gastos) pagado[g.pagadorId] = (pagado[g.pagadorId] ?? 0) + g.importe
  for (const pago of pagosCobrados(quedada)) {
    const familia = quedada.asistentes.find((a) => a.id === pago.familiaId)
    const quien = (familia && pagadorDeLaCasa(quedada, familia)) ?? pago.familiaId
    pagado[quien] = (pagado[quien] ?? 0) + pago.importe
  }
  return pagado
}

/** Alquiler que entra en las cuentas: solo lo marcado como pagado. */
export function totalCasa(quedada: Quedada): Centimos {
  return pagosCobrados(quedada).reduce((suma, p) => suma + p.importe, 0)
}

/** Lo que le toca a cada participante: su parte del alquiler pagado y de los gastos. */
export function partesDeCadaUno(quedada: Quedada): { casa: Record<Id, Centimos>; gastos: Record<Id, Centimos> } {
  const pesosCasa: Record<Id, number> = {}
  const pesosComida: Record<Id, number> = {}
  for (const p of quedada.participantes) {
    pesosCasa[p.id] = pesoCasa(p)
    pesosComida[p.id] = p.porcentajeComida ?? 100
  }
  return {
    casa: repartirProporcional(totalCasa(quedada), pesosCasa),
    gastos: repartirProporcional(quedada.gastos.reduce((suma, g) => suma + g.importe, 0), pesosComida),
  }
}

/** Saldo de cada persona: lo que ha pagado menos lo que le corresponde. */
export function balances(quedada: Quedada): Record<Id, Centimos> {
  const pagado = pagadoPor(quedada)
  const { casa: debeCasa, gastos: debeComida } = partesDeCadaUno(quedada)

  const saldos: Record<Id, Centimos> = {}
  for (const p of quedada.participantes) saldos[p.id] = 0
  for (const id of Object.keys(pagado)) saldos[id] ??= 0
  for (const id of Object.keys(saldos)) {
    saldos[id] = (pagado[id] ?? 0) - (debeCasa[id] ?? 0) - (debeComida[id] ?? 0)
    if (saldos[id] === 0) saldos[id] = 0 // evita -0
  }
  return saldos
}

/** Transferencias que saldan los balances: mayor deudor con mayor acreedor, como mucho n-1. */
export function liquidar(saldos: Record<Id, Centimos>): Transferencia[] {
  const restantes = Object.entries(saldos)
    .filter(([, saldo]) => saldo !== 0)
    .map(([id, saldo]) => ({ id, saldo }))
  const transferencias: Transferencia[] = []
  for (;;) {
    let acreedor = restantes[0]
    let deudor = restantes[0]
    for (const r of restantes) {
      if (r.saldo > (acreedor?.saldo ?? 0)) acreedor = r
      if (r.saldo < (deudor?.saldo ?? 0)) deudor = r
    }
    if (!acreedor || !deudor || acreedor.saldo <= 0 || deudor.saldo >= 0) break
    const importe = Math.min(acreedor.saldo, -deudor.saldo)
    transferencias.push({ de: deudor.id, a: acreedor.id, importe })
    acreedor.saldo -= importe
    deudor.saldo += importe
  }
  return transferencias
}

export function liquidacion(quedada: Quedada): Liquidacion {
  const pagado = pagadoPor(quedada)
  const saldos = balances(quedada)
  return {
    total: Object.values(pagado).reduce((suma, v) => suma + v, 0),
    pagado,
    balances: saldos,
    transferencias: liquidar(saldos),
  }
}
