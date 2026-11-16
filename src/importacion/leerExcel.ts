import { importarLibro, type HojaLeida, type InformeImportacion } from './importarHoja'

/**
 * Lee un .xlsx (con los valores ya calculados de las fórmulas) y convierte sus hojas de compras
 * en quedadas. La librería se carga solo al importar, para no pesar en el arranque de la app.
 */
export async function leerExcel(archivo: Blob): Promise<InformeImportacion> {
  const { default: leerLibro } = await import('read-excel-file/browser')
  const hojas = (await leerLibro(archivo)) as HojaLeida[]
  return importarLibro(hojas)
}
