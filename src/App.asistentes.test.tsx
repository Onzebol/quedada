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
    expect(screen.getByText('Vienen 4 personas')).toBeInTheDocument()
    await anadir(usuario, 'Gil', '3')
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
    expect((await repositorio.obtener('q1'))?.asistentes).toEqual([])
    expect(within(seccion()).getByText(/^\d+ asistentes?$/)).toHaveTextContent('0 asistentes')
  })
})

describe('Básicos', () => {
  const base = () =>
    quedada({
      id: 'q1',
      asistentes: [{ id: 'a1', familia: 'Pérez', personas: 2, llegada: null }],
      basicos: [
        { id: 'b1', nombre: 'Leche', asistenteId: null },
        { id: 'b2', nombre: 'Lavavajillas', asistenteId: 'a1' },
      ],
    })

  it('resume lo que queda sin asignar', async () => {
    await preparar(base())
    expect(within(seccion()).getByText('Sin asignar: Leche')).toBeInTheDocument()
  })

  it('avisa cuando todo está asignado', async () => {
    await preparar(quedada({ id: 'q1' }))
    expect(within(seccion()).getByText('Todos los básicos tienen quién los traiga')).toBeInTheDocument()
  })

  it('añade un básico', async () => {
    const { usuario, repositorio } = await preparar(base())
    await usuario.type(within(seccion()).getByRole('textbox', { name: 'Nombre del básico' }), 'Papel de cocina')
    await usuario.click(within(seccion()).getByRole('button', { name: 'Añadir básico' }))
    expect((await repositorio.obtener('q1'))?.basicos.map((b) => b.nombre)).toContain('Papel de cocina')
  })

  it('asigna un básico a una familia', async () => {
    const { usuario, repositorio } = await preparar(base())
    await usuario.selectOptions(within(seccion()).getByRole('combobox', { name: 'Quién trae Leche' }), 'Pérez')
    expect((await repositorio.obtener('q1'))?.basicos[0].asistenteId).toBe('a1')
    expect(within(seccion()).getByText('Todos los básicos tienen quién los traiga')).toBeInTheDocument()
  })

  it('borra un básico', async () => {
    const { usuario, repositorio } = await preparar(base())
    await usuario.click(within(seccion()).getByRole('button', { name: 'Borrar básico Leche' }))
    expect((await repositorio.obtener('q1'))?.basicos.map((b) => b.nombre)).toEqual(['Lavavajillas'])
  })
})
