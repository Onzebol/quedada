import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { producto, quedada } from '../dominio/fabrica'
import { RepositorioMemoria } from '../test/repositorioMemoria'
import { ImportarExcel } from './ImportarExcel'
import type { InformeImportacion } from './importarHoja'

const importada = (id = 'import-compras-2026', nombre = 'Quedada 2026') => quedada({ id, nombre, participantes: [{ id: 'p1', nombre: 'Ana', familiaId: 'fa' }, { id: 'p2', nombre: 'Beto', familiaId: 'fb' }], asistentes: [{ id: 'fa', familia: 'Ana', personas: 1, llegada: null }, { id: 'fb', familia: 'Beto', personas: 1, llegada: null }], productos: [producto({ id: `${id}-producto-1` })] })
const informe = (...ids: string[]): InformeImportacion => ({
  importadas: ids.map((id) => ({ hoja: 'Compras 2026', quedada: importada(id), avisos: [] })),
  ignoradas: [],
})

async function importar(props: { repo: RepositorioMemoria; espacio?: string; ids?: string[] }) {
  const onImportado = vi.fn()
  const { unmount } = render(
    <ImportarExcel
      leer={async () => informe(...(props.ids ?? ['import-compras-2026']))}
      repositorio={props.repo}
      espacio={props.espacio}
      onImportado={onImportado}
    />,
  )
  await userEvent.upload(screen.getByLabelText('Archivo de Excel (.xlsx)'), new File(['x'], 'compras.xlsx'))
  await waitFor(() => expect(onImportado).toHaveBeenCalled())
  unmount()
  return onImportado
}

describe('ImportarExcel: id de la quedada importada', () => {
  it('sin cuenta conserva el id de siempre', async () => {
    const repo = new RepositorioMemoria()
    const onImportado = await importar({ repo })
    expect(repo.quedadas.map((q) => q.id)).toEqual(['import-compras-2026'])
    expect(onImportado).toHaveBeenCalledWith(['import-compras-2026'])
  })

  it('con cuenta añade el id de la cuenta, y dos cuentas no comparten id', async () => {
    const deAna = new RepositorioMemoria()
    const deLuis = new RepositorioMemoria()
    await importar({ repo: deAna, espacio: 'ana' })
    await importar({ repo: deLuis, espacio: 'luis' })
    expect(deAna.quedadas.map((q) => q.id)).toEqual(['ana-import-compras-2026'])
    expect(deLuis.quedadas.map((q) => q.id)).toEqual(['luis-import-compras-2026'])
  })

  it('avisa del id final, el que se ha guardado', async () => {
    const onImportado = await importar({ repo: new RepositorioMemoria(), espacio: 'ana' })
    expect(onImportado).toHaveBeenCalledWith(['ana-import-compras-2026'])
  })

  it('importar dos veces con la misma cuenta sustituye en vez de duplicar', async () => {
    const repo = new RepositorioMemoria()
    await importar({ repo, espacio: 'ana' })
    await importar({ repo, espacio: 'ana' })
    expect(repo.quedadas.map((q) => q.id)).toEqual(['ana-import-compras-2026'])
  })

  it('si la cuenta ya tiene la quedada con el id antiguo, la sustituye y no crea otra', async () => {
    const repo = new RepositorioMemoria([quedada({ id: 'import-compras-2026', nombre: 'Vieja' })])
    const onImportado = await importar({ repo, espacio: 'ana' })
    expect(repo.quedadas.map((q) => [q.id, q.nombre])).toEqual([['import-compras-2026', 'Quedada 2026']])
    expect(onImportado).toHaveBeenCalledWith(['import-compras-2026'])
  })

  it('conserva los asistentes y básicos que ya tenía la quedada', async () => {
    const repo = new RepositorioMemoria([
      quedada({
        id: 'ana-import-compras-2026',
        asistentes: [{ id: 'a1', familia: 'Pérez', personas: 3, llegada: null }],
        basicos: [{ id: 'b1', nombre: 'Leche', asistenteId: 'a1' }],
      }),
    ])
    await importar({ repo, espacio: 'ana' })
    const q = repo.quedadas[0]
    expect(q.id).toBe('ana-import-compras-2026')
    // La familia que ya tenía se conserva; las de los compradores nuevos se añaden.
    expect(q.asistentes.map((a) => a.id)).toEqual(['a1', 'fa', 'fb'])
    expect(q.basicos).toHaveLength(1)
  })

  it('conserva la casa, las familias y el porcentaje de casa al reimportar', async () => {
    const repo = new RepositorioMemoria([
      quedada({
        id: 'ana-import-compras-2026',
        casa: { titulo: 'Casa Almunia', descripcion: '', direccion: 'Calle 1', latitud: 1, longitud: 2, precio: 90000, pagadorId: 'p1' },
        participantes: [{ id: 'p1', nombre: 'Ana', familiaId: 'f1', porcentajeCasa: 50 }],
        asistentes: [{ id: 'f1', familia: 'Pérez', personas: 1, llegada: null }],
      }),
    ])
    await importar({ repo, espacio: 'ana' })
    const q = repo.quedadas[0]
    expect(q.casa).toMatchObject({ titulo: 'Casa Almunia', precio: 90000, pagadorId: 'p1' })
    expect(q.participantes.find((p) => p.id === 'p1')).toMatchObject({ familiaId: 'f1', porcentajeCasa: 50 })
    expect(q.participantes.find((p) => p.id === 'p2')).toEqual({ id: 'p2', nombre: 'Beto', familiaId: 'fb' })
    // Conserva su familia y añade la de quien no la tenía, sin duplicar.
    expect(q.asistentes.map((a) => a.id)).toEqual(['f1', 'fb'])
  })

  it('al importar por primera vez, cada comprador queda como una familia', async () => {
    const repo = new RepositorioMemoria()
    await importar({ repo })
    const q = repo.quedadas[0]
    expect(q.asistentes.map((a) => a.familia)).toEqual(['Ana', 'Beto'])
    expect(q.participantes.map((p) => p.familiaId)).toEqual(['fa', 'fb'])
  })

  it('con varias hojas, cada quedada recibe su id con la cuenta', async () => {
    const repo = new RepositorioMemoria()
    await importar({ repo, espacio: 'ana', ids: ['import-compras-2026', 'import-compras-2025'] })
    expect(repo.quedadas.map((q) => q.id).sort()).toEqual(['ana-import-compras-2025', 'ana-import-compras-2026'])
  })
})
