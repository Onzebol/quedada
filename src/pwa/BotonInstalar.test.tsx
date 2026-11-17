import { act, render, screen, waitFor } from '@testing-library/react'
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
})
