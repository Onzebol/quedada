import { describe, expect, it } from 'vitest'
import { quedada } from '../dominio/fabrica'
import { RepositorioSupabase, type ClienteDatos } from './repositorioSupabase'

interface Fila {
  id: string
  datos: unknown
}

/** Cliente falso con la parte de la API de Supabase que usa el repositorio. */
function clienteFalso(inicial: Fila[] = [], error: { message: string } | null = null) {
  const filas = new Map(inicial.map((f) => [f.id, f]))
  const respuesta = <T,>(data: T) => ({ data: error ? null : data, error })
  const cliente: ClienteDatos = {
    from: () => ({
      select: () => ({
        eq: (_c: string, id: string) => ({ maybeSingle: async () => respuesta(filas.get(id) ?? null) }),
        order: async () => respuesta([...filas.values()]),
      }),
      upsert: async (fila: Fila) => {
        if (!error) filas.set(fila.id, fila)
        return { error }
      },
      delete: () => ({
        eq: async (_c: string, id: string) => {
          if (!error) filas.delete(id)
          return { error }
        },
      }),
    }),
  }
  return { cliente, filas }
}

describe('RepositorioSupabase', () => {
  it('empieza sin quedadas', async () => {
    expect(await new RepositorioSupabase(clienteFalso().cliente).listar()).toEqual([])
  })

  it('guarda y recupera una quedada', async () => {
    const repo = new RepositorioSupabase(clienteFalso().cliente)
    const q = quedada({ id: 'q1', nombre: 'Almunia 2026' })
    await repo.guardar(q)
    expect(await repo.obtener('q1')).toEqual(q)
  })

  it('guardar con un id existente la reemplaza en vez de duplicarla', async () => {
    const repo = new RepositorioSupabase(clienteFalso().cliente)
    await repo.guardar(quedada({ id: 'q1', nombre: 'Antes' }))
    await repo.guardar(quedada({ id: 'q1', nombre: 'Después' }))
    const todas = await repo.listar()
    expect(todas).toHaveLength(1)
    expect(todas[0].nombre).toBe('Después')
  })

  it('obtener devuelve null si no existe', async () => {
    expect(await new RepositorioSupabase(clienteFalso().cliente).obtener('nada')).toBeNull()
  })

  it('borra una quedada y deja las demás', async () => {
    const repo = new RepositorioSupabase(clienteFalso().cliente)
    await repo.guardar(quedada({ id: 'q1' }))
    await repo.guardar(quedada({ id: 'q2' }))
    await repo.borrar('q1')
    expect((await repo.listar()).map((q) => q.id)).toEqual(['q2'])
  })

  it('borrar algo que no existe no falla', async () => {
    await expect(new RepositorioSupabase(clienteFalso().cliente).borrar('nada')).resolves.toBeUndefined()
  })

  it('ignora filas con datos que no son una quedada', async () => {
    const q = quedada({ id: 'q1' })
    const { cliente } = clienteFalso([{ id: 'q1', datos: q }, { id: 'rota', datos: { basura: true } }])
    expect((await new RepositorioSupabase(cliente).listar()).map((x) => x.id)).toEqual(['q1'])
  })

  it('propaga los errores del servidor', async () => {
    const repo = new RepositorioSupabase(clienteFalso([], { message: 'sin permiso' }).cliente)
    await expect(repo.listar()).rejects.toThrow('sin permiso')
    await expect(repo.obtener('q1')).rejects.toThrow('sin permiso')
    await expect(repo.guardar(quedada({ id: 'q1' }))).rejects.toThrow('sin permiso')
    await expect(repo.borrar('q1')).rejects.toThrow('sin permiso')
  })
})
