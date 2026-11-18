import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { importarLibro, type Celda, type InformeImportacion } from './importacion/importarHoja'
import { RepositorioMemoria } from './test/repositorioMemoria'

afterEach(() => {
  window.location.hash = ''
})

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

/** La importación vive en la página inicial. */
async function esperarCarga() {
  await screen.findByRole('region', { name: 'Importar Excel' })
}

async function subir(usuario: ReturnType<typeof userEvent.setup>) {
  const archivo = new File(['x'], 'QUEDADA.xlsx')
  await usuario.upload(screen.getByLabelText('Archivo de Excel (.xlsx)'), archivo)
}

/** Las secciones de la compra empiezan contraídas: las despliega todas. */
async function abrirSecciones(usuario: ReturnType<typeof userEvent.setup>) {
  await usuario.click(await screen.findByRole('tab', { name: 'Lista de la compra' }))
  await screen.findAllByRole('heading', { level: 3 })
  for (const alternar of screen.getAllByRole('button', { expanded: false })) {
    if (alternar.closest('h3')) await usuario.click(alternar)
  }
}

const importacion = () => screen.getByRole('region', { name: 'Importar Excel' })

describe('Importar Excel', () => {
  it('al reimportar conserva los asistentes y básicos de la quedada', async () => {
    const [{ quedada: importada }] = informe().importadas
    const previa = {
      ...importada,
      asistentes: [{ id: 'a1', familia: 'Pérez', personas: 4, llegada: '18:00' }],
      basicos: [{ id: 'b1', nombre: 'Leche', asistenteId: 'a1' }],
    }
    const { usuario, repositorio } = preparar(async () => informe(), new RepositorioMemoria([previa]))
    await esperarCarga()
    await subir(usuario)
    await within(importacion()).findByRole('status')
    const guardada = await repositorio.obtener(importada.id)
    expect(guardada?.asistentes).toEqual(previa.asistentes)
    expect(guardada?.basicos).toEqual(previa.basicos)
  })

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

  it('las quedadas importadas aparecen en la lista y se pueden abrir', async () => {
    const { usuario } = preparar(async () => informe())
    await esperarCarga()
    await subir(usuario)
    await within(importacion()).findByRole('status')
    expect(within(screen.getByRole('list', { name: 'Quedadas' })).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      expect.stringContaining('Quedada 2026'),
      expect.stringContaining('Quedada 2025'),
    ])

    await usuario.click(screen.getByRole('button', { name: 'Quedada 2025' }))
    await abrirSecciones(usuario)
    expect(await screen.findByRole('checkbox', { name: 'Pizza 2025' })).toBeChecked()
    expect(screen.queryByRole('checkbox', { name: 'Pizza 2026' })).not.toBeInTheDocument()
  })

  it('si el Excel trae una sola quedada la abre directamente', async () => {
    const { usuario } = preparar(async () => {
      const i = informe()
      return { ...i, importadas: [i.importadas[0]] }
    })
    await esperarCarga()
    await subir(usuario)
    await abrirSecciones(usuario)
    expect(await screen.findByRole('checkbox', { name: 'Pizza 2026' })).toBeInTheDocument()
  })

  it('guarda las quedadas en el repositorio y conserva los cambios al volver a importar sin duplicar', async () => {
    const repositorio = new RepositorioMemoria()
    const { usuario } = preparar(async () => informe(), repositorio)
    await esperarCarga()
    await subir(usuario)
    await within(importacion()).findByRole('status')
    expect(repositorio.quedadas.map((q) => q.id)).toEqual(
      expect.arrayContaining(['import-compras-2026', 'import-compras-2025']),
    )
    const antes = repositorio.quedadas.length

    await subir(usuario)
    await within(importacion()).findByText(/Importadas 2 quedadas/)
    expect(repositorio.quedadas).toHaveLength(antes)
    expect(within(screen.getByRole('list', { name: 'Quedadas' })).getAllByRole('listitem')).toHaveLength(antes)
  })

  it('las quedadas importadas siguen ahí al recargar', async () => {
    const repositorio = new RepositorioMemoria()
    const primera = preparar(async () => informe(), repositorio)
    await esperarCarga()
    await subir(primera.usuario)
    await within(importacion()).findByRole('status')
    primera.vista.unmount()

    preparar(async () => informe(), repositorio)
    expect(await screen.findByRole('button', { name: 'Quedada 2025' })).toBeInTheDocument()
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
