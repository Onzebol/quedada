import { beforeEach, describe, expect, it } from 'vitest'
import { quedada } from './fabrica'
import { RepositorioLocalStorage } from './repositorioLocalStorage'

describe('RepositorioLocalStorage', () => {
  beforeEach(() => localStorage.clear())

  it('empieza sin quedadas', async () => {
    expect(await new RepositorioLocalStorage().listar()).toEqual([])
  })

  it('guarda y recupera una quedada', async () => {
    const repo = new RepositorioLocalStorage()
    const q = quedada({ id: 'q1', nombre: 'Almunia 2026' })
    await repo.guardar(q)
    expect(await repo.obtener('q1')).toEqual(q)
  })

  it('persiste entre instancias que comparten el almacén', async () => {
    await new RepositorioLocalStorage().guardar(quedada({ id: 'q1' }))
    expect(await new RepositorioLocalStorage().listar()).toHaveLength(1)
  })

  it('guardar con un id existente la reemplaza en vez de duplicarla', async () => {
    const repo = new RepositorioLocalStorage()
    await repo.guardar(quedada({ id: 'q1', nombre: 'Antes' }))
    await repo.guardar(quedada({ id: 'q1', nombre: 'Después' }))
    const todas = await repo.listar()
    expect(todas).toHaveLength(1)
    expect(todas[0].nombre).toBe('Después')
  })

  it('obtener devuelve null si no existe', async () => {
    expect(await new RepositorioLocalStorage().obtener('nada')).toBeNull()
  })

  it('borra una quedada y deja las demás', async () => {
    const repo = new RepositorioLocalStorage()
    await repo.guardar(quedada({ id: 'q1' }))
    await repo.guardar(quedada({ id: 'q2' }))
    await repo.borrar('q1')
    expect((await repo.listar()).map((q) => q.id)).toEqual(['q2'])
  })

  it('borrar algo que no existe no falla', async () => {
    await expect(new RepositorioLocalStorage().borrar('nada')).resolves.toBeUndefined()
  })

  it('ignora datos corruptos en vez de romper', async () => {
    localStorage.setItem('quedada:quedadas', '{no es json')
    expect(await new RepositorioLocalStorage().listar()).toEqual([])
  })

  it('ignora datos que son JSON válido pero no una lista', async () => {
    localStorage.setItem('quedada:quedadas', '{"id":"q1"}')
    expect(await new RepositorioLocalStorage().listar()).toEqual([])
  })

  it('usa la clave indicada, para no pisar otros datos', async () => {
    await new RepositorioLocalStorage(localStorage, 'otra').guardar(quedada({ id: 'q1' }))
    expect(await new RepositorioLocalStorage().listar()).toEqual([])
    expect(localStorage.getItem('otra')).not.toBeNull()
  })
})
