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
  const alRenombrar = vi.fn()
  render(
    <Inicio quedadas={quedadas} alElegir={alElegir} alCrear={alCrear} alEliminar={alEliminar} alRenombrar={alRenombrar} />,
  )
  return { usuario: userEvent.setup(), alElegir, alCrear, alEliminar, alRenombrar }
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

  it('«Añadir quedada» abre una ventana modal y crea con el nombre escrito', async () => {
    const { usuario, alCrear } = preparar()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Añadir quedada' }))
    const ventana = screen.getByRole('dialog')
    await usuario.type(within(ventana).getByRole('textbox', { name: 'Nombre' }), '  Navidad  ')
    await usuario.click(within(ventana).getByRole('button', { name: 'Añadir' }))
    expect(alCrear).toHaveBeenCalledWith('Navidad')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('no crea una quedada sin nombre', async () => {
    const { usuario, alCrear } = preparar()
    await usuario.click(screen.getByRole('button', { name: 'Añadir quedada' }))
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Añadir' }))
    expect(alCrear).not.toHaveBeenCalled()
  })

  it('«Editar» abre una ventana modal con el nombre y renombra solo esa quedada', async () => {
    const { usuario, alRenombrar } = preparar()
    await usuario.click(screen.getByRole('button', { name: 'Editar Almunia 2025' }))
    const ventana = screen.getByRole('dialog')
    const campo = within(ventana).getByRole('textbox', { name: 'Nombre' })
    expect(campo).toHaveValue('Almunia 2025')
    await usuario.clear(campo)
    await usuario.type(campo, 'Almunia 2027')
    await usuario.click(within(ventana).getByRole('button', { name: 'Guardar' }))
    expect(alRenombrar).toHaveBeenCalledWith('b', 'Almunia 2027')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
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
