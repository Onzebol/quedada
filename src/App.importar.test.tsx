import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import App from './App'
import { importarLibro, type Celda, type InformeImportacion } from './importacion/importarHoja'
import { RepositorioMemoria } from './test/repositorioMemoria'

function contador() {
  let n = 0
  return () => `id${++n}`
}

const cabecera2026: Celda[] = ['COMPRADOR', 'COMPRADO', null, 'CENA VIERNES', 'OBSERVACIONES']
const cabecera2025: Celda[] = ['COMPRADOR', 'COMPRADO', null, '€/ud', 'dto', 'total', 'CENA VIERNES', null, 'Observaciones']

function informe() {
  return importarLibro([
    {
      sheet: 'COMPRAS 2026',
      data: [cabecera2026, [null, '☐', 1, 'Pizza 2026', null], [null, '☐', 1, 'Pan', null], [null, null, null, 'LECHES', null]],
    },
    { sheet: 'Compras 2025', data: [cabecera2025, ['ANA', '☑', 2, 5, null, 10, 'Pizza 2025', null, null]] },
    { sheet: 'NOMBRES', data: [['Nombre'], ['ANA']] },
  ])
}

function preparar(leerExcel: (a: Blob) => Promise<InformeImportacion>, repositorio = new RepositorioMemoria()) {
  const usuario = userEvent.setup()
  const vista = render(<App repositorio={repositorio} crearId={contador()} leerExcel={leerExcel} />)
  return { usuario, repositorio, vista }
}

async function esperarCarga() {
  await screen.findByRole('heading', { level: 3, name: 'Cena del viernes' })
}

async function subir(usuario: ReturnType<typeof userEvent.setup>) {
  const archivo = new File(['x'], 'QUEDADA.xlsx')
  await usuario.upload(screen.getByLabelText('Archivo de Excel (.xlsx)'), archivo)
}

const importacion = () => screen.getByRole('region', { name: 'Importar Excel' })

describe('Importar Excel', () => {
  it('importa las hojas de compras y cuenta lo importado', async () => {
    const { usuario } = preparar(async () => informe())
    await esperarCarga()
    await subir(usuario)
    expect(await within(importacion()).findByRole('status')).toHaveTextContent(
      'Importadas 2 quedadas: Quedada 2026 (2 productos), Quedada 2025 (1 producto)',
    )
  })

  it('lista las hojas que no ha importado', async () => {
    const { usuario } = preparar(async () => informe())
    await esperarCarga()
    await subir(usuario)
    expect(await within(importacion()).findByText('Hojas ignoradas: NOMBRES')).toBeInTheDocument()
  })

  it('muestra los avisos de cada hoja', async () => {
    const { usuario } = preparar(async () => informe())
    await esperarCarga()
    await subir(usuario)
    expect(await within(importacion()).findByText('1 aviso en Quedada 2026')).toBeInTheDocument()
    expect(within(importacion()).getByText('Grupo vacío ignorado: Leches')).toBeInTheDocument()
  })

  it('muestra la quedada importada más reciente y permite cambiar de quedada', async () => {
    const { usuario } = preparar(async () => informe())
    await esperarCarga()
    await subir(usuario)
    expect(await screen.findByRole('checkbox', { name: 'Pizza 2026' })).toBeInTheDocument()

    const selector = screen.getByRole('combobox', { name: 'Quedada' })
    expect(within(selector).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Quedada',
      'Quedada 2026',
      'Quedada 2025',
    ])

    await usuario.selectOptions(selector, 'Quedada 2025')
    expect(await screen.findByRole('checkbox', { name: 'Pizza 2025' })).toBeChecked()
    expect(screen.queryByRole('checkbox', { name: 'Pizza 2026' })).not.toBeInTheDocument()
  })

  it('no muestra el selector si solo hay una quedada', async () => {
    preparar(async () => informe())
    await esperarCarga()
    expect(screen.queryByRole('combobox', { name: 'Quedada' })).not.toBeInTheDocument()
  })

  it('guarda las quedadas en el repositorio y conserva los cambios al volver a importar sin duplicar', async () => {
    const repositorio = new RepositorioMemoria()
    const { usuario } = preparar(async () => informe(), repositorio)
    await esperarCarga()
    await subir(usuario)
    await screen.findByRole('checkbox', { name: 'Pizza 2026' })
    expect(repositorio.quedadas.map((q) => q.id)).toEqual(
      expect.arrayContaining(['import-compras-2026', 'import-compras-2025']),
    )
    const antes = repositorio.quedadas.length

    await subir(usuario)
    await within(importacion()).findByText(/Importadas 2 quedadas/)
    expect(repositorio.quedadas).toHaveLength(antes)
    const selector = screen.getByRole('combobox', { name: 'Quedada' })
    expect(within(selector).getAllByRole('option')).toHaveLength(antes)
  })

  it('las quedadas importadas siguen ahí al recargar', async () => {
    const repositorio = new RepositorioMemoria()
    const primera = preparar(async () => informe(), repositorio)
    await esperarCarga()
    await subir(primera.usuario)
    await screen.findByRole('checkbox', { name: 'Pizza 2026' })
    primera.vista.unmount()

    preparar(async () => informe(), repositorio)
    expect(await screen.findByRole('combobox', { name: 'Quedada' })).toBeInTheDocument()
  })

  it('avisa si el archivo no se puede leer', async () => {
    const leer = vi.fn().mockRejectedValue(new Error('zip corrupto'))
    const { usuario } = preparar(leer)
    await esperarCarga()
    await subir(usuario)
    expect(await within(importacion()).findByRole('alert')).toHaveTextContent('No se pudo leer el archivo')
  })

  it('avisa si el archivo no tiene hojas de compras', async () => {
    const { usuario } = preparar(async () => importarLibro([{ sheet: 'NOMBRES', data: [['Nombre']] }]))
    await esperarCarga()
    await subir(usuario)
    expect(await within(importacion()).findByRole('alert')).toHaveTextContent('No se encontró ninguna hoja «Compras AAAA»')
  })
})
