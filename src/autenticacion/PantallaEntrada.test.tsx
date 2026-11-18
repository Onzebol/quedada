import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AutenticacionMemoria } from '../test/autenticacionMemoria'
import { recuperarEnlacePendiente } from './enlacePendiente'
import { PantallaEntrada } from './PantallaEntrada'

const ana = { id: 'u1', nombre: 'Ana', foto: null }

describe('PantallaEntrada', () => {
  it('solo ofrece entrar con Google', () => {
    render(<PantallaEntrada autenticacion={new AutenticacionMemoria(ana)} />)
    expect(screen.getByRole('heading', { name: 'Quedada' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Entrar con Google' })).toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(1)
  })

  it('el botón de entrar muestra siempre el texto, también en móvil (#141)', () => {
    render(<PantallaEntrada autenticacion={new AutenticacionMemoria(ana)} />)
    expect(screen.getByRole('button', { name: 'Entrar con Google' })).toHaveClass('con-texto')
  })

  it('al pulsar inicia el flujo de entrada', async () => {
    const auth = new AutenticacionMemoria(ana)
    const entrar = vi.spyOn(auth, 'entrar')
    render(<PantallaEntrada autenticacion={auth} />)
    await userEvent.click(screen.getByRole('button', { name: 'Entrar con Google' }))
    expect(entrar).toHaveBeenCalledOnce()
  })

  it('avisa si falla la entrada', async () => {
    render(<PantallaEntrada autenticacion={new AutenticacionMemoria(null)} />)
    await userEvent.click(screen.getByRole('button', { name: 'Entrar con Google' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo iniciar sesión')
  })

  it('sin configuración no hay botón y lo explica', () => {
    render(<PantallaEntrada autenticacion={new AutenticacionMemoria(ana, null, false)} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Falta la configuración')
  })

  describe('enlace abierto sin sesión (#140)', () => {
    afterEach(() => {
      window.location.hash = ''
      window.localStorage.clear()
    })

    it('antes de ir a Google recuerda la invitación abierta, para recuperarla al volver', async () => {
      window.location.hash = '#/unirse/abc123'
      render(<PantallaEntrada autenticacion={new AutenticacionMemoria(ana)} />)
      await userEvent.click(screen.getByRole('button', { name: 'Entrar con Google' }))
      expect(recuperarEnlacePendiente('')).toBe('#/unirse/abc123')
    })

    it('también recuerda el enlace a una quedada', async () => {
      window.location.hash = '#/q1'
      render(<PantallaEntrada autenticacion={new AutenticacionMemoria(ana)} />)
      await userEvent.click(screen.getByRole('button', { name: 'Entrar con Google' }))
      expect(recuperarEnlacePendiente('')).toBe('#/q1')
    })

    it('sin enlace no guarda nada', async () => {
      render(<PantallaEntrada autenticacion={new AutenticacionMemoria(ana)} />)
      await userEvent.click(screen.getByRole('button', { name: 'Entrar con Google' }))
      expect(recuperarEnlacePendiente('')).toBeNull()
    })
  })
})
