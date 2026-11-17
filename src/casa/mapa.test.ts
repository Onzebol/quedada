import { describe, expect, it } from 'vitest'
import { urlAppMapas, urlMapaIncrustado } from './mapa'

describe('mapa', () => {
  it('construye la URL incrustada de OpenStreetMap con marcador y recuadro', () => {
    const url = new URL(urlMapaIncrustado(41.6, -1.2))
    expect(url.origin + url.pathname).toBe('https://www.openstreetmap.org/export/embed.html')
    expect(url.searchParams.get('marker')).toBe('41.6,-1.2')
    expect(url.searchParams.get('bbox')).toBe('-1.21,41.59,-1.19,41.61')
  })

})

describe('urlAppMapas', () => {
  const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Mobile Safari/537.36'
  const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'
  const ESCRITORIO = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
  const IPADOS = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15'

  it('en Android usa un enlace geo: con la etiqueta de la casa', () => {
    expect(urlAppMapas(41.6, -1.2, 'Casa Almunia', ANDROID, 5)).toBe('geo:41.6,-1.2?q=41.6,-1.2(Casa%20Almunia)')
  })

  it('en iPhone y iPad abre Apple Maps', () => {
    expect(urlAppMapas(41.6, -1.2, 'Casa', IPHONE, 5)).toBe('https://maps.apple.com/?ll=41.6,-1.2&q=Casa')
    expect(urlAppMapas(41.6, -1.2, 'Casa', IPADOS, 5)).toBe('https://maps.apple.com/?ll=41.6,-1.2&q=Casa')
  })

  it('en el ordenador (o un Mac sin pantalla táctil) no hay enlace', () => {
    expect(urlAppMapas(41.6, -1.2, 'Casa', ESCRITORIO, 0)).toBeNull()
    expect(urlAppMapas(41.6, -1.2, 'Casa', IPADOS, 0)).toBeNull()
  })

  it('sin nombre usa «La casa»', () => {
    expect(urlAppMapas(1, 2, '', ANDROID, 5)).toBe('geo:1,2?q=1,2(La%20casa)')
  })
})
