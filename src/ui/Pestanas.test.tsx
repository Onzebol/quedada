import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Pestanas } from './Pestanas'

const pestanas = [
  { id: 'a', titulo: 'Primera', contenido: <p>Contenido A</p> },
  { id: 'b', titulo: 'Segunda', contenido: <p>Contenido B</p> },
  { id: 'c', titulo: 'Tercera', contenido: <p>Contenido C</p> },
]

describe('Pestanas', () => {
  it('muestra las pestañas en orden y solo el contenido de la primera', () => {
    render(<Pestanas etiqueta="Secciones" pestanas={pestanas} />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((t) => t.textContent)).toEqual(['Primera', 'Segunda', 'Tercera'])
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel', { name: 'Primera' })).toHaveTextContent('Contenido A')
    expect(screen.queryByText('Contenido B')).not.toBeInTheDocument()
  })

  it('cambia de contenido al pulsar una pestaña', async () => {
    render(<Pestanas etiqueta="Secciones" pestanas={pestanas} />)
    await userEvent.click(screen.getByRole('tab', { name: 'Segunda' }))
    expect(screen.getByRole('tab', { name: 'Segunda' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel', { name: 'Segunda' })).toHaveTextContent('Contenido B')
    expect(screen.queryByText('Contenido A')).not.toBeInTheDocument()
  })

  it('se maneja con las flechas, Inicio y Fin', async () => {
    const usuario = userEvent.setup()
    render(<Pestanas etiqueta="Secciones" pestanas={pestanas} />)
    screen.getByRole('tab', { name: 'Primera' }).focus()
    await usuario.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Segunda' })).toHaveFocus()
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Contenido B')
    await usuario.keyboard('{End}')
    expect(screen.getByRole('tab', { name: 'Tercera' })).toHaveFocus()
    await usuario.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Primera' })).toHaveFocus()
    await usuario.keyboard('{ArrowLeft}')
    expect(screen.getByRole('tab', { name: 'Tercera' })).toHaveFocus()
    await usuario.keyboard('{Home}')
    expect(screen.getByRole('tab', { name: 'Primera' })).toHaveFocus()
  })
})
