import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { quedada } from '../dominio/fabrica'
import type { Repositorio } from '../dominio/repositorio'
import type { Id, Quedada } from '../dominio/tipos'
import { useQuedada } from './useQuedada'

/** Repositorio que no termina un guardado hasta que el test lo libera, como una red lenta. */
class RepositorioLento implements Repositorio {
  guardados: string[] = []
  enCurso = 0
  maxEnCurso = 0
  pendientes: { nombre: string; terminar: () => void; fallar: () => void }[] = []

  private readonly inicial: Quedada

  constructor(inicial: Quedada) {
    this.inicial = inicial
  }

  async listar() {
    return [this.inicial]
  }
  async obtener(_id: Id) {
    return this.inicial
  }
  async borrar(_id: Id) {}

  guardar(q: Quedada): Promise<void> {
    this.enCurso++
    this.maxEnCurso = Math.max(this.maxEnCurso, this.enCurso)
    return new Promise<void>((resolver, rechazar) => {
      this.pendientes.push({
        nombre: q.nombre,
        terminar: () => {
          this.enCurso--
          this.guardados.push(q.nombre)
          resolver()
        },
        fallar: () => {
          this.enCurso--
          rechazar(new Error('red'))
        },
      })
    })
  }
}

const renombrar = (nombre: string) => (q: Quedada): Quedada => ({ ...q, nombre })
const siguiente = (repo: RepositorioLento) => repo.pendientes.shift()!

async function abrir(repo: RepositorioLento) {
  const vista = renderHook(() => useQuedada(repo, () => 'id'))
  await waitFor(() => expect(vista.result.current.quedada).not.toBeNull())
  return vista
}

describe('useQuedada: guardado en orden', () => {
  it('nunca hay dos guardados a la vez y termina con el último estado', async () => {
    const repo = new RepositorioLento(quedada({ id: 'q1', nombre: 'Inicio' }))
    const { result } = await abrir(repo)

    act(() => result.current.aplicar(renombrar('A')))
    act(() => result.current.aplicar(renombrar('B')))
    act(() => result.current.aplicar(renombrar('C')))

    expect(repo.maxEnCurso).toBe(1)
    siguiente(repo).terminar()
    await waitFor(() => expect(repo.pendientes).toHaveLength(1))
    siguiente(repo).terminar()
    await waitFor(() => expect(repo.guardados).toEqual(['A', 'C']))
    expect(repo.maxEnCurso).toBe(1)
    expect(repo.pendientes).toHaveLength(0)
  })

  it('tras un fallo de guardado se sigue guardando', async () => {
    const repo = new RepositorioLento(quedada({ id: 'q1', nombre: 'Inicio' }))
    const { result } = await abrir(repo)

    act(() => result.current.aplicar(renombrar('A')))
    act(() => result.current.aplicar(renombrar('B')))
    siguiente(repo).fallar()
    await waitFor(() => expect(repo.pendientes).toHaveLength(1))
    siguiente(repo).terminar()
    await waitFor(() => expect(repo.guardados).toEqual(['B']))
  })

  it('comunica el error de guardado', async () => {
    const repo = new RepositorioLento(quedada({ id: 'q1', nombre: 'Inicio' }))
    const { result } = await abrir(repo)

    act(() => result.current.aplicar(renombrar('A')))
    siguiente(repo).fallar()
    await waitFor(() => expect(result.current.error).toBe('guardado'))
  })
})
