import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import type { Geocodificador } from './casa/mapa'
import { quedada } from './dominio/fabrica'
import { leaflet } from './test/leafletFalso'
import { abrirPrimera } from './test/abrirPrimera'
import { RepositorioMemoria } from './test/repositorioMemoria'

vi.mock('leaflet', async () => (await import('./test/leafletFalso')).leafletFalso)
vi.mock('leaflet/dist/leaflet.css', () => ({}))

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
  leaflet.mapa = null
  leaflet.marcador = null
})

const ficha = () => screen.getByRole('region', { name: 'Datos de la casa' })
const guardada = async (r: RepositorioMemoria) => (await r.obtener('q1'))!

type Usuario = ReturnType<typeof userEvent.setup>

async function editar(usuario: Usuario) {
  await usuario.click(within(ficha()).getByRole('button', { name: 'Editar la casa' }))
  return screen.getByRole('form', { name: 'Editar la casa' })
}

const casaCon = (parcial: Partial<ReturnType<typeof quedada>['casa']>) => ({ ...quedada().casa, ...parcial })

describe('La casa: ficha', () => {
  it('se ve como información, sin campos para editar, y con un botón de edición', async () => {
    await preparar(
      quedada({
        id: 'q1',
        casa: casaCon({ titulo: 'Casa Almunia', descripcion: 'Piscina', direccion: 'Calle Mayor 1', precio: 125050 }),
      }),
    )
    expect(within(ficha()).getByRole('heading', { name: 'Casa Almunia' })).toBeInTheDocument()
    expect(within(ficha()).getByText('Piscina')).toBeInTheDocument()
    expect(within(ficha()).getByText(/Calle Mayor 1/)).toBeInTheDocument()
    expect(within(ficha()).getByText(/Precio:/).parentElement).toHaveTextContent(/1\.250,50\s€/)
    expect(within(ficha()).queryByText(/pagado por/)).not.toBeInTheDocument()
    expect(within(ficha()).queryByRole('textbox')).not.toBeInTheDocument()
    expect(within(ficha()).queryByRole('combobox')).not.toBeInTheDocument()
    expect(within(ficha()).getByRole('button', { name: 'Editar la casa' })).toBeInTheDocument()
  })

  it('Editar cambia al formulario y Guardar guarda todo y vuelve a la información', async () => {
    const { usuario, repositorio } = await preparar()
    const form = await editar(usuario)
    expect(within(ficha()).queryByRole('button', { name: 'Editar la casa' })).not.toBeInTheDocument()
    await usuario.type(within(form).getByRole('textbox', { name: 'Título de la casa' }), 'Casa Almunia')
    await usuario.type(within(form).getByRole('textbox', { name: 'Descripción de la casa' }), 'Piscina')
    await usuario.type(within(form).getByRole('textbox', { name: 'Dirección de la casa' }), 'Calle Mayor 1')
    await usuario.type(within(form).getByRole('textbox', { name: 'Precio de la casa (€)' }), '1250,5')
    expect((await guardada(repositorio)).casa.titulo).toBe('')
    await usuario.click(within(form).getByRole('button', { name: 'Guardar' }))
    expect((await guardada(repositorio)).casa).toMatchObject({
      titulo: 'Casa Almunia',
      descripcion: 'Piscina',
      direccion: 'Calle Mayor 1',
      precio: 125050,
    })
    expect(screen.queryByRole('form', { name: 'Editar la casa' })).not.toBeInTheDocument()
    expect(within(ficha()).getByRole('heading', { name: 'Casa Almunia' })).toBeInTheDocument()
    expect(within(ficha()).getByRole('button', { name: 'Editar la casa' })).toBeInTheDocument()
  })

  it('Cancelar vuelve a la información sin guardar', async () => {
    const { usuario, repositorio } = await preparar(quedada({ id: 'q1', casa: casaCon({ titulo: 'Casa' }) }))
    const form = await editar(usuario)
    await usuario.type(within(form).getByRole('textbox', { name: 'Título de la casa' }), ' nueva')
    await usuario.click(within(form).getByRole('button', { name: 'Cancelar' }))
    expect((await guardada(repositorio)).casa.titulo).toBe('Casa')
    expect(within(ficha()).getByRole('heading', { name: 'Casa' })).toBeInTheDocument()
  })

  it('un precio que no es un número no se guarda y avisa', async () => {
    const { usuario, repositorio } = await preparar()
    const form = await editar(usuario)
    await usuario.type(within(form).getByRole('textbox', { name: 'Precio de la casa (€)' }), 'mucho')
    await usuario.click(within(form).getByRole('button', { name: 'Guardar' }))
    expect(within(form).getByRole('alert')).toHaveTextContent('El precio no es válido')
    expect((await guardada(repositorio)).casa.precio).toBeNull()
  })

  it('muestra los enlaces de la descripción como enlaces que abren en otra pestaña', async () => {
    await preparar(quedada({ id: 'q1', casa: casaCon({ descripcion: 'Fotos en https://casa.es/fotos, gracias' }) }))
    const enlace = within(ficha()).getByRole('link', { name: 'https://casa.es/fotos' })
    expect(enlace).toHaveAttribute('href', 'https://casa.es/fotos')
    expect(enlace).toHaveAttribute('target', '_blank')
    expect(enlace).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it('sitúa la dirección en el mapa; el mapa se ve en la información al guardar', async () => {
    const geocodificar = vi.fn<Geocodificador>().mockResolvedValue({ latitud: 41.6, longitud: -1.2 })
    const { usuario, repositorio } = await preparar(quedada({ id: 'q1', casa: casaCon({ direccion: 'Calle Mayor 1' }) }), geocodificar)
    expect(within(ficha()).queryByTitle('Mapa de la casa')).not.toBeInTheDocument()
    const form = await editar(usuario)
    await usuario.click(within(form).getByRole('button', { name: 'Situar en el mapa' }))
    expect(geocodificar).toHaveBeenCalledWith('Calle Mayor 1')
    expect(await within(form).findByLabelText(/Mapa de la casa/)).toBeInTheDocument()
    await waitFor(() => expect(leaflet.marcador?.posicion).toEqual({ lat: 41.6, lng: -1.2 }))
    await usuario.click(within(form).getByRole('button', { name: 'Guardar' }))
    expect((await guardada(repositorio)).casa).toMatchObject({ direccion: 'Calle Mayor 1', latitud: 41.6, longitud: -1.2 })
    expect(within(ficha()).getByTitle('Mapa de la casa')).toBeInTheDocument()
  })

  it('el botón de la app de mapas solo aparece en el móvil, y no el enlace a OpenStreetMap', async () => {
    const q = () => quedada({ id: 'q1', casa: casaCon({ titulo: 'Casa', direccion: 'A', latitud: 41.6, longitud: -1.2 }) })
    await preparar(q())
    expect(within(ficha()).getByTitle('Mapa de la casa')).toBeInTheDocument()
    expect(within(ficha()).queryByRole('link', { name: /app de mapas/ })).not.toBeInTheDocument()
    expect(within(ficha()).queryByRole('link', { name: /OpenStreetMap/ })).not.toBeInTheDocument()
  })

  it('en un móvil Android ofrece abrir la casa en la app de mapas', async () => {
    const agente = vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Linux; Android 14) Mobile Safari/537.36')
    try {
      await preparar(quedada({ id: 'q1', casa: casaCon({ titulo: 'Casa', direccion: 'A', latitud: 41.6, longitud: -1.2 }) }))
      expect(within(ficha()).getByRole('link', { name: 'Abrir en la app de mapas' })).toHaveAttribute('href', 'geo:41.6,-1.2?q=41.6,-1.2(Casa)')
      expect(within(ficha()).queryByRole('link', { name: /OpenStreetMap/ })).not.toBeInTheDocument()
    } finally {
      agente.mockRestore()
    }
  })

  it('la ficha tiene «Centrar en la casa», que devuelve el mapa a la casa', async () => {
    await preparar(quedada({ id: 'q1', casa: casaCon({ titulo: 'Casa', direccion: 'A', latitud: 41.6, longitud: -1.2 }) }))
    const antes = within(ficha()).getByTitle('Mapa de la casa')
    await userEvent.click(within(ficha()).getByRole('button', { name: 'Centrar en la casa' }))
    const despues = within(ficha()).getByTitle('Mapa de la casa')
    expect(despues).not.toBe(antes)
    expect(despues).toHaveAttribute('src', antes.getAttribute('src'))
  })

  it('el marcador se puede mover solo al editar, y la nueva posición se guarda', async () => {
    const { usuario, repositorio } = await preparar(
      quedada({ id: 'q1', casa: casaCon({ titulo: 'Casa', direccion: 'A', latitud: 41.6, longitud: -1.2 }) }),
    )
    // En la ficha el mapa es de solo lectura: no hay marcador que mover.
    expect(within(ficha()).getByTitle('Mapa de la casa')).toBeInTheDocument()
    expect(leaflet.marcador).toBeNull()
    const form = await editar(usuario)
    await waitFor(() => expect(leaflet.marcador).not.toBeNull())
    act(() => leaflet.arrastrar(41.65, -1.25))
    await usuario.click(within(form).getByRole('button', { name: 'Guardar' }))
    expect((await guardada(repositorio)).casa).toMatchObject({ direccion: 'A', latitud: 41.65, longitud: -1.25 })
    expect(within(ficha()).getByTitle('Mapa de la casa')).toHaveAttribute('src', expect.stringContaining('marker=41.65,-1.25'))
  })

  it('si se cancela, la posición del marcador no se guarda', async () => {
    const { usuario, repositorio } = await preparar(
      quedada({ id: 'q1', casa: casaCon({ direccion: 'A', latitud: 41.6, longitud: -1.2 }) }),
    )
    const form = await editar(usuario)
    await waitFor(() => expect(leaflet.marcador).not.toBeNull())
    act(() => leaflet.arrastrar(10, 10))
    await usuario.click(within(form).getByRole('button', { name: 'Cancelar' }))
    expect((await guardada(repositorio)).casa).toMatchObject({ latitud: 41.6, longitud: -1.2 })
  })

  it('si se cambia la dirección, el mapa anterior desaparece hasta volver a situarla', async () => {
    const { usuario, repositorio } = await preparar(
      quedada({ id: 'q1', casa: casaCon({ direccion: 'A', latitud: 1, longitud: 2 }) }),
    )
    const form = await editar(usuario)
    expect(within(form).getByLabelText(/Mapa de la casa/)).toBeInTheDocument()
    await usuario.type(within(form).getByRole('textbox', { name: 'Dirección de la casa' }), 'B')
    expect(within(form).queryByLabelText(/Mapa de la casa/)).not.toBeInTheDocument()
    await usuario.click(within(form).getByRole('button', { name: 'Guardar' }))
    expect((await guardada(repositorio)).casa).toMatchObject({ direccion: 'AB', latitud: null, longitud: null })
  })

  it('avisa si no encuentra la dirección o falla la búsqueda', async () => {
    const geocodificar = vi.fn<Geocodificador>().mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('red'))
    const { usuario } = await preparar(quedada({ id: 'q1', casa: casaCon({ direccion: 'Nowhere' }) }), geocodificar)
    const form = await editar(usuario)
    await usuario.click(within(form).getByRole('button', { name: 'Situar en el mapa' }))
    expect(await within(form).findByRole('alert')).toHaveTextContent('No se encontró esa dirección')
    await usuario.click(within(form).getByRole('button', { name: 'Situar en el mapa' }))
    expect(await within(form).findByText('No se pudo buscar la dirección. Inténtalo de nuevo.')).toBeInTheDocument()
  })

  it('no ofrece situar en el mapa sin dirección', async () => {
    const { usuario } = await preparar()
    const form = await editar(usuario)
    expect(within(form).getByRole('button', { name: 'Situar en el mapa' })).toBeDisabled()
  })

  it('no muestra aquí lo que paga cada uno ni quién la pagó: eso va en el Resumen y en Pagos', async () => {
    const { usuario } = await preparar(
      quedada({
        id: 'q1',
        casa: casaCon({ precio: 90000, pagadorId: 'a' }),
        participantes: [{ id: 'a', nombre: 'Ana' }],
      }),
    )
    expect(within(ficha()).queryByRole('list', { name: 'Lo que paga cada uno de la casa' })).not.toBeInTheDocument()
    expect(within(ficha()).queryByText(/Lo que paga cada uno/)).not.toBeInTheDocument()
    expect(within(ficha()).queryByText(/pagado por|no entra en las cuentas/)).not.toBeInTheDocument()
    const form = await editar(usuario)
    expect(within(form).queryByRole('combobox', { name: 'Quién pagó la casa' })).not.toBeInTheDocument()
  })
})

describe('Resumen: lo que paga cada uno de la casa', () => {
  async function abrirResumen(inicial: ReturnType<typeof quedada>) {
    const { usuario } = await preparar(inicial)
    await usuario.click(screen.getByRole('tab', { name: 'Resumen' }))
    return screen.getByRole('region', { name: 'Cuentas' })
  }

  it('lista lo que le toca a cada participante del precio de la casa, según su % de casa', async () => {
    const cuentas = await abrirResumen(
      quedada({
        id: 'q1',
        casa: casaCon({ precio: 90000 }),
        participantes: [
          { id: 'a', nombre: 'Ana' },
          { id: 'b', nombre: 'Beto', porcentajeCasa: 50 },
        ],
      }),
    )
    const partes = within(cuentas).getByRole('list', { name: 'Lo que paga cada uno de la casa' })
    expect(within(partes).getByText(/Ana/)).toHaveTextContent(/600,00\s€/)
    expect(within(partes).getByText(/Beto/)).toHaveTextContent(/300,00\s€/)
  })

  it('sin precio de la casa no aparece la sección', async () => {
    const cuentas = await abrirResumen(quedada({ id: 'q1', participantes: [{ id: 'a', nombre: 'Ana' }] }))
    expect(within(cuentas).queryByText(/Lo que paga cada uno de la casa/)).not.toBeInTheDocument()
  })
})

describe('Pagos', () => {
  const conPrecio = (pagadorId: string | null) =>
    quedada({
      id: 'q1',
      casa: casaCon({ precio: 90000, pagadorId }),
      participantes: [
        { id: 'a', nombre: 'Ana' },
        { id: 'b', nombre: 'Beto' },
      ],
    })

  async function abrirPagos(inicial = conPrecio(null)) {
    const { usuario, repositorio } = await preparar(inicial)
    await usuario.click(screen.getByRole('tab', { name: 'Pagos' }))
    return { usuario, repositorio, panel: screen.getByRole('region', { name: 'Pago de la casa' }) }
  }

  it('indica quién pagó la casa y lo guarda', async () => {
    const { usuario, repositorio, panel } = await abrirPagos()
    expect(within(panel).getByText(/900,00\s€/)).toBeInTheDocument()
    expect(within(panel).getByText(/no entra en las cuentas/)).toBeInTheDocument()
    await usuario.selectOptions(within(panel).getByRole('combobox', { name: 'Quién pagó la casa' }), 'Ana')
    expect((await guardada(repositorio)).casa.pagadorId).toBe('a')
    expect(within(panel).queryByText(/no entra en las cuentas/)).not.toBeInTheDocument()
  })

  it('«Quién pagó la casa» ofrece primero Nadie todavía y luego los nombres por orden alfabético', async () => {
    const { panel } = await abrirPagos()
    const selector = within(panel).getByRole('combobox', { name: 'Quién pagó la casa' })
    const opciones = Array.from((selector as HTMLSelectElement).options).map((o) => o.textContent)
    expect(opciones[0]).toBe('Nadie todavía')
    expect(opciones.slice(1)).toEqual([...opciones.slice(1)].sort((a, b) => (a ?? '').localeCompare(b ?? '', 'es', { sensitivity: 'base' })))
  })

  it('muestra quién la pagó y permite quitarlo', async () => {
    const { usuario, repositorio, panel } = await abrirPagos(conPrecio('b'))
    expect(within(panel).getByRole('combobox', { name: 'Quién pagó la casa' })).toHaveValue('b')
    await usuario.selectOptions(within(panel).getByRole('combobox', { name: 'Quién pagó la casa' }), 'Nadie todavía')
    expect((await guardada(repositorio)).casa.pagadorId).toBeNull()
  })

  it('sin precio avisa de que hay que ponerlo en La casa', async () => {
    const { panel } = await abrirPagos(quedada({ id: 'q1' }))
    expect(within(panel).getByText(/Todavía no hay precio de la casa/)).toBeInTheDocument()
    expect(within(panel).queryByRole('combobox')).not.toBeInTheDocument()
  })
})

describe('La casa: familias y componentes', () => {
  /** Las fichas de familia empiezan contraídas: se expanden pulsando el nombre. */
  const expandir = (usuario: Usuario, familia: string) =>
    usuario.click(screen.getByRole('button', { name: familia, expanded: false }))

  const conFamilia = () =>
    quedada({
      id: 'q1',
      asistentes: [{ id: 'f1', familia: 'Pérez', personas: 1, llegada: null }],
      participantes: [
        { id: 'a', nombre: 'Ana', familiaId: 'f1' },
        { id: 'z', nombre: 'Zoe' },
      ],
    })

  it('ordena alfabéticamente las personas de la familia y las que no tienen familia', async () => {
    const { usuario } = await preparar(
      quedada({
        id: 'q1',
        asistentes: [{ id: 'f1', familia: 'Pérez', personas: 2, llegada: null }],
        participantes: [
          { id: 'z', nombre: 'Zoe', familiaId: 'f1' },
          { id: 'a', nombre: 'Álex', familiaId: 'f1' },
          { id: 'p', nombre: 'Pablo' },
          { id: 'b', nombre: 'Berta' },
        ],
      }),
    )
    await expandir(usuario, 'Pérez')
    const nombres = (lista: string) =>
      within(screen.getByRole('list', { name: lista }))
        .getAllByRole('listitem')
        .map((li) => li.querySelector('strong, .persona__nombre')?.textContent)
    expect(nombres('Personas de la familia Pérez')).toEqual(['Álex', 'Zoe'])
    expect(nombres('Participantes sin familia')).toEqual(['Berta', 'Pablo'])
  })

  it('añade personas a una familia con «Añadir persona» y su número de personas las cuenta', async () => {
    const { usuario, repositorio } = await preparar(conFamilia())
    await expandir(usuario, 'Pérez')
    await usuario.click(screen.getByRole('button', { name: 'Añadir persona a Pérez' }))
    const d = within(screen.getByRole('dialog', { name: 'Nueva persona' }))
    await usuario.type(d.getByRole('textbox', { name: 'Nombre' }), 'Beto')
    await usuario.click(d.getByRole('button', { name: 'Añadir' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
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
    await expandir(usuario, 'Pérez')
    expect(screen.queryByRole('textbox', { name: /Nombre de Ana/ })).not.toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Editar persona Ana' }))
    const d = within(screen.getByRole('dialog', { name: 'Editar persona' }))
    const nombre = d.getByRole('textbox', { name: 'Nombre' })
    await usuario.clear(nombre)
    await usuario.type(nombre, 'Anita')
    const casa = d.getByRole('spinbutton', { name: '% casa' })
    await usuario.clear(casa)
    await usuario.type(casa, '50')
    const gastos = d.getByRole('spinbutton', { name: '% demás gastos' })
    await usuario.clear(gastos)
    await usuario.type(gastos, '25')
    await usuario.click(d.getByRole('button', { name: 'Guardar' }))
    expect((await guardada(repositorio)).participantes[0]).toMatchObject({
      nombre: 'Anita',
      porcentajeCasa: 50,
      porcentajeComida: 25,
    })
  })

  it('quita un componente tras confirmar', async () => {
    const { usuario, repositorio } = await preparar(conFamilia())
    await expandir(usuario, 'Pérez')
    await usuario.click(screen.getByRole('button', { name: 'Borrar persona Ana' }))
    expect(screen.getByRole('dialog', { name: '¿Borrar a «Ana»?' })).toBeInTheDocument()
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Sí, borrar' }))
    expect((await guardada(repositorio)).participantes.map((p) => p.id)).toEqual(['z'])
  })

  it('no hay desplegable para cambiar de familia: las personas se añaden en su familia', async () => {
    await preparar(conFamilia())
    expect(screen.queryByRole('combobox', { name: /^Familia de/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Añadir componente/ })).not.toBeInTheDocument()
  })
})
