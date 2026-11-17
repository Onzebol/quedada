import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { quedada } from '../dominio/fabrica'
import { Inicio } from './Inicio'

const lista = () => [quedada({ id: 'a', nombre: 'Almunia 2026' }), quedada({ id: 'b', nombre: 'Almunia 2025' })]

function preparar(quedadas = lista()) {
  const alElegir = vi.fn()
  const alCrear = vi.fn()
  const alEliminar = vi.fn().mockResolvedValue(undefined)
  render(<Inicio quedadas={quedadas} alElegir={alElegir} alCrear={alCrear} alEliminar={alEliminar} />)
  return { usuario: userEvent.setup(), alElegir, alCrear, alEliminar }
}

describe('Inicio', () => {
  it('lista las quedadas y avisa si no hay ninguna', () => {
    preparar()
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      expect.stringContaining('Almunia 2026'),
      expect.stringContaining('Almunia 2025'),
    ])
  })

  it('sin quedadas muestra un aviso', () => {
    preparar([])
    expect(screen.getByText('Todavía no tienes ninguna quedada.')).toBeInTheDocument()
  })

  it('elegir una quedada la abre', async () => {
    const { usuario, alElegir } = preparar()
    await usuario.click(screen.getByRole('button', { name: 'Almunia 2025' }))
    expect(alElegir).toHaveBeenCalledWith('b')
  })

  it('crea una quedada con el nombre escrito y vacía el campo', async () => {
    const { usuario, alCrear } = preparar()
    const campo = screen.getByRole('textbox', { name: 'Nombre de la nueva quedada' })
    await usuario.type(campo, '  Navidad  ')
    await usuario.click(screen.getByRole('button', { name: 'Crear quedada' }))
    expect(alCrear).toHaveBeenCalledWith('Navidad')
    expect(campo).toHaveValue('')
  })

  it('no crea una quedada sin nombre', async () => {
    const { usuario, alCrear } = preparar()
    await usuario.click(screen.getByRole('button', { name: 'Crear quedada' }))
    expect(alCrear).not.toHaveBeenCalled()
  })

  it('elimina con confirmación y solo la quedada elegida', async () => {
    const { usuario, alEliminar } = preparar()
    await usuario.click(screen.getAllByRole('button', { name: /^Borrar quedada/ })[1])
    const aviso = screen.getByRole('dialog')
    expect(aviso).toHaveTextContent('«Almunia 2025»')
    expect(alEliminar).not.toHaveBeenCalled()
    await usuario.click(within(aviso).getByRole('button', { name: 'Sí, borrar' }))
    expect(alEliminar).toHaveBeenCalledWith('b')
  })
})
