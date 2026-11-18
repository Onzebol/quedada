import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { quedada } from '../dominio/fabrica'
import type { Quedada } from '../dominio/tipos'
import { Cuentas } from './Cuentas'

const q = (parcial: Partial<Quedada> = {}): Quedada =>
  quedada({
    casa: { ...quedada().casa, precio: 40000 },
    asistentes: [
      { id: 'f1', familia: 'Pérez', personas: 2, llegada: null },
      { id: 'f2', familia: 'Gómez', personas: 2, llegada: null },
    ],
    participantes: [
      { id: 'ana', nombre: 'Ana', familiaId: 'f1' },
      { id: 'beto', nombre: 'Beto', familiaId: 'f1' },
      { id: 'cris', nombre: 'Cris', familiaId: 'f2' },
      { id: 'dani', nombre: 'Dani', familiaId: 'f2' },
    ],
    pagos: [{ id: 'p1', familiaId: 'f1', concepto: 'Reserva', importe: 40000, pagado: true }],
    gastos: [{ id: 'g1', pagadorId: 'cris', concepto: 'Compra', importe: 4000 }],
    ...parcial,
  })

const euros = (texto: string) => new RegExp(texto.replace(' ', '[\\s\\u00a0]'))

function ficha(nombre: string) {
  return screen.getByRole('heading', { level: 4, name: nombre }).closest('li') as HTMLElement
}

describe('Cuentas', () => {
  it('muestra arriba el total pagado, lo pagado de la casa y los gastos', () => {
    render(<Cuentas quedada={q()} />)
    const totales = screen.getByRole('list', { name: 'Totales' })
    expect(within(totales).getByText('Total pagado').nextElementSibling).toHaveTextContent(euros('440,00 €'))
    expect(within(totales).getByText('Casa pagada').nextElementSibling).toHaveTextContent(euros('400,00 €'))
    expect(within(totales).getByText('Gastos').nextElementSibling).toHaveTextContent(euros('40,00 €'))
  })

  it('una ficha por familia, por orden alfabético, con lo pagado, lo que le toca y el saldo', () => {
    render(<Cuentas quedada={q()} />)
    const nombres = screen.getAllByRole('heading', { level: 4 }).map((h) => h.textContent)
    expect(nombres).toEqual(['Gómez', 'Pérez'])
    const perez = ficha('Pérez')
    expect(within(perez).getByText('Ha pagado').nextElementSibling).toHaveTextContent(euros('400,00 €'))
    expect(within(perez).getByText('Le toca').nextElementSibling).toHaveTextContent(euros('220,00 €'))
    expect(within(perez).getByText('Le deben').nextElementSibling).toHaveTextContent(euros('180,00 €'))
    expect(within(ficha('Gómez')).getByText('Debe').nextElementSibling).toHaveTextContent(euros('180,00 €'))
  })

  it('las fichas vienen contraídas y al abrirlas muestran a las personas con su desglose', async () => {
    render(<Cuentas quedada={q()} />)
    expect(screen.queryByText('Ana')).not.toBeInTheDocument()
    await userEvent.click(within(ficha('Pérez')).getByRole('button', { name: /Pérez/ }))
    const personas = within(ficha('Pérez')).getByRole('list', { name: 'Personas de Pérez' })
    const ana = within(personas).getByText('Ana').closest('li') as HTMLElement
    expect(within(ana).getByText('Ha pagado').nextElementSibling).toHaveTextContent(euros('200,00 €'))
    expect(within(ana).getByText('Casa').nextElementSibling).toHaveTextContent(euros('100,00 €'))
    expect(within(ana).getByText('Gastos').nextElementSibling).toHaveTextContent(euros('10,00 €'))
  })

  it('una persona sin familia es una ficha sin desplegable', () => {
    render(<Cuentas quedada={q({ asistentes: [], participantes: [{ id: 'ana', nombre: 'Ana' }], pagos: [] })} />)
    expect(within(ficha('Ana')).queryByRole('button')).not.toBeInTheDocument()
  })

  it('un grupo al día lo dice', () => {
    render(<Cuentas quedada={q({ asistentes: [], participantes: [{ id: 'ana', nombre: 'Ana' }], pagos: [], gastos: [] })} />)
    expect(within(ficha('Ana')).getByText('Al día')).toBeInTheDocument()
  })

  it('«Quién paga a quién» lista las transferencias, entre familias y no entre personas', () => {
    render(<Cuentas quedada={q()} />)
    const lista = screen.getByRole('list', { name: 'Quién paga a quién' })
    const filas = within(lista).getAllByRole('listitem').map((li) => li.textContent?.replace(/\s/g, ' '))
    expect(filas).toEqual(['Gómez paga 180,00 € a Pérez'])
  })

  it('sin nada que liquidar lo dice', () => {
    render(<Cuentas quedada={q({ pagos: [], gastos: [] })} />)
    expect(screen.getByText('No hay nada que liquidar')).toBeInTheDocument()
  })

  it('es de solo lectura', () => {
    render(<Cuentas quedada={q()} />)
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
  })
})
