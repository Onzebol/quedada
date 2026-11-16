import { describe, expect, it } from 'vitest'
import { totalQuedada } from '../dominio/totales'
import { importarHoja, type Celda } from './importarHoja'

const CABECERA: Celda[] = ['COMPRADOR', 'COMPRADO', null, '€/ud', 'dto', 'total', 'CENA VIERNES', null, 'Observaciones']

describe('importarHoja: lo que no es compra', () => {
  it('se detiene en el bloque de tickets y avisa', () => {
    const r = importarHoja('Compras 2025', [
      CABECERA,
      ['ANA', '☐', 2, 5, null, 10, 'Pan', null, null],
      [null, null, null, null, 'SUMA ARTICULOS', 'TICKETS', null, null, null],
      ['ANA', null, 'COSTO', 440107, 76.93, 76.93, null, null, null],
      ['ANA', null, 'TOTAL', null, null, 76.93, null, null, null],
    ])!
    expect(r.quedada.productos.map((p) => p.nombre)).toEqual(['Pan'])
    expect(r.avisos).toContain('Bloque de tickets no importado (desde la fila 3)')
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
