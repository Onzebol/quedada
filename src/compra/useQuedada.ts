import { useCallback, useEffect, useRef, useState } from 'react'
import { quedadaInicial } from '../dominio/operaciones'
import type { Repositorio } from '../dominio/repositorio'
import type { Id, Quedada } from '../dominio/tipos'

export type ErrorAlmacen = 'carga' | 'guardado'

export type EstadoQuedada = ReturnType<typeof useQuedada>

/**
 * Carga la primera quedada guardada (o crea una con las comidas habituales) y
 * guarda en el repositorio cada cambio que se aplique. Si el almacenamiento falla
 * (bloqueado por el navegador, lleno…) lo comunica en `error` en vez de quedarse esperando.
 */
export function useQuedada(repositorio: Repositorio, crearId: () => Id) {
  const [quedada, setQuedada] = useState<Quedada | null>(null)
  const [error, setError] = useState<ErrorAlmacen | null>(null)
  const actual = useRef<Quedada | null>(null)
  const idsRef = useRef(crearId)

  useEffect(() => {
    let cancelado = false
    async function cargar() {
      const guardadas = await repositorio.listar()
      const q = guardadas[0] ?? quedadaInicial(idsRef.current)
      if (guardadas.length === 0) await repositorio.guardar(q)
      if (cancelado) return
      actual.current = q
      setQuedada(q)
    }
    cargar().catch(() => {
      if (!cancelado) setError('carga')
    })
    return () => {
      cancelado = true
    }
  }, [repositorio])

  const aplicar = useCallback(
    (cambio: (q: Quedada) => Quedada) => {
      if (actual.current === null) return
      const siguiente = cambio(actual.current)
      if (siguiente === actual.current) return
      actual.current = siguiente
      setQuedada(siguiente)
      setError(null)
      repositorio.guardar(siguiente).catch(() => setError('guardado'))
    },
    [repositorio],
  )

  return { quedada, aplicar, error }
}
