import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BotonBorrar } from './BotonBorrar'

function montar(onConfirmar: () => void | Promise<void> = () => {}) {
  render(
    <BotonBorrar
      texto="Borrar"
      etiqueta="Borrar Sidra"
      titulo="¿Borrar «Sidra»?"
      mensaje="Se borrará de la lista."
      onConfirmar={onConfirmar}
    />,
  )
  return userEvent.setup()
}

const dialogo = () => screen.getByRole('dialog', { name: '¿Borrar «Sidra»?' })

describe('BotonBorrar', () => {
  it('no borra nada hasta confirmar: el botón abre una ventana modal con el aviso', async () => {
    const onConfirmar = vi.fn()
    const usuario = montar(onConfirmar)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Borrar Sidra' }))
    expect(dialogo()).toHaveTextContent('Se borrará de la lista.')
    expect(onConfirmar).not.toHaveBeenCalled()
  })

  it('Cancelar cierra sin borrar y devuelve el foco al botón', async () => {
    const onConfirmar = vi.fn()
    const usuario = montar(onConfirmar)
    await usuario.click(screen.getByRole('button', { name: 'Borrar Sidra' }))
    await usuario.click(within(dialogo()).getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onConfirmar).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Borrar Sidra' })).toHaveFocus()
  })

  it('al abrir el foco está en Cancelar, la opción segura', async () => {
    const usuario = montar()
    await usuario.click(screen.getByRole('button', { name: 'Borrar Sidra' }))
    expect(within(dialogo()).getByRole('button', { name: 'Cancelar' })).toHaveFocus()
  })

  it('confirmar borra y cierra la ventana', async () => {
    const onConfirmar = vi.fn()
    const usuario = montar(onConfirmar)
    await usuario.click(screen.getByRole('button', { name: 'Borrar Sidra' }))
    await usuario.click(within(dialogo()).getByRole('button', { name: 'Sí, borrar' }))

    expect(onConfirmar).toHaveBeenCalledOnce()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('si falla el borrado la ventana sigue abierta con el aviso', async () => {
    const usuario = montar(async () => {
      throw new Error('sin permiso')
    })
    await usuario.click(screen.getByRole('button', { name: 'Borrar Sidra' }))
    await usuario.click(within(dialogo()).getByRole('button', { name: 'Sí, borrar' }))

    expect(await within(dialogo()).findByRole('alert')).toHaveTextContent('No se pudo borrar')
    expect(dialogo()).toBeInTheDocument()
  })

  it('mientras se borra no se puede confirmar dos veces ni cerrar', async () => {
    let terminar = () => {}
    const onConfirmar = vi.fn(() => new Promise<void>((resolver) => (terminar = resolver)))
    const usuario = montar(onConfirmar)
    await usuario.click(screen.getByRole('button', { name: 'Borrar Sidra' }))
    const confirmar = within(dialogo()).getByRole('button', { name: 'Sí, borrar' })
    await usuario.click(confirmar)
    await usuario.click(confirmar)

    expect(onConfirmar).toHaveBeenCalledOnce()
    expect(confirmar).toBeDisabled()
    await usuario.keyboard('{Escape}')
    expect(dialogo()).toBeInTheDocument()

    terminar()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('usa el texto de confirmación indicado', async () => {
    render(<BotonBorrar texto="Eliminar quedada" titulo="¿Eliminar?" textoConfirmar="Sí, eliminar" onConfirmar={() => {}} />)
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Eliminar quedada' }))
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Sí, eliminar' })).toBeInTheDocument()
  })
})
