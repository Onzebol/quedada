import { describe, expect, it } from 'vitest'
import { quedada } from './fabrica'
import { migrar } from './migracion'
import { RepositorioMemoria } from '../test/repositorioMemoria'

describe('migrar', () => {
  it('copia las quedadas del origen si el destino está vacío', async () => {
    const origen = new RepositorioMemoria([quedada({ id: 'q1' }), quedada({ id: 'q2' })])
    const destino = new RepositorioMemoria()
    await migrar(origen, destino)
    expect((await destino.listar()).map((q) => q.id)).toEqual(['q1', 'q2'])
  })

  it('no toca el destino si ya tiene datos', async () => {
    const destino = new RepositorioMemoria([quedada({ id: 'nueva' })])
    await migrar(new RepositorioMemoria([quedada({ id: 'vieja' })]), destino)
    expect((await destino.listar()).map((q) => q.id)).toEqual(['nueva'])
  })

  it('conserva el origen intacto', async () => {
    const origen = new RepositorioMemoria([quedada({ id: 'q1' })])
    await migrar(origen, new RepositorioMemoria())
    expect(await origen.listar()).toHaveLength(1)
  })
})
