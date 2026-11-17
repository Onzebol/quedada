import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'
import { quedada } from './dominio/fabrica'
import { abrirPrimera } from './test/abrirPrimera'
import { RepositorioMemoria } from './test/repositorioMemoria'

function contador() {
  let n = 0
  return () => `id${++n}`
}

async function preparar(inicial = quedada({ id: 'q1', grupos: [{ id: 'g1', nombre: 'Cena', orden: 0 }] })) {
  const usuario = userEvent.setup()
  const repositorio = new RepositorioMemoria([inicial])
  abrirPrimera(repositorio)
  render(<App repositorio={repositorio} crearId={contador()} />)
  await usuario.click(await screen.findByRole('tab', { name: 'La casa' }))
  await screen.findByRole('region', { name: 'Asistentes' })
  return { usuario, repositorio }
}

afterEach(() => {
  window.location.hash = ''
})

const seccion = () => screen.getByRole('region', { name: 'Asistentes' })

async function anadir(usuario: ReturnType<typeof userEvent.setup>, familia: string, personas: string, llegada = '') {
  const f = within(seccion()).getByRole('form', { name: 'Nuevo asistente' })
  await usuario.type(within(f).getByRole('textbox', { name: 'Familia' }), familia)
  const campo = within(f).getByRole('spinbutton', { name: 'Personas' })
  await usuario.clear(campo)
  await usuario.type(campo, personas)
  if (llegada) await usuario.type(within(f).getByLabelText('Llegada'), llegada)
  await usuario.click(within(f).getByRole('button', { name: 'Añadir asistente' }))
}

describe('Asistentes', () => {
  it('añade familias, muestra el total y lo guarda', async () => {
    const { usuario, repositorio } = await preparar()
    expect(within(seccion()).getByText(/^\d+ asistentes?$/)).toHaveTextContent('0 asistentes')
    await anadir(usuario, 'Pérez', '4', '18:30')
    await anadir(usuario, 'Gil', '1')
    expect(within(seccion()).getByText(/^\d+ asistentes?$/)).toHaveTextContent('5 asistentes')
    expect((await repositorio.obtener('q1'))?.asistentes).toEqual([
      { id: 'id1', familia: 'Pérez', personas: 4, llegada: '18:30' },
      { id: 'id2', familia: 'Gil', personas: 1, llegada: null },
    ])
  })

  it('usa el singular con una sola persona', async () => {
    const { usuario } = await preparar()
    await anadir(usuario, 'Gil', '1')
    expect(within(seccion()).getByText(/^\d+ asistentes?$/)).toHaveTextContent('1 asistente')
    expect(within(seccion()).getByText(/^\d+ asistentes?$/)).not.toHaveTextContent('1 asistentes')
  })

  it('muestra el total de asistentes en la lista de la compra', async () => {
    const { usuario } = await preparar(
      quedada({ id: 'q1', asistentes: [{ id: 'a1', familia: 'Pérez', personas: 4, llegada: null }] }),
    )
    await usuario.click(screen.getByRole('tab', { name: 'Lista de la compra' }))
    expect(screen.getByText('Vienen 4 personas')).toBeInTheDocument()
    await usuario.click(screen.getByRole('tab', { name: 'La casa' }))
    await anadir(usuario, 'Gil', '3')
    await usuario.click(screen.getByRole('tab', { name: 'Lista de la compra' }))
    expect(screen.getByText('Vienen 7 personas')).toBeInTheDocument()
  })

  it('lista las familias por hora de llegada', async () => {
    const { usuario } = await preparar()
    await anadir(usuario, 'Tarde', '2', '21:00')
    await anadir(usuario, 'Pronto', '2', '09:15')
    const nombres = within(seccion())
      .getAllByRole('listitem')
      .map((li) => within(li).getByRole('textbox', { name: /^Familia de/ }))
      .map((i) => (i as HTMLInputElement).value)
    expect(nombres).toEqual(['Pronto', 'Tarde'])
  })

  it('edita personas y hora de llegada de una familia', async () => {
    const { usuario, repositorio } = await preparar(
      quedada({ id: 'q1', asistentes: [{ id: 'a1', familia: 'Pérez', personas: 2, llegada: null }] }),
    )
    const personas = within(seccion()).getByRole('spinbutton', { name: 'Personas de Pérez' })
    await usuario.clear(personas)
    await usuario.type(personas, '6')
    await usuario.type(within(seccion()).getByLabelText('Llegada de Pérez'), '19:45')
    const [a] = (await repositorio.obtener('q1'))!.asistentes
    expect(a).toMatchObject({ personas: 6, llegada: '19:45' })
  })

  it('borra una familia', async () => {
    const { usuario, repositorio } = await preparar(
      quedada({ id: 'q1', asistentes: [{ id: 'a1', familia: 'Pérez', personas: 2, llegada: null }] }),
    )
    await usuario.click(within(seccion()).getByRole('button', { name: 'Borrar Pérez' }))
    expect(screen.getByRole('dialog', { name: '¿Borrar la familia «Pérez»?' })).toBeInTheDocument()
    expect((await repositorio.obtener('q1'))?.asistentes).toHaveLength(1)

    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Sí, borrar' }))
    expect((await repositorio.obtener('q1'))?.asistentes).toEqual([])
    expect(within(seccion()).getByText(/^\d+ asistentes?$/)).toHaveTextContent('0 asistentes')
  })
})
