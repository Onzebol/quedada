import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BotonInstalar } from './BotonInstalar'

/** Simula el evento que lanza el navegador cuando permite instalar la aplicación. */
function lanzarInstalable(resultado: 'accepted' | 'dismissed' = 'accepted') {
  const evento = new Event('beforeinstallprompt', { cancelable: true }) as Event & {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: string }>
  }
  evento.prompt = vi.fn(() => Promise.resolve())
  evento.userChoice = Promise.resolve({ outcome: resultado })
  act(() => {
    window.dispatchEvent(evento)
  })
  return evento
}

function simularModo(standalone: boolean) {
  vi.stubGlobal('matchMedia', (consulta: string) => ({
    matches: standalone && consulta.includes('standalone'),
    media: consulta,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

/** Simula el navegador de un dispositivo (en iOS no existe `beforeinstallprompt`). */
function simularNavegador(datos: { userAgent: string; platform?: string; maxTouchPoints?: number; standalone?: boolean }) {
  vi.stubGlobal('navigator', { platform: '', maxTouchPoints: 0, ...datos })
}

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
// Un iPad reciente se presenta como un Mac: solo lo delata la pantalla táctil.
const IPAD_COMO_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15'
const MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('BotonInstalar', () => {
  it('no sale mientras el navegador no permita instalar', () => {
    render(<BotonInstalar />)
    expect(screen.queryByRole('button', { name: 'Instalar' })).not.toBeInTheDocument()
  })

  it('sale cuando el navegador permite instalar y evita su mini aviso propio', () => {
    render(<BotonInstalar />)
    const evento = lanzarInstalable()
    expect(screen.getByRole('button', { name: 'Instalar' })).toBeInTheDocument()
    expect(evento.defaultPrevented).toBe(true)
  })

  it('al pulsarlo abre el diálogo de instalación y después desaparece', async () => {
    render(<BotonInstalar />)
    const evento = lanzarInstalable('accepted')
    await userEvent.click(screen.getByRole('button', { name: 'Instalar' }))
    expect(evento.prompt).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Instalar' })).not.toBeInTheDocument())
  })

  it('si se rechaza el diálogo, también desaparece (el navegador no deja reutilizar el evento)', async () => {
    render(<BotonInstalar />)
    lanzarInstalable('dismissed')
    await userEvent.click(screen.getByRole('button', { name: 'Instalar' }))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Instalar' })).not.toBeInTheDocument())
  })

  it('desaparece cuando la aplicación se instala por otra vía', () => {
    render(<BotonInstalar />)
    lanzarInstalable()
    act(() => {
      window.dispatchEvent(new Event('appinstalled'))
    })
    expect(screen.queryByRole('button', { name: 'Instalar' })).not.toBeInTheDocument()
  })

  it('no sale si ya está abierta como aplicación instalada', () => {
    simularModo(true)
    render(<BotonInstalar />)
    lanzarInstalable()
    expect(screen.queryByRole('button', { name: 'Instalar' })).not.toBeInTheDocument()
  })

  describe('en iOS (sin instalación propia del navegador)', () => {
    it('sale «Instalar» y abre una ventana con los pasos', async () => {
      simularNavegador({ userAgent: IPHONE, platform: 'iPhone', maxTouchPoints: 5, standalone: false })
      render(<BotonInstalar />)
      await userEvent.click(screen.getByRole('button', { name: 'Instalar' }))
      const ventana = screen.getByRole('dialog', { name: 'Instalar en iOS' })
      expect(ventana).toHaveTextContent('Compartir')
      expect(ventana).toHaveTextContent('Añadir a pantalla de inicio')
      await userEvent.click(within(ventana).getByRole('button', { name: 'Entendido' }))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('también en un iPad que se presenta como Mac', () => {
      simularNavegador({ userAgent: IPAD_COMO_MAC, platform: 'MacIntel', maxTouchPoints: 5 })
      render(<BotonInstalar />)
      expect(screen.getByRole('button', { name: 'Instalar' })).toBeInTheDocument()
    })

    it('no sale en un Mac de verdad (sin pantalla táctil)', () => {
      simularNavegador({ userAgent: MAC, platform: 'MacIntel', maxTouchPoints: 0 })
      render(<BotonInstalar />)
      expect(screen.queryByRole('button', { name: 'Instalar' })).not.toBeInTheDocument()
    })

    it('no sale si ya está abierta desde la pantalla de inicio', () => {
      simularNavegador({ userAgent: IPHONE, platform: 'iPhone', maxTouchPoints: 5, standalone: true })
      render(<BotonInstalar />)
      expect(screen.queryByRole('button', { name: 'Instalar' })).not.toBeInTheDocument()
    })
  })
})
