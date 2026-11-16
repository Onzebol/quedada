import { useCallback, useEffect, useRef, useState } from 'react'
import { quedadaInicial } from '../dominio/operaciones'
import type { Repositorio } from '../dominio/repositorio'
import type { Id, Quedada } from '../dominio/tipos'

export type ErrorAlmacen = 'carga' | 'guardado'

/** Espera tras un aviso de cambio ajeno para juntar ráfagas (y los ecos de lo que guardamos nosotros). */
export const ESPERA_AVISOS_MS = 150

export type EstadoQuedada = ReturnType<typeof useQuedada>

/**
 * Carga la quedada indicada, o la primera guardada (o crea una con las comidas habituales), y
 * guarda en el repositorio cada cambio que se aplique, de uno en uno y en orden (con un servicio
 * remoto, dos guardados a la vez podrían llegar desordenados y el viejo pisaría al nuevo; mientras
 * hay uno en curso solo se recuerda el último estado). Si el repositorio es compartido
 * (`suscribir`), vuelve a leer la quedada cuando otra persona la cambia, sin pisar lo que se
 * acaba de cambiar aquí. Si el almacenamiento falla
 * (bloqueado por el navegador, lleno…) lo comunica en `error` en vez de quedarse esperando.
 */
export function useQuedada(repositorio: Repositorio, crearId: () => Id, quedadaId: Id | null = null) {
  const [quedada, setQuedada] = useState<Quedada | null>(null)
  const [error, setError] = useState<ErrorAlmacen | null>(null)
  const actual = useRef<Quedada | null>(null)
  const idsRef = useRef(crearId)
  const guardando = useRef(false)
  const pendiente = useRef<Quedada | null>(null)
  /** Sube con cada cambio local: una lectura que empezó antes de él ya no vale. */
  const version = useRef(0)

  useEffect(() => {
    let cancelado = false
    async function cargar() {
      const guardadas = await repositorio.listar()
      const elegida = quedadaId === null ? undefined : guardadas.find((g) => g.id === quedadaId)
      const q = elegida ?? guardadas[0] ?? quedadaInicial(idsRef.current)
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
  }, [repositorio, quedadaId])

  const vaciarGuardados = useCallback(async () => {
    if (guardando.current) return
    guardando.current = true
    try {
      while (pendiente.current !== null) {
        const q = pendiente.current
        pendiente.current = null
        try {
          await repositorio.guardar(q)
          // Cada guardado lleva la quedada entera: si este sale bien, un fallo anterior ya no importa.
          if (pendiente.current === null) setError(null)
        } catch {
          setError('guardado')
        }
      }
    } finally {
      guardando.current = false
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
      version.current++
      pendiente.current = siguiente
      void vaciarGuardados()
    },
    [vaciarGuardados],
  )

  const idCargada = quedada?.id ?? null
  useEffect(() => {
    if (idCargada === null || repositorio.suscribir === undefined) return
    let cancelado = false
    let temporizador: ReturnType<typeof setTimeout> | undefined

    const programar = () => {
      clearTimeout(temporizador)
      temporizador = setTimeout(() => void refrescar(), ESPERA_AVISOS_MS)
    }
    const hayCambiosLocales = () => guardando.current || pendiente.current !== null

    async function refrescar() {
      // Con cambios nuestros sin guardar, leer ahora devolvería lo viejo: se espera a que terminen.
      if (hayCambiosLocales()) return programar()
      const desde = version.current
      let leida: Quedada | null
      try {
        leida = await repositorio.obtener(idCargada!)
      } catch {
        return // el siguiente aviso lo reintenta
      }
      if (cancelado) return
      if (desde !== version.current || hayCambiosLocales()) return programar()
      if (leida !== null && JSON.stringify(leida) !== JSON.stringify(actual.current)) {
        actual.current = leida
        setQuedada(leida)
      }
    }

    const cancelar = repositorio.suscribir(idCargada, programar)
    return () => {
      cancelado = true
      clearTimeout(temporizador)
      cancelar()
    }
  }, [repositorio, idCargada])

  return { quedada, aplicar, error }
}
