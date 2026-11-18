import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// El módulo virtual lo pone el plugin PWA; aquí se sustituye por uno controlable.
const estado = vi.hoisted(() => ({
  hayNueva: false,
  setHayNueva: vi.fn(),
  actualizar: vi.fn(() => Promise.resolve()),
  opciones: undefined as undefined | { onRegisteredSW?: (url: string, reg?: { update: () => Promise<void> }) => void },
}))

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: (opciones: typeof estado.opciones) => {
    estado.opciones = opciones
    return {
      needRefresh: [estado.hayNueva, estado.setHayNueva],
      offlineReady: [false, vi.fn()],
      updateServiceWorker: estado.actualizar,
    }
  },
}))

import { ActualizacionPwa } from './ActualizacionPwa'

beforeEach(() => {
  estado.hayNueva = false
  estado.setHayNueva.mockClear()
  estado.actualizar.mockClear()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('ActualizacionPwa', () => {
  it('en desarrollo, con ?aviso en la URL, muestra el aviso aunque no haya versión nueva', () => {
    window.history.pushState({}, '', '/?aviso')
    render(<ActualizacionPwa />)
    window.history.pushState({}, '', '/')
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('no avisa si no hay versión nueva', () => {
    render(<ActualizacionPwa />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('avisa cuando el service worker tiene una versión nueva y «Actualizar» la carga recargando', async () => {
    estado.hayNueva = true
    render(<ActualizacionPwa />)
    expect(screen.getByRole('status')).toHaveTextContent('Hay una versión nueva')
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar' }))
    expect(estado.actualizar).toHaveBeenCalledWith(true)
  })

  it('«Más tarde» oculta el aviso sin actualizar', async () => {
    estado.hayNueva = true
    render(<ActualizacionPwa />)
    await userEvent.click(screen.getByRole('button', { name: 'Más tarde' }))
    expect(estado.setHayNueva).toHaveBeenCalledWith(false)
    expect(estado.actualizar).not.toHaveBeenCalled()
  })

  it('busca versiones nuevas cada hora mientras la aplicación está abierta', () => {
    vi.useFakeTimers()
    render(<ActualizacionPwa />)
    const update = vi.fn(() => Promise.resolve())
    act(() => estado.opciones?.onRegisteredSW?.('/quedada/sw.js', { update }))
    expect(update).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(60 * 60 * 1000)
    })
    expect(update).toHaveBeenCalledTimes(1)
    act(() => {
      vi.advanceTimersByTime(60 * 60 * 1000)
    })
    expect(update).toHaveBeenCalledTimes(2)
  })
})
