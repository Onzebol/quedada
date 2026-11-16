import { describe, expect, it } from 'vitest'
import { totalPorComprador, totalQuedada } from '../dominio/totales'
import { importarHoja, importarLibro, type Celda } from './importarHoja'

// Fragmentos con la misma forma que cada hoja del Excel, con nombres inventados.

/** Hoja «COMPRAS 2026»: sin precios. Columnas: comprador, comprado, cantidad, producto, observaciones. */
const hoja2026: Celda[][] = [
  [null, null, null, null, null],
  [null, null, null, null, null],
  [null, null, null, null, null],
  ['COMPRADOR', 'COMPRADO', null, 'CENA VIERNES', 'OBSERVACIONES DEL 2025 PARA 2026'],
  [null, null, null, null, null],
  [null, '☐', 1, 'Pizza BBQ -(6 porciones)', 'Sobraron 3 pizzas'],
  [null, '☐', 2.3, 'Alitas pollo', null],
  [null, null, null, null, null],
  [null, null, null, 'COMIDA SABADO - ASADO', null],
  [null, '☐', null, 'LEÑA', null],
  ['ANA', '☑', 1, 'Torreznos ', 'GARAJE'],
  [null, null, null, 'LECHES', null],
  [null, null, null, 'PICOTEOS Y VARIOS', null],
  [null, '☐', 0.5, 'Lomo', null],
]

/** Hoja «Compras 2025»: €/ud, dto y total; una columna de nota sin título tras el producto. */
const hoja2025: Celda[][] = [
  ['COMPRADOR', 'COMPRADO', null, '€/ud', 'dto', 'total', 'CENA VIERNES', null, 'Observaciones'],
  [null, null, null, null, null, 0, null, null, null],
  ['ANA', '☐', 2, 10.99, null, 21.98, 'Pizza BBQ', null, null],
  ['BETO', '☐', 4.558, 6.49, null, 29.58142, 'Alitas pollo', '**Ha sobrado', 'Una bandeja'],
  [null, null, null, null, null, 0, 'ASADO', null, null],
  ['ANA', '☑', 2, 2.59, -1.04, 4.14, 'Chorizo dulce', null, null],
  [null, '☐', null, null, null, 0, 'LECHES', null, 'Cada uno la suya'],
  [null, null, null, null, null, 0, null, null, null],
]

/** Hoja «Compras 2024»: sin cabecera de comprador; la columna del precio es el total de la línea. */
const hoja2024: Celda[][] = [
  [null, null, 'CENA VIERNES', null, null],
  [null, null, null, null, null],
  ['ANA', 1, 'Pizza BBQ', 7.99, null],
  [null, null, null, null, null],
  [null, null, 'BEBIDA', null, null],
  ['BETO', '2 blíster', 'Cerveza', 20, null],
  ['BETO', 16, 'Yogures', 3.98, 'GUARDADO'],
  ['TODOS', null, 'LECHES', null, null],
  ['CASA - PEDIR', null, 'LEÑA', null, null],
  ['ANA', 3, 'Algo sin precio', null, null],
]

/** Hoja «Compras 2023»: columna «Ha sobrado» y un segundo bloque «Próximo año» que no se importa. */
const hoja2023: Celda[][] = [
  [null, null, null, null, null, null, null, null, null, null],
  [null, null, 'CENA VIERNES', null, null, null, 'Ha Sobrado', null, 'Próximo año', 'CENA VIERNES'],
  ['ANA', 1, 'Pizza BBQ', 9.99, null, null, '3 porciones', null, 1, 'Pizza BBQ'],
  ['BETO', 2, 'Barra de pan', 1.89, null, null, null, null, 2, 'Barra de pan'],
]

describe('importarHoja: formato 2026 (sin precios)', () => {
  const r = importarHoja('COMPRAS 2026', hoja2026)!

  it('crea una quedada con el año en el nombre', () => {
    expect(r.quedada.nombre).toBe('Quedada 2026')
  })

  it('crea un grupo por cada título y descarta los que quedan vacíos', () => {
    expect(r.quedada.grupos.map((g) => g.nombre)).toEqual([
      'Cena viernes',
      'Comida sabado - asado',
      'Picoteos y varios',
    ])
    expect(r.quedada.grupos.map((g) => g.orden)).toEqual([0, 1, 2])
    expect(r.avisos).toContain('Grupo vacío ignorado: Leches')
  })

  it('lee productos con cantidad, comprado y observaciones', () => {
    const nombres = r.quedada.productos.map((p) => p.nombre)
    expect(nombres).toEqual(['Pizza BBQ -(6 porciones)', 'Alitas pollo', 'Leña', 'Torreznos', 'Lomo'])
    const torreznos = r.quedada.productos[3]
    expect(torreznos).toMatchObject({ cantidad: 1, comprado: true, observaciones: 'GARAJE' })
    expect(r.quedada.productos[0]).toMatchObject({ comprado: false, observaciones: 'Sobraron 3 pizzas' })
  })

  it('asigna cada producto a su grupo', () => {
    const grupoDe = (nombre: string) =>
      r.quedada.grupos.find((g) => g.id === r.quedada.productos.find((p) => p.nombre === nombre)!.grupoId)!.nombre
    expect(grupoDe('Pizza BBQ -(6 porciones)')).toBe('Cena viernes')
    expect(grupoDe('Leña')).toBe('Comida sabado - asado')
    expect(grupoDe('Lomo')).toBe('Picoteos y varios')
  })

  it('crea participantes solo para los compradores que aparecen y deja el resto sin asignar', () => {
    expect(r.quedada.participantes.map((p) => p.nombre)).toEqual(['Ana'])
    expect(r.quedada.productos[3].compradorId).toBe(r.quedada.participantes[0].id)
    expect(r.quedada.productos[0].compradorId).toBeNull()
  })

  it('no inventa precios', () => {
    expect(r.quedada.productos.every((p) => p.precioUnidad === null && p.descuento === 0)).toBe(true)
  })
})

describe('importarHoja: formato 2025 (€/ud, dto, total)', () => {
  const r = importarHoja('Compras 2025', hoja2025)!

  it('lee precio por unidad y descuento', () => {
    const chorizo = r.quedada.productos.find((p) => p.nombre === 'Chorizo dulce')!
    expect(chorizo).toMatchObject({ cantidad: 2, precioUnidad: 2.59, descuento: -1.04, comprado: true })
  })

  it('une la nota sin título y la columna de observaciones', () => {
    const alitas = r.quedada.productos.find((p) => p.nombre === 'Alitas pollo')!
    expect(alitas.observaciones).toBe('**Ha sobrado · Una bandeja')
  })

  it('los totales coinciden con los de la hoja', () => {
    // 21,98 + 29,58 (29,58142) + 4,14 = 55,70 €
    expect(totalQuedada(r.quedada)).toBe(5570)
    expect(totalPorComprador(r.quedada)).toEqual({
      [r.quedada.participantes[0].id]: 2198 + 414,
      [r.quedada.participantes[1].id]: 2958,
    })
  })

  it('un producto con casilla pero sin título de grupo vacío sigue siendo producto', () => {
    expect(r.quedada.productos.some((p) => p.nombre === 'Leches')).toBe(true)
  })
})

describe('importarHoja: formatos 2024 y 2023 (precio total de la línea)', () => {
  it('convierte el total de la línea en precio por unidad', () => {
    const r = importarHoja('Compras 2024', hoja2024)!
    const yogures = r.quedada.productos.find((p) => p.nombre === 'Yogures')!
    expect(yogures.cantidad).toBe(16)
    expect(yogures.precioUnidad).toBeCloseTo(0.24875, 5)
    expect(totalQuedada(r.quedada)).toBe(799 + 2000 + 398)
  })

  it('separa número y unidad cuando la cantidad es texto', () => {
    const r = importarHoja('Compras 2024', hoja2024)!
    expect(r.quedada.productos.find((p) => p.nombre === 'Cerveza')).toMatchObject({
      cantidad: 2,
      unidad: 'blíster',
    })
  })

  it('no trata TODOS ni CASA - PEDIR como personas', () => {
    const r = importarHoja('Compras 2024', hoja2024)!
    expect(r.quedada.participantes.map((p) => p.nombre)).toEqual(['Ana', 'Beto'])
    expect(r.quedada.productos.find((p) => p.nombre === 'Leches')!.compradorId).toBeNull()
  })

  it('un producto sin precio queda sin precio', () => {
    const r = importarHoja('Compras 2024', hoja2024)!
    expect(r.quedada.productos.find((p) => p.nombre === 'Algo sin precio')).toMatchObject({
      cantidad: 3,
      precioUnidad: null,
    })
  })

  it('en 2023 lee «Ha sobrado» como observación e ignora el bloque «Próximo año»', () => {
    const r = importarHoja('Compras 2023', hoja2023)!
    expect(r.quedada.productos.map((p) => p.nombre)).toEqual(['Pizza BBQ', 'Barra de pan'])
    expect(r.quedada.productos[0].observaciones).toBe('3 porciones')
    expect(r.quedada.productos[1].observaciones).toBe('')
  })
})

describe('importarHoja: casos límite', () => {
  it('devuelve null si la hoja no tiene la cabecera «CENA VIERNES»', () => {
    expect(importarHoja('Previsión 2023', [['hora', '19H'], ['Familia', 'X']])).toBeNull()
  })

  it('devuelve null con una hoja vacía', () => {
    expect(importarHoja('TICKETS 2025', [])).toBeNull()
  })

  it('avisa de las filas con datos pero sin nombre de producto', () => {
    const r = importarHoja('Compras 2025', [
      ['COMPRADOR', 'COMPRADO', null, '€/ud', 'dto', 'total', 'CENA VIERNES', null, 'Observaciones'],
      ['ANA', '☐', 2, 5, null, 10, null, null, null],
      ['ANA', '☐', 1, 5, null, 5, 'Pan', null, null],
    ])!
    expect(r.quedada.productos.map((p) => p.nombre)).toEqual(['Pan'])
    expect(r.avisos).toContain('Fila 2 sin nombre de producto: ignorada')
  })

  it('importar dos veces la misma hoja da exactamente lo mismo (ids estables)', () => {
    expect(importarHoja('Compras 2025', hoja2025)).toEqual(importarHoja('Compras 2025', hoja2025))
  })

  it('hojas distintas generan quedadas con ids distintos', () => {
    const a = importarHoja('Compras 2025', hoja2025)!.quedada
    const b = importarHoja('Compras 2024', hoja2024)!.quedada
    expect(a.id).not.toBe(b.id)
  })
})

describe('importarLibro', () => {
  const hojas = [
    { sheet: 'COMPRAS 2026', data: hoja2026 },
    { sheet: 'Compras 2025', data: hoja2025 },
    { sheet: 'TICKETS 2025', data: [] },
    { sheet: 'NOMBRES', data: [['Nombre'], ['ANA']] },
    { sheet: 'Previsión 2023', data: [['hora llegada', '19H']] },
  ]

  it('importa solo las hojas de compras y lista el resto como ignoradas', () => {
    const informe = importarLibro(hojas)
    expect(informe.importadas.map((i) => i.hoja)).toEqual(['COMPRAS 2026', 'Compras 2025'])
    expect(informe.ignoradas).toEqual(['TICKETS 2025', 'NOMBRES', 'Previsión 2023'])
  })

  it('una hoja de compras con otra estructura se ignora en vez de romper', () => {
    const informe = importarLibro([{ sheet: 'Compras 2022', data: [['otra', 'cosa']] }])
    expect(informe.importadas).toEqual([])
    expect(informe.ignoradas).toEqual(['Compras 2022'])
  })
})
