import { describe, expect, it } from 'vitest'
import { totalQuedada } from '../dominio/totales'
import { importarHoja, type Celda } from './importarHoja'

const CABECERA: Celda[] = ['COMPRADOR', 'COMPRADO', null, '€/ud', 'dto', 'total', 'CENA VIERNES', null, 'Observaciones']

describe('importarHoja: lo que no es compra', () => {
  it('se detiene en el bloque de tickets y no lo cuenta como productos', () => {
    const r = importarHoja('Compras 2025', [
      CABECERA,
      ['ANA', '☐', 2, 5, null, 10, 'Pan', null, null],
      [null, null, null, null, 'SUMA ARTICULOS', 'TICKETS', null, null, null],
      ['ANA', null, 'COSTO', 440107, 76.93, 76.93, null, null, null],
      ['ANA', null, 'TOTAL', null, null, 76.93, null, null, null],
    ])!
    expect(r.quedada.productos.map((p) => p.nombre)).toEqual(['Pan'])
    expect(r.avisos).not.toContain('Bloque de tickets no importado (desde la fila 3)')
  })

  it('importa los tickets como gastos de quien los pagó, sin las filas TOTAL', () => {
    const r = importarHoja('Compras 2025', [
      CABECERA,
      ['ANA', '☐', 2, 5, null, 10, 'Pan', null, null],
      [null, null, null, null, 'SUMA ARTICULOS', 'TICKETS', null, null, null],
      ['ANA', null, 'COSTO', 440107, 76.93, 76.93, null, null, null],
      ['BETO', null, 'Mercadona', 99, 10, 12.5, null, null, null],
      ['ANA', null, 'TOTAL', null, null, 76.93, null, null, null],
    ])!
    const ana = r.quedada.participantes.find((p) => p.nombre === 'Ana')!
    const beto = r.quedada.participantes.find((p) => p.nombre === 'Beto')!
    expect(r.quedada.gastos).toEqual([
      { id: 'import-compras-2025-gasto-4', pagadorId: ana.id, concepto: 'Costo', importe: 7693 },
      { id: 'import-compras-2025-gasto-5', pagadorId: beto.id, concepto: 'Mercadona', importe: 1250 },
    ])
  })

  it('avisa de los tickets sin pagador o sin importe y no los importa', () => {
    const r = importarHoja('Compras 2025', [
      CABECERA,
      ['ANA', '☐', 2, 5, null, 10, 'Pan', null, null],
      [null, null, null, null, 'SUMA ARTICULOS', 'TICKETS', null, null, null],
      [null, null, 'TIENDA', 1, 5, 5, null, null, null],
      ['ANA', null, 'VACIO', 2, null, null, null, null, null],
    ])!
    expect(r.quedada.gastos).toEqual([])
    expect(r.avisos).toContain('Ticket de la fila 4 sin pagador: ignorado')
  })

  it('se detiene en la lista de asistentes y avisa', () => {
    const r = importarHoja('COMPRAS 2026', [
      ['COMPRADOR', 'COMPRADO', null, 'CENA VIERNES', 'OBSERVACIONES'],
      [null, '☐', 1, 'Pan', null],
      [null, null, null, 'Asistentes', null],
      ['ANA', null, null, 'Beto', null],
    ])!
    expect(r.quedada.productos.map((p) => p.nombre)).toEqual(['Pan'])
    expect(r.avisos).toContain('Sección «Asistentes» no importada (desde la fila 3)')
  })

  it('no trata «Totales» ni «Casa-pedir» como personas', () => {
    const r = importarHoja('Compras 2023', [
      [null, null, 'CENA VIERNES', null],
      ['TOTALES', 1, 'Pan', 5],
      ['CASA-PEDIR', 1, 'Leña', null],
      ['ANA', 1, 'Sal', 1],
    ])!
    expect(r.quedada.participantes.map((p) => p.nombre)).toEqual(['Ana'])
  })

  it('ignora sin avisar las filas de plantilla con solo comprador y casilla', () => {
    const r = importarHoja('Compras 2025', [CABECERA, ['ANA', '☐', null, null, null, null, null, null, null]])!
    expect(r.quedada.productos).toEqual([])
    expect(r.avisos).toEqual(['Grupo vacío ignorado: Cena viernes'])
  })

  it('normaliza los espacios repetidos en los nombres', () => {
    const r = importarHoja('Compras 2025', [
      CABECERA,
      ['ANA', '☐', 1, 1, null, 1, 'Pan  integral', null, null],
      [null, null, null, null, null, 0, 'CENA SABADO  - SOPA', null, null],
      ['ANA', '☐', 1, 1, null, 1, 'Sopa', null, null],
    ])!
    expect(r.quedada.productos[0].nombre).toBe('Pan integral')
    expect(r.quedada.grupos.map((g) => g.nombre)).toEqual(['Cena viernes', 'Cena sabado - sopa'])
  })
})

describe('importarHoja: ids estables y legibles', () => {
  it('conservan los dígitos del año y quitan los acentos de los nombres', () => {
    const r = importarHoja('Compras 2025', [CABECERA, ['BELÉN', '☐', 1, 1, null, 1, 'Pan', null, null]])!
    expect(r.quedada.id).toBe('import-compras-2025')
    expect(r.quedada.participantes[0].id).toBe('import-compras-2025-persona-belen')
    expect(r.quedada.productos[0].id).toBe('import-compras-2025-producto-2')
  })
})

describe('importarHoja: total tecleado sin precio por unidad', () => {
  it('usa el total de la línea cuando falta el precio por unidad', () => {
    const r = importarHoja('Compras 2025', [
      CABECERA,
      ['ANA', '☐', 6, null, null, 8, 'Barras de pan', null, null],
    ])!
    expect(r.quedada.productos[0].precioUnidad).toBeCloseTo(8 / 6, 5)
    expect(totalQuedada(r.quedada)).toBe(800)
  })

  it('no inventa precio si tampoco hay total', () => {
    const r = importarHoja('Compras 2025', [
      CABECERA,
      ['ANA', '☐', 6, null, null, 0, 'Barras de pan', null, null],
    ])!
    expect(r.quedada.productos[0].precioUnidad).toBeNull()
  })
})
