import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { leaflet } from '../test/leafletFalso'
import { MapaCasa } from './MapaCasa'

vi.mock('leaflet', async () => (await import('../test/leafletFalso')).leafletFalso)
vi.mock('leaflet/dist/leaflet.css', () => ({}))

beforeEach(() => {
  leaflet.mapa = null
  leaflet.marcador = null
  leaflet.capas = {}
  leaflet.selector = []
})

describe('MapaCasa', () => {
  it('pinta el mapa en la casa con un marcador fijo', async () => {
    render(<MapaCasa latitud={41.6} longitud={-1.2} />)
    expect(screen.getByLabelText(/Mapa de la casa/)).toBeInTheDocument()
    await waitFor(() => expect(leaflet.marcador).not.toBeNull())
    expect(leaflet.mapa!.centro).toEqual([41.6, -1.2])
    expect(leaflet.marcador!.posicion).toEqual({ lat: 41.6, lng: -1.2 })
    expect(leaflet.marcador!.opciones.draggable).toBeFalsy()
  })

  it('el único pie es «© OpenStreetMap», sin el prefijo de Leaflet', async () => {
    render(<MapaCasa latitud={41.6} longitud={-1.2} />)
    await waitFor(() => expect(leaflet.mapa).not.toBeNull())
    expect(leaflet.mapa!.prefijo).toBe(false)
    const calles = leaflet.capas['https://tile.openstreetmap.org/{z}/{x}/{y}.png']
    expect(calles).toContain('© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>')
    expect(calles).not.toMatch(/donat|problem/i)
  })

  it('ofrece la capa de satélite con la atribución de Esri', async () => {
    render(<MapaCasa latitud={41.6} longitud={-1.2} />)
    await waitFor(() => expect(leaflet.mapa).not.toBeNull())
    expect(leaflet.selector).toEqual(['Mapa', 'Satélite'])
    const satelite = Object.entries(leaflet.capas).find(([url]) => url.includes('World_Imagery'))
    expect(satelite?.[1]).toMatch(/Esri/)
  })

  it('«Centrar» devuelve el mapa a la casa', async () => {
    render(<MapaCasa latitud={41.6} longitud={-1.2} />)
    await waitFor(() => expect(leaflet.mapa).not.toBeNull())
    act(() => void leaflet.mapa!.panTo({ lat: 0, lng: 0 }))
    await userEvent.click(screen.getByRole('button', { name: 'Centrar' }))
    expect(leaflet.mapa!.centro).toEqual([41.6, -1.2])
  })

  it('con «Navegar» muestra el enlace a la app de mapas', () => {
    render(<MapaCasa latitud={41.6} longitud={-1.2} enlaceApp="geo:41.6,-1.2" />)
    expect(screen.getByRole('link', { name: 'Navegar' })).toHaveAttribute('href', 'geo:41.6,-1.2')
  })

  it('en modo estricto (el efecto se monta, desmonta y monta) no intenta crear dos mapas en el mismo contenedor', async () => {
    const rechazos: unknown[] = []
    const alRechazar = (e: PromiseRejectionEvent) => rechazos.push(e.reason)
    window.addEventListener('unhandledrejection', alRechazar)
    render(
      <StrictMode>
        <MapaCasa latitud={41.6} longitud={-1.2} />
      </StrictMode>,
    )
    await waitFor(() => expect(leaflet.marcador).not.toBeNull())
    await new Promise((r) => setTimeout(r, 20))
    window.removeEventListener('unhandledrejection', alRechazar)
    expect(rechazos).toEqual([])
    expect(leaflet.mapa!.quitado).toBe(false)
  })

  it('al desmontar quita el mapa', async () => {
    const { unmount } = render(<MapaCasa latitud={41.6} longitud={-1.2} />)
    await waitFor(() => expect(leaflet.mapa).not.toBeNull())
    const mapa = leaflet.mapa!
    unmount()
    expect(mapa.quitado).toBe(true)
  })
})
