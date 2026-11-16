import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AutenticacionMemoria } from '../test/autenticacionMemoria'
import { PantallaEntrada } from './PantallaEntrada'

const ana = { id: 'u1', nombre: 'Ana', foto: null }

describe('PantallaEntrada', () => {
  it('solo ofrece entrar con Google', () => {
    render(<PantallaEntrada autenticacion={new AutenticacionMemoria(ana)} />)
    expect(screen.getByRole('heading', { name: 'Quedada' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Entrar con Google' })).toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(1)
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
})
