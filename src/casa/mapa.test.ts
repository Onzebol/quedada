import { describe, expect, it } from 'vitest'
import { urlAbrirMapa, urlMapaIncrustado } from './mapa'

describe('mapa', () => {
  it('construye la URL incrustada de OpenStreetMap con marcador y recuadro', () => {
    const url = new URL(urlMapaIncrustado(41.6, -1.2))
    expect(url.origin + url.pathname).toBe('https://www.openstreetmap.org/export/embed.html')
    expect(url.searchParams.get('marker')).toBe('41.6,-1.2')
    expect(url.searchParams.get('bbox')).toBe('-1.21,41.59,-1.19,41.61')
  })

  it('construye el enlace para abrir el mapa grande', () => {
    expect(urlAbrirMapa(41.6, -1.2)).toBe('https://www.openstreetmap.org/?mlat=41.6&mlon=-1.2#map=16/41.6/-1.2')
  })
})
