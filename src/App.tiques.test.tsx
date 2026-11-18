import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { quedada } from './dominio/fabrica'
import { abrirPrimera } from './test/abrirPrimera'
import { AlmacenMemoria, imagenesDePrueba } from './test/almacenMemoria'
import { RepositorioMemoria } from './test/repositorioMemoria'

vi.mock('leaflet', async () => (await import('./test/leafletFalso')).leafletFalso)
vi.mock('leaflet/dist/leaflet.css', () => ({}))

afterEach(() => {
  window.location.hash = ''
})

const inicial = () =>
  quedada({
    id: 'q1',
    participantes: [
      { id: 'a', nombre: 'Ana' },
      { id: 'b', nombre: 'Beto' },
    ],
    gastos: [
      { id: 'g1', pagadorId: 'a', concepto: 'Gasolina', importe: 4550 },
      { id: 'g2', pagadorId: 'b', concepto: 'Súper', importe: 8000, imagen: 'q1/g2.jpg' },
    ],
  })

async function abrir(opciones: { conImagenes?: boolean; almacen?: AlmacenMemoria } = {}) {
  const { conImagenes = true, almacen = new AlmacenMemoria() } = opciones
  const usuario = userEvent.setup()
  const repositorio = new RepositorioMemoria([inicial()])
  abrirPrimera(repositorio)
  render(
    <App
      repositorio={repositorio}
      crearId={() => 'nuevo'}
      imagenes={conImagenes ? imagenesDePrueba(almacen) : undefined}
    />,
  )
  await usuario.click(await screen.findByRole('tab', { name: 'Pagos' }))
  return { usuario, repositorio, almacen, panel: screen.getByRole('region', { name: 'Gastos pagados' }) }
}

const guardada = async (r: RepositorioMemoria) => (await r.obtener('q1'))!
const foto = () => new File(['jpg'], 'tique.jpg', { type: 'image/jpeg' })

describe('Tiques: foto de un gasto (#118)', () => {
  it('guarda la foto del tique y el gasto con su total y su pagador', async () => {
    const { usuario, repositorio, almacen, panel } = await abrir()
    await usuario.click(within(panel).getByRole('button', { name: 'Añadir gasto' }))
    const ventana = screen.getByRole('dialog')
    await usuario.selectOptions(within(ventana).getByRole('combobox', { name: 'Quién pagó' }), 'Beto')
    await usuario.type(within(ventana).getByRole('textbox', { name: 'Concepto' }), 'Carnicería')
    await usuario.type(within(ventana).getByRole('textbox', { name: 'Importe (€)' }), '23,40')
    await usuario.upload(within(ventana).getByLabelText('Foto del tique'), foto())
    await usuario.click(within(ventana).getByRole('button', { name: 'Añadir' }))

    await waitFor(async () => expect((await guardada(repositorio)).gastos).toHaveLength(3))
    expect((await guardada(repositorio)).gastos[2]).toEqual({
      id: 'nuevo',
      pagadorId: 'b',
      concepto: 'Carnicería',
      importe: 2340,
      imagen: 'q1/nuevo.jpg',
    })
    expect([...almacen.imagenes.keys()]).toEqual(['q1/nuevo.jpg'])
  })

  it('sin concepto, un gasto con foto se llama «Tique»', async () => {
    const { usuario, repositorio, panel } = await abrir()
    await usuario.click(within(panel).getByRole('button', { name: 'Añadir gasto' }))
    const ventana = screen.getByRole('dialog')
    await usuario.type(within(ventana).getByRole('textbox', { name: 'Importe (€)' }), '10')
    await usuario.upload(within(ventana).getByLabelText('Foto del tique'), foto())
    await usuario.click(within(ventana).getByRole('button', { name: 'Añadir' }))
    await waitFor(async () => expect((await guardada(repositorio)).gastos).toHaveLength(3))
    expect((await guardada(repositorio)).gastos[2]).toMatchObject({ concepto: 'Tique', importe: 1000 })
  })

  it('si la foto no se puede subir avisa y no crea el gasto', async () => {
    const almacen = new AlmacenMemoria()
    almacen.fallarAlSubir = true
    const { usuario, repositorio, panel } = await abrir({ almacen })
    await usuario.click(within(panel).getByRole('button', { name: 'Añadir gasto' }))
    const ventana = screen.getByRole('dialog')
    await usuario.type(within(ventana).getByRole('textbox', { name: 'Concepto' }), 'Carnicería')
    await usuario.type(within(ventana).getByRole('textbox', { name: 'Importe (€)' }), '5')
    await usuario.upload(within(ventana).getByLabelText('Foto del tique'), foto())
    await usuario.click(within(ventana).getByRole('button', { name: 'Añadir' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo subir la foto del tique')
    expect((await guardada(repositorio)).gastos).toHaveLength(2)
  })

  it('muestra la miniatura del tique y la amplía al pulsarla', async () => {
    const { usuario, panel } = await abrir()
    expect(within(panel).queryByRole('button', { name: 'Ver tique de Gasolina' })).not.toBeInTheDocument()
    await usuario.click(within(panel).getByRole('button', { name: 'Ver tique de Súper' }))
    const ventana = screen.getByRole('dialog', { name: 'Tique: Súper' })
    expect(await within(ventana).findByRole('img', { name: 'Tique de Súper' })).toHaveAttribute('src', 'https://imagenes.test/q1/g2.jpg')
  })

  it('al editar se puede cambiar la foto', async () => {
    const { usuario, repositorio, almacen, panel } = await abrir()
    await usuario.click(within(panel).getByRole('button', { name: 'Editar gasto Gasolina' }))
    await usuario.upload(screen.getByLabelText('Foto del tique'), foto())
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))
    await waitFor(async () => expect((await guardada(repositorio)).gastos[0].imagen).toBe('q1/g1.jpg'))
    expect(almacen.imagenes.has('q1/g1.jpg')).toBe(true)
  })

  it('al editar se puede quitar la foto y se borra del almacén', async () => {
    const almacen = new AlmacenMemoria()
    almacen.imagenes.set('q1/g2.jpg', new Blob(['x']))
    const { usuario, repositorio, panel } = await abrir({ almacen })
    await usuario.click(within(panel).getByRole('button', { name: 'Editar gasto Súper' }))
    await usuario.click(screen.getByRole('checkbox', { name: 'Quitar la foto' }))
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))
    await waitFor(async () => expect((await guardada(repositorio)).gastos[1]).not.toHaveProperty('imagen'))
    await waitFor(() => expect(almacen.imagenes.size).toBe(0))
  })

  it('al borrar el gasto se borra su foto del almacén', async () => {
    const almacen = new AlmacenMemoria()
    almacen.imagenes.set('q1/g2.jpg', new Blob(['x']))
    const { usuario, repositorio, panel } = await abrir({ almacen })
    await usuario.click(within(panel).getByRole('button', { name: 'Borrar gasto Súper' }))
    await usuario.click(screen.getByRole('button', { name: 'Sí, borrar' }))
    await waitFor(async () => expect((await guardada(repositorio)).gastos).toHaveLength(1))
    await waitFor(() => expect(almacen.imagenes.size).toBe(0))
  })

  it('sin almacén de imágenes (modo local) no se ofrece la foto', async () => {
    const { usuario, panel } = await abrir({ conImagenes: false })
    await usuario.click(within(panel).getByRole('button', { name: 'Añadir gasto' }))
    expect(screen.queryByLabelText('Foto del tique')).not.toBeInTheDocument()
    expect(within(panel).queryByRole('button', { name: /Ver tique/ })).not.toBeInTheDocument()
  })
})
