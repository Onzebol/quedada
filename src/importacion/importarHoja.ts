import type { Grupo, Participante, Producto, Quedada } from '../dominio/tipos'

export type Celda = string | number | boolean | Date | null

export interface ResultadoHoja {
  quedada: Quedada
  avisos: string[]
}

export interface HojaLeida {
  sheet: string
  data: Celda[][]
}

export interface InformeImportacion {
  importadas: Array<{ hoja: string } & ResultadoHoja>
  ignoradas: string[]
}

/** Valores de la columna «comprador» que no son personas (comparados como slug). */
const NO_PERSONAS = new Set(['todos', 'casa-pedir', 'totales', 'total'])

function texto(celda: Celda | undefined): string {
  if (typeof celda === 'string') return celda.trim().replace(/\s+/g, ' ')
  if (typeof celda === 'number') return String(celda)
  return ''
}

function numero(celda: Celda | undefined): number | null {
  return typeof celda === 'number' ? celda : null
}

/** «JOSU» → «Josu». Lo que ya mezcla mayúsculas y minúsculas se deja como está. */
function suave(valor: string): string {
  if (valor === valor.toUpperCase() && valor !== valor.toLowerCase()) {
    return valor.charAt(0) + valor.slice(1).toLowerCase()
  }
  return valor
}

function slug(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function leerCantidad(celda: Celda | undefined): { cantidad: number | null; unidad: string } {
  if (typeof celda === 'number') return { cantidad: celda, unidad: '' }
  const m = /^(\d+(?:[.,]\d+)?)\s*(.*)$/.exec(texto(celda))
  if (m === null) return { cantidad: null, unidad: '' }
  return { cantidad: Number(m[1].replace(',', '.')), unidad: m[2].trim() }
}

interface Columnas {
  comprador: number
  comprado: number
  cantidad: number
  producto: number
  /** Precio por unidad (formatos nuevos) o total de la línea (formatos antiguos). */
  precio: number
  /** Columna «total» de la línea, por si falta el precio por unidad (-1 si no existe). */
  total: number
  precioEsTotal: boolean
  descuento: number
  nota: number
  observaciones: number
}

function detectarColumnas(cabecera: Celda[]): Columnas | null {
  const idx = (patron: RegExp) => cabecera.findIndex((c) => patron.test(texto(c)))
  const producto = idx(/^cena viernes$/i)
  if (producto === -1) return null
  const comprador = idx(/^comprador$/i)
  if (comprador !== -1) {
    // 2025 y 2026: cabeceras COMPRADOR, COMPRADO, (cantidad sin título), €/ud, dto…
    const comprado = idx(/^comprado$/i)
    const observaciones = idx(/^observaciones/i)
    return {
      comprador,
      comprado,
      cantidad: comprado + 1,
      producto,
      precio: idx(/^€\/ud$/i),
      total: idx(/^total$/i),
      precioEsTotal: false,
      descuento: idx(/^dto$/i),
      nota: producto + 1 === observaciones ? -1 : producto + 1,
      observaciones,
    }
  }
  // 2023 y 2024: sin cabeceras de comprador; la cantidad y el comprador van a la izquierda del producto.
  return {
    comprador: producto - 2,
    comprado: -1,
    cantidad: producto - 1,
    producto,
    precio: producto + 1,
    total: -1,
    precioEsTotal: true,
    descuento: -1,
    nota: -1,
    observaciones: idx(/sobrado/i),
  }
}

/**
 * Convierte una hoja anual del Excel (filas de celdas con los valores ya calculados) en una quedada.
 * Devuelve null si no reconoce la estructura. Los ids salen del nombre de la hoja y de la fila, así
 * que importar dos veces la misma hoja da el mismo resultado.
 */
export function importarHoja(nombre: string, filas: Celda[][]): ResultadoHoja | null {
  const cabeceraIdx = filas.slice(0, 15).findIndex((f) => f.some((c) => /^cena viernes$/i.test(texto(c))))
  if (cabeceraIdx === -1) return null
  const col = detectarColumnas(filas[cabeceraIdx])
  if (col === null) return null

  const quedadaId = `import-${slug(nombre)}`
  const avisos: string[] = []
  const grupos: Grupo[] = []
  const productos: Producto[] = []
  const participantes: Participante[] = []

  const nuevoGrupo = (titulo: string) => {
    grupos.push({ id: `${quedadaId}-grupo-${grupos.length + 1}`, nombre: suave(titulo), orden: grupos.length })
  }
  nuevoGrupo(texto(filas[cabeceraIdx][col.producto]))

  const compradorId = (valor: string): string | null => {
    if (valor === '' || NO_PERSONAS.has(slug(valor))) return null
    const nombrePersona = suave(valor)
    const existente = participantes.find((p) => p.nombre.toLowerCase() === nombrePersona.toLowerCase())
    if (existente) return existente.id
    const nueva = { id: `${quedadaId}-persona-${slug(nombrePersona)}`, nombre: nombrePersona }
    participantes.push(nueva)
    return nueva.id
  }

  for (let i = cabeceraIdx + 1; i < filas.length; i++) {
    const f = filas[i]
    const celda = (c: number) => (c >= 0 ? f[c] : null)
    if (f.some((c) => /^(suma articulos|tickets)$/i.test(texto(c)))) {
      avisos.push(`Bloque de tickets no importado (desde la fila ${i + 1})`)
      break
    }
    const nombreProducto = texto(celda(col.producto))
    if (/^asistentes$/i.test(nombreProducto)) {
      avisos.push(`Sección «Asistentes» no importada (desde la fila ${i + 1})`)
      break
    }
    const comprador = texto(celda(col.comprador))
    const comprado = texto(celda(col.comprado))
    const precio = numero(celda(col.precio))
    const descuento = numero(celda(col.descuento))
    const tieneDatos =
      comprador !== '' || comprado !== '' || texto(celda(col.cantidad)) !== '' || precio !== null || descuento !== null

    if (nombreProducto === '') {
      if (texto(celda(col.cantidad)) !== '' || precio !== null || descuento !== null) avisos.push(`Fila ${i + 1} sin nombre de producto: ignorada`)
      continue
    }
    if (!tieneDatos) {
      nuevoGrupo(nombreProducto)
      continue
    }

    let { cantidad, unidad } = leerCantidad(celda(col.cantidad))
    let precioUnidad: number | null = precio
    const totalTecleado = numero(celda(col.total))
    if (precio === null && totalTecleado !== null && totalTecleado > 0 && cantidad !== null && cantidad > 0) {
      precioUnidad = Math.round((totalTecleado / cantidad) * 1e6) / 1e6
    }
    if (col.precioEsTotal && precio !== null) {
      if (cantidad !== null && cantidad > 0) {
        precioUnidad = Math.round((precio / cantidad) * 1e6) / 1e6
      } else if (precio > 0) {
        cantidad = 1
        unidad = ''
      }
    }

    const observaciones = col.precioEsTotal
      ? texto(celda(col.observaciones))
      : [texto(celda(col.nota)), texto(celda(col.observaciones))].filter((t) => t !== '').join(' · ')

    productos.push({
      id: `${quedadaId}-producto-${i + 1}`,
      grupoId: grupos[grupos.length - 1].id,
      nombre: suave(nombreProducto),
      cantidad,
      unidad,
      compradorId: compradorId(comprador),
      comprado: /[☑✓✔]/.test(comprado),
      precioUnidad,
      descuento: descuento ?? 0,
      observaciones,
    })
  }

  const conProductos = grupos.filter((g) => productos.some((p) => p.grupoId === g.id))
  for (const g of grupos) {
    if (!conProductos.includes(g)) avisos.push(`Grupo vacío ignorado: ${g.nombre}`)
  }

  const anio = /\d{4}/.exec(nombre)?.[0]
  return {
    quedada: {
      id: quedadaId,
      nombre: anio ? `Quedada ${anio}` : nombre,
      inicio: null,
      fin: null,
      participantes,
      grupos: conProductos.map((g, orden) => ({ ...g, orden })),
      productos,
      asistentes: [],
      basicos: [],
    },
    avisos,
  }
}

/** Importa las hojas «Compras AAAA» de un libro; el resto (tickets, nombres, previsión…) se ignora. */
export function importarLibro(hojas: HojaLeida[]): InformeImportacion {
  const informe: InformeImportacion = { importadas: [], ignoradas: [] }
  for (const hoja of hojas) {
    const resultado = /^compras\s+\d{4}$/i.test(hoja.sheet) ? importarHoja(hoja.sheet, hoja.data) : null
    if (resultado) informe.importadas.push({ hoja: hoja.sheet, ...resultado })
    else informe.ignoradas.push(hoja.sheet)
  }
  return informe
}
