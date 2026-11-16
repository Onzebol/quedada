import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Modal } from './Modal'

function Probar({ alCerrar = () => {} }: { alCerrar?: () => void }) {
  const [abierta, setAbierta] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setAbierta(true)}>
        Abrir
      </button>
      {abierta && (
        <Modal
          titulo="¿Seguro?"
          descripcion="Esto no se puede deshacer."
          onCerrar={() => {
            setAbierta(false)
            alCerrar()
          }}
        >
          <button type="button">Primero</button>
          <button type="button">Segundo</button>
          <button type="button" data-autofocus>
            Cancelar
          </button>
        </Modal>
      )}
    </>
  )
}

async function abrir() {
  const usuario = userEvent.setup()
  render(<Probar />)
  await usuario.click(screen.getByRole('button', { name: 'Abrir' }))
  return usuario
}

describe('Modal', () => {
  it('es un diálogo modal con nombre y descripción accesibles', async () => {
    await abrir()
    const dialogo = screen.getByRole('dialog', { name: '¿Seguro?' })
    expect(dialogo).toHaveAttribute('aria-modal', 'true')
    expect(dialogo).toHaveAccessibleDescription('Esto no se puede deshacer.')
  })

  it('lleva el foco al elemento marcado como inicial', async () => {
    await abrir()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus()
  })

  it('se cierra con Esc', async () => {
    const alCerrar = vi.fn()
    const usuario = userEvent.setup()
    render(<Probar alCerrar={alCerrar} />)
    await usuario.click(screen.getByRole('button', { name: 'Abrir' }))
    await usuario.keyboard('{Escape}')
    expect(alCerrar).toHaveBeenCalledOnce()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('se cierra al pulsar fuera, pero no al pulsar dentro', async () => {
    const alCerrar = vi.fn()
    const usuario = userEvent.setup()
    render(<Probar alCerrar={alCerrar} />)
    await usuario.click(screen.getByRole('button', { name: 'Abrir' }))

    await usuario.click(screen.getByRole('dialog'))
    await usuario.click(screen.getByRole('button', { name: 'Primero' }))
    expect(alCerrar).not.toHaveBeenCalled()

    await usuario.click(screen.getByRole('dialog').parentElement!)
    expect(alCerrar).toHaveBeenCalledOnce()
  })

  it('el foco no sale de la ventana con Tab ni con Mayús+Tab', async () => {
    const usuario = await abrir()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus()

    // Tab desde el último vuelve al primero.
    await usuario.tab()
    expect(screen.getByRole('button', { name: 'Primero' })).toHaveFocus()

    // Mayús+Tab desde el primero va al último.
    await usuario.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus()
    await usuario.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Segundo' })).toHaveFocus()
  })

  it('al cerrar devuelve el foco al botón que la abrió', async () => {
    const usuario = await abrir()
    await usuario.keyboard('{Escape}')
    expect(screen.getByRole('button', { name: 'Abrir' })).toHaveFocus()
  })

  it('bloquea el scroll de la página mientras está abierta y lo libera al cerrar', async () => {
    const usuario = await abrir()
    expect(document.body.style.overflow).toBe('hidden')
    await usuario.keyboard('{Escape}')
    expect(document.body.style.overflow).toBe('')
  })
})
