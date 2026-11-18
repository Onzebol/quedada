import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { leaflet } from '../test/leafletFalso'
import { MapaAjustable } from './MapaAjustable'

vi.mock('leaflet', async () => (await import('../test/leafletFalso')).leafletFalso)
vi.mock('leaflet/dist/leaflet.css', () => ({}))

beforeEach(() => {
  leaflet.mapa = null
  leaflet.marcador = null
  leaflet.selector = []
})

describe('MapaAjustable', () => {
  it('pinta el mapa centrado en la casa con un marcador que se puede arrastrar', async () => {
    render(<MapaAjustable latitud={41.6} longitud={-1.2} onMover={() => {}} />)
    expect(screen.getByLabelText(/Mapa de la casa/)).toBeInTheDocument()
    await waitFor(() => expect(leaflet.marcador).not.toBeNull())
    expect(leaflet.mapa!.centro).toEqual([41.6, -1.2])
    expect(leaflet.marcador!.opciones.draggable).toBe(true)
    expect(leaflet.marcador!.posicion).toEqual({ lat: 41.6, lng: -1.2 })
  })

  it('sin el prefijo de Leaflet: solo «© OpenStreetMap»', async () => {
    render(<MapaAjustable latitud={41.6} longitud={-1.2} onMover={() => {}} />)
    await waitFor(() => expect(leaflet.mapa).not.toBeNull())
    expect(leaflet.mapa!.prefijo).toBe(false)
  })

  it('ofrece también la capa de satélite', async () => {
    render(<MapaAjustable latitud={41.6} longitud={-1.2} onMover={() => {}} />)
    await waitFor(() => expect(leaflet.mapa).not.toBeNull())
    expect(leaflet.selector).toEqual(['Mapa', 'Satélite'])
  })

  it('al soltar el marcador avisa de la nueva posición', async () => {
    const onMover = vi.fn()
    render(<MapaAjustable latitud={41.6} longitud={-1.2} onMover={onMover} />)
    await waitFor(() => expect(leaflet.marcador).not.toBeNull())
    leaflet.arrastrar(41.61234567, -1.19876543)
    expect(onMover).toHaveBeenCalledWith(41.612346, -1.198765)
  })

  it('al pulsar en el mapa mueve el marcador allí y avisa', async () => {
    const onMover = vi.fn()
    render(<MapaAjustable latitud={41.6} longitud={-1.2} onMover={onMover} />)
    await waitFor(() => expect(leaflet.marcador).not.toBeNull())
    leaflet.pulsar(41.7, -1.3)
    expect(leaflet.marcador!.posicion).toEqual({ lat: 41.7, lng: -1.3 })
    expect(onMover).toHaveBeenCalledWith(41.7, -1.3)
  })

  it('si las coordenadas cambian desde fuera, el marcador y el mapa las siguen', async () => {
    const { rerender } = render(<MapaAjustable latitud={41.6} longitud={-1.2} onMover={() => {}} />)
    await waitFor(() => expect(leaflet.marcador).not.toBeNull())
    rerender(<MapaAjustable latitud={40} longitud={-3} onMover={() => {}} />)
    expect(leaflet.marcador!.posicion).toEqual({ lat: 40, lng: -3 })
    expect(leaflet.mapa!.centro).toEqual([40, -3])
  })

  it('el botón «Centrar» devuelve el mapa a la posición del marcador', async () => {
    render(<MapaAjustable latitud={41.6} longitud={-1.2} onMover={() => {}} />)
    await waitFor(() => expect(leaflet.marcador).not.toBeNull())
    // El usuario ha desplazado el mapa a otro sitio.
    leaflet.mapa!.centro = [10, 10]
    await userEvent.click(screen.getByRole('button', { name: 'Centrar' }))
    expect(leaflet.mapa!.centro).toEqual([41.6, -1.2])
  })

  it('centra en donde está ahora el marcador, no donde estaba al abrir', async () => {
    render(<MapaAjustable latitud={41.6} longitud={-1.2} onMover={() => {}} />)
    await waitFor(() => expect(leaflet.marcador).not.toBeNull())
    leaflet.arrastrar(41.7, -1.3)
    leaflet.mapa!.centro = [10, 10]
    await userEvent.click(screen.getByRole('button', { name: 'Centrar' }))
    expect(leaflet.mapa!.centro).toEqual([41.7, -1.3])
  })

  it('al desmontarse libera el mapa', async () => {
    const { unmount } = render(<MapaAjustable latitud={41.6} longitud={-1.2} onMover={() => {}} />)
    await waitFor(() => expect(leaflet.mapa).not.toBeNull())
    unmount()
    expect(leaflet.mapa!.quitado).toBe(true)
  })
})
