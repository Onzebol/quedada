import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'
import type { Usuario } from './autenticacion/tipos'
import { producto, quedada } from './dominio/fabrica'
import { AutenticacionMemoria } from './test/autenticacionMemoria'
import { abrirPrimera } from './test/abrirPrimera'
import { RepositorioMemoria } from './test/repositorioMemoria'

const ana: Usuario = { id: 'c1', nombre: 'Ana Pérez', foto: null }

const q = (cuenta: boolean) =>
  quedada({
    id: 'q1',
    asistentes: [
      { id: 'f1', familia: 'Pérez', personas: 2, llegada: null },
      { id: 'f2', familia: 'Gil', personas: 1, llegada: null },
    ],
    participantes: [
      { id: 'u1', nombre: 'Ana', familiaId: 'f1', ...(cuenta && { cuentaId: 'c1' }) },
      { id: 'u2', nombre: 'Luis', familiaId: 'f1' },
      { id: 'u3', nombre: 'Eva', familiaId: 'f2' },
    ],
    grupos: [{ id: 'g1', nombre: 'Cena', orden: 0 }],
    productos: [
      producto({ id: 'p1', nombre: 'Pan', compradorId: 'u2' }),
      producto({ id: 'p2', nombre: 'Vino', compradorId: 'u3' }),
    ],
    pagos: [
      { id: 'a1', familiaId: 'f1', importe: 10000, concepto: 'Reserva' },
      { id: 'a2', familiaId: 'f2', importe: 5000, concepto: 'Reserva' },
    ],
    gastos: [
      { id: 'x1', pagadorId: 'u1', concepto: 'Carne', importe: 3000 },
      { id: 'x2', pagadorId: 'u3', concepto: 'Hielo', importe: 500 },
    ],
  })

async function abrir(cuenta: boolean) {
  const usuario = userEvent.setup()
  const repositorio = new RepositorioMemoria([q(cuenta)])
  abrirPrimera(repositorio)
  render(<App repositorio={repositorio} autenticacion={new AutenticacionMemoria(ana, ana)} crearId={() => 'x'} />)
  await screen.findByRole('tab', { name: 'La casa' })
  return usuario
}

const mio = (el: HTMLElement) => el.closest('[data-mio]') !== null

afterEach(() => {
  window.location.hash = ''
})

describe('resaltar lo mío (#156)', () => {
  it('en «La casa» resalta mi familia (no sus personas) y no las demás', async () => {
    const usuario = await abrir(true)
    await usuario.click(screen.getByRole('button', { name: /^Pérez/ }))
    expect(mio(screen.getByRole('button', { name: /^Pérez/ }))).toBe(true)
    expect(within(screen.getByRole('list', { name: 'Personas de la familia Pérez' })).getByText('Luis').closest('li.persona')).not.toHaveAttribute('data-mio')
    expect(mio(screen.getByRole('button', { name: /^Gil/ }))).toBe(false)
  })

  it('en la lista de la compra resalta lo que me toca comprar a mí o a mi familia', async () => {
    const usuario = await abrir(true)
    await usuario.click(screen.getByRole('tab', { name: 'Lista de la compra' }))
    await usuario.click(await screen.findByRole('button', { name: /^Cena/ }))
    expect(mio(screen.getByRole('checkbox', { name: 'Pan' }))).toBe(true)
    expect(mio(screen.getByRole('checkbox', { name: 'Vino' }))).toBe(false)
  })

  it('en «Pagos» resalta los pagos de mi familia y los gastos míos', async () => {
    const usuario = await abrir(true)
    await usuario.click(screen.getByRole('tab', { name: 'Pagos' }))
    const pagos = screen.getByRole('list', { name: 'Pagos de la casa' })
    expect(pagos.querySelectorAll('[data-mio]')).toHaveLength(1)
    expect(mio(screen.getByText('Carne'))).toBe(true)
    expect(mio(screen.getByText('Hielo'))).toBe(false)
  })

  it('en el Resumen resalta mi familia', async () => {
    const usuario = await abrir(true)
    await usuario.click(screen.getByRole('tab', { name: 'Resumen' }))
    expect(mio(screen.getByRole('button', { name: /^Pérez/ }))).toBe(true)
    expect(mio(screen.getByRole('button', { name: /^Gil/ }))).toBe(false)
  })

  it('sin «Este soy yo» no resalta nada', async () => {
    const usuario = await abrir(false)
    await usuario.click(screen.getByRole('tab', { name: 'Pagos' }))
    expect(document.querySelector('[data-mio]')).toBeNull()
  })
})
