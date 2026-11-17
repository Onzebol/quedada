import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AvisoActualizacion } from './AvisoActualizacion'

describe('AvisoActualizacion', () => {
  it('no muestra nada mientras no hay versión nueva', () => {
    const { container } = render(<AvisoActualizacion hayNueva={false} onActualizar={vi.fn()} onCerrar={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('avisa de que hay una versión nueva', () => {
    render(<AvisoActualizacion hayNueva onActualizar={vi.fn()} onCerrar={vi.fn()} />)
    expect(screen.getByRole('status')).toHaveTextContent('Hay una versión nueva de la aplicación')
  })

  it('«Actualizar» pide cargar la versión nueva', async () => {
    const onActualizar = vi.fn()
    render(<AvisoActualizacion hayNueva onActualizar={onActualizar} onCerrar={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar' }))
    expect(onActualizar).toHaveBeenCalledTimes(1)
  })

  it('«Más tarde» cierra el aviso sin actualizar', async () => {
    const onActualizar = vi.fn()
    const onCerrar = vi.fn()
    render(<AvisoActualizacion hayNueva onActualizar={onActualizar} onCerrar={onCerrar} />)
    await userEvent.click(screen.getByRole('button', { name: 'Más tarde' }))
    expect(onCerrar).toHaveBeenCalledTimes(1)
    expect(onActualizar).not.toHaveBeenCalled()
  })
})
