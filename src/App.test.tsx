import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('muestra el nombre de la aplicación como título principal', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: 'Quedada' })).toBeInTheDocument()
  })

  it('anuncia las dos secciones del mínimo: compra y gastos', () => {
    render(<App />)
    expect(screen.getByText('Lista de la compra')).toBeInTheDocument()
    expect(screen.getByText('Gastos')).toBeInTheDocument()
  })
})
