import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { quedada } from '../dominio/fabrica'
import type { Repositorio } from '../dominio/repositorio'
import type { Id, Quedada } from '../dominio/tipos'
import { ESPERA_AVISOS_MS, useQuedada } from './useQuedada'

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


/** Repositorio compartido simulado: otra persona puede cambiar `guardada` y avisar con `avisar()`. */
class RepositorioEnVivo implements Repositorio {
  guardada: Quedada
  lecturas = 0
  suscripciones = 0
  cancelaciones = 0
  /** Mientras sea `true`, `guardar` no termina hasta `soltarGuardados()`. */
  retenerGuardados = false
  /** Si no es `null`, `obtener` espera a que se llame a ese resolutor. */
  lecturaRetenida: (() => void) | null = null
  retenerLectura = false
  fallarLectura = false
  private alCambiar: (() => void) | null = null
  private pendientesDeGuardar: (() => void)[] = []

  constructor(inicial: Quedada) {
    this.guardada = inicial
  }

  async listar() {
    return [this.guardada]
  }

  async obtener(_id: Id) {
    this.lecturas++
    if (this.fallarLectura) throw new Error('sin red')
    const leida = this.guardada
    if (this.retenerLectura) {
      await new Promise<void>((resolver) => {
        this.lecturaRetenida = resolver
      })
    }
    return leida
  }

  async guardar(q: Quedada) {
    if (this.retenerGuardados) {
      await new Promise<void>((resolver) => this.pendientesDeGuardar.push(resolver))
    }
    this.guardada = q
  }

  async borrar(_id: Id) {}

  suscribir(_id: Id, alCambiar: () => void) {
    this.suscripciones++
    this.alCambiar = alCambiar
    return () => {
      this.cancelaciones++
      this.alCambiar = null
    }
  }

  avisar() {
    this.alCambiar?.()
  }

  soltarGuardados() {
    this.retenerGuardados = false
    for (const resolver of this.pendientesDeGuardar.splice(0)) resolver()
  }
}

const pausa = (ms = ESPERA_AVISOS_MS * 3) => new Promise((r) => setTimeout(r, ms))

describe('useQuedada: tiempo real', () => {
  it('se suscribe a la quedada cargada y cancela al desmontar', async () => {
    const repo = new RepositorioEnVivo(quedada({ id: 'q1' }))
    const vista = renderHook(() => useQuedada(repo, () => 'id'))
    await waitFor(() => expect(repo.suscripciones).toBe(1))
    vista.unmount()
    expect(repo.cancelaciones).toBe(1)
  })

  it('un cambio ajeno aparece sin recargar', async () => {
    const repo = new RepositorioEnVivo(quedada({ id: 'q1', nombre: 'Inicio' }))
    const { result } = await abrir(repo as unknown as RepositorioLento)
    repo.guardada = quedada({ id: 'q1', nombre: 'Cambiada por otra persona' })
    repo.avisar()
    await waitFor(() => expect(result.current.quedada?.nombre).toBe('Cambiada por otra persona'))
  })

  it('una ráfaga de avisos hace una sola lectura', async () => {
    const repo = new RepositorioEnVivo(quedada({ id: 'q1' }))
    await abrir(repo as unknown as RepositorioLento)
    await pausa()
    repo.lecturas = 0
    for (let i = 0; i < 6; i++) repo.avisar()
    await pausa()
    expect(repo.lecturas).toBe(1)
  })

  it('un aviso con un guardado propio en curso no pisa lo local y lee cuando termina', async () => {
    const repo = new RepositorioEnVivo(quedada({ id: 'q1', nombre: 'Inicio' }))
    const { result } = await abrir(repo as unknown as RepositorioLento)
    await pausa()
    repo.retenerGuardados = true
    repo.lecturas = 0

    act(() => result.current.aplicar(renombrar('Mío')))
    repo.avisar()
    await pausa()

    expect(result.current.quedada?.nombre).toBe('Mío')
    expect(repo.lecturas).toBe(0)

    repo.soltarGuardados()
    await waitFor(() => expect(repo.lecturas).toBeGreaterThan(0))
    expect(result.current.quedada?.nombre).toBe('Mío')
  })

  it('un cambio local hecho mientras se lee lo ajeno no se pierde', async () => {
    const repo = new RepositorioEnVivo(quedada({ id: 'q1', nombre: 'Inicio' }))
    const { result } = await abrir(repo as unknown as RepositorioLento)
    await pausa()
    repo.retenerLectura = true

    repo.avisar()
    await waitFor(() => expect(repo.lecturaRetenida).not.toBeNull())
    act(() => result.current.aplicar(renombrar('Local')))
    repo.retenerLectura = false
    repo.lecturaRetenida!()

    await pausa()
    expect(result.current.quedada?.nombre).toBe('Local')
    await waitFor(() => expect(repo.guardada.nombre).toBe('Local'))
  })

  it('si la lectura falla, el siguiente aviso lo reintenta', async () => {
    const repo = new RepositorioEnVivo(quedada({ id: 'q1', nombre: 'Inicio' }))
    const { result } = await abrir(repo as unknown as RepositorioLento)
    await pausa()
    repo.fallarLectura = true
    repo.avisar()
    await pausa()
    expect(result.current.quedada?.nombre).toBe('Inicio')

    repo.fallarLectura = false
    repo.guardada = quedada({ id: 'q1', nombre: 'Ya hay red' })
    repo.avisar()
    await waitFor(() => expect(result.current.quedada?.nombre).toBe('Ya hay red'))
  })

  it('una lectura igual a lo que ya se ve no repinta', async () => {
    const repo = new RepositorioEnVivo(quedada({ id: 'q1' }))
    let pintados = 0
    const vista = renderHook(() => {
      pintados++
      return useQuedada(repo, () => 'id')
    })
    await waitFor(() => expect(vista.result.current.quedada).not.toBeNull())
    await pausa()
    const antes = pintados
    repo.avisar()
    await pausa()
    expect(pintados).toBe(antes)
  })
})
