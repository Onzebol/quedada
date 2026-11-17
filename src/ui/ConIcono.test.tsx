import { render, screen } from '@testing-library/react'
import { Plus } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import { ConIcono } from './ConIcono'

describe('ConIcono', () => {
  it('mantiene el texto como nombre accesible y oculta el icono a los lectores', () => {
    render(
      <button type="button">
        <ConIcono icono={Plus}>Añadir</ConIcono>
      </button>,
    )
    const boton = screen.getByRole('button', { name: 'Añadir' })
    expect(boton.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('marca el texto para poder ocultarlo en móvil sin quitarlo del DOM', () => {
    render(<ConIcono icono={Plus}>Añadir</ConIcono>)
    expect(screen.getByText('Añadir')).toHaveClass('icono-texto')
  })
})
