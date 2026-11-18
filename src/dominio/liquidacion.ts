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

/**
 * Lo pagado de la casa por cada persona. El pago de una familia se acredita a sus componentes según
 * su porcentaje de casa (a partes iguales si todos pesan 0); si la familia no tiene componentes,
 * figura ella misma.
 */
function pagadoCasaPor(quedada: Quedada): Record<Id, Centimos> {
  const pagado: Record<Id, Centimos> = {}
  for (const pago of quedada.pagos) {
    const componentes = quedada.participantes.filter((p) => p.familiaId === pago.familiaId)
    if (componentes.length === 0) {
      pagado[pago.familiaId] = (pagado[pago.familiaId] ?? 0) + pago.importe
      continue
    }
    const pesos: Record<Id, number> = {}
    for (const p of componentes) pesos[p.id] = pesoCasa(p)
    for (const [id, parte] of Object.entries(repartirProporcional(pago.importe, pesos))) {
      pagado[id] = (pagado[id] ?? 0) + parte
    }
  }
  return pagado
}

/** Lo pagado por cada persona: sus gastos y los pagos de la casa. */
function pagadoPor(quedada: Quedada): Record<Id, Centimos> {
  const pagado = pagadoCasaPor(quedada)
  for (const g of quedada.gastos) pagado[g.pagadorId] = (pagado[g.pagadorId] ?? 0) + g.importe
  return pagado
}

/** Alquiler que entra en las cuentas: solo lo pagado. */
function totalCasa(quedada: Quedada): Centimos {
  return quedada.pagos.reduce((suma, p) => suma + p.importe, 0)
}

/** Saldo de la casa de cada persona: lo pagado de ella menos su parte (negativo = debe a quien la pagó). */
export function saldosCasa(quedada: Quedada): Record<Id, Centimos> {
  const pagado = pagadoCasaPor(quedada)
  const pesos: Record<Id, number> = {}
  for (const p of quedada.participantes) pesos[p.id] = pesoCasa(p)
  const debe = repartirProporcional(totalCasa(quedada), pesos)
  const saldos: Record<Id, Centimos> = {}
  for (const id of new Set([...Object.keys(pesos), ...Object.keys(pagado)])) {
    saldos[id] = (pagado[id] ?? 0) - (debe[id] ?? 0)
  }
  return saldos
}

/** Saldo de cada persona: lo que ha pagado menos lo que le corresponde, descontando lo que ya ha enviado de la casa. */
export function balances(quedada: Quedada): Record<Id, Centimos> {
  const pagado = pagadoPor(quedada)
  const pesosCasa: Record<Id, number> = {}
  const pesosComida: Record<Id, number> = {}
  for (const p of quedada.participantes) {
    pesosCasa[p.id] = pesoCasa(p)
    pesosComida[p.id] = p.porcentajeComida ?? 100
  }
  const debeCasa = repartirProporcional(totalCasa(quedada), pesosCasa)
  const debeComida = repartirProporcional(quedada.gastos.reduce((suma, g) => suma + g.importe, 0), pesosComida)

  const saldos: Record<Id, Centimos> = {}
  for (const p of quedada.participantes) saldos[p.id] = 0
  for (const id of Object.keys(pagado)) saldos[id] ??= 0
  for (const id of Object.keys(saldos)) {
    saldos[id] = (pagado[id] ?? 0) - (debeCasa[id] ?? 0) - (debeComida[id] ?? 0)
    if (saldos[id] === 0) saldos[id] = 0 // evita -0
  }

  // Quien debe parte de la casa y ya la ha enviado salda esa deuda y se la quita a quienes la pagaron.
  const casa = saldosCasa(quedada)
  const enviado = quedada.participantes
    .filter((p) => p.casaEnviada === true && (casa[p.id] ?? 0) < 0)
    .reduce((suma, p) => suma - casa[p.id], 0)
  if (enviado > 0) {
    const acreedores: Record<Id, number> = {}
    for (const [id, saldo] of Object.entries(casa)) if (saldo > 0) acreedores[id] = saldo
    for (const p of quedada.participantes) if (p.casaEnviada === true && (casa[p.id] ?? 0) < 0) saldos[p.id] -= casa[p.id]
    for (const [id, parte] of Object.entries(repartirProporcional(enviado, acreedores))) saldos[id] -= parte
    for (const id of Object.keys(saldos)) if (saldos[id] === 0) saldos[id] = 0
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
