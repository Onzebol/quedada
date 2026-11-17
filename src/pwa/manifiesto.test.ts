import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { manifiesto } from './manifiesto'

// (no con `new URL(…, import.meta.url)`: Vite lo trata como un recurso estático)
const publico = (ruta: string) => resolve(import.meta.dirname, '../../public', ruta)

describe('manifiesto de la aplicación', () => {
  it('se instala como aplicación independiente, con nombre, idioma y colores de la web', () => {
    expect(manifiesto.name).toBe('Quedada')
    expect(manifiesto.short_name).toBe('Quedada')
    expect(manifiesto.lang).toBe('es')
    expect(manifiesto.display).toBe('standalone')
    expect(manifiesto.theme_color).toBe('#2f6b4f')
    expect(manifiesto.background_color).toBe('#e8ecea')
  })

  it('abre y limita su alcance a la carpeta de la web (no a la raíz del dominio)', () => {
    expect(manifiesto.start_url).toBe('./')
    expect(manifiesto.scope).toBe('./')
  })

  it('trae iconos de 192 y 512 px y uno «maskable», y todos existen', () => {
    const iconos = manifiesto.icons ?? []
    expect(iconos.some((i) => i.sizes === '192x192' && i.purpose === 'any')).toBe(true)
    expect(iconos.some((i) => i.sizes === '512x512' && i.purpose === 'any')).toBe(true)
    expect(iconos.some((i) => i.purpose === 'maskable')).toBe(true)
    for (const icono of iconos) expect(existsSync(publico(icono.src)), icono.src).toBe(true)
  })

  it('los iconos son PNG del tamaño que dicen', () => {
    for (const icono of manifiesto.icons ?? []) {
      const datos = readFileSync(publico(icono.src))
      expect(datos.subarray(1, 4).toString(), icono.src).toBe('PNG')
      const [ancho, alto] = [datos.readUInt32BE(16), datos.readUInt32BE(20)]
      expect(`${ancho}x${alto}`, icono.src).toBe(icono.sizes)
    }
  })

  it('hay favicon (SVG e ICO) e icono para iOS', () => {
    for (const fichero of ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png']) {
      expect(existsSync(publico(fichero)), fichero).toBe(true)
    }
  })
})
