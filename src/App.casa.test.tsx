import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import type { Geocodificador } from './casa/mapa'
import { quedada } from './dominio/fabrica'
import { abrirPrimera } from './test/abrirPrimera'
import { RepositorioMemoria } from './test/repositorioMemoria'

function contador() {
  let n = 0
  return () => `id${++n}`
}

async function preparar(inicial = quedada({ id: 'q1' }), geocodificar?: Geocodificador) {
  const usuario = userEvent.setup()
  const repositorio = new RepositorioMemoria([inicial])
  abrirPrimera(repositorio)
  render(<App repositorio={repositorio} crearId={contador()} geocodificar={geocodificar} />)
  await usuario.click(await screen.findByRole('tab', { name: 'La casa' }))
  await screen.findByRole('region', { name: 'Datos de la casa' })
  return { usuario, repositorio }
}

afterEach(() => {
  window.location.hash = ''
})

const ficha = () => screen.getByRole('region', { name: 'Datos de la casa' })
const guardada = async (r: RepositorioMemoria) => (await r.obtener('q1'))!

describe('La casa: ficha', () => {
  it('guarda título, descripción, dirección y precio', async () => {
    const { usuario, repositorio } = await preparar()
    await usuario.type(within(ficha()).getByRole('textbox', { name: 'Título de la casa' }), 'Casa Almunia')
    await usuario.type(within(ficha()).getByRole('textbox', { name: 'Descripción de la casa' }), 'Piscina')
    await usuario.type(within(ficha()).getByRole('textbox', { name: 'Dirección de la casa' }), 'Calle Mayor 1')
    await usuario.type(within(ficha()).getByRole('textbox', { name: 'Precio de la casa (€)' }), '1250,5')
    await usuario.tab()
    const { casa } = await guardada(repositorio)
    expect(casa).toMatchObject({ titulo: 'Casa Almunia', descripcion: 'Piscina', direccion: 'Calle Mayor 1', precio: 125050 })
  })

  it('muestra los enlaces de la descripción como enlaces que abren en otra pestaña', async () => {
    await preparar(quedada({ id: 'q1', casa: { ...quedada().casa, descripcion: 'Fotos en https://casa.es/fotos, gracias' } }))
    const enlace = within(ficha()).getByRole('link', { name: 'https://casa.es/fotos' })
    expect(enlace).toHaveAttribute('href', 'https://casa.es/fotos')
    expect(enlace).toHaveAttribute('target', '_blank')
    expect(enlace).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it('sitúa la dirección en el mapa y muestra el mapa', async () => {
    const geocodificar = vi.fn<Geocodificador>().mockResolvedValue({ latitud: 41.6, longitud: -1.2 })
    const { usuario, repositorio } = await preparar(
      quedada({ id: 'q1', casa: { ...quedada().casa, direccion: 'Calle Mayor 1' } }),
      geocodificar,
    )
    expect(within(ficha()).queryByTitle('Mapa de la casa')).not.toBeInTheDocument()
    await usuario.click(within(ficha()).getByRole('button', { name: 'Situar en el mapa' }))
    expect(geocodificar).toHaveBeenCalledWith('Calle Mayor 1')
    const mapa = await within(ficha()).findByTitle('Mapa de la casa')
    expect(mapa).toHaveAttribute('src', expect.stringContaining('marker=41.6,-1.2'))
    expect((await guardada(repositorio)).casa).toMatchObject({ latitud: 41.6, longitud: -1.2 })
  })

  it('avisa si no encuentra la dirección o falla la búsqueda', async () => {
    const geocodificar = vi.fn<Geocodificador>().mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('red'))
    const { usuario } = await preparar(quedada({ id: 'q1', casa: { ...quedada().casa, direccion: 'Nowhere' } }), geocodificar)
    await usuario.click(within(ficha()).getByRole('button', { name: 'Situar en el mapa' }))
    expect(await within(ficha()).findByRole('alert')).toHaveTextContent('No se encontró esa dirección')
    await usuario.click(within(ficha()).getByRole('button', { name: 'Situar en el mapa' }))
    expect(await within(ficha()).findByText('No se pudo buscar la dirección. Inténtalo de nuevo.')).toBeInTheDocument()
  })

  it('no ofrece situar en el mapa sin dirección', async () => {
    await preparar()
    expect(within(ficha()).getByRole('button', { name: 'Situar en el mapa' })).toBeDisabled()
  })

  it('indica quién pagó la casa y cuánto paga cada participante', async () => {
    const { usuario, repositorio } = await preparar(
      quedada({
        id: 'q1',
        casa: { ...quedada().casa, precio: 90000 },
        participantes: [
          { id: 'a', nombre: 'Ana' },
          { id: 'b', nombre: 'Beto', porcentajeCasa: 50 },
        ],
      }),
    )
    const partes = within(ficha()).getByRole('list', { name: 'Lo que paga cada uno de la casa' })
    expect(within(partes).getByText(/Ana/)).toHaveTextContent(/600,00\s€/)
    expect(within(partes).getByText(/Beto/)).toHaveTextContent(/300,00\s€/)
    await usuario.selectOptions(within(ficha()).getByRole('combobox', { name: 'Quién pagó la casa' }), 'Ana')
    expect((await guardada(repositorio)).casa.pagadorId).toBe('a')
  })
})

describe('La casa: familias y componentes', () => {
  const conFamilia = () =>
    quedada({
      id: 'q1',
      asistentes: [{ id: 'f1', familia: 'Pérez', personas: 1, llegada: null }],
      participantes: [
        { id: 'a', nombre: 'Ana', familiaId: 'f1' },
        { id: 'z', nombre: 'Zoe' },
      ],
    })

  it('añade componentes a una familia y su número de personas los cuenta', async () => {
    const { usuario, repositorio } = await preparar(conFamilia())
    const form = screen.getByRole('form', { name: 'Nuevo componente de Pérez' })
    await usuario.type(within(form).getByRole('textbox', { name: 'Nombre' }), 'Beto')
    await usuario.click(within(form).getByRole('button', { name: 'Añadir componente a Pérez' }))
    const q = await guardada(repositorio)
    expect(q.participantes.map((p) => [p.nombre, p.familiaId])).toEqual([
      ['Ana', 'f1'],
      ['Zoe', undefined],
      ['Beto', 'f1'],
    ])
    expect(q.asistentes[0].personas).toBe(2)
    expect(screen.getByText(/^\d+ asistentes?$/)).toHaveTextContent('2 asistentes')
  })

  it('edita el nombre y lo que paga cada componente de casa y de los demás gastos', async () => {
    const { usuario, repositorio } = await preparar(conFamilia())
    const nombre = screen.getByRole('textbox', { name: 'Nombre de Ana' })
    await usuario.clear(nombre)
    await usuario.type(nombre, 'Anita')
    await usuario.tab()
    const casa = screen.getByRole('spinbutton', { name: '% de la casa de Anita' })
    await usuario.clear(casa)
    await usuario.type(casa, '50')
    const gastos = screen.getByRole('spinbutton', { name: '% de los demás gastos de Anita' })
    await usuario.clear(gastos)
    await usuario.type(gastos, '25')
    expect((await guardada(repositorio)).participantes[0]).toMatchObject({
      nombre: 'Anita',
      porcentajeCasa: 50,
      porcentajeComida: 25,
    })
  })

  it('quita un componente tras confirmar', async () => {
    const { usuario, repositorio } = await preparar(conFamilia())
    await usuario.click(screen.getByRole('button', { name: 'Quitar a Ana' }))
    expect(screen.getByRole('dialog', { name: '¿Quitar a «Ana»?' })).toBeInTheDocument()
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Sí, borrar' }))
    expect((await guardada(repositorio)).participantes.map((p) => p.id)).toEqual(['z'])
  })

  it('los participantes sin familia se pueden asignar a una', async () => {
    const { usuario, repositorio } = await preparar(conFamilia())
    const sin = screen.getByRole('list', { name: 'Participantes sin familia' })
    expect(within(sin).getByRole('textbox', { name: 'Nombre de Zoe' })).toBeInTheDocument()
    await usuario.selectOptions(within(sin).getByRole('combobox', { name: 'Familia de Zoe' }), 'Pérez')
    const q = await guardada(repositorio)
    expect(q.participantes.find((p) => p.id === 'z')?.familiaId).toBe('f1')
    expect(q.asistentes[0].personas).toBe(2)
  })
})
