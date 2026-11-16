// @vitest-environment node
/// <reference types="node" />
import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { totalQuedada } from '../dominio/totales'
import { leerExcel } from './leerExcel'

async function ejemplo(): Promise<Blob> {
  return new Blob([await readFile(new URL('./fixtures/ejemplo.xlsx', import.meta.url))])
}

describe('leerExcel', () => {
  it('lee un .xlsx real y devuelve las hojas de compras como quedadas', async () => {
    const informe = await leerExcel(await ejemplo())
    expect(informe.importadas.map((i) => i.hoja)).toEqual(['Compras 2025', 'Compras 2024'])
    expect(informe.ignoradas).toEqual(['TICKETS 2025', 'NOMBRES'])
  })

  it('trae los productos, los precios y no cuenta el bloque de tickets', async () => {
    const informe = await leerExcel(await ejemplo())
    const q2025 = informe.importadas[0].quedada
    expect(q2025.productos.map((p) => p.nombre)).toEqual(['Pizza BBQ', 'Alitas pollo', 'Sidra'])
    expect(totalQuedada(q2025)).toBe(5570)
    expect(informe.importadas[0].avisos).toContain('Bloque de tickets no importado (desde la fila 7)')
  })

  it('lee el formato antiguo con la cantidad escrita como texto', async () => {
    const informe = await leerExcel(await ejemplo())
    const cerveza = informe.importadas[1].quedada.productos.find((p) => p.nombre === 'Cerveza')!
    expect(cerveza).toMatchObject({ cantidad: 2, unidad: 'blíster' })
    expect(totalQuedada(informe.importadas[1].quedada)).toBe(799 + 2000)
  })

  it('falla con un error claro si el archivo no es un .xlsx', async () => {
    await expect(leerExcel(new Blob(['esto no es un excel']))).rejects.toThrow()
  })
})
